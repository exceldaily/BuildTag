import { notFound } from "next/navigation";

import { StatusPage } from "@/components/layout/status-page";

export const metadata = { title: "Scan", robots: { index: false, follow: false } };

const STATES: Record<string, { code: string; title: string; description: string }> = {
  invalid: {
    code: "INVALID TAG",
    title: "This BuildTag does not exist",
    description: "The code on this decal is not registered. If you own the vehicle, check your dashboard for the correct BuildTag.",
  },
  disabled: {
    code: "TAG DISABLED",
    title: "This BuildTag has been disabled",
    description: "The QR on this decal was turned off. The build may still be viewable through its owner's link.",
  },
  "build-disabled": {
    code: "BUILD UNAVAILABLE",
    title: "This build has been disabled",
    description: "The build behind this BuildTag is not available right now.",
  },
  private: {
    code: "PRIVATE",
    title: "This build is private",
    description: "The owner has set this build to private. Only they can view it while signed in.",
  },
  error: {
    code: "SCAN ERROR",
    title: "We could not resolve that code",
    description: "Something went wrong looking up this BuildTag. Give it another scan in a moment.",
  },
};

export default async function ScanStatePage({ params }: PageProps<"/scan/[state]">) {
  const { state } = await params;
  const s = STATES[state];
  if (!s) notFound();
  return (
    <StatusPage
      code={s.code}
      title={s.title}
      description={s.description}
      actions={[
        { href: "/explore", label: "Explore builds" },
        { href: "/signup", label: "Create your build", primary: false },
      ]}
    />
  );
}
