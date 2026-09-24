import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { LEGAL, LEGAL_DOCS } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "Keep it honest, keep it yours, keep it safe. The rules for builds, Crews and businesses on BuildTags.",
  alternates: { canonical: "/community-guidelines" },
};

const B = LEGAL.brand;

const S: LegalSection[] = [
  {
    id: "yours",
    title: "Post builds you have the right to post",
    content: (
      <>
        <p>
          Only create or claim a profile for a vehicle you own, or that you are authorized to represent (for example as the shop that built it). Do not claim
          ownership of a vehicle that is not yours.
        </p>
        <p>
          Only upload photos, logos and other content you have the right to use. Do not post other people&apos;s cars or photos as your own. See our{" "}
          <Link href="/copyright">Copyright Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "honest",
    title: "Keep it honest",
    content: (
      <>
        <p>
          Power figures, dyno results, mileage, build costs and part lists should reflect the actual vehicle. Estimates are fine when you say they are estimates.
        </p>
        <p>
          Businesses must represent themselves accurately and only record work they actually did. Do not create false vehicle records or false attribution.
        </p>
      </>
    ),
  },
  {
    id: "people",
    title: "Respect people",
    content: (
      <ul>
        <li>No harassment, bullying, threats or intimidation.</li>
        <li>No hate speech or abuse targeting people for who they are.</li>
        <li>No doxxing: do not post someone else&apos;s private information, such as a home address or license plate tied to a person, without consent.</li>
        <li>No impersonation of people, shops, dealers, manufacturers or other brands.</li>
      </ul>
    ),
  },
  {
    id: "links",
    title: "No spam or malicious links",
    content: (
      <ul>
        <li>Product links should point to the actual part on the vehicle. Do not use build pages as link farms or to push unrelated products.</li>
        <li>No phishing, malware, scams or misleading redirects, and no links designed to trick people who scan a BuildTag.</li>
        <li>If you add affiliate links, follow your programs&apos; rules and the law on disclosure.</li>
      </ul>
    ),
  },
  {
    id: "legal",
    title: "Nothing illegal or dangerous",
    content: (
      <ul>
        <li>No illegal content, stolen parts or vehicles, or fraud.</li>
        <li>Do not promote street racing on public roads, reckless driving or other dangerous activity.</li>
        <li>Never scan or use {B} while driving.</li>
      </ul>
    ),
  },
  {
    id: "crews",
    title: "Crews and businesses",
    content: (
      <p>
        Crew and business owners are responsible for who they add and what they post. Do not add people or vehicles to a Crew to mislead others about who you
        are associated with.
      </p>
    ),
  },
  {
    id: "report",
    title: "Reporting problems",
    content: (
      <>
        <p>
          Every public build has a Report button. Reports are reviewed by our moderators, who can hide builds, disable BuildTags or suspend accounts. You can also
          email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
        <p>Please report in good faith. Abusing the report system can itself lead to action.</p>
      </>
    ),
  },
  {
    id: "enforcement",
    title: "Enforcement",
    content: (
      <p>
        These guidelines are part of our <Link href="/terms">Terms of Service</Link>. Depending on how serious a violation is, we may remove content, disable a
        BuildTag, restrict features or suspend an account. We aim to be fair and consistent, and you can ask us to review a decision by emailing us.
      </p>
    ),
  },
];

export default function GuidelinesPage() {
  return (
    <LegalPage
      doc={LEGAL_DOCS.community}
      intro={<p>{B} is for showing off real builds. Keep it honest, keep it yours, keep it safe.</p>}
      sections={S}
    />
  );
}
