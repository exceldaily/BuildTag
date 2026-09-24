import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, OperatorBlock, type LegalSection } from "@/components/marketing/legal-page";
import { LEGAL, LEGAL_DOCS } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What BuildTags collects, what is public, what stays private, and your choices.",
  alternates: { canonical: "/privacy" },
};

/*
 * Every statement here was checked against the code and migrations on
 * 2026-09-24. When data collection changes (new tables, analytics, cookies,
 * processors), update this page and bump LEGAL_DOCS.privacy in config.ts.
 */

const S: LegalSection[] = [
  {
    id: "public-private",
    title: "Public build data and private account data",
    content: (
      <>
        <p>{LEGAL.brand} handles two very different kinds of information:</p>
        <ul>
          <li>
            <strong>Public build data</strong> is what you choose to publish on a build page: vehicle details, photos, modifications, performance figures,
            social links and, if you turn it on, your owner section. Public builds can be seen by anyone and indexed by search engines. Unlisted builds can be
            seen by anyone who has the link. Private builds are shown only to you (and to the business managing them, if a shop created the build).
          </li>
          <li>
            <strong>Private account data</strong> is everything else: your email address, password, orders, shipping addresses, billing records, private
            notes, claim credentials and analytics. It is never shown on public pages.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "collect",
    title: "Information we collect",
    content: (
      <>
        <h3>Account</h3>
        <ul>
          <li>Email address and password. Passwords are handled by our authentication provider and we never see them in plain text.</li>
          <li>Username, display name, and optionally an avatar, bio, location text and website.</li>
          <li>Language and region preferences. At signup we suggest a region from your browser&apos;s language setting.</li>
        </ul>
        <h3>Builds you create</h3>
        <ul>
          <li>
            Vehicle details (year, make, model, nickname, description, location text), performance figures, mileage, build cost (private unless you choose to
            show it), modifications, part links, affiliate links, social links and BuildTag designs.
          </li>
          <li>
            Photos and design assets you upload. Photos are re-encoded on our servers, which removes embedded EXIF data such as GPS coordinates.
          </li>
        </ul>
        <h3>People who scan or visit a build</h3>
        <ul>
          <li>
            For each BuildTag scan we record the time, the vehicle, the country reported by our hosting provider&apos;s network, a coarse device type (phone,
            tablet, desktop or other) and the hostname of the referring site. We read the browser&apos;s user agent only to filter out bots and work out the
            device type; we do not store it. We do not store IP addresses in scan records.
          </li>
          <li>When someone opens a part or social link from a build, we record which link was opened and when, without identifying the visitor.</li>
          <li>
            Likes and reports use an anonymous key made from a random first-party cookie and a shortened (truncated) network address, combined with a secret
            key so it cannot be reversed. Reports also store the reason and any description the reporter writes.
          </li>
        </ul>
        <h3>Orders and payments</h3>
        <ul>
          <li>
            Shipping name, company, address and phone number, order email, notes, the approved artwork and production files, order status and tracking
            details. We prefill your next order with the address from your last one.
          </li>
          <li>
            Payments are processed by Stripe on its own hosted checkout page. We never receive or store your full card number. We keep references to the
            Stripe checkout session, payment and subscription so we can match payments to orders and plans. For subscriptions, Stripe may collect your billing
            address.
          </li>
        </ul>
        <h3>Businesses and shop-created builds</h3>
        <ul>
          <li>
            Business details a business enters, such as name, type, logo, description, website, email, phone, address and social links, plus team membership
            and roles.
          </li>
          <li>
            When a shop creates a build for a customer, the shop may record the customer&apos;s name, email, phone number and private notes, and send a claim
            invitation to that email. These customer records are visible only to that business&apos;s staff and our administrators, and they remain with the
            business&apos;s records after the customer claims the build. The business only sees whether its build was claimed, not the account that claimed it.
          </li>
          <li>
            Claim links and codes are stored only as one-way hashes, together with their expiry and the email they were sent to. We keep an audit log of claim
            events.
          </li>
          <li>
            Business inquiry form submissions: name, business name, email, phone, website, business details and message, plus an anonymous network key used to
            limit spam.
          </li>
        </ul>
        <h3>Consent records</h3>
        <ul>
          <li>
            When you accept these policies, approve custom artwork, confirm business authorization or confirm a vehicle claim, we record what you accepted, the
            version, the time, the context and your browser&apos;s user agent string. We do not store your IP address with these records.
          </li>
        </ul>
        <h3>Messages</h3>
        <ul>
          <li>Emails you send us and our replies.</li>
        </ul>
        <h3>Logs kept by our providers</h3>
        <ul>
          <li>
            Our hosting and database providers process IP addresses and request details in their own security and operational logs, as all web services do. We
            do not copy IP addresses into our own application tables.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use information",
    content: (
      <ul>
        <li>to run your account, build pages, BuildTags, Crews and Business features;</li>
        <li>to produce, ship and support your orders, and to manage subscriptions and billing;</li>
        <li>to show owners and businesses analytics about their builds;</li>
        <li>to handle claims, transfers and attribution;</li>
        <li>to send transactional emails about your account, orders, claims and security;</li>
        <li>to prevent fraud, spam and abuse, and to keep the service secure;</li>
        <li>to respond to you, and to meet legal, tax and accounting obligations.</li>
      </ul>
    ),
  },
  {
    id: "public",
    title: "What other people can see",
    content: (
      <ul>
        <li>Everything on a public or unlisted build page, including photos and the parts list. Build cost and part prices stay private unless you show them.</li>
        <li>Your username on your builds. Your display name, avatar, bio, location text, website and profile socials only if you turn on the owner section.</li>
        <li>On a Crew page: members&apos; usernames, display names and avatars.</li>
        <li>On a business page: the details the business chose to publish, which can include its email, phone number and city.</li>
        <li>Whether an owner has a Pro plan (a Pro badge), and total scan counts on leaderboards.</li>
      </ul>
    ),
  },
  {
    id: "photos",
    title: "Where photos are stored",
    content: (
      <p>
        Photos, avatars and design assets are stored in file storage that serves images by direct link, so pages load fast. A photo on a private build is not
        listed or shown anywhere public, but anyone who has its exact file address could open it. Do not upload photos you would not want seen by someone who has
        the link, such as photos showing a home address or license plate.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Who we share information with",
    content: (
      <>
        <p>We do not sell personal information and we do not share it for targeted advertising. We share it only with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> that process it for us: Supabase (database, sign-in and file storage), Vercel (hosting), Stripe (payments and
            subscriptions) and Resend (email delivery).
          </li>
          <li>
            <strong>Production and shipping partners</strong>, who receive the artwork and the ship-to name, address and phone number needed to make and deliver
            your order, and shipping carriers.
          </li>
          <li>
            <strong>Businesses you deal with through {LEGAL.brand}</strong>, as described above for shop-created builds and business orders.
          </li>
          <li>
            <strong>Authorities or others</strong> when the law requires it, or when needed to protect people, prevent fraud or enforce our Terms.
          </li>
          <li>
            <strong>A successor</strong> if {LEGAL.brand} is reorganized (for example moved into a new legal entity) or sold, in which case this policy
            continues to protect your information.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar storage",
    content: (
      <>
        <p>We do not use advertising or third-party analytics cookies. We use:</p>
        <ul>
          <li>sign-in session cookies from our authentication provider, needed to keep you signed in;</li>
          <li>an anonymous visitor cookie, set only when you like or report a build, used to count likes fairly and prevent abuse;</li>
          <li>a language preference cookie, and for business users a cookie remembering which business is active;</li>
          <li>browser storage remembering whether you dismissed the &quot;install app&quot; prompt, and an offline cache of static files for the app.</li>
        </ul>
        <p>
          Affiliate and product links take you to other websites, which may set their own cookies under their own policies. {LEGAL.brand} does not add tracking
          parameters or cookies to those links.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    content: (
      <>
        <p>
          We keep account and build information while your account is active. When you delete a vehicle, its photos and records are deleted. When we delete an
          account at your request, we delete or de-identify its information, except what we need to keep for legal, tax, accounting, fraud-prevention or
          dispute purposes, such as order and payment records.
        </p>
        <p>
          Scan and click records are kept to provide ongoing analytics. Consent records are kept for as long as the account exists so we can show what was
          agreed to. Business customer records stay with the business&apos;s records until the business or we delete them.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your choices and rights",
    content: (
      <>
        <p>
          You can edit or delete your builds, photos and profile at any time from your dashboard, and change a build&apos;s visibility. To access, correct,
          export or delete your personal information, or to delete your account, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We may need to
          confirm it is you before acting on a request.
        </p>
        <p>
          Depending on where you live, you may have additional rights under local privacy law, such as the right to know what we hold, to object to certain
          uses, or to appeal a decision about your request. We will honor those rights as the law requires and will not treat you differently for using them.
        </p>
        <p>
          If a shop recorded your details as its customer, you can also contact that shop directly. We will help route requests about those records.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <p>
        We use access controls that limit each account to its own data, keep passwords with our authentication provider, store claim credentials only as hashes,
        and use encrypted connections. No system is perfectly secure, so we cannot guarantee absolute security. If we learn of a breach that affects you, we will
        notify you as required by law.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        {LEGAL.brand} is not directed to children. You must be at least 16 to create an account. We do not knowingly collect personal information from children
        under 13. If you believe a child has given us personal information, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: "location",
    title: "Where information is processed",
    content: (
      <p>
        {LEGAL.brand} is operated from the United States, and our providers process information in the United States. If you use {LEGAL.brand} from elsewhere,
        your information will be transferred to and processed in the United States.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We will update this policy when our practices change and show the new effective date above. For material changes we will give notice, for example on the
        site, by email or when you next sign in, and ask for consent again where the law requires. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: <OperatorBlock />,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      doc={LEGAL_DOCS.privacy}
      intro={
        <p>
          This Privacy Policy explains what {LEGAL.brand} collects when you use {LEGAL.websiteLabel}, scan a BuildTag, order a product or use BuildTags
          Business, how we use it, what is public and what stays private, and the choices you have. {LEGAL.brand} is operated by {LEGAL.operator.description}.
        </p>
      }
      sections={S}
    />
  );
}
