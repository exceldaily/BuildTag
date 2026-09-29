import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { siteUrl } from "@/lib/env";

import "./globals.css";

import { PwaRegister } from "@/components/layout/pwa-register";
import { getLocale } from "@/lib/i18n/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

/* Spec-sheet labels. Loaded so they look the same on Windows, Android and iOS. */
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "BuildTags | Scan the build.",
    template: "%s | BuildTags",
  },
  description:
    "BuildTags gives your car or motorcycle a digital build sheet connected to a permanent QR decal. Anyone scans it and sees the power, the mods and the parts.",
  applicationName: "BuildTags",
  appleWebApp: { capable: true, title: "BuildTags", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "BuildTags",
    title: "BuildTags | Scan the build.",
    description:
      "Stop explaining your build. Put a BuildTag on your car or bike and let anyone scan to see what is done to it.",
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "BuildTags. Stop explaining your build. Tag it." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuildTags | Scan the build.",
    description: "Stop explaining your build. Put a BuildTag on your car or bike and let anyone scan to see what is done to it.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png?v=2",
  },
};

export const viewport: Viewport = {
  themeColor: "#06050d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`dark ${inter.variable} ${barlow.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster theme="dark" position="bottom-center" richColors closeButton />
        <PwaRegister />
      </body>
    </html>
  );
}
