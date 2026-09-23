interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

/**
 * Shared layout for legal templates. Every page is explicitly labelled as an
 * initial template that needs legal review before commercial launch.
 */
export function LegalPage({ eyebrow, title, updated, intro, sections }: LegalPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 md:py-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>
      <div className="mt-6 rounded-md border border-signal/40 bg-signal/10 p-4 text-sm">
        <strong className="font-semibold">Initial template.</strong> This document is a starting point and must be reviewed
        by a lawyer before BuildTag launches commercially.
      </div>
      <p className="mt-8 text-muted-foreground">{intro}</p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-2xl">{s.title}</h2>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
