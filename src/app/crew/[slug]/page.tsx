import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCrew } from "@/lib/db/public";
import { formatCount } from "@/lib/utils";
import { BuildCard } from "@/components/build/build-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/crew/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const crew = await getCrew(slug);
  if (!crew) return { title: "Crew not found", robots: { index: false } };
  return {
    title: `${crew.name} crew`,
    description: crew.tagline || `${crew.members.length} members, ${crew.builds.length} builds on BuildTag.`,
    openGraph: { title: `${crew.name} · BuildTag crew`, description: crew.tagline || undefined, images: crew.builds[0]?.hero_image_url ? [crew.builds[0].hero_image_url] : undefined },
  };
}

/** Numbered mono section label, same as the homepage: "01 / Members". */
function Label({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] font-medium tracking-[0.16em] text-signal uppercase">
      <span className="text-foreground/45">{n} / </span>
      {children}
    </h2>
  );
}

export default async function CrewPublicPage({ params }: PageProps<"/crew/[slug]">) {
  const { slug } = await params;
  const crew = await getCrew(slug);
  if (!crew) notFound();

  const stats: [string, string][] = [
    ["Members", formatCount(crew.members.length)],
    ["Builds", formatCount(crew.builds.length)],
    ["Crew scans", formatCount(crew.total_scans)],
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1720px] px-4 py-10 sm:px-6 md:py-14 lg:px-10 2xl:px-16">
        <p className="eyebrow">BuildTag crew</p>
        <h1 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
          <span className="speed-heading">{crew.name}</span>
        </h1>
        {crew.tagline && <p className="mt-3 max-w-xl text-foreground/80">{crew.tagline}</p>}

        {/* Spec row: ruled, no boxes. */}
        <dl className="mt-8 grid max-w-2xl grid-cols-3 border-t-2 border-foreground/20">
          {stats.map(([label, value], i) => (
            <div key={label} className={i > 0 ? "border-l border-line py-4 pl-4" : "py-4 pr-4"}>
              <dt className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
              <dd className="mt-1 font-display text-3xl leading-none font-bold tabular-nums sm:text-4xl">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-12">
          <Label n="01">Members</Label>
          <ul className="mt-4 max-w-xl divide-y divide-line border-y border-line">
            {crew.members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2 font-display text-sm font-bold uppercase">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    (m.display_name || m.username).slice(0, 1)
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {m.display_name || m.username} <span className="text-muted-foreground">@{m.username}</span>
                </span>
                {m.role === "owner" && <span className="font-mono text-[10px] tracking-[0.14em] text-signal uppercase">Owner</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <Label n="02">Builds</Label>
          {crew.builds.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No public builds yet.</p>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {crew.builds.map((b) => (
                <BuildCard key={b.slug} build={b} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
