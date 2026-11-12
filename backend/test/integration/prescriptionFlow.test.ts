import express from "express";
import request from "supertest";
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ apt: null as any, notifications: new Map<string, any>(), draw: vi.fn(), orders: vi.fn() }));
vi.mock("supertokens-node/recipe/session/framework/express", () => ({ verifySession: () => (req: any, _res: any, next: any) => { req.session = { getUserId: () => req.header("x-user") || "doctor-1" }; next(); } }));
vi.mock("../../src/middleware/requireRole", () => ({ requireRole: (role: string) => (req: any, res: any, next: any) => { if (req.header("x-role") !== role) return res.sendStatus(403); req.session = { getUserId: () => req.header("x-user") || "doctor-1" }; next(); } }));
vi.mock("../../src/middleware/requireFeature", () => ({ requireFeature: () => (_req: any, _res: any, next: any) => next() }));
vi.mock("../../src/config/cosmos", () => ({ appointmentsContainer: {
  item: () => ({ read: async () => ({ resource: structuredClone(state.apt) }), replace: async (doc: any) => { state.apt = structuredClone(doc); return { resource: doc }; } }),
  items: { query: () => ({ fetchAll: async () => ({ resources: state.apt?.prescriptionUpdates?.some((e: any) => e.notificationPending) ? [{ id: state.apt.id }] : [] }) }), upsert: async (doc: any) => { state.apt = doc; } },
}, doctorsContainer: { item: () => ({ read: async () => ({ resource: { fullName: "Doctor", clinicId: null } }) }) }, patientsContainer: { item: () => ({ read: async () => ({ resource: { fullName: "Patient" } }) }) },
  notificationsContainer: { items: { create: async (n: any) => { if (state.notifications.has(n.id)) throw { code: 409 }; state.notifications.set(n.id, n); }, query: () => ({ fetchAll: async () => ({ resources: [...state.notifications.values()] }) }) } },
  appointmentSlotsContainer: {}, queryDocuments: async () => [], dietPlansContainer: {}, medicineOrdersContainer: { items: { upsert: state.orders } },
}));
vi.mock("../../src/config/blob", () => ({ parseConnectionStringCredentials: () => ({}), blobExists: async () => true }));
vi.mock("../../src/config/livekit", () => ({ livekitApiKey: "test", livekitApiSecret: "test" }));
vi.mock("../../src/routes/clinicInsurance", () => ({ insuranceNamesMatch: () => true, loadOrgDocForClinicId: async () => null }));
vi.mock("../../src/utils/clinicScope", () => ({ getActorClinicIds: async () => [], mainBranchFrom: (v: any) => v, branchAsPublicClinic: (v: any) => v, buildInClause: () => ({ clause: "true", parameters: [] }) }));
vi.mock("../../src/utils/appointmentAuth", () => ({ resolveAppointmentActor: async () => ({ isDoctor: true, isPatient: false, isClinic: false }) }));
vi.mock("../../src/utils/activityLogger", () => ({ logActivity: vi.fn() }));
vi.mock("../../src/utils/appointmentSweep", () => ({ autoExpireStaleAppointments: async (v: any) => v }));
vi.mock("../../src/utils/pushNotifications", () => ({ sendPushToUser: async () => true }));
vi.mock("../../src/services/fhirClient", () => ({ FhirError: class extends Error {} }));
vi.mock("../../src/services/fhirService", () => ({ getFhirEncounters: vi.fn(), getFhirNotes: vi.fn(), getFhirObservations: vi.fn(), getFhirContext: vi.fn() }));
vi.mock("../../src/utils/dietPlanProgress", () => ({ computeDietPlanProgress: vi.fn() }));
vi.mock("../../src/utils/pharmacyOrders", () => ({ validateOrderItems: vi.fn(), resolvePackQuantity: vi.fn() }));
vi.mock("../../src/utils/timezone", () => ({ zonedTimeToUtc: vi.fn(), utcToZonedTime: vi.fn(), startOfClinicDayUtc: vi.fn(), resolveTimezoneForDoctor: vi.fn(), resolveTimezoneForDoctorId: vi.fn(), formatClinicDateTimeText: vi.fn() }));
vi.mock("../../src/utils/currency", () => ({ resolveCurrencyForDoctorId: vi.fn(), formatCurrencyText: vi.fn() }));
vi.mock("../../src/utils/prescriptionPdf", () => ({ drawPrescriptionPdf: state.draw }));
vi.mock("pdfkit", () => ({ default: class { res: any; pipe(res: any) { this.res = res; } end() { this.res.end("test-pdf"); } } }));
import appointments from "../../src/routes/appointments";
import additions from "../../src/routes/prescriptionAdditions";
import internal from "../../src/routes/internal";
import notifications from "../../src/routes/notifications";
const app = express(); app.use(express.json()); app.use("/api/appointments", appointments, additions); app.use("/api/internal", internal); app.use("/api/notifications", notifications);
const path = "/api/appointments/apt-1";
beforeEach(() => { state.apt = { id: "apt-1", doctorId: "doctor-1", patientId: "patient-1", visitType: "online", status: "in_progress", _etag: "1", callStartedAt: new Date().toISOString(), doctorInCall: false, patientInCall: true, emr: { medicines: [{ id: "old", name: "Original" }], sections: {}, labs: [] } }; state.notifications.clear(); state.draw.mockReset(); state.orders.mockReset(); });
it("RX-FLOW-001: call exit stamps completion then new medicines reach patient PDF and notification", async () => {
  await request(app).patch(`${path}/call-presence`).set("x-user", "patient-1").send({ inCall: false }).expect(200);
  expect(state.apt.status).toBe("completed"); expect(Date.parse(state.apt.completedAt)).toBeGreaterThan(0);
  await request(app).post(`${path}/prescription-additions`).set("x-role", "doctor").send({ requestId: "flow-request-1", medicines: [{ name: "Added", dosage: "10 mg", frequency: "Once Daily", timing: "After food" }] }).expect(200);
  await request(app).get(`${path}/prescription-pdf`).set("x-role", "patient").set("x-user", "patient-1").expect(200);
  expect(state.draw.mock.calls[0][1].medicines.map((m: any) => m.name)).toEqual(["Original", "Added"]);
  const r = await request(app).get("/api/notifications").set("x-user", "patient-1").expect(200);
  expect(r.body.notifications[0]).toMatchObject({ type: "prescription_updated", reference_id: "apt-1", user_id: "patient-1" }); expect(state.orders).not.toHaveBeenCalled();
});
it("RX-FLOW-002: explicit completion stamps time only once", async () => { await request(app).patch(`${path}/status`).set("x-role", "doctor").send({ status: "completed" }).expect(200); const completedAt = state.apt.completedAt; await request(app).patch(`${path}/status`).set("x-role", "doctor").send({ status: "completed" }).expect(200); expect(state.apt.completedAt).toBe(completedAt); });
it("RX-FLOW-003: completed medicine replacement rejected, notes-only saves preserve medicines and labs", async () => { state.apt.status = "completed"; state.apt.emr.labs = [{ id: "lab-1", contributorDoctorId: "doctor-1" }]; const old = structuredClone(state.apt.emr.medicines); await request(app).post(`${path}/emr`).set("x-role", "doctor").send({ medicines: [] }).expect(409); await request(app).post(`${path}/emr`).set("x-role", "doctor").send({ addendum: "Follow-up note" }).expect(200); expect(state.apt.emr.medicines).toEqual(old); expect(state.apt.emr.labs).toHaveLength(1); });
it.each(["cancel", "reschedule", "status"])("RX-FLOW-004: %s cannot reopen completed appointment", async action => { state.apt.status = "completed"; await request(app).patch(`${path}/${action}`).set("x-role", "doctor").send({ status: "in_progress", date: "2026-11-12", time: "12:00" }).expect(409); });
it("RX-FLOW-005: another patient's PDF remains forbidden", async () => { await request(app).get(`${path}/prescription-pdf`).set("x-role", "patient").set("x-user", "other-patient").expect(403); });
it("RX-FLOW-006: notification retry sweep requires internal secret", async () => { vi.stubEnv("INTERNAL_CRON_SECRET", "test-only"); try { await request(app).post("/api/internal/prescription-notifications/sweep").expect(403); await request(app).post("/api/internal/prescription-notifications/sweep").set("x-internal-secret", "test-only").expect(200); } finally { vi.unstubAllEnvs(); } });
