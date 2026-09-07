import fs from "fs";
import path from "path";
import { SHOW_COVER } from "@/lib/customer-images";

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"];

/**
 * Resolve a customer drop-folder image under public/, trying common extensions.
 * Pass a path with or without extension, e.g. "images/customer/home-hero"
 * or "images/customer/shows/murder-for-real-cover.jpg".
 */
export function resolveCustomerImage(
  ...relativeCandidates: Array<string | null | undefined>
): string | null {
  for (const relative of relativeCandidates) {
    if (!relative?.trim()) continue;
    const normalized = relative.replace(/^\/+/, "").replace(/\\/g, "/");
    const withoutExt = normalized.replace(/\.(jpe?g|png|webp)$/i, "");
    const withExt = /\.(jpe?g|png|webp)$/i.test(normalized)
      ? [normalized]
      : [];

    for (const candidate of [
      ...withExt,
      ...EXTENSIONS.map((ext) => `${withoutExt}${ext}`),
    ]) {
      const absolute = path.join(process.cwd(), "public", candidate);
      if (fs.existsSync(absolute)) {
        return `/${candidate.replace(/\\/g, "/")}`;
      }
    }
  }
  return null;
}

/** Show cover, then shared live-event fallback so cards never look empty. */
export function resolveShowCover(
  slug: string,
  remoteUrl?: string | null,
): string | null {
  return (
    resolveCustomerImage(
      remoteUrl,
      SHOW_COVER.pathForSlug(slug),
      SHOW_COVER.fallbackFile,
    ) ?? null
  );
}
