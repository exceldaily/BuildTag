/**
 * THE single source of truth for BuildTags' legal identity and document
 * versions. Every legal page, footer line and consent record reads from here.
 *
 * Changing the operator (for example once Rywin Ventures LLC is formed):
 *   1. Set OPERATOR_KIND to "llc" (and LLC_FORMATION_STATE if needed).
 *   2. Bump the `version`, `effective` and `updated` of every document whose
 *      text changes (at least terms, privacy, refunds).
 *   3. Decide whether the change is material enough to need renewed consent.
 *      If yes, also raise `requiredVersion` for terms/privacy; signed-in users
 *      are then asked to accept again (see src/lib/legal/status.ts).
 * Historical acceptance rows are never rewritten: each row keeps the version
 * that was accepted at the time.
 *
 * Editing this file needs a commit and a deploy, so only people with access
 * to the repository can change the legal identity. There is intentionally no
 * admin form for it.
 */

export type OperatorKind = "sole_proprietor" | "llc";

// ---------------------------------------------------------------------------
// Operator. TODO(legal): replace the owner placeholder with the full legal
// name, or switch to the LLC once it is formed. Never publish a placeholder
// to production without deciding which one applies.
// ---------------------------------------------------------------------------
const OPERATOR_KIND: OperatorKind = "sole_proprietor";
const OWNER_FULL_LEGAL_NAME = "[OWNER FULL LEGAL NAME]";
const LLC_LEGAL_NAME = "Rywin Ventures LLC";
/** State the LLC is organized in, e.g. "Florida". Only used when OPERATOR_KIND is "llc". */
const LLC_FORMATION_STATE = "[LLC FORMATION STATE]";

function operator() {
  if (OPERATOR_KIND === "llc") {
    return {
      kind: OPERATOR_KIND,
      legalName: LLC_LEGAL_NAME,
      /** "Rywin Ventures LLC, a Florida limited liability company doing business as BuildTags" */
      description: `${LLC_LEGAL_NAME}, a ${LLC_FORMATION_STATE} limited liability company doing business as BuildTags`,
    };
  }
  return {
    kind: OPERATOR_KIND,
    legalName: OWNER_FULL_LEGAL_NAME,
    description: `${OWNER_FULL_LEGAL_NAME}, a sole proprietor doing business as BuildTags`,
  };
}

export const LEGAL = {
  brand: "BuildTags",
  website: "https://buildtags.app",
  websiteLabel: "buildtags.app",
  email: "customersupport@buildtags.app",
  address: {
    line1: "5533 Sunburst Lane",
    city: "Pensacola",
    region: "FL",
    postalCode: "32507",
    country: "United States",
  },
  governingState: "Florida",
  venueCounty: "Escambia County",
  operator: operator(),
  /** Reporting window for defective, damaged or wrong physical products. */
  issueWindowDays: 30,
} as const;

/** True while any operator field still shows a placeholder. */
export const LEGAL_HAS_PLACEHOLDERS = /\[[A-Z ]+\]/.test(LEGAL.operator.description);

export const LEGAL_ADDRESS_LINES = [
  LEGAL.address.line1,
  `${LEGAL.address.city}, ${LEGAL.address.region} ${LEGAL.address.postalCode}`,
  LEGAL.address.country,
] as const;

// ---------------------------------------------------------------------------
// Document versions. `version` is what gets stored with an acceptance.
// Use ISO dates so versions sort correctly. `requiredVersion` is the oldest
// accepted version that is still good enough; raise it only for material
// changes that need renewed consent.
// ---------------------------------------------------------------------------
export interface LegalDocMeta {
  path: string;
  title: string;
  version: string;
  requiredVersion?: string;
  effective: string;
  updated: string;
}

export const LEGAL_DOCS = {
  terms: { path: "/terms", title: "Terms of Service", version: "2026-09-24", requiredVersion: "2026-09-24", effective: "September 24, 2026", updated: "September 24, 2026" },
  privacy: { path: "/privacy", title: "Privacy Policy", version: "2026-09-24", requiredVersion: "2026-09-24", effective: "September 24, 2026", updated: "September 24, 2026" },
  disclaimer: { path: "/disclaimer", title: "Disclaimer", version: "2026-09-24", effective: "September 24, 2026", updated: "September 24, 2026" },
  refunds: { path: "/refunds", title: "Refund & Replacement Policy", version: "2026-09-24", effective: "September 24, 2026", updated: "September 24, 2026" },
  community: { path: "/community-guidelines", title: "Community Guidelines", version: "2026-09-24", effective: "September 24, 2026", updated: "September 24, 2026" },
  copyright: { path: "/copyright", title: "Copyright Policy", version: "2026-09-24", effective: "September 24, 2026", updated: "September 24, 2026" },
} as const satisfies Record<string, LegalDocMeta>;

export const TERMS_VERSION = LEGAL_DOCS.terms.version;
export const PRIVACY_VERSION = LEGAL_DOCS.privacy.version;
export const DISCLAIMER_VERSION = LEGAL_DOCS.disclaimer.version;
export const REFUNDS_VERSION = LEGAL_DOCS.refunds.version;

/** Versions stored for the transactional confirmations (their wording lives in consent.ts). */
export const CUSTOM_PRODUCT_APPROVAL_VERSION = "2026-09-24";
export const BUSINESS_AUTHORIZATION_VERSION = "2026-09-24";
export const VEHICLE_CLAIM_CONFIRMATION_VERSION = "2026-09-24";

/** Footer / cross-link order. */
export const LEGAL_NAV = [
  LEGAL_DOCS.terms,
  LEGAL_DOCS.privacy,
  LEGAL_DOCS.disclaimer,
  LEGAL_DOCS.refunds,
  LEGAL_DOCS.community,
  LEGAL_DOCS.copyright,
] as const;
