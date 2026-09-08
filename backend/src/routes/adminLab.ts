import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import UserRoles from "supertokens-node/recipe/userroles";
import { requireRole } from "../middleware/requireRole";
import { labServicesContainer, labTestsContainer } from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";
import { logActivity } from "../utils/activityLogger";

const router = Router();
router.use(requireRole("admin"));

// ─── POST /api/admin/lab ──────────────────────────────────────────────────────
router.post("/", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const {
      name, email, contactNumber, location, director, manager,
      labLicense, healthAuthorityLicense, accreditationNumber,
      operatingHours, website, description, specializations,
    } = req.body;

    if (!name || !email || !contactNumber || !location) {
      res.status(400).json({ error: "name, email, contactNumber, and location are required" });
      return;
    }

    const now = new Date().toISOString();
    const labId = uuidv4();

    const lab = {
      id: labId,
      name, email, contactNumber, location, director, manager,
      labLicense:              labLicense ?? null,
      healthAuthorityLicense:  healthAuthorityLicense ?? null,
      accreditationNumber:     accreditationNumber ?? null,
      operatingHours:          operatingHours ?? null,
      website:                 website ?? null,
      description:             description ?? null,
      specializations:         Array.isArray(specializations) ? specializations : [],
      status:                  "approved",
      supertokens_id:          null,   // no ST account — admin-created
      clinicIds:               [],
      affiliation:             null,
      linkRequests:            [],
      createdAt:               now,
      approvedAt:              now,
      approvedBy:              adminId,
      totalTests:              0,
      rating:                  0,
    };

    await labServicesContainer.items.upsert(lab);
    res.status(201).json({ status: "OK", lab });
  } catch (err) {
    console.error("Admin create lab error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/lab/:labId/tests ─────────────────────────────────────────
router.post("/:labId/tests", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const { labId } = req.params;
    const {
      name, category, price, turnaround_hours, requires_fasting,
      requires_doctor_approval, homeVisitAvailable, description, recommendedFor, ageRange,
      targetGroups, normalValues, howItsDone, recommendedFrequency,
      patientInstructions,
    } = req.body;

    if (!name || !category || price == null) {
      res.status(400).json({ error: "name, category, and price are required" });
      return;
    }

    // Verify lab exists
    const { resources: labs } = await labServicesContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: labId }],
    }).fetchAll();

    if (!labs.length) {
      res.status(404).json({ error: "Lab not found" });
      return;
    }

    const now = new Date().toISOString();
    const testId = uuidv4();

    const test = {
      id: testId,
      labId,
      labName: labs[0].name,
      name,
      category,
      price:                    parseFloat(price),
      turnaround_hours:         turnaround_hours ?? null,
      requires_fasting:         Boolean(requires_fasting),
      requires_doctor_approval: Boolean(requires_doctor_approval),
      homeVisitAvailable:       Boolean(homeVisitAvailable),
      is_active:                true,
      status:                   "approved",
      description:              description ?? null,
      recommendedFor:           recommendedFor ?? null,
      ageRange:                 ageRange ?? null,
      targetGroups:             Array.isArray(targetGroups) ? targetGroups : [],
      normalValues:             Array.isArray(normalValues) ? normalValues : [],
      howItsDone:               howItsDone ?? null,
      recommendedFrequency:     recommendedFrequency ?? null,
      patientInstructions:      patientInstructions ?? null,
      createdAt:                now,
      addedBy:                  adminId,
    };

    await labTestsContainer.items.upsert(test);

    // Increment totalTests count on the lab
    const updatedLab = { ...labs[0], totalTests: (labs[0].totalTests ?? 0) + 1 };
    await labServicesContainer.items.upsert(updatedLab);

    res.status(201).json({ status: "OK", test });
  } catch (err) {
    console.error("Admin add lab test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/lab ───────────────────────────────────────────────────────
router.get("/", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await labServicesContainer.items.query(
      "SELECT * FROM c ORDER BY c.createdAt DESC"
    ).fetchAll();
    res.json({ labs: resources });
  } catch (err) {
    console.error("Admin get labs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/lab/pending ───────────────────────────────────────────────
// Must be registered before GET /:labId — otherwise Express matches the
// param route first and treats "pending" as a labId, returning 404 instead
// of ever reaching this handler.
router.get("/pending", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await labServicesContainer.items.query(
      { query: "SELECT * FROM c WHERE c.status = 'pending_approval' ORDER BY c.registeredAt DESC" }
    ).fetchAll();
    res.json({ labs: resources });
  } catch (err) {
    console.error("Admin lab pending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/lab/approved ─────────────────────────────────────────────
router.get("/approved", async (_req: SessionRequest, res: Response) => {
  try {
    const { resources } = await labServicesContainer.items.query(
      { query: "SELECT * FROM c WHERE c.status = 'approved' ORDER BY c.approvedAt DESC" }
    ).fetchAll();
    res.json({ labs: resources });
  } catch (err) {
    console.error("Admin lab approved error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/lab/:labId ────────────────────────────────────────────────
router.get("/:labId", async (req: SessionRequest, res: Response) => {
  try {
    const { labId } = req.params;
    const { resources } = await labServicesContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: labId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Lab not found" }); return; }
    res.json({ lab: resources[0] });
  } catch (err) {
    console.error("Admin get lab error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/admin/lab/:labId/tests ─────────────────────────────────────────
router.get("/:labId/tests", async (req: SessionRequest, res: Response) => {
  try {
    const { labId } = req.params;
    const { resources } = await labTestsContainer.items.query({
      query: "SELECT * FROM c WHERE c.labId = @labId ORDER BY c.createdAt DESC",
      parameters: [{ name: "@labId", value: labId }],
    }).fetchAll();
    res.json({ tests: resources });
  } catch (err) {
    console.error("Admin get lab tests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/admin/lab/tests/:testId/toggle ────────────────────────────────
router.patch("/tests/:testId/toggle", async (_req: SessionRequest, res: Response) => {
  try {
    const { testId } = _req.params;
    const { resources } = await labTestsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: testId }],
    }).fetchAll();
    if (!resources.length) { res.status(404).json({ error: "Test not found" }); return; }
    const test = resources[0];
    const updated = { ...test, is_active: !test.is_active, updatedAt: new Date().toISOString() };
    await labTestsContainer.items.upsert(updated);
    res.json({ status: "OK", test: updated });
  } catch (err) {
    console.error("Admin toggle lab test error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/lab/:labId/approve ──────────────────────────────────────
router.post("/:labId/approve", async (req: SessionRequest, res: Response) => {
  try {
    const adminId = req.session!.getUserId();
    const { labId } = req.params;

    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "Lab not found" }); return; }

    await UserRoles.removeUserRole("public", labId, "lab_pending");
    await UserRoles.addRoleToUser("public", labId, "lab");

    const updated = {
      ...lab,
      status:     "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: adminId,
    };
    await labServicesContainer.items.upsert(updated);

    logActivity({
      source: "admin",
      action: "Lab Approved",
      details: `${lab.name ?? labId} approved`,
      performedBy: "Admin",
      performedById: adminId,
      entityType: "lab",
      entityId: labId,
    });

    res.json({ status: "OK", lab: updated });
  } catch (err) {
    console.error("Lab approve error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/admin/lab/:labId/reject ───────────────────────────────────────
router.post("/:labId/reject", async (req: SessionRequest, res: Response) => {
  try {
    const { labId } = req.params;
    const { reason } = req.body;

    const { resource: lab } = await labServicesContainer.item(labId, labId).read();
    if (!lab) { res.status(404).json({ error: "Lab not found" }); return; }

    const updated = {
      ...lab,
      status:         "rejected",
      rejectedAt:     new Date().toISOString(),
      rejectedReason: reason || null,
    };
    await labServicesContainer.items.upsert(updated);
    res.json({ status: "OK", lab: updated });
  } catch (err) {
    console.error("Lab reject error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
