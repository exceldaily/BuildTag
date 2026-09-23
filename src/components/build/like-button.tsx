"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { formatCount } from "@/lib/utils";

export function LikeButton({ slug, initialCount, initialLiked }: { slug: string; initialCount: number; initialLiked: boolean }) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, start] = useTransition();

  const toggle = () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    start(async () => {
      try {
        const res = await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const data = (await res.json()) as { ok?: boolean; liked?: boolean; like_count?: number; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not save");
        setLiked(Boolean(data.liked));
        if (typeof data.like_count === "number") setCount(data.like_count);
      } catch (err) {
        setLiked(!nextLiked);
        setCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
        toast.error(err instanceof Error ? err.message : "Could not save your like");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      className={`btn-ghost ${liked ? "border-signal/60 text-signal" : ""}`}
    >
      <Heart className={`size-4 ${liked ? "fill-current" : ""}`} aria-hidden="true" />
      <span>{formatCount(count)}</span>
      <span className="sr-only">{liked ? "Unlike this build" : "Like this build"}</span>
    </button>
  );
}
