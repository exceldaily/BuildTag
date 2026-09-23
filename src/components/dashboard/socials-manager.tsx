"use client";

import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addSocialLinkAction, deleteSocialLinkAction, reorderSocialLinksAction, toggleSocialVisibilityAction } from "@/lib/actions/socials";
import { displayHandle } from "@/lib/social";
import { SOCIAL_PLATFORMS, type SocialLinkRow, type SocialOwnerType, type SocialPlatform } from "@/lib/types";
import { SocialIcon } from "@/components/build/social-icon";

import { SortableItem, SortableList } from "./sortable";

interface Props {
  ownerType: SocialOwnerType;
  ownerId: string;
  links: SocialLinkRow[];
  title: string;
  description: string;
}

export function SocialsManager({ ownerType, ownerId, links: initial, title, description }: Props) {
  const [links, setLinks] = useState(initial);
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const def = SOCIAL_PLATFORMS.find((p) => p.value === platform)!;

  const add = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    start(async () => {
      const res = await addSocialLinkAction(ownerType, ownerId, form);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      setLinks((l) => [...l, res.data]);
      formEl.reset();
    });
  };

  const toggle = (link: SocialLinkRow) => {
    setLinks((l) => l.map((x) => (x.id === link.id ? { ...x, is_public: !x.is_public } : x)));
    start(async () => {
      const res = await toggleSocialVisibilityAction(link.id, !link.is_public);
      if (!res.ok) toast.error(res.error);
    });
  };

  const remove = (link: SocialLinkRow) => {
    setLinks((l) => l.filter((x) => x.id !== link.id));
    start(async () => {
      const res = await deleteSocialLinkAction(link.id);
      if (!res.ok) toast.error(res.error);
    });
  };

  const reorder = (next: SocialLinkRow[]) => {
    setLinks(next);
    start(async () => {
      const res = await reorderSocialLinksAction(ownerType, ownerId, next.map((l) => l.id));
      if (!res.ok) toast.error(res.error);
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <form onSubmit={add} className="panel grid gap-2 p-3 sm:grid-cols-[150px_1fr_auto] sm:items-end">
        <div>
          <label htmlFor={`${ownerType}-platform`} className="field-label">
            Platform
          </label>
          <select id={`${ownerType}-platform`} name="platform" value={platform} onChange={(e) => setPlatform(e.target.value as SocialPlatform)} className="field">
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${ownerType}-handle`} className="field-label">
            {def.base ? "Handle" : "URL"}
          </label>
          {def.base ? (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">@</span>
              <input id={`${ownerType}-handle`} name="handle" placeholder="ghost_supra" autoComplete="off" autoCapitalize="none" className="field pl-8" />
            </div>
          ) : (
            <input id={`${ownerType}-handle`} name="url" type="url" placeholder="https://" autoComplete="off" className="field" />
          )}
          {(errors.handle || errors.url) && <p className="field-error">{errors.handle ?? errors.url}</p>}
        </div>
        <button type="submit" className="btn-signal" disabled={pending}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </button>
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet.</p>
      ) : (
        <SortableList items={links} onReorder={reorder}>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {links.map((l) => (
              <SortableItem key={l.id} id={l.id}>
                {(handle) => (
                  <li className={`flex items-center gap-2 bg-surface px-2 py-2 ${l.is_public ? "" : "opacity-60"}`}>
                    {handle}
                    <SocialIcon platform={l.platform} className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{displayHandle(l.platform, l.handle, l.url)}</p>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-muted-foreground hover:underline">
                        {l.url}
                      </a>
                    </div>
                    <button type="button" onClick={() => toggle(l)} className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-white/5 hover:text-foreground" aria-label={l.is_public ? "Hide link" : "Show link"} aria-pressed={l.is_public}>
                      {l.is_public ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button type="button" onClick={() => remove(l)} className="inline-flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete link">
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                )}
              </SortableItem>
            ))}
          </ul>
        </SortableList>
      )}
    </div>
  );
}
