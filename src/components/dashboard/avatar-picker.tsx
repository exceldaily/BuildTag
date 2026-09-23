"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * One big tappable avatar. Tapping anywhere on it opens the phone's photo
 * picker (or the file dialog on desktop); the picture is uploaded straight
 * away and every avatar on the page refreshes.
 */
export function AvatarPicker({
  avatarUrl,
  initial,
  size = "lg",
  className,
}: {
  avatarUrl: string | null;
  initial: string;
  size?: "lg" | "xl";
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setAvatar(data.url);
      toast.success("Profile picture updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const dim = size === "xl" ? "size-32 sm:size-36" : "size-24 sm:size-28";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile picture"
        className={cn(
          "group relative shrink-0 rounded-full ring-2 ring-line transition hover:ring-signal focus-visible:ring-signal focus-visible:outline-none disabled:opacity-70",
          dim,
        )}
      >
        <span className="block size-full overflow-hidden rounded-full bg-surface-2">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-4xl font-bold uppercase">{initial}</span>
          )}
        </span>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 font-display text-xs font-bold tracking-widest text-white uppercase opacity-0 transition group-hover:opacity-100">
          {uploading ? "Uploading" : "Change"}
        </span>
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full border-2 border-background bg-signal text-white shadow-[0_0_16px_rgba(255,45,122,0.6)]"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.2" />
          </svg>
        </span>
      </button>
      <div className="min-w-0">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-ghost btn-small">
          {uploading ? "Uploading…" : "Change profile picture"}
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Tap the picture or the button. JPEG, PNG or WebP, up to 5 MB. It is cropped to a square.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
