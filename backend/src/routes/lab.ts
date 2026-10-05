import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import UserRoles from "supertokens-node/recipe/userroles";
import multer from "multer";
import { requireRole } from "../middleware/requireRole";
import { requireFeature } from "../middleware/requireFeature";
import { labServicesContainer, labTestsContainer, labBookingsContainer, vaccinesContainer, vaccinationBookingsContainer, doctorsContainer, patientsContainer, labTestCatalogContainer } from "../config/cosmos";
import { catalogOwnedFields } from "./adminLabCatalog";
import { updateLabBookingWithRetry, LabBookingWriteNotAuthorizedError, LabBookingAlreadyHandledError } from "../utils/labBookingWrite";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";
import { resolveClinicName } from "./clinicInsurance";
import { resolveOrgId, resolveOrgIdForRegistration, resolveOrgIdFromHeader, getLabIdsForOrg } from "../utils/orgScope";
import { resolveCurrencyForOrgId, formatCurrencyText } from "../utils/currency";
import { buildInClause } from "../utils/clinicScope";

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
    const { category, labId, clinicId, catalogTestId, unlinked } = req.query as { category?: string; labId?: string; clinicId?: string; catalogTestId?: string; unlinked?: string };
    // Legacy-safe: test docs created before the approval workflow existed have
    // no `status` field at all — treat those as approved, same pattern used
    // for pharmacyProducts.inStock everywhere else in this codebase.
    let query = "SELECT * FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved')";
    const parameters: any[] = [];

    // Scope to this brand's own labs, mirroring the medicine catalogue. A
    // brand with no approved lab of its own sees no tests rather than the
    // whole platform's. The clinicId and labId filters below then narrow
    // within that set — they never widen past it.
    const orgSlug = typeof req.headers["x-org-slug"] === "string" ? req.headers["x-org-slug"] : undefined;
    const orgId = await resolveOrgIdFromHeader(orgSlug);
    const orgLabIds = await getLabIdsForOrg(orgId);

    if (orgLabIds.length === 0) {
      res.json([]);
      return;
    }

    const { clause: orgClause, parameters: orgParams } = buildInClause("c.labId", orgLabIds);
    query += ` AND ${orgClause}`;
    parameters.push(...orgParams);

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

    // Intersected with the org scope above, so another brand's labId yields
    // nothing rather than leaking their tests.
    if (labId) {
      if (!orgLabIds.includes(labId)) {
        res.json([]);
        return;
      }
      query += " AND c.labId = @labId";
      parameters.push({ name: "@labId", value: labId });
    }
    if (category) {
      query += " AND LOWER(c.category) = LOWER(@cat)";
      parameters.push({ name: "@cat", value: category });
    }
    // ?catalogTestId= — every lab offering one catalog test (the patient
    // app's "pick a lab" step). ?unlinked=true — only standalone custom tests
    // that aren't part of any catalog group.
    if (catalogTestId) {
      query += " AND c.catalogTestId = @catalogTestId";
      parameters.push({ name: "@catalogTestId", value: catalogTestId });
    } else if (unlinked === "true") {
      query += " AND (NOT IS_DEFINED(c.catalogTestId) OR c.catalogTestId = null)";
    }
    query += " ORDER BY c.createdAt DESC";
    const { resources } = await labTestsContainer.items.query({ query, parameters }).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error("Get lab tests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/catalog ─────────────────────────────────────────────────────
// Public: catalog tests that at least one approved, active lab in this brand's
// org actually offers, with the cheapest price and how many labs offer it.
// Scoped the same way as GET /tests so the two always agree.
router.get("/catalog", async (req: Request, res: Response) => {
  try {
    const orgSlug = typeof req.headers["x-org-slug"] === "string" ? req.headers["x-org-slug"] : undefined;
    const orgId = await resolveOrgIdFromHeader(orgSlug);
    const orgLabIds = await getLabIdsForOrg(orgId);
    if (orgLabIds.length === 0) { res.json([]); return; }

    const { clause, parameters } = buildInClause("c.labId", orgLabIds);
    const { resources: tests } = await labTestsContainer.items.query({
      query: `SELECT c.catalogTestId, c.price, c.labId FROM c WHERE c.is_active = true AND (NOT IS_DEFINED(c.status) OR c.status = 'approved') AND IS_DEFINED(c.catalogTestId) AND c.catalogTestId != null AND ${clause}`,
      parameters,
    }).fetchAll();

    const stats = new Map<string, { minPrice: number; labs: Set<string> }>();
    tests.forEach((t: any) => {
      const s = stats.get(t.catalogTestId) ?? { minPrice: Infinity, labs: new Set<string>() };
      s.minPrice = Math.min(s.minPrice, t.price);
      s.labs.add(t.labId);
      stats.set(t.catalogTestId, s);
    });
    if (stats.size === 0) { res.json([]); return; }

    const { resources: catalog } = await labTestCatalogContainer.items
      .query({ query: "SELECT * FROM c WHERE c.is_active = true ORDER BY c.name ASC" })
      .fetchAll();

    res.json(
      catalog
        .filter((c: any) => stats.has(c.id))
        .map((c: any) => ({ ...c, minPrice: stats.get(c.id)!.minPrice, labCount: stats.get(c.id)!.labs.size }))
    );
  } catch (err) {
    console.error("Get lab catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/catalog-tests ───────────────────────────────────────────────
// Lab-side picker: every active catalog test the lab can choose to offer.
router.get("/catalog-tests", requireRole("lab"), async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await labTestCatalogContainer.items
      .query({ query: "SELECT * FROM c WHERE c.is_active = true ORDER BY c.name ASC" })
      .fetchAll();
    res.json({ tests: resources });
  } catch (err) {
    console.error("Get catalog tests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/labs ─────────────────────────────────────────────────────────
// Public — lists approved labs that carry at least one orderable test, for the
// patient app's "browse by lab" screen. Mirrors GET /api/pharmacy/pharmacies.
router.get("/labs", async (req: Request, res: Response) => {
  try {
    // Scoped the same way as GET /tests above — the two screens have to agree,
    // or a patient taps a lab card and lands on an empty test list.
    const orgSlug = typeof req.headers["x-org-slug"] === "string" ? req.headers["x-org-slug"] : undefined;
    const orgId = await resolveOrgIdFromHeader(orgSlug);

    const { resources: labs } = await labServicesContainer.items.query({
      query: "SELECT * FROM c WHERE c.status = 'approved' AND c.tenantId = @orgId",
      parameters: [{ name: "@orgId", value: orgId }],
    }).fetchAll();

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
    // Which white-label org this lab belongs to — the portal it registered
    // through sends its slug on this header, exactly as pharmacy.ts does.
    // Absent or unknown resolves to the platform default.
    const orgSlug = typeof req.headers["x-org-slug"] === "string" ? req.headers["x-org-slug"] : undefined;
    const tenantId = await resolveOrgIdForRegistration(orgSlug);

    const labDoc = {
      id:             supertokensId,
      supertokens_id: supertokensId,
      status:         "pending_approval" as const,
      tenantId,
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
      patientInstructions, catalogTestId,
    } = req.body;

    // A test picked from the admin catalog takes its name/category/approval
    // flag/etc. from the catalog doc — the lab only supplies price, turnaround
    // and home-visit. No catalogTestId means a custom test, as before.
    let catalog: any = null;
    if (catalogTestId) {
      const { resource } = await labTestCatalogContainer.item(catalogTestId, catalogTestId).read();
      if (!resource || !resource.is_active) { res.status(404).json({ error: "Catalog test not found" }); return; }
      catalog = resource;

      const { resources: dupes } = await labTestsContainer.items.query({
        query: "SELECT c.id FROM c WHERE c.labId = @labId AND c.catalogTestId = @cid",
        parameters: [{ name: "@labId", value: labId }, { name: "@cid", value: catalogTestId }],
      }, { partitionKey: labId }).fetchAll();
      if (dupes.length) { res.status(409).json({ error: "You already offer this test." }); return; }
    }

    if ((!catalog && (!name || !category)) || price == null) {
      res.status(400).json({ error: catalog ? "price is required" : "name, category, and price are required" });
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
      catalogTestId:            catalog ? catalog.id : null,
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
      ...(catalog ? catalogOwnedFields(catalog) : {}),
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
      // Tests linked to a catalog test keep the catalog's wording and its
      // approval/fasting flags — only price, turnaround, home visit and
      // is_active are the lab's to change.
      ...(existing.catalogTestId && {
        name: existing.name,
        category: existing.category,
        description: existing.description,
        requires_fasting: existing.requires_fasting,
        requires_doctor_approval: existing.requires_doctor_approval,
        recommendedFor: existing.recommendedFor,
        howItsDone: existing.howItsDone,
        patientInstructions: existing.patientInstructions,
      }),
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
      profileId,          // fallback owner when an item doesn't set its own forPatientId
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
        forPatientId:  item.forPatientId ?? profileId ?? patientId,
        visitMode:     item.visitMode ?? "Laboratory",
        scheduledAt:   item.scheduledAt ?? null,
        requires_doctor_approval: test.requires_doctor_approval,
      });
      total_amount += test.price;
    }

    // A test flagged requires_doctor_approval needs a clinic-assigned doctor
    // to sign off before it's actually confirmed — see POST/PATCH
    // /bookings/:bookingId/approve|reject below. Everything else keeps the
    // old behavior of going straight to "confirmed".
    const needsDoctorApproval = validatedItems.some(i => i.requires_doctor_approval);

    const booking = {
      id:                bookingId,
      patientId,
      items:             validatedItems,
      consultationDate:  consultationDate ?? null,
      consultationSlot:  consultationSlot ?? null,
      notes:             notes ?? null,
      status:            needsDoctorApproval ? "pending_doctor_approval" : "confirmed",
      payment_status:    "paid",
      payment_amount:    total_amount,
      createdAt:         now,
      updatedAt:         now,
    };

    await labBookingsContainer.items.upsert(booking);

    const testNames = validatedItems.map((i: any) => i.testName).join(", ");
    const labCurrency = await resolveCurrencyForOrgId(await resolveOrgId(req));
    logActivity({
      source: "patient",
      action: "Lab Test Booked",
      details: `Lab booking ${formatCurrencyText(total_amount, labCurrency)} — ${testNames}`,
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

// Best-effort join used by the two patient-facing reads below: once a
// booking has been approved, attach the reviewing doctor's name so the
// patient app can show who approved it instead of just a doctor id. Never
// fails the request if a lookup comes up empty — the booking itself is
// still valid without it.
async function withAssignedDoctorNames(bookings: any[]): Promise<any[]> {
  const doctorIds = Array.from(new Set(bookings.map(b => b.approvedBy).filter(Boolean)));
  if (doctorIds.length === 0) return bookings;

  const names = new Map<string, string>();
  await Promise.all(doctorIds.map(async (id) => {
    try {
      const { resource: doctor } = await doctorsContainer.item(id, id).read();
      if (doctor?.fullName) names.set(id, doctor.fullName);
    } catch {
      // lookup failed — leave this booking without a resolved name
    }
  }));

  return bookings.map(b => b.approvedBy && names.has(b.approvedBy)
    ? { ...b, assignedDoctorName: names.get(b.approvedBy) }
    : b);
}

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
    res.json(await withAssignedDoctorNames(resources));
  } catch (err) {
    console.error("Get lab bookings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Labs (clinic-owned, for now) this doctor has been assigned to by their
// clinic — see PUT /api/clinics/labs/assigned-doctors. Cross-partition
// (labServicesContainer is keyed by /id), but cheap at this scale: the
// number of labs on the platform is nowhere near appointment/booking volume.
async function getAssignedLabIds(doctorId: string): Promise<string[]> {
  const { resources } = await labServicesContainer.items.query({
    query: "SELECT c.id FROM c WHERE ARRAY_CONTAINS(c.assignedDoctorIds, @doctorId)",
    parameters: [{ name: "@doctorId", value: doctorId }],
  }).fetchAll();
  return resources.map((r: any) => r.id);
}

// ─── GET /api/lab/bookings/pending-approval ───────────────────────────────────
// The shared claim queue for a doctor assigned to one or more labs: every
// booking awaiting doctor sign-off on any of those labs. Any assigned doctor
// can see and act on any of these — first to approve/reject wins (see
// POST .../approve and .../reject below). Registered BEFORE
// GET /bookings/:bookingId — that route's :bookingId param would otherwise
// swallow this literal path first, since Express matches in registration
// order and "pending-approval" matches :bookingId just fine syntactically.
router.get("/bookings/pending-approval", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const doctorId = req.session!.getUserId();
    const labIds = await getAssignedLabIds(doctorId);
    if (labIds.length === 0) { res.json([]); return; }

    const { resources } = await labBookingsContainer.items.query({
      query: "SELECT * FROM c WHERE c.status = 'pending_doctor_approval' AND EXISTS(SELECT VALUE i FROM i IN c.items WHERE ARRAY_CONTAINS(@labIds, i.labId)) ORDER BY c.createdAt ASC",
      parameters: [{ name: "@labIds", value: labIds }],
    }).fetchAll();

    // Best-effort join so the doctor sees a real patient name, not a raw id.
    const patientIds = Array.from(new Set(resources.map((b: any) => b.patientId)));
    const names = new Map<string, string>();
    await Promise.all(patientIds.map(async (id) => {
      try {
        const { resource: patient } = await patientsContainer.item(id, id).read();
        if (patient?.fullName) names.set(id, patient.fullName);
      } catch {
        // lookup failed — leave this booking without a resolved name
      }
    }));
    const withNames = resources.map((b: any) => ({ ...b, patientName: names.get(b.patientId) ?? "Patient" }));

    res.json(withNames);
  } catch (err) {
    console.error("Get pending lab approvals error:", err);
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
    const [booking] = await withAssignedDoctorNames(resources);
    res.json(booking);
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

// Shared by approve/reject below: locates a booking this doctor is actually
// allowed to act on (cross-partition, same shape as PATCH .../status above —
// a doctor, like a lab, doesn't know the booking's patientId up front) and
// applies computeUpdate through the ETag-guarded retry helper so two
// doctors racing on the same booking can't silently overwrite each other.
async function reviewBooking(
  doctorId: string,
  bookingId: string,
  computeUpdate: (booking: any) => any
): Promise<any> {
  const labIds = await getAssignedLabIds(doctorId);
  if (labIds.length === 0) throw new LabBookingWriteNotAuthorizedError("You aren't assigned to any labs.");

  const { resources } = await labBookingsContainer.items.query({
    query: "SELECT * FROM c WHERE c.id = @id AND EXISTS(SELECT VALUE i FROM i IN c.items WHERE ARRAY_CONTAINS(@labIds, i.labId))",
    parameters: [{ name: "@id", value: bookingId }, { name: "@labIds", value: labIds }],
  }, { maxItemCount: 1 }).fetchAll();

  if (!resources.length) return null;
  const { patientId } = resources[0];

  return updateLabBookingWithRetry(bookingId, patientId, (booking) => {
    if (booking.status !== "pending_doctor_approval") throw new LabBookingAlreadyHandledError();
    return computeUpdate(booking);
  });
}

// ─── POST /api/lab/bookings/:bookingId/approve ────────────────────────────────
router.post("/bookings/:bookingId/approve", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const doctorId = req.session!.getUserId();
    const { bookingId } = req.params;
    const now = new Date().toISOString();

    const updated = await reviewBooking(doctorId, bookingId, (booking) => ({
      ...booking,
      status: "confirmed",
      approvedBy: doctorId,
      approvedAt: now,
      updatedAt: now,
    }));

    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    if (err instanceof LabBookingWriteNotAuthorizedError) { res.status(403).json({ error: err.message }); return; }
    if (err instanceof LabBookingAlreadyHandledError) { res.status(409).json({ error: err.message }); return; }
    console.error("Approve lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/lab/bookings/:bookingId/reject ─────────────────────────────────
router.post("/bookings/:bookingId/reject", requireRole("doctor"), async (req: SessionRequest, res: Response) => {
  try {
    const doctorId = req.session!.getUserId();
    const { bookingId } = req.params;
    const { reason } = req.body;
    const now = new Date().toISOString();

    const updated = await reviewBooking(doctorId, bookingId, (booking) => ({
      ...booking,
      status: "cancelled",
      rejectedBy: doctorId,
      rejectedReason: typeof reason === "string" ? reason.slice(0, 500) : "",
      rejectedAt: now,
      updatedAt: now,
    }));

    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    if (err instanceof LabBookingWriteNotAuthorizedError) { res.status(403).json({ error: err.message }); return; }
    if (err instanceof LabBookingAlreadyHandledError) { res.status(409).json({ error: err.message }); return; }
    console.error("Reject lab booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/vaccines ────────────────────────────────────────────────────
// The vaccine catalogue as the lab sees it. Vaccines are an admin-owned global
// catalogue with no owning lab (unlike labTests, which carry a labId), so every
// lab sees the same list — this is a read-only reference view so the lab knows
// what patients can book.
router.get("/vaccines", requireRole("lab"), async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await vaccinesContainer.items.query({
      query: "SELECT * FROM c WHERE c.is_active = true ORDER BY c.name ASC",
    }).fetchAll();
    res.json({ vaccines: resources });
  } catch (err) {
    console.error("Lab vaccines error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/lab/vaccination-bookings ────────────────────────────────────────
// Because no vaccine carries a labId there is nothing to scope a booking to a
// particular lab, so this is a SHARED queue: every lab sees every vaccination
// booking, and whichever lab acts on one first claims it (see the approve/
// reject routes below, which stamp approvedByLabId/rejectedByLabId).
// vaccinationBookings is partitioned by /patientId so this is cross-partition.
router.get("/vaccination-bookings", requireRole("lab"), async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await vaccinationBookingsContainer.items.query(
      { query: "SELECT * FROM c ORDER BY c.createdAt DESC" },
      { maxItemCount: 100 }
    ).fetchAll();
    res.json({ bookings: resources });
  } catch (err) {
    console.error("Lab vaccination bookings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Shared by the approve and reject routes below. Bookings created before this
// workflow existed have status "confirmed" and no approval fields; treat those
// as still actionable so the existing backlog can be worked through.
const VACCINATION_ACTIONABLE = ["pending_approval", "confirmed"];

// ─── PATCH /api/lab/vaccination-bookings/:bookingId/approve ───────────────────
router.patch("/vaccination-bookings/:bookingId/approve", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { bookingId } = req.params;

    const { resources } = await vaccinationBookingsContainer.items.query(
      {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: bookingId }],
      },
      { maxItemCount: 1 }
    ).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }

    const booking = resources[0];
    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking was cancelled by the patient." });
      return;
    }
    if (!VACCINATION_ACTIONABLE.includes(booking.status)) {
      // Another lab already decided this one — surface that rather than
      // silently overwriting their decision.
      res.status(409).json({ error: `Booking already ${booking.status}.` });
      return;
    }

    const now = new Date().toISOString();
    const labDoc = await labServicesContainer.item(labId, labId).read().catch(() => ({ resource: null as any }));
    const updated = {
      ...booking,
      status: "approved",
      approvedAt: now,
      approvedByLabId: labId,
      approvedByLabName: labDoc.resource?.name ?? null,
      rejectedAt: null,
      rejectedByLabId: null,
      rejectedReason: null,
      updatedAt: now,
    };
    await vaccinationBookingsContainer.items.upsert(updated);

    logActivity({
      source: "lab",
      action: "Vaccination Approved",
      details: `Vaccination booking ${bookingId.slice(0, 8)} approved`,
      performedBy: labDoc.resource?.name ?? "Lab",
      performedById: labId,
      entityType: "vaccinationBooking",
      entityId: bookingId,
    });

    res.json(updated);
  } catch (err) {
    console.error("Approve vaccination booking error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/lab/vaccination-bookings/:bookingId/reject ────────────────────
// A reason is required — it is shown to the patient verbatim on the booking
// details screen, so "rejected" is never a dead end they can't act on.
router.patch("/vaccination-bookings/:bookingId/reject", requireRole("lab"), async (req: SessionRequest, res: Response) => {
  try {
    const labId = req.session!.getUserId();
    const { bookingId } = req.params;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!reason) {
      res.status(400).json({ error: "A rejection reason is required." });
      return;
    }

    const { resources } = await vaccinationBookingsContainer.items.query(
      {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: bookingId }],
      },
      { maxItemCount: 1 }
    ).fetchAll();

    if (!resources.length) { res.status(404).json({ error: "Booking not found" }); return; }

    const booking = resources[0];
    if (booking.status === "cancelled") {
      res.status(400).json({ error: "Booking was cancelled by the patient." });
      return;
    }
    if (!VACCINATION_ACTIONABLE.includes(booking.status)) {
      res.status(409).json({ error: `Booking already ${booking.status}.` });
      return;
    }

    const now = new Date().toISOString();
    const labDoc = await labServicesContainer.item(labId, labId).read().catch(() => ({ resource: null as any }));
    const updated = {
      ...booking,
      status: "rejected",
      rejectedAt: now,
      rejectedByLabId: labId,
      rejectedByLabName: labDoc.resource?.name ?? null,
      rejectedReason: reason,
      approvedAt: null,
      approvedByLabId: null,
      updatedAt: now,
    };
    await vaccinationBookingsContainer.items.upsert(updated);

    logActivity({
      source: "lab",
      action: "Vaccination Rejected",
      details: `Vaccination booking ${bookingId.slice(0, 8)} rejected — ${reason}`,
      performedBy: labDoc.resource?.name ?? "Lab",
      performedById: labId,
      entityType: "vaccinationBooking",
      entityId: bookingId,
    });

    res.json(updated);
  } catch (err) {
    console.error("Reject vaccination booking error:", err);
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
