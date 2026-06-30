import { Router, Response } from "express";
import { requireRole } from "../middleware/requireRole";
import {
  medicineOrdersContainer,
  labBookingsContainer,
  vaccinationBookingsContainer,
  appointmentsContainer,
} from "../config/cosmos";
import { SessionRequest } from "supertokens-node/framework/express";

const router = Router();

// ─── Helper: format an ISO date string safely ─────────────────────────────────
function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── GET /api/services/history ────────────────────────────────────────────────
// Returns all of the authenticated patient's service history in a unified list:
//   - Medicine orders
//   - Lab bookings
//   - Vaccination bookings
//   - Completed / cancelled doctor consultations
//
// Query params:
//   ?limit=N   — cap total items returned (default 50)
//   ?type=medicine|lab|vaccination|consultation — filter to one type
router.get("/history", requireRole("patient"), async (req: SessionRequest, res: Response) => {
  try {
    const patientId = req.session!.getUserId();
    const limit = Math.min(parseInt((req.query.limit as string) || "50"), 100);
    const typeFilter = (req.query.type as string | undefined)?.toLowerCase();

    // ── Parallel fetches ────────────────────────────────────────────────────
    const [meds, labs, vaccines, appointments] = await Promise.allSettled([
      // Medicine orders
      !typeFilter || typeFilter === "medicine"
        ? medicineOrdersContainer.items
            .query(
              {
                query:
                  "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
                parameters: [{ name: "@pid", value: patientId }],
              },
              { partitionKey: patientId }
            )
            .fetchAll()
            .then((r) => r.resources)
        : Promise.resolve([]),

      // Lab bookings
      !typeFilter || typeFilter === "lab"
        ? labBookingsContainer.items
            .query(
              {
                query:
                  "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
                parameters: [{ name: "@pid", value: patientId }],
              },
              { partitionKey: patientId }
            )
            .fetchAll()
            .then((r) => r.resources)
        : Promise.resolve([]),

      // Vaccination bookings
      !typeFilter || typeFilter === "vaccination"
        ? vaccinationBookingsContainer.items
            .query(
              {
                query:
                  "SELECT * FROM c WHERE c.patientId = @pid ORDER BY c.createdAt DESC",
                parameters: [{ name: "@pid", value: patientId }],
              },
              { partitionKey: patientId }
            )
            .fetchAll()
            .then((r) => r.resources)
        : Promise.resolve([]),

      // Doctor consultations (completed or cancelled only)
      !typeFilter || typeFilter === "consultation"
        ? appointmentsContainer.items
            .query({
              query:
                "SELECT * FROM c WHERE c.patientId = @pid AND (c.status = 'completed' OR c.status = 'cancelled') ORDER BY c.scheduledAt DESC",
              parameters: [{ name: "@pid", value: patientId }],
            })
            .fetchAll()
            .then((r) => r.resources)
        : Promise.resolve([]),
    ]);

    // ── Normalise each type into a unified ServiceItem shape ───────────────
    const items: any[] = [];

    // Medicine orders
    if (meds.status === "fulfilled") {
      for (const o of meds.value as any[]) {
        const orderItems: any[] = o.items ?? [];
        const names = orderItems
          .map((i: any) => i.name || i.medicineName || "Item")
          .slice(0, 3);
        items.push({
          id: `med-${o.id}`,
          type: "Medicine",
          title:
            names.join(", ") +
            (orderItems.length > 3 ? ` +${orderItems.length - 3} more` : ""),
          subText: `${orderItems.length} item${orderItems.length !== 1 ? "s" : ""}`,
          date: `Placed on ${formatDate(o.createdAt || o.created_at)}`,
          price: `AED ${((o.total_amount || o.totalAmount || 0)).toFixed(0)}`,
          status: o.status ?? "confirmed",
          rawId: o.id,
          createdAt: o.createdAt || o.created_at || "",
        });
      }
    }

    // Lab bookings
    if (labs.status === "fulfilled") {
      for (const b of labs.value as any[]) {
        const bookingItems: any[] = b.items ?? [];
        const names = bookingItems
          .map((i: any) => i.testName || i.name || "Test")
          .slice(0, 3);
        items.push({
          id: `lab-${b.id}`,
          type: "Lab Service",
          title:
            names.join(", ") +
            (bookingItems.length > 3 ? ` +${bookingItems.length - 3} more` : ""),
          subText: `${bookingItems.length} test${bookingItems.length !== 1 ? "s" : ""} · ${b.status || "Confirmed"}`,
          date: `Booked on ${formatDate(b.createdAt)}`,
          price: `AED ${(b.payment_amount || 0).toFixed(0)}`,
          status: b.status ?? "confirmed",
          rawId: b.id,
          createdAt: b.createdAt || "",
        });
      }
    }

    // Vaccination bookings
    if (vaccines.status === "fulfilled") {
      for (const b of vaccines.value as any[]) {
        const bookingItems: any[] = b.items ?? [];
        const names = bookingItems
          .map((i: any) => i.vaccineName || i.name || "Vaccine")
          .slice(0, 3);
        items.push({
          id: `vac-${b.id}`,
          type: "Vaccination",
          title:
            names.join(", ") +
            (bookingItems.length > 3 ? ` +${bookingItems.length - 3} more` : ""),
          subText: `${bookingItems.length} vaccine${bookingItems.length !== 1 ? "s" : ""} · ${b.status || "Confirmed"}`,
          date: `Booked on ${formatDate(b.createdAt)}`,
          price: `AED ${(b.payment_amount || 0).toFixed(0)}`,
          status: b.status ?? "confirmed",
          rawId: b.id,
          createdAt: b.createdAt || "",
        });
      }
    }

    // Doctor consultations
    if (appointments.status === "fulfilled") {
      for (const a of appointments.value as any[]) {
        items.push({
          id: `apt-${a.id}`,
          type: "Doctors Consultation",
          title: a.doctorName || "Doctor Consultation",
          subText: a.doctorSpecialty || "General Physician",
          date: `Visited on ${formatDate(a.scheduledAt || a.createdAt)}`,
          price: a.paymentAmount
            ? `AED ${Number(a.paymentAmount).toFixed(0)}`
            : "",
          status: a.status,
          appointmentId: a.id,
          doctor: {
            name: a.doctorName || "Doctor",
            specialty: a.doctorSpecialty || "General Physician",
            imageUrl: a.doctorAvatarUrl || null,
          },
          rawId: a.id,
          createdAt: a.scheduledAt || a.createdAt || "",
        });
      }
    }

    // Sort by most recent first, then cap at limit
    items.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    res.json({
      total: items.length,
      items: items.slice(0, limit),
    });
  } catch (err) {
    console.error("Services history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
