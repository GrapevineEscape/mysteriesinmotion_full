import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SURFACE_HEADER, surfaceFromHeader } from "@/lib/surface";
import "./globals.css";
import "@/styles/portal.css";

export const metadata: Metadata = {
  title: {
    default: "Mysteries in Motion",
    template: "%s | Mysteries in Motion",
  },
  description:
    "Mysteries in Motion is an interactive mystery company in Dallas–Fort Worth. Hire us to perform at your event, hire us to host your group online, or play a case tonight."
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const surface = surfaceFromHeader(requestHeaders.get(SURFACE_HEADER));

  // The troupe portal supplies its own sidebar shell.
  if (surface === "portal") {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html data-surface={surface} lang="en">
      <body>
        <SiteHeader surface={surface} />
        <main>{children}</main>
        <SiteFooter surface={surface} />
      </body>
    </html>
  );
}
