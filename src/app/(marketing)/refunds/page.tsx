import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { LEGAL, LEGAL_DOCS } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Refund & Replacement Policy",
  description: "How BuildTags handles custom product issues, replacements, refunds, cancellations and subscriptions.",
  alternates: { canonical: "/refunds" },
};

const B = LEGAL.brand;
const DAYS = LEGAL.issueWindowDays;

const S: LegalSection[] = [
  {
    id: "custom",
    title: "Custom products are made for you",
    content: (
      <>
        <p>
          Every physical BuildTag is produced from the design you approve, with your vehicle&apos;s permanent QR code. Because it is personalized, we cannot
          resell it. Except where applicable law requires otherwise, we do not accept returns or give refunds for a correctly produced personalized product
          because you changed your mind or no longer want it, or because customization details you entered (such as a spelling or a handle) were produced as
          approved.
        </p>
        <p>Please check your proof carefully before approving it: spelling, vehicle details, usernames, social handles, colors, layout and size.</p>
      </>
    ),
  },
  {
    id: "issues",
    title: "When something is wrong",
    content: (
      <>
        <p>We will make it right if your product is:</p>
        <ul>
          <li>materially defective (for example misprinted, mis-cut or peeling out of the package);</li>
          <li>materially different from the proof you approved;</li>
          <li>the wrong product or design because of our error or our production partner&apos;s error;</li>
          <li>damaged in shipping.</li>
        </ul>
        <p>
          Report the issue within <strong>{DAYS} days of delivery</strong>. Reasonable production variation in color, size, cut and finish, and the fact that
          screens do not show printed color exactly, are not defects on their own.
        </p>
      </>
    ),
  },
  {
    id: "how",
    title: "How to report an issue",
    content: (
      <>
        <p>
          Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with your order number (it looks like BT-000123) and a short description. We may ask for
          photos of the product and packaging, or other reasonable evidence, so we can see the problem and fix it with our production partner.
        </p>
        <p>Please do not throw away a damaged or defective product until we have reviewed your report.</p>
      </>
    ),
  },
  {
    id: "remedies",
    title: "Remedies",
    content: (
      <>
        <p>Depending on the issue, we will offer one or more of:</p>
        <ul>
          <li>a replacement or reprint at no charge;</li>
          <li>a refund of the affected item, or of the order;</li>
          <li>another remedy required by applicable law.</li>
        </ul>
        <p>
          Refunds go back to the original payment method. Your bank or card issuer controls how long they take to appear. Nothing in this policy limits rights
          you have under applicable law that cannot be waived, and {B} alone does not decide what the law entitles you to.
        </p>
      </>
    ),
  },
  {
    id: "delivery",
    title: "Lost or undelivered orders",
    content: (
      <p>
        If your order has not arrived within a reasonable time after it shipped, or tracking shows it delivered but you did not receive it, contact us. We will
        work with the carrier and, where the loss was not caused by an incorrect address you entered, replace the order or refund it.
      </p>
    ),
  },
  {
    id: "cancel",
    title: "Cancelling an order",
    content: (
      <p>
        If you need to cancel, contact us as soon as possible. If your order has not yet gone into production, we will cancel it and refund you in full. Once
        production has started we generally cannot cancel a personalized order, except where the law requires otherwise. We may also cancel and refund an order
        ourselves before production, for example because of a pricing or technical error or a production limitation.
      </p>
    ),
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    content: (
      <p>
        You can cancel BuildTags Pro at any time from your profile page. Cancelling stops the next renewal and your plan stays active until the end of the period
        you paid for. Except where applicable law requires otherwise, we do not refund partial billing periods. If you were charged in error, contact us and we
        will fix it.
      </p>
    ),
  },
  {
    id: "free",
    title: "Free and promotional tags",
    content: (
      <p>
        Free or promotional BuildTags that turn out defective, wrong or damaged in shipping will be replaced under the same {DAYS}-day reporting window. There is
        no cash refund for a free product.
      </p>
    ),
  },
  {
    id: "more",
    title: "More information",
    content: (
      <p>
        This policy is part of our <Link href="/terms">Terms of Service</Link>. Questions? Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      doc={LEGAL_DOCS.refunds}
      intro={<p>This policy covers physical BuildTags and other products you order from {B}, and BuildTags Pro subscriptions.</p>}
      sections={S}
    />
  );
}
