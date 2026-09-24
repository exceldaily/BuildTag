import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crown, ScanLine, Users } from "lucide-react";

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

export default async function CrewPublicPage({ params }: PageProps<"/crew/[slug]">) {
  const { slug } = await params;
  const crew = await getCrew(slug);
  if (!crew) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1720px] px-4 py-10 sm:px-6 lg:px-10 2xl:px-16 md:py-14">
        <p className="eyebrow">BuildTag crew</p>
        <h1 className="mt-3 text-4xl sm:text-5xl xl:text-6xl">
          <span className="speed-heading">{crew.name}</span>
        </h1>
        {crew.tagline && <p className="mt-3 max-w-xl text-foreground/80">{crew.tagline}</p>}

        <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <div className="bg-surface px-4 py-4">
            <dt className="label-tech">Members</dt>
            <dd className="mt-1 font-display text-3xl font-bold tabular-nums">{crew.members.length}</dd>
          </div>
          <div className="bg-surface px-4 py-4">
            <dt className="label-tech">Builds</dt>
            <dd className="mt-1 font-display text-3xl font-bold tabular-nums">{crew.builds.length}</dd>
          </div>
          <div className="bg-surface px-4 py-4">
            <dt className="label-tech">Crew scans</dt>
            <dd className="mt-1 flex items-center gap-2 font-display text-3xl font-bold tabular-nums">
              <ScanLine className="size-5 text-neon-cyan" aria-hidden="true" />
              {formatCount(crew.total_scans)}
            </dd>
          </div>
        </dl>

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-2xl">
            <Users className="size-5 text-signal" aria-hidden="true" />
            Members
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {crew.members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1">
                <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-display text-xs font-bold uppercase">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    (m.display_name || m.username).slice(0, 1)
                  )}
                </span>
                <span className="text-sm">
                  {m.display_name || m.username} <span className="text-muted-foreground">@{m.username}</span>
                </span>
                {m.role === "owner" && <Crown className="size-3.5 text-neon-amber" aria-label="Crew owner" />}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl">Builds</h2>
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
