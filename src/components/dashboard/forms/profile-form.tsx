"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { saveProfileAction } from "@/lib/actions/profile";
import type { ProfileRow } from "@/lib/types";
import type { ActionResult } from "@/lib/validation/common";

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [state, action, pending] = useActionState<ActionResult<ProfileRow> | null, FormData>(saveProfileAction, null);
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setAvatar(data.url);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Profile</h2>
        {state?.ok && <span className="label-tech text-emerald-400">Saved</span>}
      </div>

      <div className="flex items-center gap-4">
        <div className="size-20 overflow-hidden rounded-full bg-surface-2">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center font-display text-2xl font-bold uppercase">{profile.display_name.slice(0, 1) || profile.username.slice(0, 1)}</div>
          )}
        </div>
        <label className="btn-ghost btn-small cursor-pointer">
          {uploading ? "Uploading…" : "Change avatar"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAvatar(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="display_name" className="field-label">
            Display name
          </label>
          <input id="display_name" name="display_name" defaultValue={profile.display_name} required maxLength={60} className="field" />
          {errors.display_name && <p className="field-error">{errors.display_name}</p>}
        </div>
        <div>
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">@</span>
            <input id="username" name="username" defaultValue={profile.username} required pattern="[a-z0-9_]{3,30}" maxLength={30} autoCapitalize="none" className="field pl-8" />
          </div>
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="bio" className="field-label">
          Bio
        </label>
        <textarea id="bio" name="bio" defaultValue={profile.bio} maxLength={600} rows={4} className="field-textarea min-h-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location_text" className="field-label">
            Location <span className="normal-case tracking-normal">(general)</span>
          </label>
          <input id="location_text" name="location_text" defaultValue={profile.location_text} maxLength={80} placeholder="Florida" className="field" />
        </div>
        <div>
          <label htmlFor="website_url" className="field-label">
            Website
          </label>
          <input id="website_url" name="website_url" type="url" defaultValue={profile.website_url ?? ""} placeholder="https://" className="field" />
          {errors.website_url && <p className="field-error">{errors.website_url}</p>}
        </div>
      </div>
      {state && !state.ok && !state.fieldErrors && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-signal" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
