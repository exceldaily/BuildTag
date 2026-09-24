import Link from "next/link";

import { LEGAL, LEGAL_ADDRESS_LINES, LEGAL_NAV, type LegalDocMeta } from "@/lib/legal/config";

export interface LegalSection {
  /** Anchor id, e.g. "eligibility". */
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageProps {
  doc: LegalDocMeta;
  intro?: React.ReactNode;
  sections: LegalSection[];
  /** Hide the table of contents on short documents. */
  toc?: boolean;
}

/**
 * Shared layout for every legal document: readable measure, dated header,
 * numbered table of contents with anchor links, and cross-links to the
 * other policies. Deliberately plain: legal pages are for reading.
 */
export function LegalPage({ doc, intro, sections, toc = true }: LegalPageProps) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">{doc.title}</h1>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <div className="flex gap-1.5">
          <dt>Effective date:</dt>
          <dd className="text-foreground/85">{doc.effective}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Last updated:</dt>
          <dd className="text-foreground/85">{doc.updated}</dd>
        </div>
      </dl>

      {intro && <div className="legal-prose mt-8">{intro}</div>}

      {toc && sections.length > 3 && (
        <nav aria-label="Contents" className="mt-10 border-y border-line py-5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Contents</p>
          <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id} className="flex gap-2">
                <span className="w-6 shrink-0 font-mono text-xs leading-6 text-signal tabular-nums">{i + 1}.</span>
                <a href={`#${s.id}`} className="leading-6 text-foreground/85 underline-offset-4 hover:text-foreground hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="legal-h2">
              <span className="font-mono text-base leading-8 font-normal text-signal tabular-nums">{i + 1}.</span>
              <a href={`#${s.id}`} className="hover:underline">
                {s.title}
              </a>
            </h2>
            <div className="legal-prose mt-3">{s.content}</div>
          </section>
        ))}
      </div>

      <footer className="mt-14 border-t border-line pt-6 text-sm text-muted-foreground">
        <p>
          Questions about this document? Email{" "}
          <a href={`mailto:${LEGAL.email}`} className="text-foreground underline underline-offset-4">
            {LEGAL.email}
          </a>{" "}
          or write to {LEGAL.brand}, {LEGAL_ADDRESS_LINES.join(", ")}.
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          {LEGAL_NAV.filter((d) => d.path !== doc.path).map((d) => (
            <li key={d.path}>
              <Link href={d.path} className="text-foreground/85 underline-offset-4 hover:text-foreground hover:underline">
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}

/** Operator block used at the top of the Terms and Privacy Policy. */
export function OperatorBlock() {
  return (
    <address className="space-y-3 not-italic">
      <p>
        {LEGAL.brand} is operated by {LEGAL.operator.description} (&quot;{LEGAL.brand},&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
      </p>
      <p>
        <span className="block text-foreground/85">Mailing address:</span>
        {LEGAL_ADDRESS_LINES.map((l) => (
          <span key={l} className="block">
            {l}
          </span>
        ))}
      </p>
      <p>
        <span className="block text-foreground/85">Email:</span>
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>
    </address>
  );
}
