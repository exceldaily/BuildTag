/**
 * BuildTag wording rules: every plan can remove lines and use ready-made
 * wording; typing your own words is Pro.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TEMPLATES, layoutTag } from "../src/lib/tag";
import type { TagConfig, TagData } from "../src/lib/tag/types";
import { SAMPLE_LINES, isSampleLine, stripCustomWording, usesCustomWording } from "../src/lib/tag/wording";

const DATA: TagData = {
  scanUrl: "https://buildtags.app/s/BF5JPWWN",
  year: 2013,
  make: "Scion",
  model: "FRS",
  trim: "",
  nickname: "",
  powerLabel: "200 WHP",
  torqueLabel: "160 WTQ",
  modCount: 7,
  username: "thirstypanda",
  socials: [],
};

function withText(patch: Partial<TagConfig["text"]>): TagConfig {
  const c = TEMPLATES.techspec.build();
  return { ...c, text: { ...c.text, ...patch } };
}

describe("tag wording", () => {
  it("treats presets and sample lines as free wording", () => {
    assert.equal(usesCustomWording(TEMPLATES.techspec.build()), false);
    for (const line of SAMPLE_LINES) {
      assert.equal(isSampleLine(line), true);
      assert.equal(usesCustomWording(withText({ custom: line })), false);
    }
    assert.equal(usesCustomWording(withText({ custom: "" })), false);
  });

  it("flags typed-in wording as Pro", () => {
    assert.equal(usesCustomWording(withText({ custom: "MY OWN WORDS" })), true);
    assert.equal(usesCustomWording(withText({ headline: "custom", headlineCustom: "HELLO" })), true);
    assert.equal(usesCustomWording(withText({ cta: "custom", ctaCustom: "TAP IN" })), true);
    // Choosing "custom" but leaving it blank prints nothing, so it isn't Pro wording.
    assert.equal(usesCustomWording(withText({ headline: "custom", headlineCustom: "  " })), false);
  });

  it("strips typed-in wording and keeps presets and samples", () => {
    const stripped = stripCustomWording(withText({ headline: "custom", headlineCustom: "HELLO", cta: "custom", ctaCustom: "TAP IN", custom: "MY OWN WORDS" }));
    assert.equal(stripped.text.headline, "none");
    assert.equal(stripped.text.headlineCustom, "");
    assert.equal(stripped.text.cta, "scan");
    assert.equal(stripped.text.custom, "");
    assert.equal(usesCustomWording(stripped), false);

    const kept = stripCustomWording(withText({ headline: "build-sheet", cta: "see-mods", custom: "DAILY DRIVEN" }));
    assert.equal(kept.text.headline, "build-sheet");
    assert.equal(kept.text.cta, "see-mods");
    assert.equal(kept.text.custom, "DAILY DRIVEN");
  });

  it("removes the power line from the tag when its box is unticked", () => {
    const on = TEMPLATES.techspec.build();
    assert.ok(layoutTag(on, DATA).lines.some((l) => l.text === "200 WHP"));
    const off: TagConfig = { ...on, text: { ...on.text, fields: { ...on.text.fields, power: false } } };
    assert.ok(!layoutTag(off, DATA).lines.some((l) => l.text === "200 WHP"));
  });
});
