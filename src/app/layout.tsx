import type { Metadata } from "next";
import { headers } from "next/headers";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SURFACE_HEADER, surfaceFromHeader } from "@/lib/surface";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mysteries in Motion",
    template: "%s | Mysteries in Motion",
  },
  description:
    "Live interactive murder mysteries for your event, and original online mysteries you play at home.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const surface = surfaceFromHeader(requestHeaders.get(SURFACE_HEADER));

  return (
    <html lang="en">
      <body>
        <SiteHeader surface={surface} />
        <main>{children}</main>
        <SiteFooter surface={surface} />
      </body>
    </html>
  );
}
