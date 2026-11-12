import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
const state = vi.hoisted(() => ({ apt: null as any, notifications: new Map<string, any>(), failNotification: false, conflict: false, push: vi.fn() }));
vi.mock("../../src/config/cosmos", () => ({
  appointmentsContainer: { item: () => ({ read: async () => ({ resource: state.apt ? structuredClone(state.apt) : undefined }), replace: async (doc: any, options: any) => {
    if (state.conflict) { state.conflict = false; state.apt.emr.medicines.push({ id: "concurrent", name: "Other addition" }); throw { code: 412 }; }
    if (options.accessCondition.condition !== state.apt._etag) throw { code: 412 };
    state.apt = { ...structuredClone(doc), _etag: String(Number(state.apt._etag) + 1) }; return { resource: state.apt };
  } }) },
  doctorsContainer: { item: () => ({ read: async () => ({ resource: { fullName: "Primary Doctor" } }) }) },
  notificationsContainer: { items: { create: async (doc: any) => { if (state.failNotification) throw Error("offline"); if (state.notifications.has(doc.id)) throw { code: 409 }; state.notifications.set(doc.id, doc); } } },
}));
vi.mock("../../src/utils/pushNotifications", () => ({ sendPushToUser: state.push }));
vi.mock("../../src/middleware/requireRole", () => ({ requireRole: () => (req: any, res: any, next: any) => { if (req.header("x-role") !== "doctor") return res.sendStatus(403); req.session = { getUserId: () => req.header("x-user") || "doctor-1" }; next(); } }));
import { addPrescriptionMedicines, getPrescriptionAdditionEligibility, deliverPrescriptionNotifications } from "../../src/utils/prescriptionAdditions";
import { completeAppointment, guardCompletedPrescription } from "../../src/utils/prescriptionPolicy";
import additionsRouter from "../../src/routes/prescriptionAdditions";
const server = express(); server.use(express.json()); server.use("/api/appointments", additionsRouter);
const now = Date.parse("2026-11-11T12:00:00Z");
const medicine = { name: "Medicine A", dosage: "10 mg", timing: "After food", frequency: "Once Daily", instructions: "As prescribed", durationDays: 5, quantity: 5 };
const payload = (requestId = "request-1") => ({ requestId, medicines: [medicine] });
const add = (body: any = payload(), doctor = "doctor-1") => addPrescriptionMedicines("apt-1", doctor, body);
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(now);
  state.notifications.clear(); state.failNotification = false; state.conflict = false; state.push.mockReset(); state.push.mockResolvedValue(true);
  state.apt = { id: "apt-1", patientId: "patient-1", doctorId: "doctor-1", status: "completed", visitType: "online", completedAt: "2026-11-11T11:00:00Z", recordingBlobPath: "keep", _etag: "1", emr: { medicines: [{ id: "old", name: "Existing", contributorDoctorId: "specialist-1" }], labs: [{ id: "lab" }], sections: { plan: "Keep notes" }, addenda: [] } };
});
describe("post-consultation prescription additions", () => {
  it("RX-REMOVE-001: primary doctor removes specialist medicine and retains audit and orders", async () => {
    state.apt.orders = [{ id: "order-1", medicineId: "old" }];
    await add({ requestId: "remove-001", removeMedicineIds: ["old"] });
    expect(state.apt.emr.medicines).toEqual([]);
    expect(state.apt.orders).toEqual([{ id: "order-1", medicineId: "old" }]);
    expect(state.apt.prescriptionUpdates[0].removedMedicines).toEqual([expect.objectContaining({ id: "old", contributorDoctorId: "specialist-1" })]);
    expect([...state.notifications.values()][0].body).toContain("updated");
    await add({ requestId: "remove-001", removeMedicineIds: ["old"] });
    expect(state.notifications.size).toBe(1);
  });
  it("RX-REMOVE-002: additions and removals commit atomically", async () => {
    await add({ ...payload(), removeMedicineIds: ["old"] });
    expect(state.apt.emr.medicines).toHaveLength(1);
    expect(state.apt.emr.medicines[0].name).toBe(medicine.name);
  });
  it("RX-REMOVE-003: missing medicine rejects the whole change", async () => {
    await expect(add({ ...payload(), removeMedicineIds: ["missing"] })).rejects.toMatchObject({ status: 409 });
    expect(state.apt.emr.medicines).toHaveLength(1);
  });
  it("RX-REMOVE-004: removal is blocked at the deadline", async () => {
    state.apt.completedAt = new Date(now - 86400000).toISOString();
    await expect(add({ requestId: "remove-001", removeMedicineIds: ["old"] })).rejects.toMatchObject({ status: 409 });
  });
  it.each([null, "old", [""], ["old", "old"], [1]])("RX-REMOVE-005: invalid removal list %#", async removeMedicineIds => {
    await expect(add({ ...payload(), removeMedicineIds })).rejects.toMatchObject({ status: 400 });
  });
  it("RX-REMOVE-006: another doctor cannot remove medicines", async () => {
    await expect(add({ requestId: "remove-001", removeMedicineIds: ["old"] }, "other")).rejects.toMatchObject({ status: 403 });
  });
  it("RX-REMOVE-007: legacy medicines receive safe removal tokens without rewriting stored entries", async () => {
    delete state.apt.emr.medicines[0].id;
    const r = await request(server).get("/api/appointments/apt-1/prescription-additions").set("x-role", "doctor").expect(200);
    expect(r.body.medicines[0].id).toMatch(/^legacy_/);
    expect(state.apt.emr.medicines[0].id).toBeUndefined();
    await request(server).post("/api/appointments/apt-1/prescription-additions").set("x-role", "doctor").send({ requestId: "remove-legacy", removeMedicineIds: [r.body.medicines[0].id] }).expect(200);
    expect(state.apt.emr.medicines).toEqual([]);
  });
  it("RX-REMOVE-008: reused removal request with different targets conflicts", async () => {
    await add({ requestId: "remove-001", removeMedicineIds: ["old"] });
    await expect(add({ requestId: "remove-001", removeMedicineIds: ["other"] })).rejects.toMatchObject({ status: 409 });
  });
  it("RX-001: appends audited medicines without altering existing clinical data", async () => { await add(); expect(state.apt.emr.medicines).toHaveLength(2); expect(state.apt.emr.medicines[1]).toMatchObject({ name: medicine.name, contributorDoctorId: "doctor-1", addedAt: new Date(now).toISOString() }); expect(state.apt).toMatchObject({ status: "completed", recordingBlobPath: "keep", completedAt: "2026-11-11T11:00:00Z", emr: { labs: [{ id: "lab" }], sections: { plan: "Keep notes" } } }); expect(state.apt.prescriptionUpdates).toHaveLength(1); });
  it("RX-002: primary doctor only, even when a specialist participated", async () => { state.apt.specialistInvite = { doctorId: "specialist-1" }; await expect(add(payload(), "specialist-1")).rejects.toMatchObject({ status: 403 }); });
  it.each(["scheduled", "in_progress", "cancelled"])("RX-003: rejects %s appointment", async status => { state.apt.status = status; await expect(add()).rejects.toMatchObject({ status: 409 }); });
  it("RX-004: rejects offline visit", async () => { state.apt.visitType = "offline"; await expect(add()).rejects.toMatchObject({ status: 409 }); });
  it("RX-005: accepts immediately before the 24-hour deadline", async () => { state.apt.completedAt = new Date(now - 86400000 + 1).toISOString(); await add(); expect(state.apt.emr.medicines).toHaveLength(2); });
  it.each([86400000, 86400001])("RX-006: rejects elapsed milliseconds %s", async elapsed => { state.apt.completedAt = new Date(now - elapsed).toISOString(); await expect(add()).rejects.toMatchObject({ status: 409 }); });
  it.each([undefined, "invalid", "2026-11-12T00:00:00Z"])("RX-007: fails closed with invalid completion time %s", async completedAt => { state.apt.completedAt = completedAt; await expect(add()).rejects.toMatchObject({ status: 409 }); });
  it("RX-008: missing appointment", async () => { state.apt = null; await expect(add()).rejects.toMatchObject({ status: 404 }); });
  it.each([[], [{ ...medicine, name: " " }], [{ ...medicine, dosage: "" }], [{ ...medicine, frequency: "" }], [{ ...medicine, durationDays: -1 }], [{ ...medicine, quantity: 0 }], [null]])("RX-009: rejects malformed medicines %#", async medicines => { await expect(add({ requestId: "request-1", medicines })).rejects.toMatchObject({ status: 400 }); });
  it("RX-010: retries same request without adding again or notifying twice", async () => { await add(); await add(); expect(state.apt.emr.medicines).toHaveLength(2); expect(state.notifications.size).toBe(1); expect(state.push).toHaveBeenCalledTimes(1); });
  it("RX-011: same key with different payload conflicts", async () => { await add(); await expect(add({ ...payload(), medicines: [{ ...medicine, name: "Different" }] })).rejects.toMatchObject({ status: 409 }); });
  it("RX-012: replay after deadline returns original success", async () => { await add(); vi.mocked(Date.now).mockReturnValue(now + 86400000); await add(); expect(state.apt.emr.medicines).toHaveLength(2); });
  it("RX-013: ETag retry preserves concurrent additions", async () => { state.conflict = true; await add(); expect(state.apt.emr.medicines.map((m: any) => m.id)).toContain("concurrent"); expect(state.apt.emr.medicines).toHaveLength(3); expect(state.notifications.size).toBe(1); });
  it("RX-014: in-app plus privacy-safe push targets account owner and family profile", async () => { state.apt.familyMemberId = "child-1"; await add(); const n = [...state.notifications.values()][0]; expect(n).toMatchObject({ patientId: "patient-1", profileId: "child-1", type: "prescription_updated", referenceId: "apt-1" }); expect(n.body).not.toContain(medicine.name); expect(state.push.mock.calls[0][0]).toBe("patient-1"); });
  it("RX-015: failed notification never loses medicine; retry delivers once", async () => { state.failNotification = true; await add(); expect(state.apt.emr.medicines).toHaveLength(2); expect(state.push).not.toHaveBeenCalled(); state.failNotification = false; await deliverPrescriptionNotifications("apt-1"); expect(state.notifications.size).toBe(1); await deliverPrescriptionNotifications("apt-1"); expect(state.push).toHaveBeenCalledTimes(1); });
  it("RX-016: push failure remains pending and can be retried without duplicating in-app", async () => { state.push.mockResolvedValueOnce(false); await add(); state.push.mockResolvedValue(true); await deliverPrescriptionNotifications("apt-1"); expect(state.notifications.size).toBe(1); expect(state.push).toHaveBeenCalledTimes(2); });
  it("RX-017: ignores client-supplied identity and medicine ids", async () => { await add({ ...payload(), medicines: [{ ...medicine, id: "old", contributorDoctorId: "evil", addedAt: "yesterday" }] }); expect(state.apt.emr.medicines[1]).toMatchObject({ contributorDoctorId: "doctor-1" }); expect(state.apt.emr.medicines[1].id).not.toBe("old"); });
  it("RX-018: eligibility uses completedAt rather than later updatedAt", () => { state.apt.completedAt = new Date(now - 86400001).toISOString(); state.apt.updatedAt = new Date(now).toISOString(); expect(getPrescriptionAdditionEligibility(state.apt).eligible).toBe(false); });
  it("RX-023: concurrent identical requests persist and notify only once", async () => { await Promise.all([add(), add()]); expect(state.apt.emr.medicines).toHaveLength(2); expect(state.apt.prescriptionUpdates).toHaveLength(1); expect(state.notifications.size).toBe(1); expect(state.push).toHaveBeenCalledTimes(1); });
  it("RX-024: distinct concurrent requests preserve both additions", async () => { await Promise.all([add(payload("request-1")), add(payload("request-2"))]); expect(state.apt.emr.medicines).toHaveLength(3); expect(state.apt.prescriptionUpdates).toHaveLength(2); await deliverPrescriptionNotifications("apt-1"); expect(state.notifications.size).toBe(2); });
  it("RX-019: rejects missing request id", async () => { await expect(add({ medicines: [medicine] })).rejects.toMatchObject({ status: 400 }); });
  it("RX-020: completed appointment timestamp cannot be reset by repeat completion", () => { expect(completeAppointment(state.apt, new Date(now).toISOString()).completedAt).toBe(state.apt.completedAt); });
  it("RX-021: first completion stamps time; legacy completion is not guessed", () => { expect(completeAppointment({ status: "in_progress" }, new Date(now).toISOString()).completedAt).toBe(new Date(now).toISOString()); expect(completeAppointment({ status: "completed" }, new Date(now).toISOString()).completedAt).toBeUndefined(); });
  it("RX-022: completed EMR medicine replacement cannot bypass append-only API", () => { expect(() => guardCompletedPrescription(state.apt, [])).toThrow(); expect(() => guardCompletedPrescription(state.apt, undefined)).not.toThrow(); });
  it("RX-API-001: primary doctor can append via HTTP", async () => { await request(server).post("/api/appointments/apt-1/prescription-additions").set("x-role", "doctor").send(payload()).expect(200); expect(state.apt.emr.medicines).toHaveLength(2); });
  it("RX-API-002: patient cannot append via HTTP", async () => { await request(server).post("/api/appointments/apt-1/prescription-additions").set("x-role", "patient").send(payload()).expect(403); });
  it("RX-API-003: another doctor cannot append or read prescription eligibility", async () => { await request(server).get("/api/appointments/apt-1/prescription-additions").set("x-role", "doctor").set("x-user", "other").expect(403); await request(server).post("/api/appointments/apt-1/prescription-additions").set("x-role", "doctor").set("x-user", "other").send(payload()).expect(403); });
  it("RX-API-004: expired request returns conflict without mutation", async () => { state.apt.completedAt = new Date(now - 86400000).toISOString(); await request(server).post("/api/appointments/apt-1/prescription-additions").set("x-role", "doctor").send(payload()).expect(409); expect(state.apt.emr.medicines).toHaveLength(1); });
  it("RX-API-005: eligibility exposes existing medicines and deadline", async () => { const r = await request(server).get("/api/appointments/apt-1/prescription-additions").set("x-role", "doctor").expect(200); expect(r.body).toMatchObject({ eligible: true, deadline: "2026-11-12T11:00:00.000Z", medicines: [{ id: "old" }] }); });
});
