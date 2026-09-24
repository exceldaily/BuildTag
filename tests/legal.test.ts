/**
 * Legal plumbing: versions the database will accept, routes that exist,
 * consent parsing, and the enum/contexts the SQL migration enforces.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  BUSINESS_AUTHORIZATION_VERSION,
  CUSTOM_PRODUCT_APPROVAL_VERSION,
  LEGAL,
  LEGAL_DOCS,
  LEGAL_HAS_PLACEHOLDERS,
  LEGAL_NAV,
  VEHICLE_CLAIM_CONFIRMATION_VERSION,
} from "../src/lib/legal/config";
import { CONSENT_TEXT, DISCLOSURE, isChecked } from "../src/lib/legal/consent";

const ROOT = join(__dirname, "..");
const MIGRATION = readFileSync(join(ROOT, "supabase/migrations/0015_buildtag_legal_acceptances.sql"), "utf8");
const VERSION_RE = /^[0-9A-Za-z._-]{1,40}$/; // same check as legal_acceptances.document_version

describe("legal config", () => {
  it("every version is accepted by the database check", () => {
    const versions = [
      ...Object.values(LEGAL_DOCS).flatMap((d) => [d.version, "requiredVersion" in d ? d.requiredVersion : d.version]),
      CUSTOM_PRODUCT_APPROVAL_VERSION,
      BUSINESS_AUTHORIZATION_VERSION,
      VEHICLE_CLAIM_CONFIRMATION_VERSION,
    ];
    for (const v of versions) assert.match(v, VERSION_RE);
  });

  it("required versions never exceed the published version", () => {
    assert.ok(LEGAL_DOCS.terms.requiredVersion <= LEGAL_DOCS.terms.version);
    assert.ok(LEGAL_DOCS.privacy.requiredVersion <= LEGAL_DOCS.privacy.version);
  });

  it("every legal route in the footer/nav has a page", () => {
    for (const d of LEGAL_NAV) {
      const file = join(ROOT, "src/app/(marketing)", d.path.slice(1), "page.tsx");
      assert.ok(existsSync(file), `missing page for ${d.path}`);
    }
    assert.equal(new Set(LEGAL_NAV.map((d) => d.path)).size, LEGAL_NAV.length);
  });

  it("operator line is built from one place and flags placeholders", () => {
    assert.match(LEGAL.operator.description, /doing business as BuildTags$/);
    assert.equal(LEGAL_HAS_PLACEHOLDERS, /\[[A-Z ]+\]/.test(LEGAL.operator.description));
    assert.equal(LEGAL.email, "customersupport@buildtags.app");
    assert.equal(LEGAL.governingState, "Florida");
    assert.equal(LEGAL.venueCounty, "Escambia County");
  });
});

describe("consent", () => {
  it("only an explicit tick counts", () => {
    assert.equal(isChecked("on"), true);
    assert.equal(isChecked("true"), true);
    assert.equal(isChecked(null), false);
    assert.equal(isChecked(""), false);
    assert.equal(isChecked("off"), false);
  });

  it("the SQL enum covers every recorded document type and context", () => {
    for (const t of ["terms", "privacy", "custom_product_approval", "business_authorization", "vehicle_claim_confirmation"]) {
      assert.ok(MIGRATION.includes(`'${t}'`), `enum missing ${t}`);
    }
    for (const c of ["signup", "reaccept", "checkout", "business_create_vehicle", "organization_create", "vehicle_claim"]) {
      assert.ok(MIGRATION.includes(`'${c}'`), `context missing ${c}`);
    }
  });

  it("affiliate disclosure matches the current business model (owners earn, BuildTags takes no cut)", () => {
    assert.match(DISCLOSURE.affiliate, /build owner may earn/);
    assert.doesNotMatch(DISCLOSURE.affiliate, /BuildTags or/);
  });

  it("legal copy has no em or en dashes", () => {
    const files = ["terms", "privacy", "disclaimer", "refunds", "community-guidelines", "copyright"].map((p) =>
      readFileSync(join(ROOT, "src/app/(marketing)", p, "page.tsx"), "utf8"),
    );
    for (const text of [...files, ...Object.values(CONSENT_TEXT), ...Object.values(DISCLOSURE)]) {
      assert.doesNotMatch(text, /[\u2013\u2014]/);
    }
  });
});
