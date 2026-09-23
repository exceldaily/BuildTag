import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="September 2026"
      intro="BuildTag collects as little as it can. This policy explains what we store, why, and what we deliberately do not store."
      sections={[
        {
          title: "What we collect from owners",
          body: [
            "Account: email address and password hash (handled by our authentication provider), username, display name and optional avatar, bio, general location text and website.",
            "Build data: vehicle details, photos, performance figures, modifications, part links and social media links you choose to add.",
            "Uploaded photos are re-encoded on our servers, which removes embedded EXIF data such as GPS coordinates.",
          ],
        },
        {
          title: "What we collect from visitors who scan a BuildTag",
          body: [
            "A scan records the time, the country reported by our hosting provider's edge network, a coarse device type (phone, tablet, desktop) and the referring site's hostname. We do not store IP addresses or user agent strings in scan records.",
            "Likes and reports use an anonymous, non-reversible key derived from a first-party cookie and coarse network information. It cannot be used to identify you.",
            "We do not use third-party advertising trackers.",
          ],
        },
        {
          title: "What is public",
          body: [
            "Anything on a public or unlisted build page is visible to anyone with the link, including search engines for public builds. Private builds are visible only to their owner while signed in.",
            "Your email address and internal identifiers are never shown publicly.",
          ],
        },
        {
          title: "Where data lives",
          body: [
            "BuildTag runs on Vercel and Supabase. Data may be processed in the United States. Photos are stored in Supabase Storage.",
          ],
        },
        {
          title: "Your rights",
          body: [
            "You can edit or delete your builds and photos at any time from the dashboard. Contact us to delete your account entirely or to request a copy of your data.",
          ],
        },
        {
          title: "Cookies",
          body: [
            "We use strictly necessary cookies for sign-in sessions and one anonymous visitor cookie for likes and abuse prevention.",
          ],
        },
      ]}
    />
  );
}
