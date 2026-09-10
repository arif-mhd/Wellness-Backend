import { pharmacyProductsContainer, pharmaciesContainer } from "../config/cosmos";

export interface OrderItemInput {
  medicine_id: string;
  quantity: number;
}

// A shared order can span several pharmacies at once — each line item is
// fulfilled (and its progress tracked) independently by whichever pharmacy
// owns it, so status lives per item rather than once on the whole order.
export type OrderItemStatus = "confirmed" | "shipped" | "delivered" | "cancelled";

export interface ValidatedOrderItem {
  medicine_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  pharmacyId: string;
  pharmacyName: string | null;
  image_url: string | null;
  numberOfTablets: string | null;
  status: OrderItemStatus;
}

export type ValidateItemsResult =
  | { ok: true; items: ValidatedOrderItem[]; total_amount: number }
  | { ok: false; error: string };

// Validates each requested item against live approved availability and
// computes the order total. Shared by the direct patient-initiated shop flow
// (POST /api/pharmacy/orders in medicineOrders.ts) and the EMR-driven
// consultation flow (POST /api/appointments/:id/order-medicines) so both
// enforce identical availability/price rules from one place.
//
// Pharmacies flag availability with a plain in-stock/out-of-stock toggle
// (inStock) rather than tracking exact counts, so there's no quantity-vs-
// stock comparison here — an order is only ever rejected for being
// completely out of stock, never for "not enough left."
export async function validateOrderItems(items: OrderItemInput[]): Promise<ValidateItemsResult> {
  let total_amount = 0;
  const validatedItems: ValidatedOrderItem[] = [];
  const pharmacyNameCache: Record<string, string | null> = {};

  for (const item of items) {
    const { resources } = await pharmacyProductsContainer.items.query({
      query: "SELECT * FROM c WHERE c.id = @id AND c.status = 'approved' AND (NOT IS_DEFINED(c.flagged) OR c.flagged = false)",
      parameters: [{ name: "@id", value: item.medicine_id }],
    }).fetchAll();

    if (!resources.length) {
      return { ok: false, error: `Product ${item.medicine_id} not found or unavailable` };
    }

    const product = resources[0];
    if (product.inStock === false) {
      return { ok: false, error: `${product.name} is currently out of stock` };
    }

    if (!(product.pharmacyId in pharmacyNameCache)) {
      const { resource: pharmacyDoc } = await pharmaciesContainer.item(product.pharmacyId, product.pharmacyId).read();
      pharmacyNameCache[product.pharmacyId] = pharmacyDoc?.pharmacyName ?? null;
    }

    validatedItems.push({
      medicine_id:  product.id,
      name:         product.name,
      quantity:     item.quantity,
      unit_price:   product.price,
      pharmacyId:   product.pharmacyId,
      pharmacyName: pharmacyNameCache[product.pharmacyId],
      image_url:    product.imageUrl ?? null,
      numberOfTablets: product.numberOfTablets ?? null,
      status:       "confirmed",
    });
    total_amount += product.price * item.quantity;
  }

  return { ok: true, items: validatedItems, total_amount };
}

// A shared order's own top-level `status` becomes a derived summary once
// items can be fulfilled independently — "confirmed"/"shipped"/"delivered"
// when every item agrees, "partial" the moment they diverge (e.g. one
// pharmacy ships while another hasn't). Cancelled items don't count toward
// that agreement unless every item is cancelled — a lone cancellation
// shouldn't mask the real progress of everything else in the order.
export function computeAggregateOrderStatus(items: { status?: string }[]): string {
  const live = items.filter(i => i.status !== "cancelled");
  const pool = live.length ? live : items;
  const distinct = new Set(pool.map(i => i.status ?? "confirmed"));
  return distinct.size === 1 ? [...distinct][0] : "partial";
}

// Converts a prescribed total unit count (e.g. "10 tablets" — frequency x
// duration, from the doctor's EMR entry) into how many of the pharmacy's own
// pack-sized SKUs to order. numberOfTablets is a per-pack descriptor set by
// the pharmacy at listing time ("15 Tablets" per strip), not a running
// count, and stock/order quantity are both tracked in that same pack unit —
// so a doctor's per-tablet regimen has to be divided up into whole packs
// here rather than assuming 1 pack covers it. Falls back to 1 pack when the
// product has no parseable pack size (syrups, creams, etc.) or the doctor
// didn't specify a total (custom/legacy entries).
export async function resolvePackQuantity(productId: string, totalUnits: number | undefined): Promise<number> {
  if (!totalUnits || totalUnits <= 0) return 1;

  const { resources } = await pharmacyProductsContainer.items.query({
    query: "SELECT c.numberOfTablets FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: productId }],
  }).fetchAll();

  const packSize = resources[0]?.numberOfTablets ? parseInt(String(resources[0].numberOfTablets), 10) : NaN;
  if (!packSize || isNaN(packSize) || packSize <= 0) return 1;

  return Math.max(1, Math.ceil(totalUnits / packSize));
}
