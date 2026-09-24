/**
 * Business / claim pure-logic tests. Run with `pnpm test`.
 *
 * The security rules themselves (who can claim, provenance, RLS) live in the
 * database and are tested by supabase/tests/0014_org_claims.test.sql, run with
 * `node scripts/db-migrate-0014.mjs`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CLAIM_ERROR_MESSAGE, claimUrl, looksLikeClaimCode } from "../src/lib/claims";
import { SOURCE_BADGE, type ClaimError } from "../src/lib/types";
import { businessInquirySchema, customerRecordSchema, organizationProfileSchema, orgVehicleSchema } from "../src/lib/validation/business";
import { modificationSchema } from "../src/lib/validation/modification";

describe("claim codes", () => {
  it("accepts the printed format with or without dashes, case-insensitive", () => {
    for (const c of ["BT-H7K9-XP4M", "bt-h7k9-xp4m", "BT H7K9 XP4M", "H7K9XP4M", "h7k9-xp4m"]) assert.equal(looksLikeClaimCode(c), true, c);
  });
  it("does not strip a leading BT from a bare 8-character code", () => {
    assert.equal(looksLikeClaimCode("BTK9XP4M"), true);
  });
  it("rejects wrong lengths", () => {
    for (const c of ["", "BT-H7K9", "H7K9XP4MM", "BT-H7K9-XP4M-1"]) assert.equal(looksLikeClaimCode(c), false, c);
  });
});

describe("claim urls", () => {
  it("builds the private claim path without double slashes", () => {
    assert.equal(claimUrl("https://buildtags.app/", "abc"), "https://buildtags.app/claim/abc");
    assert.equal(claimUrl("https://buildtags.app", "abc"), "https://buildtags.app/claim/abc");
  });
  it("has customer copy for every database claim error", () => {
    const errors: ClaimError[] = ["invalid", "expired", "revoked", "claimed", "issuer_member", "rate_limited"];
    for (const e of errors) assert.ok(CLAIM_ERROR_MESSAGE[e].length > 10, e);
  });
});

describe("provenance badges", () => {
  it("never claim certification or OEM approval", () => {
    for (const label of Object.values(SOURCE_BADGE)) assert.doesNotMatch(label, /certif|approved|official|genuine|oem/i);
  });
});

describe("modification input", () => {
  it("uses the renamed installer column and drops the old shop_id", () => {
    const parsed = modificationSchema.parse({ category: "exhaust", part_name: "Slip-ons", installed_by_organization_id: "", shop_id: "x" });
    assert.equal(parsed.installed_by_organization_id, null);
    assert.equal("shop_id" in parsed, false);
  });
  it("never lets the client set provenance fields", () => {
    const parsed = modificationSchema.parse({ category: "exhaust", part_name: "Slip-ons", source_type: "dealer", created_by_organization_id: "00000000-0000-0000-0000-000000000000" });
    assert.equal("source_type" in parsed, false);
    assert.equal("created_by_organization_id" in parsed, false);
  });
});

describe("business forms", () => {
  it("requires make and model for a customer build and keeps customer fields separate", () => {
    assert.equal(orgVehicleSchema.safeParse({ make: "", model: "Road Glide" }).success, false);
    const ok = orgVehicleSchema.parse({ year: "2026", make: "Harley-Davidson", model: "Road Glide", customer_email: "", add_to_crew: "on" });
    assert.equal(ok.year, 2026);
    assert.equal(ok.add_to_crew, true);
    assert.equal(ok.customer_email, "");
  });
  it("rejects a bad customer email but allows none", () => {
    assert.equal(customerRecordSchema.safeParse({ customer_email: "nope" }).success, false);
    assert.equal(customerRecordSchema.safeParse({ customer_email: "" }).success, true);
  });
  it("normalizes the business profile", () => {
    const p = organizationProfileSchema.parse({ name: "Blackline Performance", organization_type: "performance_shop", country: "us", instagram_handle: "@blackline" });
    assert.equal(p.country, "US");
    assert.equal(p.instagram_handle, "blackline");
    assert.equal(organizationProfileSchema.safeParse({ name: "X", organization_type: "custom_shop" }).success, false);
  });
});

describe("business inquiry", () => {
  const base = { name: "Sam", business_name: "Test Shop", email: "Sam@Example.com", business_type: "custom_shop" };
  it("accepts the minimum and normalizes email and website", () => {
    const q = businessInquirySchema.parse({ ...base, website: "testshop.com" });
    assert.equal(q.email, "sam@example.com");
    assert.equal(q.website, "https://testshop.com");
    assert.deepEqual(q.interests, []);
  });
  it("only allows known interests", () => {
    assert.equal(businessInquirySchema.safeParse({ ...base, interests: ["crews", "free_money"] }).success, false);
    assert.deepEqual(businessInquirySchema.parse({ ...base, interests: ["crews"] }).interests, ["crews"]);
  });
  it("passes the honeypot through so the action can silently drop bots", () => {
    assert.equal(businessInquirySchema.parse({ ...base, company_fax: "555" }).company_fax, "555");
    assert.equal(businessInquirySchema.parse(base).company_fax, "");
  });
});
