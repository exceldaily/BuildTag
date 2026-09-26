import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, OperatorBlock, type LegalSection } from "@/components/marketing/legal-page";
import { LEGAL, LEGAL_DOCS } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern BuildTags.app, BuildTags products and BuildTags Business.",
  alternates: { canonical: "/terms" },
};

/*
 * TODO(legal): FINAL ARBITRATION LANGUAGE REQUIRES ATTORNEY REVIEW.
 * No arbitration agreement or class-action waiver is published. Until an
 * attorney-reviewed clause exists, disputes fall under the governing law and
 * venue section below. Do not add an arbitration section without that review.
 */

const S: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these Terms",
    content: (
      <>
        <p>
          By creating an account, placing an order, claiming a vehicle or otherwise using {LEGAL.brand}, you agree to these Terms. If you do not agree, do not
          use {LEGAL.brand}. If you use {LEGAL.brand} for a business, you agree on behalf of that business and confirm you have authority to do so.
        </p>
        <p>
          These Terms work together with our <Link href="/privacy">Privacy Policy</Link>, <Link href="/disclaimer">Disclaimer</Link>,{" "}
          <Link href="/refunds">Refund &amp; Replacement Policy</Link>, <Link href="/community-guidelines">Community Guidelines</Link> and{" "}
          <Link href="/copyright">Copyright Policy</Link>, which are part of these Terms.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility and accounts",
    content: (
      <>
        <p>
          You must be at least 16 years old to create an account and legally able to enter into this agreement. Purchases, subscriptions and Business accounts
          require an adult who can form a binding contract where you live (usually 18). A minor may use a purchase made by a parent or guardian who agrees to
          these Terms.
        </p>
        <p>You agree to:</p>
        <ul>
          <li>give accurate information and keep it up to date;</li>
          <li>keep your password secure and tell us promptly if you think your account has been accessed without permission;</li>
          <li>take responsibility for activity under your account, except activity caused by our own failure.</li>
        </ul>
        <p>
          You may not impersonate any person, shop, dealership, business, vehicle owner or manufacturer, or suggest a connection with them that does not exist.
        </p>
        <p>
          We may suspend or restrict an account when we reasonably believe it is involved in fraud, a security threat, illegal activity, abuse or a violation of
          these Terms. Where appropriate and lawful we will tell you why and give you a chance to respond.
        </p>
      </>
    ),
  },
  {
    id: "services",
    title: "What BuildTags provides",
    content: (
      <>
        <p>{LEGAL.brand} may provide, among other things:</p>
        <ul>
          <li>digital vehicle profiles and build sheets, including modification records, photos, performance information and social links;</li>
          <li>product links, including affiliate links added by owners;</li>
          <li>permanent BuildTag identifiers, physical BuildTags and QR redirects;</li>
          <li>Crews and other community features, and analytics about scans and clicks;</li>
          <li>business, shop and dealer profiles, builder and installer attribution, customer build creation, customer claiming and vehicle transfers;</li>
          <li>order management for physical products.</li>
        </ul>
        <p>Features may be added, changed or retired over time. See the section on availability and changes below.</p>
      </>
    ),
  },
  {
    id: "automotive-disclaimer",
    title: "Important automotive disclaimer",
    content: (
      <>
        <p>
          <strong>
            {LEGAL.brand} does not inspect, certify, approve, guarantee, endorse or warrant a vehicle because it appears on {LEGAL.brand}.
          </strong>
        </p>
        <p>Unless we expressly say otherwise for a specific item, {LEGAL.brand} does not guarantee:</p>
        <ul>
          <li>vehicle condition, safety or roadworthiness;</li>
          <li>the legality of any modification, or emissions compliance;</li>
          <li>horsepower, torque, mileage or build cost figures;</li>
          <li>parts compatibility, installation quality or repair quality;</li>
          <li>ownership or provenance;</li>
          <li>manufacturer approval, warranty coverage or insurance coverage;</li>
          <li>the accuracy of information submitted by users.</li>
        </ul>
        <p>
          Information on a profile may be submitted by owners, shops, dealers, builders, tuners, installers or other users. Read the full{" "}
          <Link href="/disclaimer">Disclaimer</Link>.
        </p>
      </>
    ),
  },
  {
    id: "performance",
    title: "Performance and specification claims",
    content: (
      <>
        <p>
          Horsepower, wheel horsepower, torque, acceleration, dyno results, mileage, build cost and similar figures may be reported by owners or businesses.{" "}
          {LEGAL.brand} does not independently verify them unless a profile expressly says so.
        </p>
        <p>You must not knowingly submit materially false information about a vehicle, its specifications or its history.</p>
      </>
    ),
  },
  {
    id: "attribution",
    title: "Attribution labels",
    content: (
      <>
        <p>
          Labels such as <em>Built by</em>, <em>Installed by</em>, <em>Shop installed</em>, <em>Shop recorded</em>, <em>Dealer recorded</em>,{" "}
          <em>Owner added</em> and <em>Tuned by</em> show who reported or recorded information, or who is credited for work, within {LEGAL.brand}.
        </p>
        <p>They do not by themselves mean that {LEGAL.brand}:</p>
        <ul>
          <li>certified or inspected the work or the vehicle;</li>
          <li>confirmed that the work is manufacturer approved, covered by warranty, road legal or emissions compliant;</li>
          <li>confirmed that the vehicle is safe or mechanically sound.</li>
        </ul>
      </>
    ),
  },
  {
    id: "verified",
    title: "What “Verified” means",
    content: (
      <>
        <p>
          When {LEGAL.brand} shows a verification badge, it states exactly what was verified. Today the only badge is <strong>Verified business</strong>, which
          means {LEGAL.brand} confirmed the business&apos;s identity and contact details.
        </p>
        <p>
          A verification badge never means that {LEGAL.brand} inspected or certified the safety, quality, legality, performance or mechanical condition of a
          vehicle, part or piece of work. {LEGAL.brand} does not currently offer vehicle inspection or certification services.
        </p>
      </>
    ),
  },
  {
    id: "qr",
    title: "The permanent BuildTag QR",
    content: (
      <>
        <p>
          Each vehicle gets a permanent identifier. A physical BuildTag encodes a short link such as <code>{LEGAL.websiteLabel}/s/CODE</code>, and the digital
          profile it opens can keep changing while the physical QR stays the same.
        </p>
        <p>
          Scanning can be affected by lighting, distance, camera quality, the device, internet connection, physical damage, dirt, water, the surface,
          installation, printing variation, environmental conditions and third-party software. We do not guarantee that every BuildTag will scan forever, on
          every device, from every distance or under every condition.
        </p>
        <p>We may disable a code that is used to violate these Terms, for example to send people to a malicious destination.</p>
      </>
    ),
  },
  {
    id: "products",
    title: "Physical products",
    content: (
      <>
        <p>
          {LEGAL.brand} may sell decals, stickers, window products, magnets, badges, plates, plate-mounted accessories, QR products and other vehicle
          accessories. Products may be manufactured or fulfilled by third parties on our behalf.
        </p>
        <p>
          Digital previews are representations. Reasonable production variation can occur in color, dimensions, cutting, positioning, material, finish and
          printing, and screens do not reproduce printed color exactly.
        </p>
      </>
    ),
  },
  {
    id: "proofs",
    title: "Custom artwork approval",
    content: (
      <>
        <p>Before a customized product goes into production you will be asked to review and approve a proof. You are responsible for checking:</p>
        <ul>
          <li>spelling, vehicle information, usernames and social handles;</li>
          <li>images, logos, colors and layout;</li>
          <li>the QR destination and any other customization.</li>
        </ul>
        <p>
          Your approval authorizes us to produce the product substantially as shown in the proof. We may make non-material technical changes needed for
          production, such as bleed, safe zones, cut paths, QR quiet zones, minimum sizes and file formatting, without changing the intended design.
        </p>
      </>
    ),
  },
  {
    id: "custom-returns",
    title: "Custom products, returns and replacements",
    content: (
      <>
        <p>
          Customized products are made specifically for you. Except where applicable law requires otherwise, they cannot be returned because you changed your
          mind, no longer want the product, or entered customization details that were then produced accurately.
        </p>
        <p>
          If a product is materially defective, materially different from the approved proof, wrong because of our or our fulfillment partner&apos;s error, or
          damaged in shipping, report it within {LEGAL.issueWindowDays} days of delivery. We may ask for photos or other reasonable evidence. Remedies may
          include a replacement, reprint, repair where appropriate, refund or any other remedy required by law. Details are in the{" "}
          <Link href="/refunds">Refund &amp; Replacement Policy</Link>. Nothing in these Terms limits rights you have under law that cannot be waived.
        </p>
      </>
    ),
  },
  {
    id: "installation",
    title: "Installation and removal",
    content: (
      <>
        <p>
          How well a physical BuildTag sticks, and how cleanly it comes off, depends on things like paint, wraps, ceramic coatings, glass, plastic, metal,
          surface preparation, temperature, weather, chemicals, pressure washing, the installation and removal method, and the age and condition of the
          finish. Unless we expressly say so for a particular product, we cannot guarantee compatibility with every surface.
        </p>
        <p>
          Follow the installation and removal instructions that come with your product. This section does not limit liability that cannot legally be limited.
        </p>
      </>
    ),
  },
  {
    id: "placement",
    title: "Safe placement",
    content: (
      <>
        <p>Do not install a BuildTag where it interferes with:</p>
        <ul>
          <li>the driver&apos;s visibility, license plates or legally required markings;</li>
          <li>lights, cameras, ADAS sensors or parking sensors;</li>
          <li>airbags or other safety equipment;</li>
        </ul>
        <p>or anywhere prohibited by law. You are responsible for complying with local vehicle and equipment laws.</p>
        <p>
          <strong>Never scan, configure or interact with a BuildTag while operating a vehicle.</strong>
        </p>
      </>
    ),
  },
  {
    id: "user-content",
    title: "Your content",
    content: (
      <>
        <p>
          &quot;User Content&quot; means anything you or your business submit, such as vehicle photos, videos, text, modifications, specifications, logos, shop
          information, usernames, social links, comments and build descriptions.
        </p>
        <p>
          You keep ownership of your User Content. You grant {LEGAL.brand} a non-exclusive, worldwide, royalty-free license to host, store, process, format,
          resize, display, transmit, serve and back up your User Content only as reasonably needed to operate and secure {LEGAL.brand}, including showing public
          content (for example in link previews when a page is shared) according to your visibility settings. The license ends when you delete the content,
          except for reasonable backup periods, copies others have already shared, and records we must keep by law.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    content: (
      <>
        <p>
          Only upload or use content you have the right to use, including photographs, logos, trademarks, artwork, manufacturer logos, shop logos and brand
          assets. Uploading a logo does not mean {LEGAL.brand} approved or licensed its use.
        </p>
        <p>
          We may remove material that is alleged to infringe someone&apos;s rights. See our <Link href="/copyright">Copyright Policy</Link> for how to report
          infringement.
        </p>
        <p>
          The {LEGAL.brand} name, logos, website, software and designer templates belong to {LEGAL.brand} or its licensors. You may not copy or reuse them except
          as these Terms allow.
        </p>
      </>
    ),
  },
  {
    id: "brands",
    title: "Automotive brand references",
    content: (
      <>
        <p>
          Profiles may name vehicle manufacturers, models, parts manufacturers, shops, dealers and product brands so people can identify a vehicle and its parts.
        </p>
        <p>
          Unless we expressly say otherwise, a reference to a third-party brand (for example Toyota, BMW, Harley-Davidson, Porsche, Ford or Chevrolet) does not
          mean that brand sponsors, partners with, endorses, approves or is affiliated with {LEGAL.brand}.
        </p>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Vehicles, accounts and ownership",
    content: (
      <>
        <p>
          On {LEGAL.brand} a vehicle is its own record, separate from any account. The person who created a profile, the current owner, the builder and the
          installer can all be different people or businesses. A vehicle can have relationships such as owner, creator, builder, dealer, installer, tuner and
          sponsor.
        </p>
        <p>
          <strong>
            {LEGAL.brand} profile ownership is not a certificate of title, a registration or legal proof of vehicle ownership, and the public BuildTag QR does not
            prove ownership.
          </strong>{" "}
          It only controls who manages the digital profile on {LEGAL.brand}.
        </p>
      </>
    ),
  },
  {
    id: "business-builds",
    title: "Builds created by shops and dealers",
    content: (
      <>
        <p>
          An authorized business can create a vehicle profile for a customer, document the modifications it installed, upload photos it is authorized to use,
          order and install a BuildTag, and create a private claim invitation.
        </p>
        <p>
          When the customer claims the vehicle, the customer becomes the owner of the digital profile. Legitimate historical attribution, such as{" "}
          <em>Built by</em> credit and shop-recorded modifications, may remain. In short: the customer takes ownership, the shop keeps the credit. The owner can
          hide shop-recorded records from their public page but cannot rewrite who did the work.
        </p>
        <p>Businesses must not knowingly create false or misleading records.</p>
      </>
    ),
  },
  {
    id: "claims",
    title: "Claiming a vehicle",
    content: (
      <>
        <p>
          The public BuildTag QR on a vehicle only opens its public page. Ownership of a profile moves only through a private claim link or code, which is a
          sensitive credential. Keep it private and do not share it with anyone who should not control the profile.
        </p>
        <p>
          We may investigate, delay, deny or reverse a claim, or ask for more verification, when there is reasonable evidence of fraud, a mistake, a
          conflicting claim, unauthorized access, stolen credentials or an ownership dispute. A {LEGAL.brand} claim does not determine who holds legal title to a
          vehicle.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Vehicle transfers",
    content: (
      <p>
        When a vehicle changes hands, its digital profile may transfer to the new owner. Legitimate history, including shop, dealer and builder attribution, may
        stay attached to the vehicle. The previous owner&apos;s private account information (such as their email, private notes and order history) does not
        transfer. We may separate private account information from information that belongs to the vehicle&apos;s history.
      </p>
    ),
  },
  {
    id: "business",
    title: "Business accounts",
    content: (
      <>
        <p>
          If you create or manage a Business account, you confirm that you are authorized to act for that organization and that the information you submit
          about it is accurate. Business features may include customer builds, claiming, a portfolio, Crews, team members, analytics, BuildTag orders, shop
          attribution and a business profile. New business accounts may be reviewed before they are activated.
        </p>
        <p>
          If your business records customer details (such as a customer&apos;s name, email or phone number) in {LEGAL.brand}, you are responsible for having a
          lawful basis to share them with us and for telling your customers how you use them.
        </p>
        <p>
          Custom pricing, integrations and enterprise arrangements may be covered by a separate written agreement. If a signed Business or Enterprise agreement
          conflicts with these Terms on the same subject, the signed agreement controls for that subject.
        </p>
      </>
    ),
  },
  {
    id: "crews",
    title: "Crews and community",
    content: (
      <>
        <p>
          Crews, clubs, groups and shop or dealer communities let people show builds together. A vehicle can appear in a Crew (for example a shop&apos;s customer
          Crew) without its owner personally joining that Crew.
        </p>
        <p>
          Harassment, threats, impersonation, fraud, spam, illegal content and malicious behavior are not allowed. Our{" "}
          <Link href="/community-guidelines">Community Guidelines</Link> explain what is expected and how to report problems.
        </p>
      </>
    ),
  },
  {
    id: "links",
    title: "Product and third-party links",
    content: (
      <>
        <p>
          Profiles may link to third-party retailers, manufacturers, shops, social networks, websites and products. We do not control those services and do not
          guarantee their pricing, inventory, quality, compatibility, shipping, warranties, returns or security. Your dealings with them are between you and
          them.
        </p>
        <p>
          Parts shown on another vehicle may not be right for yours. Verify fitment, compatibility, safety, legality and warranty impact before buying or
          installing anything.
        </p>
      </>
    ),
  },
  {
    id: "affiliate",
    title: "Affiliate links",
    content: (
      <>
        <p>
          Some product links may be affiliate links. The build owner, or in the future possibly {LEGAL.brand}, may receive compensation from qualifying
          purchases. {LEGAL.brand} currently takes no share of owners&apos; affiliate earnings. Build pages that contain affiliate links show a disclosure next to
          the parts list.
        </p>
        <p>
          If you add affiliate links, you are responsible for following the rules of your affiliate programs and for disclosing material relationships clearly
          where the law requires. {LEGAL.brand} does not guarantee program acceptance, commissions, attribution, conversions, payments, income or that any
          program will stay available.
        </p>
      </>
    ),
  },
  {
    id: "analytics",
    title: "Analytics",
    content: (
      <p>
        Owners and businesses may see analytics such as scans, clicks, social and part clicks, device type and approximate country. Bots, privacy tools, ad
        blockers, duplicate visits, network configuration and technical errors can affect these numbers. Analytics are estimates unless we expressly describe
        them otherwise.
      </p>
    ),
  },
  {
    id: "payments",
    title: "Payments and orders",
    content: (
      <>
        <p>
          Prices, shipping costs and applicable taxes are shown before you pay. Payments are processed by our payment processor. {LEGAL.brand} does not receive
          or store your full card number.
        </p>
        <p>
          An order is accepted when we confirm it. We may review orders for fraud, and we may cancel and refund an order before production if needed, for
          example because of a pricing or technical error, suspected fraud or a production limitation. If we cancel a paid order, we refund what you paid for
          it.
        </p>
      </>
    ),
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    content: (
      <>
        <p>
          Paid plans such as BuildTags Pro renew automatically at the end of each billing period (monthly or yearly) until you cancel. The price, billing
          interval and renewal terms are shown before you subscribe.
        </p>
        <p>
          You can cancel at any time from your profile page through the billing portal. Cancelling stops future renewals; your plan stays active until the end
          of the period you already paid for. Except where applicable law requires otherwise, we do not refund partial billing periods. If we change the price
          of your plan, we will tell you in advance and the new price applies from your next renewal.
        </p>
      </>
    ),
  },
  {
    id: "promotions",
    title: "Promotions, credits and free tags",
    content: (
      <p>
        Promo codes, free tags, credits, referrals and trials may have their own terms, which we will show you. They have no cash value unless the law requires
        otherwise, and we may invalidate promotional benefits obtained by fraud or abuse.
      </p>
    ),
  },
  {
    id: "prohibited",
    title: "Prohibited use",
    content: (
      <>
        <p>You may not use {LEGAL.brand} for, or to attempt:</p>
        <ul>
          <li>illegal activity, fraud or impersonation;</li>
          <li>false ownership claims or false vehicle records;</li>
          <li>malware, phishing or malicious QR destinations;</li>
          <li>unauthorized scraping, or bypassing security, rate limits or access controls;</li>
          <li>accessing other people&apos;s accounts or data;</li>
          <li>harassment, spam or abuse;</li>
          <li>infringing intellectual property or violating someone&apos;s privacy.</li>
        </ul>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the service",
    content: (
      <p>
        We work to keep {LEGAL.brand} available but cannot promise uninterrupted operation. Maintenance, hosting or internet outages, security events and
        third-party failures can interrupt it. Features may change. If we discontinue a paid service, we will handle it fairly and as required by law and your
        plan terms, for example by giving notice and refunding prepaid fees for the unused period where appropriate.
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <p>
        {LEGAL.brand} relies on third parties such as hosting and database providers, payment processors, email providers, fulfillment and shipping partners,
        social platforms and affiliate networks. Their services may have their own terms. Our <Link href="/privacy">Privacy Policy</Link> describes the
        providers that process personal information for us.
      </p>
    ),
  },
  {
    id: "no-advice",
    title: "No professional advice",
    content: (
      <p>
        {LEGAL.brand} does not provide mechanical advice, engineering certification, or legal, tax, insurance, financial or regulatory advice. Information on{" "}
        {LEGAL.brand} is for general information. Consult a qualified professional when it matters.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "Warranty disclaimer",
    content: (
      <>
        <p className="caps">
          To the maximum extent permitted by applicable law, {LEGAL.brand} and its services are provided &quot;as is&quot; and &quot;as available,&quot; without
          warranties of any kind, whether express, implied or statutory, including implied warranties of merchantability, fitness for a particular purpose,
          title and non-infringement.
        </p>
        <p>
          We do not guarantee uninterrupted or error-free operation, absolute security, perfect or complete data, or that every QR will scan. This does not
          affect any express warranty we give for a particular physical product, or our obligations under the{" "}
          <Link href="/refunds">Refund &amp; Replacement Policy</Link>. Some jurisdictions do not allow certain warranty disclaimers, so some of this section may
          not apply to you.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <>
        <p className="caps">
          To the maximum extent permitted by applicable law, {LEGAL.brand} and its owners, members, employees and agents will not be liable for any indirect,
          incidental, special, consequential, exemplary or punitive damages, or for lost profits, lost revenue, lost data, lost goodwill or business
          interruption, arising out of or related to these Terms or {LEGAL.brand}, even if advised of the possibility of such damages.
        </p>
        <p className="caps">
          To the maximum extent permitted by applicable law, our total liability for all claims arising out of or related to these Terms or {LEGAL.brand} will
          not exceed the greater of (a) the amount you paid {LEGAL.brand} in the 12 months before the event giving rise to the claim, or (b) US $100.
        </p>
        <p>
          This limitation does not apply to liability that cannot legally be limited or excluded, such as liability for fraud, or for gross negligence, willful
          misconduct, death or personal injury where applicable law does not allow a limit.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnification",
    content: (
      <p>
        To the extent permitted by law, you agree to defend and indemnify {LEGAL.brand} against third-party claims, and the reasonable costs of those claims,
        to the extent they arise from your User Content, your violation of these Terms, your infringement of someone else&apos;s rights (including unauthorized
        use of logos or photos), ownership or vehicle information you submitted fraudulently, your unlawful use of {LEGAL.brand}, or, for businesses,
        representations you made about work you performed. We will tell you promptly about any such claim and let you take part in the defense. This does not
        apply to the extent a claim is caused by our own breach or misconduct.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and venue",
    content: (
      <>
        <p>
          These Terms are governed by the laws of the State of {LEGAL.governingState} and applicable United States federal law, without regard to conflict of
          laws rules. Subject to the next paragraph, disputes that go to court will be brought in the state or federal courts located in or serving{" "}
          {LEGAL.venueCounty}, {LEGAL.governingState}, and you and we consent to their jurisdiction.
        </p>
        <p>
          This section does not take away any mandatory consumer protection law, or any non-waivable right to bring a claim in your home jurisdiction, that
          applies to you. Before filing a claim, please contact us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> so we can try to resolve it
          informally.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <>
        <p>
          You can stop using {LEGAL.brand} at any time, delete your vehicles from your dashboard, and delete your account under Profile → Delete account
          (or ask us to by emailing <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>). We may suspend or terminate an account for legitimate reasons, including fraud, security risk,
          illegal activity, a material violation of these Terms, abuse or non-payment.
        </p>
        <p>
          Sections that by their nature should survive termination continue to apply, including those on your content license for reasonable backup periods,
          intellectual property, disclaimers, limitation of liability, indemnification, and governing law and venue.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    content: (
      <p>
        We may update these Terms. Changes apply going forward from their effective date. For material changes we will give notice, for example on the site,
        by email or when you next sign in, and where the law requires it we will ask for your consent again before the change applies to you. Earlier versions
        apply to the period they were in effect.
      </p>
    ),
  },
  {
    id: "communications",
    title: "Electronic communications",
    content: (
      <p>
        You agree to receive transactional messages electronically, such as messages about your account, security, orders, claims, BuildTags, subscriptions
        and Business accounts. These are part of the service. We do not currently send marketing emails. If we start, we will only send them with any consent
        the law requires, and you will be able to opt out at any time.
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    content: (
      <p>
        If any part of these Terms is found unenforceable, the rest stays in effect and that part is enforced to the maximum extent permitted. Our failure to
        enforce a provision is not a waiver. You may not transfer your rights under these Terms without our consent. We may transfer them in connection with a
        reorganization, including a change of the legal entity that operates {LEGAL.brand}, or a sale of the business, and we will notify you where required.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: <OperatorBlock />,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      doc={LEGAL_DOCS.terms}
      intro={
        <>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of {LEGAL.websiteLabel} and the products and services offered through{" "}
            {LEGAL.brand}.
          </p>
          <OperatorBlock />
        </>
      }
      sections={S}
    />
  );
}
