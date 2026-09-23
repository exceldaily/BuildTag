import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Community Guidelines", alternates: { canonical: "/community-guidelines" } };

export default function GuidelinesPage() {
  return (
    <LegalPage
      eyebrow="Community"
      title="Community Guidelines"
      updated="September 2026"
      intro="BuildTag is for showing off real builds. Keep it honest, keep it yours, keep it safe."
      sections={[
        {
          title: "Post your own build",
          body: [
            "Only create BuildTags for vehicles you own or have permission to represent. Do not upload other people's cars or photos as your own.",
          ],
        },
        {
          title: "Keep numbers honest",
          body: [
            "Dyno numbers, build costs and part lists should reflect the actual car. Estimates are fine when labelled as such.",
          ],
        },
        {
          title: "No harassment or hate",
          body: ["No slurs, threats, doxxing or targeted harassment anywhere on BuildTag, including in captions and descriptions."],
        },
        {
          title: "No spam",
          body: [
            "Product links should point to the actual part on the car. Do not use build pages as link farms or to push unrelated products.",
          ],
        },
        {
          title: "Nothing illegal",
          body: ["Do not use BuildTag to advertise illegal street racing, stolen parts, or anything else that breaks the law where you are."],
        },
        {
          title: "Reporting",
          body: [
            "Every public build has a Report button. Reports are reviewed by moderators who can disable builds and BuildTags. Abuse of the report system may itself lead to action.",
          ],
        },
      ]}
    />
  );
}
