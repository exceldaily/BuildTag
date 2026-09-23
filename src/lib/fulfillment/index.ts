import "server-only";

import { ManualFulfillmentProvider } from "./manual";
import type { FulfillmentProvider } from "./types";

export type { FulfillmentProvider, FulfillmentSubmission, FulfillmentResult, FulfillmentArtwork } from "./types";

/**
 * Provider registry. Add a real printer by implementing FulfillmentProvider
 * and registering it here; select it per print specification (`provider`
 * column) or globally with FULFILLMENT_PROVIDER.
 */
const providers: Record<string, FulfillmentProvider> = {
  manual: new ManualFulfillmentProvider(),
};

export function getFulfillmentProvider(key?: string | null): FulfillmentProvider {
  const k = key ?? process.env.FULFILLMENT_PROVIDER ?? "manual";
  return providers[k] ?? providers.manual;
}

export function listFulfillmentProviders(): FulfillmentProvider[] {
  return Object.values(providers);
}
