"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ShareButton({ slug, title, compact = false }: { slug: string; title: string; compact?: boolean }) {
  const share = async () => {
    const url = `${window.location.origin}/build/${slug}`;
    const text = `${title} on BuildTag`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.message(url);
    }
  };

  if (compact) {
    return (
      <button type="button" onClick={share} className="inline-flex size-10 items-center justify-center rounded-md bg-background/60 text-white backdrop-blur transition-colors hover:bg-background/90" aria-label="Share build">
        <Share2 className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button type="button" onClick={share} className="btn-ghost">
      <Share2 className="size-4" aria-hidden="true" />
      Share build
    </button>
  );
}
