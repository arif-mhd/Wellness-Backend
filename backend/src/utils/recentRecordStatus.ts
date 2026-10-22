import { medicineOrdersContainer, labBookingsContainer, appointmentsContainer, queryDocuments } from "../config/cosmos";
import { computeAggregateOrderStatus } from "./pharmacyOrders";

export type OrderStatusKind = "pharmacy" | "lab" | "appointment";

export interface RecentOrderStatus {
  type: OrderStatusKind;
  id: string;
  status: string;
}

// Fetches the patient's single most recent record of the given kind — the
// chat assistant's own idea of "my last order/booking/appointment" status.
// Mirrors the same ordering each kind's own list screen already uses
// (createdAt/scheduledAt DESC), just capped to one row instead of their full
// (unpaginated) history.
export async function resolveMostRecentOrderStatus(
  patientId: string,
  kind: OrderStatusKind
): Promise<RecentOrderStatus | null> {
  if (kind === "pharmacy") {
    const { resources } = await medicineOrdersContainer.items.query(
      {
        query: "SELECT TOP 1 * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
        parameters: [{ name: "@pid", value: patientId }],
      },
      { partitionKey: patientId }
    ).fetchAll();
    const order = resources[0];
    if (!order) return null;
    return { type: "pharmacy", id: order.id, status: computeAggregateOrderStatus(order.items ?? []) };
  }

  if (kind === "lab") {
    const { resources } = await labBookingsContainer.items.query(
      {
        query: "SELECT TOP 1 * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
        parameters: [{ name: "@pid", value: patientId }],
      },
      { partitionKey: patientId }
    ).fetchAll();
    const booking = resources[0];
    if (!booking) return null;
    return { type: "lab", id: booking.id, status: booking.status ?? "awaiting" };
  }

  // Appointments are partitioned /id, not /patientId — same cross-partition
  // query pattern GET /api/appointments already uses.
  const appointments = await queryDocuments<any>(appointmentsContainer, {
    query: "SELECT TOP 1 * FROM c WHERE c.patientId = @pid ORDER BY c.scheduledAt DESC",
    parameters: [{ name: "@pid", value: patientId }],
  });
  const appt = appointments[0];
  if (!appt) return null;
  return { type: "appointment", id: appt.id, status: appt.status ?? "scheduled" };
}
