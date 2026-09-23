import type { FulfillmentProvider, FulfillmentResult, FulfillmentStatusUpdate, FulfillmentSubmission } from "./types";

/**
 * Manual provider: production is run by a human from the admin order queue
 * (download artwork, send to the shop, update status). It is the default
 * until a printer API is connected.
 */
export class ManualFulfillmentProvider implements FulfillmentProvider {
  readonly key = "manual";
  readonly name = "Manual (admin queue)";
  readonly automated = false;

  async submitOrder(submission: FulfillmentSubmission): Promise<FulfillmentResult> {
    return { providerOrderId: `manual-${submission.order.order_number}`, status: "submitted", message: "Queued for manual production." };
  }

  async getStatus(): Promise<FulfillmentStatusUpdate | null> {
    return null;
  }
}
