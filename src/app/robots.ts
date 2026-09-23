import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/build/", "/explore"],
        disallow: ["/dashboard", "/admin", "/api/", "/auth/", "/s/", "/out/", "/login", "/signup"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
