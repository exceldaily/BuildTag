/**
 * Wording for consent checkboxes and contextual disclosures, in one place so
 * the text shown to people and the text reviewed by counsel stay identical.
 * If a checkbox label changes materially, bump its version in config.ts.
 */

export const CONSENT_TEXT = {
  signup: "I agree to the Terms of Service and Privacy Policy.",
  customProductApproval: "I reviewed and approve my customized BuildTag design and understand it will be produced specifically for my order.",
  businessAuthorization:
    "I confirm that my organization is authorized to create this vehicle record and that the information we submit is accurate to the best of our knowledge.",
  organizationAuthorization: "I confirm that I am authorized to act for this business and that the information I submit about it is accurate.",
  vehicleClaim: "I confirm that I am authorized to claim control of this BuildTags vehicle profile.",
} as const;

export const DISCLOSURE = {
  performance: "Performance figures may be owner or shop reported and are not independently verified by BuildTags unless indicated.",
  parts: "Verify compatibility before purchasing or installing. Parts shown on another build may not be appropriate for your vehicle.",
  attribution: "Attribution identifies the reported contributor and does not constitute BuildTags certification.",
  // Today only build owners earn from their own affiliate links; BuildTags takes no cut. If BuildTags ever
  // runs its own affiliate links, change this to "BuildTags or the build owner may earn ...".
  affiliate: "Some product links may be affiliate links. The build owner may earn a commission from qualifying purchases.",
  ownership: "BuildTags profile ownership is not proof of legal vehicle ownership.",
  claim: "Claiming a BuildTags profile does not establish legal ownership of the physical vehicle.",
  verifiedBusiness:
    "Verified business means BuildTags confirmed this business's identity and contact details. It is not an inspection, certification or endorsement of any vehicle, part or work.",
} as const;

export type { LegalDocumentType } from "@/lib/types";

export type AcceptanceContext = "signup" | "reaccept" | "checkout" | "business_create_vehicle" | "organization_create" | "vehicle_claim";

/** HTML checkbox values arrive as "on" (or the value attribute). */
export function isChecked(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "yes" || value === "1";
}
