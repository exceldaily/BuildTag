/**
 * Affiliate link helpers shared by the editor, the public page and the
 * marketing copy. Detection is heuristic: it recognises the big networks'
 * URL shapes so the editor can name the program and warn when a link is
 * a plain product page with no tracking on it.
 */

export interface AffiliateProgram {
  id: string;
  name: string;
  /** Who it is for, in one line. */
  fit: string;
  signupUrl: string;
  /** How the link usually looks, so owners recognise a real one. */
  looksLike: string;
}

export const AFFILIATE_PROGRAMS: AffiliateProgram[] = [
  {
    id: "amazon",
    name: "Amazon Associates",
    fit: "Fluids, filters, tools, lighting, detailing. Fast approval, everyone already shops there.",
    signupUrl: "https://affiliate-program.amazon.com/",
    looksLike: "amazon.com/dp/… ?tag=yourname-20 or amzn.to/…",
  },
  {
    id: "ebay",
    name: "eBay Partner Network",
    fit: "Used and rare parts, wheels, OEM+ bits.",
    signupUrl: "https://partnernetwork.ebay.com/",
    looksLike: "ebay.com/itm/… ?mkcid=1&campid=… or ebay.us/…",
  },
  {
    id: "impact",
    name: "Impact",
    fit: "Big aftermarket retailers run their programs here. Search their marketplace for the brands on your car.",
    signupUrl: "https://impact.com/",
    looksLike: "brand.sjv.io/… or brand.pxf.io/…",
  },
  {
    id: "shareasale",
    name: "ShareASale / Awin",
    fit: "Hundreds of performance and accessory shops.",
    signupUrl: "https://www.shareasale.com/",
    looksLike: "shareasale.com/r.cfm?… or awin1.com/cread.php?…",
  },
  {
    id: "avantlink",
    name: "AvantLink",
    fit: "Truck, off-road and outdoor gear retailers.",
    signupUrl: "https://www.avantlink.com/",
    looksLike: "avantlink.com/click.php?…",
  },
  {
    id: "cj",
    name: "CJ (Commission Junction)",
    fit: "Tires, wheels and big-box auto retailers.",
    signupUrl: "https://www.cj.com/",
    looksLike: "anrdoezrs.net, jdoqocy.com, tkqlkiy.com, dpbolvw.net links",
  },
  {
    id: "brand",
    name: "Direct brand programs",
    fit: "Many tuners, turbo shops and wheel companies pay creators directly. Ask the brands already on your car.",
    signupUrl: "",
    looksLike: "brand.com/?ref=yourname or a coupon code in the description",
  },
];

export interface AffiliateDetection {
  /** Program id from AFFILIATE_PROGRAMS, or "custom" for unknown but tracked, or null for plain. */
  network: string | null;
  label: string;
  /** True when the URL carries something that looks like tracking. */
  tracked: boolean;
}

const HOST_RULES: { test: (host: string, url: URL) => boolean; network: string; label: string }[] = [
  { test: (h) => h === "amzn.to" || h.endsWith(".amzn.to"), network: "amazon", label: "Amazon Associates" },
  { test: (h, u) => /(^|\.)amazon\./.test(h) && u.searchParams.has("tag"), network: "amazon", label: "Amazon Associates" },
  { test: (h) => h === "ebay.us" || h.endsWith(".ebay.us"), network: "ebay", label: "eBay Partner Network" },
  { test: (h, u) => /(^|\.)ebay\./.test(h) && (u.searchParams.has("campid") || u.searchParams.has("mkcid")), network: "ebay", label: "eBay Partner Network" },
  { test: (h) => /\.(sjv|pxf|7eer|evyy|ojrq|lusg|zdfl|ntrq|adtr)\.(io|net|com)$/.test(h), network: "impact", label: "Impact" },
  { test: (h) => h.endsWith("shareasale.com") || h.endsWith("shareasale-analytics.com") || h.endsWith("awin1.com"), network: "shareasale", label: "ShareASale / Awin" },
  { test: (h) => h.endsWith("avantlink.com"), network: "avantlink", label: "AvantLink" },
  { test: (h) => /(anrdoezrs\.net|jdoqocy\.com|tkqlkiy\.com|dpbolvw\.net|kqzyfj\.com)$/.test(h), network: "cj", label: "CJ" },
  { test: (h) => h.endsWith("go.skimresources.com") || h.endsWith("skimlinks.com"), network: "skimlinks", label: "Skimlinks" },
  { test: (h) => h.endsWith("linksynergy.com") || h.endsWith("rakutenadvertising.com"), network: "rakuten", label: "Rakuten Advertising" },
  { test: (h) => h.endsWith("geni.us"), network: "geniuslink", label: "Geniuslink" },
];

const TRACKING_PARAMS = ["ref", "ref_", "aff", "affid", "aff_id", "affiliate", "afid", "sca_ref", "utm_source", "rfsn", "irclickid", "clickid", "subid", "sid", "tag", "campid", "mkcid", "u1"];

export function detectAffiliate(raw: string): AffiliateDetection {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { network: null, label: "", tracked: false };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  for (const rule of HOST_RULES) {
    if (rule.test(host, url)) return { network: rule.network, label: rule.label, tracked: true };
  }
  const tracked = TRACKING_PARAMS.some((p) => url.searchParams.has(p)) || /\/ref\/|\/r\/|\/go\//.test(url.pathname);
  return tracked ? { network: "custom", label: "Tracked link", tracked: true } : { network: null, label: "", tracked: false };
}

/** Human label for a stored network id (falls back to the raw text an owner typed). */
export function affiliateNetworkLabel(id: string): string {
  const p = AFFILIATE_PROGRAMS.find((x) => x.id === id);
  if (p) return p.name;
  const rule = HOST_RULES.find((r) => r.network === id);
  return rule?.label ?? id;
}

/** The disclosure every public page shows when a build carries affiliate links. */
export const AFFILIATE_DISCLOSURE = "Some part links are affiliate links. The owner may earn a commission if you buy through them, at no extra cost to you.";
