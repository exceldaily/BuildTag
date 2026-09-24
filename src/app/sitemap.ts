import type { MetadataRoute } from "next";

import { listSitemapBuilds } from "@/lib/db/public";
import { siteUrl } from "@/lib/env";

export const revalidate = 3600;

/** Public builds only. Unlisted and private builds are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const statics: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/leaderboard`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${base}/crews`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/business`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/business/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/community-guidelines`, changeFrequency: "yearly", priority: 0.2 },
  ];
  let builds: MetadataRoute.Sitemap = [];
  try {
    builds = (await listSitemapBuilds()).map((b) => ({
      url: `${base}/build/${b.slug}`,
      lastModified: new Date(b.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    builds = [];
  }
  return [...statics, ...builds];
}
