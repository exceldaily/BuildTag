import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { LEGAL, LEGAL_ADDRESS_LINES, LEGAL_DOCS } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Copyright Policy",
  description: "How to report copyright infringement on BuildTags and how counter-notices work.",
  alternates: { canonical: "/copyright" },
};

/*
 * TODO(legal): register a DMCA designated agent with the U.S. Copyright Office
 * (dmca.copyright.gov) and then name that agent here. Until that is done this
 * page must NOT claim that BuildTags has a registered designated agent.
 */

const B = LEGAL.brand;

const S: LegalSection[] = [
  {
    id: "report",
    title: "Reporting infringement",
    content: (
      <>
        <p>
          If you believe content on {B} (for example a photo, logo or description on a build page) infringes your copyright, send a written notice that
          includes:
        </p>
        <ol>
          <li>the name of the copyright owner and, if you are acting for them, your name and your authority to act;</li>
          <li>a description of the copyrighted work you believe is infringed;</li>
          <li>the web address (URL) of each page, and a description of the specific material, you want removed;</li>
          <li>your contact information: mailing address, phone number and email address;</li>
          <li>a statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent or the law;</li>
          <li>
            a statement that the information in your notice is accurate and, under penalty of perjury, that you are the copyright owner or authorized to act on
            the owner&apos;s behalf;
          </li>
          <li>your physical or electronic signature.</li>
        </ol>
      </>
    ),
  },
  {
    id: "send",
    title: "Where to send notices",
    content: (
      <>
        <p>
          Email: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> (subject line &quot;Copyright notice&quot;)
        </p>
        <p>
          Mail: {B}, Attn: Copyright,{" "}
          {LEGAL_ADDRESS_LINES.map((l, i) => (
            <span key={l}>
              {l}
              {i < LEGAL_ADDRESS_LINES.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
        <p>
          You can also use the Report button on any build page and choose &quot;Copyright&quot;. For a formal notice, please also email us the details listed
          above.
        </p>
      </>
    ),
  },
  {
    id: "next",
    title: "What happens next",
    content: (
      <p>
        When we receive a complete notice, we will act promptly to remove or disable access to the material, and we will let the person who posted it know and
        give them a copy of the notice (with your personal contact details removed where appropriate).
      </p>
    ),
  },
  {
    id: "counter",
    title: "Counter-notices",
    content: (
      <>
        <p>If your content was removed and you believe that was a mistake or misidentification, you can send a counter-notice that includes:</p>
        <ol>
          <li>your name, address, phone number and email address;</li>
          <li>identification of the material that was removed and where it appeared before removal;</li>
          <li>
            a statement under penalty of perjury that you have a good-faith belief the material was removed as a result of a mistake or misidentification;
          </li>
          <li>
            a statement that you consent to the jurisdiction of the federal district court for your address (or, if you are outside the United States, any
            judicial district in which {B} may be found), and that you will accept service of process from the person who sent the original notice;
          </li>
          <li>your physical or electronic signature.</li>
        </ol>
        <p>
          We may forward your counter-notice to the person who filed the original notice. Where the law allows, we may restore the material unless they tell us
          they have filed a court action.
        </p>
      </>
    ),
  },
  {
    id: "misuse",
    title: "Accuracy",
    content: (
      <p>
        Only send a notice or counter-notice if you believe it is accurate. Knowingly misrepresenting that material is infringing, or that it was removed by
        mistake, can make you liable for damages. If you are not sure whether something infringes your rights, consider getting legal advice first.
      </p>
    ),
  },
  {
    id: "repeat",
    title: "Repeat infringers",
    content: <p>We terminate, in appropriate circumstances, the accounts of users who repeatedly infringe other people&apos;s copyrights.</p>,
  },
  {
    id: "trademarks",
    title: "Trademarks and other concerns",
    content: (
      <p>
        For trademark concerns, impersonation of a business, or other rights issues, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with the
        details and the page address. See also our <Link href="/community-guidelines">Community Guidelines</Link> and{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
];

export default function CopyrightPage() {
  return (
    <LegalPage
      doc={LEGAL_DOCS.copyright}
      intro={
        <p>
          {B} respects the rights of photographers, artists and brand owners, and expects its users to do the same. This policy explains how to report
          content you believe infringes your copyright.
        </p>
      }
      sections={S}
    />
  );
}
