import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Copyright / DMCA", alternates: { canonical: "/dmca" } };

export default function DmcaPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Copyright / DMCA"
      updated="September 2026"
      intro="BuildTag respects the rights of photographers and creators. If your work has been posted without permission, tell us."
      sections={[
        {
          title: "Filing a notice",
          body: [
            "Send a notice that includes: the URL of the build page, a description of the copyrighted work, your contact details, a statement that you have a good-faith belief the use is not authorised, a statement under penalty of perjury that the information is accurate and that you are the owner or authorised to act for the owner, and your physical or electronic signature.",
            "Use the Report button on the build page with the reason Copyright, or email the address published on the About page once launched.",
          ],
        },
        {
          title: "What happens next",
          body: [
            "We remove or disable access to the material promptly, notify the owner, and give them the opportunity to file a counter-notice.",
          ],
        },
        {
          title: "Counter-notices",
          body: [
            "If you believe your content was removed by mistake, send a counter-notice with the same identification details, your consent to jurisdiction, and a statement under penalty of perjury that the removal was a mistake or misidentification.",
          ],
        },
        {
          title: "Repeat infringers",
          body: ["Accounts that repeatedly post infringing material will be terminated."],
        },
      ]}
    />
  );
}
