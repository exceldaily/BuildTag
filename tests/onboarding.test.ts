/**
 * First-run walkthrough: the guide bar shows the right tip on every screen
 * of the setup flow and stays quiet everywhere else.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { t } from "../src/lib/i18n/dictionary";
import { TOUR_TOTAL_STEPS, guideStepForPath, type GuideTipKey } from "../src/lib/onboarding";

const ID = "3f0c9a2e-1111-4222-8333-444455556666";

describe("walkthrough guide", () => {
  it("follows the member through the whole loop in order", () => {
    const flow: [string, number, GuideTipKey][] = [
      ["/dashboard", 1, "guide_garage"],
      ["/dashboard/vehicles/new", 1, "guide_vehicle"],
      [`/dashboard/vehicles/${ID}/setup/photos`, 2, "guide_photos"],
      [`/dashboard/vehicles/${ID}/setup/performance`, 2, "guide_performance"],
      [`/dashboard/vehicles/${ID}/setup/socials`, 2, "guide_socials"],
      [`/dashboard/vehicles/${ID}/setup/modifications`, 2, "guide_mods"],
      [`/dashboard/vehicles/${ID}/setup/buildtag`, 3, "guide_buildtag"],
      [`/dashboard/vehicles/${ID}/tag-designer`, 3, "guide_designer"],
      ["/dashboard/orders/new", 4, "guide_checkout"],
    ];
    let prev = 0;
    for (const [path, step, tip] of flow) {
      const g = guideStepForPath(path);
      assert.ok(g, path);
      assert.equal(g.step, step, path);
      assert.equal(g.tip, tip, path);
      assert.ok(g.step >= prev && g.step <= TOUR_TOTAL_STEPS, "steps never go backwards");
      prev = g.step;
    }
    assert.equal(guideStepForPath("/dashboard/orders/new")?.last, true);
  });

  it("covers the editor tabs and ignores a trailing slash", () => {
    assert.equal(guideStepForPath(`/dashboard/vehicles/${ID}/modifications/`)?.tip, "guide_mods");
    assert.equal(guideStepForPath(`/dashboard/vehicles/${ID}/buildtag`)?.tip, "guide_buildtag");
  });

  it("stays quiet on screens outside the setup flow", () => {
    for (const path of ["/dashboard/profile", "/dashboard/orders", "/dashboard/crew", `/dashboard/vehicles/${ID}`, `/dashboard/vehicles/${ID}/analytics`, "/admin", "/"]) {
      assert.equal(guideStepForPath(path), null, path);
    }
  });

  it("every tip and slide has copy in all five languages, with no dashes", () => {
    const keys = ["tour_skip", "tour_next", "tour_back", "tour_start", "tour_replay", "tour_step", "tour_skip_guide", "tour_got_it", "tour_finish", "tour_s1_title", "tour_s1_body", "tour_s2_title", "tour_s2_body", "tour_s3_title", "tour_s3_body", "tour_s4_title", "tour_s4_body", "guide_garage", "guide_vehicle", "guide_photos", "guide_performance", "guide_socials", "guide_mods", "guide_buildtag", "guide_designer", "guide_checkout"] as const;
    for (const locale of ["en", "fr", "de", "es", "th"] as const) {
      for (const k of keys) {
        const text = t(locale, k, { n: 1, total: 4 });
        assert.ok(text.length > 1, `${locale}.${k}`);
        assert.doesNotMatch(text, /[–—]/, `${locale}.${k}`);
      }
    }
  });
});
