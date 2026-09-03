import { pharmacyProductsContainer } from "../config/cosmos";

export interface OrderItemInput {
  medicine_id: string;
  quantity: number;
}

export interface ValidatedOrderItem {
  medicine_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  pharmacyId: string;
  image_url: string | null;
  numberOfTablets: string | null;
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

    validatedItems.push({
      medicine_id:  product.id,
      name:         product.name,
      quantity:     item.quantity,
      unit_price:   product.price,
      pharmacyId:   product.pharmacyId,
      image_url:    product.imageUrl ?? null,
      numberOfTablets: product.numberOfTablets ?? null,
    });
    total_amount += product.price * item.quantity;
  }

  return { ok: true, items: validatedItems, total_amount };
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
