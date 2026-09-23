import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Why BuildTag exists and how the permanent QR works.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 md:py-20">
      <p className="eyebrow">About</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Built by people who get asked &ldquo;what&apos;s done to it?&rdquo;</h1>
      <div className="mt-8 space-y-5 text-base text-muted-foreground">
        <p>
          BuildTag started with a simple problem: a modified car is a story, and the story gets told badly in parking
          lots. Owners forget parts. Strangers forget the Instagram handle. Screenshots of spec lists get lost.
        </p>
        <p>
          A BuildTag is a digital build sheet connected to one permanent decal. Your vehicle, photos, power numbers,
          every modification and every part link live at one URL. The decal encodes a short code, never the URL of the
          moment, so you can rename the build, change your username or transfer the car and the decal keeps working.
        </p>
        <p>
          The BuildTag Designer produces real print artwork: vector SVG and high-resolution PNG, with the QR quiet zone
          protected no matter how much automotive styling you wrap around it.
        </p>
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className="btn-signal">
          Create your build
        </Link>
        <Link href="/explore" className="btn-ghost">
          Explore builds
        </Link>
      </div>
    </div>
  );
}
