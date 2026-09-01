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

// Validates each requested item against live approved stock and computes the
// order total. Shared by the direct patient-initiated shop flow
// (POST /api/pharmacy/orders in medicineOrders.ts) and the EMR-driven
// consultation flow (POST /api/appointments/:id/order-medicines) so both
// enforce identical stock/price rules from one place.
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
    if (product.stock < item.quantity) {
      return { ok: false, error: `Insufficient stock for ${product.name}` };
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

// Decrements stock (and, where present, the parallel numberOfTablets field)
// for each item in a just-created order. Best-effort per item — a failure on
// one item is logged and skipped rather than failing the whole order, since
// the order itself is already persisted by the time this runs.
export async function decrementStockForItems(items: ValidatedOrderItem[]): Promise<void> {
  for (const item of items) {
    try {
      const { resource: prod } = await pharmacyProductsContainer.item(item.medicine_id, item.pharmacyId).read();
      if (prod) {
        const newStock = Math.max(0, (prod.stock ?? 0) - item.quantity);
        let newNumberOfTablets = prod.numberOfTablets;

        if (newNumberOfTablets) {
          const num = parseInt(newNumberOfTablets.toString(), 10);
          if (!isNaN(num)) {
            newNumberOfTablets = Math.max(0, num - item.quantity).toString();
          }
        }

        await pharmacyProductsContainer.item(item.medicine_id, item.pharmacyId).replace({
          ...prod,
          stock: newStock,
          numberOfTablets: newNumberOfTablets,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (stockErr) {
      console.warn(`Stock decrement failed for ${item.medicine_id}:`, stockErr);
    }
  }
}
