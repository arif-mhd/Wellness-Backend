import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import multer from "multer";
import { requireRole } from "../middleware/requireRole";
import { requireFeature } from "../middleware/requireFeature";
import { labServicesContainer, labTestsContainer, labBookingsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";
import { resolveClinicName } from "./clinicInsurance";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── GET /api/lab/tests ───────────────────────────────────────────────────────
// Public: returns all approved, active lab tests. Supports ?category=, ?labId=
// (browse-by-lab, mirrors pharmacy.ts's ?pharmacyId= catalogue filter) and
// ?clinicId= (a clinic-affiliated doctor's own prescribing search, mirrors
// pharmacy.ts's clinicId->pharmacyId resolution — a branch has at most one
// affiliated lab, even though that lab may also serve other branches).
router.get("/tests", async (req: Request, res: Response) => {
  try {
    const { category, labId, clinicId } = req.query as { category?: string; labId?: string; clinicId?: string };
    // Legacy-safe: test docs created before the approval workflow existed have
    // no `status` field at all — treat those as approved, same pattern used
    // for pharmacyProducts.inStock everywhere else in this codebase.
    let query = "SELECT * FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')";
    const parameters: any[] = [];

    if (clinicId) {
      const { resources: clinicLabs } = await labServicesContainer.items
        .query({
          query: "SELECT * FROM c WHERE ARRAY_CONTAINS(c.clinicIds, @clinicId) AND c.status = 'approved'",
          parameters: [{ name: "@clinicId", value: clinicId }],
        })
        .fetchAll();
      if (clinicLabs.length) {
        query += " AND c.labId = @clinicLabId";
        parameters.push({ name: "@clinicLabId", value: clinicLabs[0].id });
      }
    }

    if (labId) {
      query += " AND c.labId = @labId";
      parameters.push({ name: "@labId", value: labId });
    }
    if (category) {
      query += " AND LOWER(c.category) = LOWER(@cat)";
      parameters.push({ name: "@cat", value: category });
    }
    query += " ORDER BY c.createdAt DESC";
    const { resources } = await labTestsContainer.items.query({ query, parameters }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get lab tests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/labs ─────────────────────────────────────────────────────────
// Public — lists approved labs that carry at least one orderable test, for the
// patient app's "browse by lab" screen. Mirrors GET /api/pharmacy/pharmacies.
router.get("/labs", async (_req: Request, res: Response) => {
  try {
    const { resources: labs } = await labServicesContainer.items.query(
      "SELECT * FROM c WHERE c.status = 'approved'"
    ).fetchAll();

    const { resources: approvedTests } = await labTestsContainer.items.query(
      "SELECT c.labId FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')"
    ).fetchAll();
    const testCountMap: Record<string, number> = {};
    approvedTests.forEach((t: any) => {
      if (!t.labId) return;
      testCountMap[t.labId] = (testCountMap[t.labId] ?? 0) + 1;
    });

    const list = labs
      .map((l: any) => ({
        id:         l.id,
        name:       l.name,
        location:   l.location ?? null,
        rating:     l.rating ?? 0,
        testCount:  testCountMap[l.id] ?? 0,
      }))
      .filter((l) => l.testCount > 0)
      .sort((a, b) => b.rating - a.rating || b.testCount - a.testCount);

    res.json(list);
  } catch (err) {
    console.error("Labs list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/register ───────────────────────────────────────────────────
// Public — self-registration for an independent lab. Mirrors pharmacy.ts's
// POST /register exactly (SuperTokens signup -> "lab_pending" role -> Cosmos
// doc awaiting admin approval). Uses the same field names adminLab.ts's
// admin-direct-create already writes, so every lab doc shares one schema
// regardless of how it was created.
router.post("/register", async (req: Request, res: Response) => {
  const { password, director, name, labLicense, location, contactNumber } = req.body;
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : req.body.email;

  if (!email || !password || !director || !name || !labLicense || !contactNumber) {
    res.status(400).json({ error: "email, password, director, name, labLicense and contactNumber are required." });
    return;
  }

  try {
    const signUpResult = await EmailPassword.signUp("public", email, password);

    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    if (signUpResult.status !== "OK") {
      res.status(400).json({ error: "Registration failed. Please try again." });
      return;
    }

    const supertokensId = signUpResult.user.id;

    await UserRoles.addRoleToUser("public", supertokensId, "lab_pending");

    const now = new Date().toISOString();
    const labDoc = {
      id:             supertokensId,
      supertokens_id: supertokensId,
      status:         "pending_approval" as const,
      email,
      director,
      name,
      labLicense,
      location:       location || null,
      contactNumber,
      clinicIds:      [],
      affiliation:    null,
      linkRequests:   [],
      registeredAt:   now,
      approvedAt:     null,
      approvedBy:     null,
      rejectedAt:     null,
      rejectedReason: null,
      totalTests:     0,
      rating:         0,
    };

    await labServicesContainer.items.upsert(labDoc);

    res.status(201).json({ status: "OK", message: "Registration submitted. Awaiting admin approval." });
  } catch (err) {
    console.error("Lab register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/me ───────────────────────────────────────────────────────────
router.get("/me", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { resource } = await labServicesContainer.item(labId, labId).read();
    if (!resource) { res.status(404).json({ error: "Lab not found" }); return; }
    res.json({ lab: resource });
  } catch (err) {
    console.error("Lab me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/lab/me ────────────────────────────────────────────────────────────
router.put("/me", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { director, name, labLicense, contactNumber, location, manager, operatingHours } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : req.body.email;

    const { resource: existing } = await labServicesContainer.item(labId, labId).read();
    if (!existing) { res.status(404).json({ error: "Lab not found" }); return; }

    const updated = {
      ...existing,
      ...(director && { director }),
      ...(name && { name }),
      ...(labLicense && { labLicense }),
      ...(email && { email }),
      ...(contactNumber && { contactNumber }),
      ...(location !== undefined && { location }),
      ...(manager !== undefined && { manager }),
      ...(operatingHours !== undefined && { operatingHours }),
      updatedAt: new Date().toISOString(),
    };

    await labServicesContainer.items.upsert(updated);
    res.json({ status: "OK", lab: updated });
  } catch (err) {
    console.error("Lab update me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/clinic-affiliations ────────────────────────────────────────
router.get("/clinic-affiliations", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { resource } = await labServicesContainer.item(labId, labId).read();
    if (!resource) { res.status(404).json({ error: "Lab not found" }); return; }

    const clinicIds: string[] = resource.clinicIds ?? [];
    const affiliations = await Promise.all(
      clinicIds.map(async (id) => ({ clinicId: id, clinicName: (await resolveClinicName(id)) ?? "Unknown clinic" }))
    );

    res.json({ affiliations, linkRequests: resource.linkRequests ?? [] });
  } catch (err) {
    console.error("Lab clinic-affiliations fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/clinic-link-requests/accept ───────────────────────────────
router.post("/clinic-link-requests/accept", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { fromClinicId } = req.body;
    if (!fromClinicId) { res.status(400).json({ error: "fromClinicId is required." }); return; }

    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "Lab not found" }); return; }

    const linkRequests: any[] = lab.linkRequests ?? [];
    if (!linkRequests.some((r) => r.fromClinicId === fromClinicId)) {
      res.status(400).json({ error: "No matching pending link request." });
      return;
    }

    const updated = {
      ...lab,
      clinicIds: [...new Set([...(lab.clinicIds ?? []), fromClinicId])],
      affiliation: lab.affiliation ?? ("linked" as const),
      linkRequests: linkRequests.filter((r) => r.fromClinicId !== fromClinicId),
    };
    await labServicesContainer.items.upsert(updated);
    res.json({ status: "OK", lab: updated });
  } catch (err) {
    console.error("Lab clinic-link-requests accept error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/clinic-link-requests/reject ───────────────────────────────
router.post("/clinic-link-requests/reject", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { fromClinicId } = req.body;
    if (!fromClinicId) { res.status(400).json({ error: "fromClinicId is required." }); return; }

    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "Lab not found" }); return; }

    const updated = { ...lab, linkRequests: (lab.linkRequests ?? []).filter((r: any) => r.fromClinicId !== fromClinicId) };
    await labServicesContainer.items.upsert(updated);
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Lab clinic-link-requests reject error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/my-tests ────────────────────────────────────────────────────
// Self-service test inventory for the authenticated lab. Named "my-tests"
// rather than reusing "tests" — that's the public catalogue route (mirrors
// pharmacy.ts's catalogue/products split).
router.get("/my-tests", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { resources } = await labTestsContainer.items.query({
      query: "SELECT * FROM c WHERE c.labId = @lid ORDER BY c.createdAt DESC",
      parameters: [{ name: "@lid", value: labId }],
    }, { partitionKey: labId }).fetchAll();
    res.json({ tests: resources });
  } catch (err) {
    console.error("Lab my-tests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/my-tests/:testId ────────────────────────────────────────────
router.get("/my-tests/:testId", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { testId } = req.params;
    const { resource } = await labTestsContainer.item(testId, labId).read();
    if (!resource || resource.labId !== labId) { res.status(404).json({ error: "Test not found" }); return; }
    res.json({ test: resource });
  } catch (err) {
    console.error("Lab my-test fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/my-tests ───────────────────────────────────────────────────
// Approval-gated exactly like pharmacy.ts's POST /products: an already-
// approved lab's new tests go straight live; a pending/rejected lab's tests
// wait for admin review.
router.post("/my-tests", requireRole("lab"), upload.single("image"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const {
      name, category, price, turnaround_hours, requires_fasting,
      requires_doctor_approval, homeVisitAvailable, description, recommendedFor,
      ageRange, targetGroups, normalValues, howItsDone, recommendedFrequency,
      patientInstructions,
    } = req.body;

    if (!name || !category || price == null) {
      res.status(400).json({ error: "name, category, and price are required" });
      return;
    }

    const { resource: labDoc } = await labServicesContainer.item(labId, labId).read();
    const isOnboarded = labDoc?.status === "approved";

    const now = new Date().toISOString();
    const testId = `${labId}_${Date.now()}`;
    const test = {
      id:                       testId,
      labId,
      labName:                  labDoc?.name ?? null,
      name,
      category,
      price:                    parseFloat(price),
      turnaround_hours:         turnaround_hours ?? null,
      requires_fasting:         requires_fasting === "true" || requires_fasting === true,
      requires_doctor_approval: requires_doctor_approval === "true" || requires_doctor_approval === true,
      homeVisitAvailable:       homeVisitAvailable === "true" || homeVisitAvailable === true,
      is_active:                true,
      description:              description ?? null,
      recommendedFor:           recommendedFor ?? null,
      ageRange:                 ageRange ?? null,
      targetGroups:             Array.isArray(targetGroups) ? targetGroups : [],
      normalValues:             Array.isArray(normalValues) ? normalValues : [],
      howItsDone:                howItsDone ?? null,
      recommendedFrequency:     recommendedFrequency ?? null,
      patientInstructions:      patientInstructions ?? null,
      status:                   isOnboarded ? "approved" : "pending_approval",
      flagged:                  false,
      flaggedAt:                null,
      flaggedBy:                null,
      flagReason:               null,
      createdAt:                now,
      approvedAt:               isOnboarded ? now : null,
      approvedBy:                null,
      rejectedAt:                null,
      rejectedReason:            null,
    };

    await labTestsContainer.items.upsert(test);

    if (labDoc) {
      await labServicesContainer.items.upsert({ ...labDoc, totalTests: (labDoc.totalTests ?? 0) + 1 });
    }

    res.status(201).json({ status: "OK", test });
  } catch (err) {
    console.error("Lab create test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /api/lab/my-tests/:testId ────────────────────────────────────────────
router.put("/my-tests/:testId", requireRole("lab"), upload.single("image"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { testId } = req.params;
    const {
      name, category, price, turnaround_hours, requires_fasting,
      requires_doctor_approval, homeVisitAvailable, description, recommendedFor,
      ageRange, targetGroups, normalValues, howItsDone, recommendedFrequency,
      patientInstructions, is_active,
    } = req.body;

    const { resource: existing } = await labTestsContainer.item(testId, labId).read();
    if (!existing || existing.labId !== labId) { res.status(404).json({ error: "Test not found" }); return; }

    const { resource: labDoc } = await labServicesContainer.item(labId, labId).read();
    const isOnboarded = labDoc?.status === "approved";

    const updated = {
      ...existing,
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(turnaround_hours !== undefined && { turnaround_hours }),
      ...(requires_fasting !== undefined && { requires_fasting: requires_fasting === "true" || requires_fasting === true }),
      ...(requires_doctor_approval !== undefined && { requires_doctor_approval: requires_doctor_approval === "true" || requires_doctor_approval === true }),
      ...(homeVisitAvailable !== undefined && { homeVisitAvailable: homeVisitAvailable === "true" || homeVisitAvailable === true }),
      ...(description !== undefined && { description }),
      ...(recommendedFor !== undefined && { recommendedFor }),
      ...(ageRange !== undefined && { ageRange }),
      ...(targetGroups !== undefined && { targetGroups: Array.isArray(targetGroups) ? targetGroups : existing.targetGroups }),
      ...(normalValues !== undefined && { normalValues: Array.isArray(normalValues) ? normalValues : existing.normalValues }),
      ...(howItsDone !== undefined && { howItsDone }),
      ...(recommendedFrequency !== undefined && { recommendedFrequency }),
      ...(patientInstructions !== undefined && { patientInstructions }),
      ...(is_active !== undefined && { is_active: is_active === "true" || is_active === true }),
      status: isOnboarded ? "approved" : "pending_approval",
      rejectedAt: null,
      rejectedReason: null,
      updatedAt: new Date().toISOString(),
    };

    await labTestsContainer.items.upsert(updated);
    res.json({ status: "OK", test: updated });
  } catch (err) {
    console.error("Lab update test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/lab/my-tests/:testId ─────────────────────────────────────────
router.delete("/my-tests/:testId", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { testId } = req.params;
    await labTestsContainer.item(testId, labId).delete();
    res.json({ status: "OK" });
  } catch (err) {
    console.error("Lab delete test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/my-bookings ──────────────────────────────────────────────────
// Returns all bookings that contain at least one item belonging to this lab.
// labBookings is partitioned by /patientId so this must be cross-partition.
router.get("/my-bookings", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { resources } = await labBookingsContainer.items.query(
      {
        query: "SELECT * FROM c WHERE EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.labId = @lid) ORDER BY c.createdAt DESC",
        parameters: [{ name: "@lid", value: labId }],
      },
      { maxItemCount: 100 }
    ).fetchAll();

    res.json({ bookings: resources });
  } catch (err) {
    console.error("Lab bookings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/tests/:testId ───────────────────────────────────────────────
router.get("/tests/:testId", async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const { resources } = await labTestsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')",
      parameters: [{ name: "@id", value: testId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Test not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get lab test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/bookings ───────────────────────────────────────────────────
// Patient creates a lab booking. Payment is mocked.
router.post("/bookings", requireRole("patient"), requireFeature("lab_booking"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const {
      items,              // [{ testId, patientId (family), visitMode, scheduledAt }]
      consultationDate,   // optional — only when requires_doctor_approval tests in cart
      consultationSlot,
      notes,
    } = req.body;

    if (!items?.length) {
      res.status(400).json({ error: "items is required" });
      return;
    }

    const now = new Date().toISOString();
    const bookingId = uuidv4();

    // Validate all test IDs exist and compute total
    let total_amount = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const { resources } = await labTestsContainer.items.query({
        query: "SELECT * FROM c WHERE c.id = @id AND c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')",
        parameters: [{ name: "@id", value: item.testId }],
      }).fetchAll();

      if (!resources.length) {
        res.status(400).json({ error: `Test ${item.testId} not found or inactive` });
        return;
      }

      const test = resources[0];
      validatedItems.push({
        testId:        test.id,
        testName:      test.name,
        category:      test.category,
        labId:         test.labId,
        labName:       test.labName,
        price:         test.price,
        forPatientId:  item.forPatientId ?? patientId,
        visitMode:     item.visitMode ?? "Laboratory",
        scheduledAt:   item.scheduledAt ?? null,
        requires_doctor_approval: test.requires_doctor_approval,
      });
      total_amount += test.price;
    }

    const booking = {
      id:                bookingId,
      patientId,
      items:             validatedItems,
      consultationDate:  consultationDate ?? null,
      consultationSlot:  consultationSlot ?? null,
      notes:             notes ?? null,
      status:            "confirmed",
      payment_status:    "paid",
      payment_amount:    total_amount,
      createdAt:         now,
      updatedAt:         now,
    };

    await labBookingsContainer.items.upsert(booking);

    const testNames = validatedItems.map((i: any) => i.testName).join(", ");
    logActivity({
      source: "patient",
      action: "Lab Test Booked",
      details: `Lab booking AED ${total_amount.toFixed(2)} — ${testNames}`,
      performedBy: "Patient",
      performedById: patientId,
      entityType: "labBooking",
      entityId: bookingId,
    });

    res.status(201).json({ status: "OK", booking });
  } catch (err) {
    console.error("Create lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/bookings ────────────────────────────────────────────────────
// Optional ?profileId= filters to bookings that include at least one item for
// that specific profile (account owner or a family member) — matches the same
// active-profile scoping used for appointments.
router.get("/bookings", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : null;
    let query = "SELECT * FROM c WHERE c.patientId = @pid";
    const parameters: any[] = [{ name: "@pid", value: patientId }];
    if (profileId) {
      query += " AND EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.forPatientId = @profileId)";
      parameters.push({ name: "@profileId", value: profileId });
    }
    query += " ORDER BY c.createdAt DESC";
    const { resources } = await labBookingsContainer.items.query({
      query,
      parameters,
    }, { partitionKey: patientId }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get lab bookings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/bookings/:bookingId ─────────────────────────────────────────
router.get("/bookings/:bookingId", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { resources } = await labBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
      parameters: [{ name: "@id", value: bookingId }, { name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(resources[0]);
  } catch (err) {
    console.error("Get lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/lab/bookings/:bookingId/cancel ────────────────────────────────
router.patch("/bookings/:bookingId/cancel", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { resources } = await labBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.patientId = @pid",
      parameters: [{ name: "@id", value: bookingId }, { name: "@pid", value: patientId }],
    }, { partitionKey: patientId }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }
    const booking = resources[0];
    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking already cancelled" }); return;
    }
    const updated = { ...booking, status: "cancelled", updatedAt: new Date().toISOString() };
    await labBookingsContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Cancel lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/lab/bookings/:bookingId/status ────────────────────────────────
// A lab (not the patient) moves a booking through its own fulfillment
// stages — mirrors pharmacy.ts's PATCH /orders/:orderId/status.
router.patch("/bookings/:bookingId/status", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { status } = req.body;

    const allowed = ["awaiting", "confirmed", "analyzing", "results", "cancelled"];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
      return;
    }

    const { resources } = await labBookingsContainer.items.query(
      {
        query: "SELECT * FROM c WHERE c.id = @id AND EXISTS(SELECT VALUE i FROM i IN c.items WHERE i.labId = @lid)",
        parameters: [{ name: "@id", value: bookingId }, { name: "@lid", value: labId }],
      },
      { maxItemCount: 1 }
    ).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }

    const booking = resources[0];
    const updated = { ...booking, status, updatedAt: new Date().toISOString() };
    await labBookingsContainer.items.upsert(updated);
    res.json(updated);
  } catch (err) {
    console.error("Update booking status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/lab/notifications ────────────────────────────────────────────
// Persists the lab's notification preferences — mirrors pharmacy.ts's
// PATCH /notifications.
router.patch("/notifications", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  const labId = req.session!.getUserId();
  const { preferences } = req.body;

  try {
    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "Lab not found." }); return; }

    const updated = {
      ...lab,
      notificationPreferences: {
        ...(lab.notificationPreferences ?? {}),
        ...(preferences ?? {}),
      },
      updatedAt: new Date().toISOString(),
    };

    await labServicesContainer.items.upsert(updated);
    res.json({ status: "OK", notificationPreferences: updated.notificationPreferences });
  } catch (err) {
    console.error("Lab notifications update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/change-password ───────────────────────────────────────────
router.post("/change-password", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  const labId = req.session!.getUserId();
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "PASSWORD_TOO_SHORT" });
    return;
  }

  try {
    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "USER_NOT_FOUND" }); return; }

    const signInResult = await EmailPassword.signIn("public", lab.email, currentPassword);
    if (signInResult.status !== "OK") {
      res.status(403).json({ error: "WRONG_PASSWORD" });
      return;
    }

    const tokenResult = await EmailPassword.createResetPasswordToken("public", labId, lab.email);
    if (tokenResult.status !== "OK") { res.status(500).json({ error: "RESET_TOKEN_FAILED" }); return; }

    const resetResult = await EmailPassword.resetPasswordUsingToken("public", tokenResult.token, newPassword);
    if (resetResult.status !== "OK") { res.status(500).json({ error: "RESET_FAILED" }); return; }

    res.json({ status: "OK" });
  } catch (err) {
    console.error("Lab change-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/2fa/status ──────────────────────────────────────────────────
router.get("/2fa/status", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  const labId = req.session!.getUserId();
  try {
    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    res.json({ twoFactorEnabled: lab?.twoFactorEnabled === true });
  } catch (err) {
    console.error("Lab 2FA status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/lab/2fa/enable ──────────────────────────────────────────────────
router.post("/2fa/enable", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  const labId = req.session!.getUserId();
  try {
    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "Lab not found." }); return; }
    await labServicesContainer.items.upsert({ ...lab, twoFactorEnabled: true, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", twoFactorEnabled: true });
  } catch (err) {
    console.error("Lab 2FA enable error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/lab/2fa/disable ─────────────────────────────────────────────────
router.post("/2fa/disable", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  const labId = req.session!.getUserId();
  try {
    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "Lab not found." }); return; }
    await labServicesContainer.items.upsert({ ...lab, twoFactorEnabled: false, updatedAt: new Date().toISOString() });
    res.json({ status: "OK", twoFactorEnabled: false });
  } catch (err) {
    console.error("Lab 2FA disable error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
