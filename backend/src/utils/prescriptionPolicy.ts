export class PrescriptionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Never derive completion from updatedAt: recordings/notes may change it later.
// Legacy completed appointments without a timestamp remain ineligible.
export function completeAppointment(appointment: any, now: string): any {
  return { ...appointment, status: "completed", ...(appointment.status !== "completed" ? { completedAt: appointment.completedAt ?? now } : {}) };
}

export function guardCompletedPrescription(appointment: any, medicines: unknown): void {
  if ((appointment.status === "completed" || appointment.completedAt) && appointment.visitType !== "offline" && medicines !== undefined) {
    throw new PrescriptionError(409, "Use prescription additions for a completed video appointment. Existing medicines cannot be replaced.");
  }
}
