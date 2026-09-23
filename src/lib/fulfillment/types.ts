import type { OrderItemRow, OrderRow, PrintSpecificationRow, ProductionSnapshotRow } from "@/lib/types";

/**
 * Fulfillment provider abstraction. An order is handed to a provider with
 * its frozen production snapshots; the provider returns its own order id
 * and later status updates. Nothing else in the app knows which printer is
 * behind it.
 */

export interface FulfillmentArtwork {
  snapshot: ProductionSnapshotRow;
  spec: PrintSpecificationRow | null;
  /** Signed, time-limited URLs the provider can download from. */
  svgUrl: string | null;
  pngUrl: string | null;
}

export interface FulfillmentSubmission {
  order: OrderRow;
  items: (OrderItemRow & { artwork: FulfillmentArtwork | null })[];
}

export interface FulfillmentResult {
  providerOrderId: string;
  /** Provider-side status string, mapped by the caller into order_status. */
  status: "submitted" | "in_production" | "shipped" | "error";
  message?: string;
}

export interface FulfillmentStatusUpdate {
  status: "submitted" | "in_production" | "shipped" | "delivered" | "error";
  trackingNumber?: string;
  trackingUrl?: string;
  message?: string;
}

export interface FulfillmentProvider {
  readonly key: string;
  readonly name: string;
  /** Whether this provider can be submitted to automatically. */
  readonly automated: boolean;
  submitOrder(submission: FulfillmentSubmission): Promise<FulfillmentResult>;
  getStatus(providerOrderId: string): Promise<FulfillmentStatusUpdate | null>;
}
