import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Toaster } from "sonner";

import { siteUrl } from "@/lib/env";

import "./globals.css";

import { PwaRegister } from "@/components/layout/pwa-register";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "BuildTag | Scan the build.",
    template: "%s | BuildTag",
  },
  description:
    "BuildTag gives your car a digital build sheet connected to a permanent QR decal. Anyone scans it and sees the power, the mods and the parts.",
  applicationName: "BuildTag",
  appleWebApp: { capable: true, title: "BuildTag", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: "BuildTag",
    title: "BuildTag | Scan the build.",
    description:
      "Your build deserves a spec sheet. Stick your BuildTag on your car and let anyone scan to see what is done to it.",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${barlow.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster theme="dark" position="bottom-center" richColors closeButton />
        <PwaRegister />
      </body>
    </html>
  );
}
