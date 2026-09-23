import { displayHandle } from "@/lib/social";
import type { PublicSocial } from "@/lib/types";

import { SocialIcon } from "./social-icon";

/** Outbound social buttons; clicks route through /out for tracking. */
export function SocialButtons({ slug, socials, label }: { slug: string; socials: PublicSocial[]; label: string }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {socials.map((s) => (
        <li key={s.public_id}>
          <a
            href={`/out/${slug}/social/${s.public_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium transition-colors hover:border-foreground/40 hover:bg-white/5"
          >
            <SocialIcon platform={s.platform} className="size-4" />
            <span className="truncate">{displayHandle(s.platform, s.handle, s.url)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
