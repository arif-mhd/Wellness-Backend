import { Response } from "express";
import { getActorClinicIds, getActorPermissionState, hasPermission } from "./clinicScope";

export interface AppointmentActor {
  isDoctor: boolean;
  isPatient: boolean;
  isClinic: boolean;
}

// Shared "who is this caller, relative to this appointment" check — was
// previously copy-pasted with minor variable-naming drift across /cancel,
// /mark-paid, /reschedule, and /remind. Sends the 403 itself and returns
// null on failure so call sites can just `if (!actor) return;`.
//
// checkPatient: false for routes only a doctor or clinic can call (e.g.
// /mark-paid, /remind) — matches each route's existing, unchanged behavior.
// requireManagePermission: true requires the "manage_appointments" grant for
// a clinic-staff caller specifically; false (the default) only checks clinic
// membership, same as /remind already did before this refactor.
export async function resolveAppointmentActor(
  apt: { doctorId: string; patientId: string; clinicId?: string | null },
  userId: string,
  res: Response,
  opts: { checkPatient?: boolean; requireManagePermission?: boolean } = {}
): Promise<AppointmentActor | null> {
  const { checkPatient = true, requireManagePermission = false } = opts;

  const isDoctor = apt.doctorId === userId;
  const isPatient = checkPatient && apt.patientId === userId;
  let isClinic = false;
  if (!isDoctor && !isPatient && apt.clinicId) {
    isClinic = (await getActorClinicIds(userId)).includes(apt.clinicId);
  }

  if (!isDoctor && !isPatient && !isClinic) {
    res.status(403).json({ error: "Not authorized." });
    return null;
  }

  if (isClinic && requireManagePermission && !hasPermission(await getActorPermissionState(userId), "manage_appointments")) {
    res.status(403).json({ error: "You don't have permission to manage appointments." });
    return null;
  }

  return { isDoctor, isPatient, isClinic };
}
