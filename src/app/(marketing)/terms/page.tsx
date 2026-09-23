import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="September 2026"
      intro="These terms govern your use of BuildTag, including the website, dashboard, public build pages and BuildTag Designer."
      sections={[
        {
          title: "1. Your account",
          body: [
            "You must be at least 16 years old to create an account. You are responsible for keeping your login credentials secure and for everything that happens under your account.",
            "One person may hold one account. Usernames that impersonate other people, brands or shops may be reclaimed.",
          ],
        },
        {
          title: "2. Your content",
          body: [
            "You own the photos, descriptions and build information you upload. By publishing a build as public or unlisted you grant BuildTag a non-exclusive licence to display, resize and cache that content so the service works, including in previews when your page is shared.",
            "You must have the rights to every photo you upload. Do not upload images you did not take unless you have permission from the photographer.",
          ],
        },
        {
          title: "3. Physical decals",
          body: [
            "BuildTag provides print-ready artwork. Printing, application and the physical decal itself are your responsibility. Always test-scan a printed decal before applying it.",
            "QR codes are permanent for the life of the vehicle record. BuildTag may disable a code that is used to violate these terms.",
          ],
        },
        {
          title: "4. Product links",
          body: [
            "Owners may link to parts and products. BuildTag does not sell those products, does not verify listings, and may earn a commission from affiliate links marked as such in the future.",
          ],
        },
        {
          title: "5. Acceptable use",
          body: [
            "Do not use BuildTag to harass, impersonate, spam or infringe. The Community Guidelines form part of these terms.",
            "Do not attempt to access other users' data, bypass rate limits or interfere with the service.",
          ],
        },
        {
          title: "6. Plans and payment",
          body: [
            "The Free plan is free. Paid plans, when offered, renew automatically until cancelled and are billed through our payment provider. Fees are non-refundable except where required by law.",
          ],
        },
        {
          title: "7. Termination",
          body: [
            "You can delete your vehicles and account at any time. We may suspend or terminate accounts that breach these terms.",
          ],
        },
        {
          title: "8. Disclaimer and liability",
          body: [
            "BuildTag is provided as is. To the maximum extent permitted by law we are not liable for indirect or consequential losses, including losses arising from a decal that fails to scan.",
          ],
        },
        {
          title: "9. Changes",
          body: ["We may update these terms. Material changes will be announced on the site or by email before they take effect."],
        },
      ]}
    />
  );
}
