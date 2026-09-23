import type { PublicOwner, PublicSocial } from "@/lib/types";

import { SocialButtons } from "./social-buttons";

export function OwnerSection({ slug, owner, extraSocials }: { slug: string; owner: PublicOwner; extraSocials: PublicSocial[] }) {
  const socials = owner.socials ?? [];
  return (
    <div className="panel p-5 sm:p-6">
      <p className="label-tech">Owner</p>
      <div className="mt-3 flex items-start gap-4">
        <div className="size-14 shrink-0 overflow-hidden rounded-full bg-surface-2">
          {owner.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={owner.avatar_url} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="flex size-full items-center justify-center font-display text-xl font-bold uppercase">
              {(owner.display_name ?? owner.username).slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-2xl leading-tight font-bold font-display uppercase">{owner.display_name || owner.username}</p>
          <p className="text-sm text-muted-foreground">
            @{owner.username}
            {owner.location_text ? ` · ${owner.location_text}` : ""}
          </p>
          {owner.bio && <p className="mt-2 text-sm text-foreground/85">{owner.bio}</p>}
          {owner.website_url && (
            <a href={owner.website_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-block text-sm underline">
              {owner.website_url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>
      {socials.length > 0 && (
        <div className="mt-5">
          <p className="label-tech mb-2">Owner socials</p>
          <SocialButtons slug={slug} socials={extraSocials.length ? [...extraSocials, ...socials.filter((s) => !extraSocials.includes(s))] : socials} label="Owner socials" />
        </div>
      )}
    </div>
  );
}
