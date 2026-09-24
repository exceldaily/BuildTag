/**
 * Commerce path unit tests (pure logic). Run with `pnpm test`.
 *
 * Database-backed checks (RLS, immutability, duplicate webhooks against a
 * real Postgres) live in scripts/rls-test.ts and need a service-role key;
 * the SQL guards they exercise are documented in README "Order operations".
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import { verifyStripeSignature } from "../src/lib/stripe-signature";
import { productionSheetHtml } from "../src/lib/orders/production-sheet";
import { ADMIN_STATUS_LABEL, CUSTOMER_STATUS_LABEL, ORDER_NUMBER_PATTERN, TRANSITIONS, canTransition, customerStepState, productionFileName, shippingLines } from "../src/lib/orders/status";
import type { OrderStatus } from "../src/lib/types";

const ALL: OrderStatus[] = ["draft", "awaiting_payment", "payment_processing", "paid", "needs_review", "artwork_approved", "artwork_issue", "preparing_artwork", "submitted_to_printer", "sent_to_maker", "in_production", "shipped", "delivered", "cancelled", "refunded", "production_error"];

describe("order numbers", () => {
  it("accepts the human format and rejects raw ids", () => {
    assert.ok(ORDER_NUMBER_PATTERN.test("BT-000127"));
    assert.ok(!ORDER_NUMBER_PATTERN.test("BT-127"));
    assert.ok(!ORDER_NUMBER_PATTERN.test("6c1d7c3e-1b2a-4c3d-8e9f-0a1b2c3d4e5f"));
  });
});

describe("state machine", () => {
  it("has a transition list and labels for every status", () => {
    for (const s of ALL) {
      assert.ok(Array.isArray(TRANSITIONS[s]), s);
      assert.ok(ADMIN_STATUS_LABEL[s], s);
      assert.ok(CUSTOMER_STATUS_LABEL[s], s);
    }
  });
  it("follows the manual production flow", () => {
    assert.ok(canTransition("needs_review", "artwork_approved"));
    assert.ok(canTransition("needs_review", "artwork_issue"));
    assert.ok(canTransition("artwork_approved", "sent_to_maker"));
    assert.ok(canTransition("sent_to_maker", "in_production"));
    assert.ok(canTransition("in_production", "shipped"));
    assert.ok(canTransition("shipped", "delivered"));
  });
  it("never leaves a closed order and never skips backwards into payment", () => {
    assert.equal(TRANSITIONS.cancelled.length, 0);
    assert.equal(TRANSITIONS.refunded.length, 0);
    assert.ok(!canTransition("shipped", "needs_review"));
    assert.ok(!canTransition("delivered", "in_production"));
    assert.ok(!canTransition("needs_review", "needs_review"));
  });
  it("customer statuses never leak internal wording", () => {
    for (const s of ALL) {
      assert.ok(!/error|_/i.test(CUSTOMER_STATUS_LABEL[s]), `${s}: ${CUSTOMER_STATUS_LABEL[s]}`);
    }
  });
  it("customer timeline reaches the right steps", () => {
    const paid = customerStepState("needs_review");
    assert.deepEqual(paid.map((s) => s.done), [true, true, false, false, false, false]);
    const shipped = customerStepState("shipped");
    assert.deepEqual(shipped.map((s) => s.done), [true, true, true, true, true, false]);
  });
});

describe("production files", () => {
  it("names admin downloads after the order number", () => {
    assert.equal(productionFileName("BT-000127", "production-svg"), "BT-000127-production.svg");
    assert.equal(productionFileName("BT-000127", "production-png"), "BT-000127-production.png");
    assert.equal(productionFileName("BT-000127", "proof-png"), "BT-000127-proof.png");
    assert.equal(productionFileName("BT-000127", "package"), "BT-000127-production-package.zip");
  });
  it("strips anything unsafe from the order number", () => {
    assert.equal(productionFileName("BT-0001/../27", "production-svg"), "BT-000127-production.svg");
  });
  it("builds shipping lines without blanks", () => {
    const lines = shippingLines({ shipping_name: "John Smith", shipping_line1: "1 Boost Ln", shipping_line2: "", shipping_city: "Orlando", shipping_state: "FL", shipping_postal_code: "32801", shipping_country: "US", shipping_company: "" });
    assert.deepEqual(lines, ["John Smith", "1 Boost Ln", "Orlando, FL 32801", "US"]);
  });
});

describe("stripe webhook signatures", () => {
  const secret = "whsec_testsecret";
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const sign = (ts: number) => createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

  it("accepts a fresh, correctly signed payload", () => {
    const ts = Math.floor(Date.now() / 1000);
    assert.ok(verifyStripeSignature(body, `t=${ts},v1=${sign(ts)}`, secret));
  });
  it("rejects a bad signature, a missing header and an old timestamp", () => {
    const ts = Math.floor(Date.now() / 1000);
    assert.ok(!verifyStripeSignature(body, `t=${ts},v1=${"0".repeat(64)}`, secret));
    assert.ok(!verifyStripeSignature(body, null, secret));
    const old = ts - 3600;
    assert.ok(!verifyStripeSignature(body, `t=${old},v1=${sign(old)}`, secret));
  });
  it("rejects a tampered body", () => {
    const ts = Math.floor(Date.now() / 1000);
    assert.ok(!verifyStripeSignature(body + " ", `t=${ts},v1=${sign(ts)}`, secret));
  });
});

describe("production sheet", () => {
  const order = {
    id: "5c602f6f-c91a-4bb7-a56e-ec46e36aa1b7",
    order_number: "BT-000127",
    shipping_name: "Demo Customer",
    shipping_company: "",
    shipping_line1: "1 Boost Lane",
    shipping_line2: "",
    shipping_city: "Orlando",
    shipping_state: "FL",
    shipping_postal_code: "32801",
    shipping_country: "US",
    shipping_phone: "407-555-0142",
    customer_email: "demo@buildtag.example",
    admin_notes: "internal: customer is picky",
    total_cents: 2999,
    payment_reference: "cs_test_secret",
  } as unknown as import("../src/lib/types").OrderRow;
  const item = { product_name: "Exterior BuildTag", product_sku: "BT-EXT-4X4-GLOSS", description: "x", quantity: 2, width: 4, height: 4, units: "in", material: "gloss", finish: "standard" } as unknown as import("../src/lib/types").OrderItemRow;
  const snapshot = { id: "snap", qr_destination_at_order: "https://buildtags.app/s/GHS7K2P9", validation_status: "passed", artwork_sha256: "abcdef0123456789abcdef", width: 4, height: 4, units: "in", material: "gloss" } as unknown as import("../src/lib/types").ProductionSnapshotRow;
  const html = productionSheetHtml({ order, item, snapshot, spec: null, vehicle: { year: 2022, make: "Toyota", model: "GR Supra", trim: "", nickname: "GHOST" }, proofSrc: null, qrSvg: null, notes: "" });

  it("carries everything the maker needs", () => {
    for (const s of ["BT-000127", "BT-EXT-4X4-GLOSS", "4 x 4 inches", "Demo Customer", "1 Boost Lane", "Orlando, FL 32801", "https://buildtags.app/s/GHS7K2P9", "PASSED", "BT-000127-production.svg", "GR Supra"]) {
      assert.ok(html.includes(s), s);
    }
  });
  it("never leaks payment, email or internal notes", () => {
    for (const s of ["cs_test_secret", "demo@buildtag.example", "internal: customer is picky", "29.99", "$"]) {
      assert.ok(!html.includes(s), s);
    }
  });
});
