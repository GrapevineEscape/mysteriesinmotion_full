/**
 * Customer-facing image slots.
 *
 * Organized under public/images/customer/ by page/section:
 *   01-home/  02-book/  03-about/  04-gallery/  05-online/  06-shows/
 *   _inbox/   (unsorted drops — not used by the site)
 *
 * Exact pixel sizes are NOT required. JPG / PNG / WEBP all work.
 * Run: npm run images:status
 */

export type ImageSlotSpec = {
  id: string;
  /** Preferred path under /public (extension optional; resolver tries common ones) */
  file: string;
  /** Frame aspect ratio numerator (not a hard file-size requirement) */
  width: number;
  /** Frame aspect ratio denominator */
  height: number;
  label: string;
  description: string;
  where: string;
  /** true = current file is a temporary stand-in; replace when you can */
  temporary?: boolean;
};

export const CUSTOMER_IMAGE_DIR = "images/customer";

/** Shared site imagery (not per-show). */
export const SITE_IMAGE_SLOTS = {
  homeHero: {
    id: "home-hero",
    file: `${CUSTOMER_IMAGE_DIR}/01-home/hero`,
    width: 4,
    height: 3,
    label: "hero",
    description:
      "Live performance / guests at a real private event. Landscape is ideal.",
    where: "Home page hero",
  },
  homeExpectArrive: {
    id: "home-expect-arrive",
    file: `${CUSTOMER_IMAGE_DIR}/01-home/expect-1-arrive`,
    width: 8,
    height: 5,
    label: "expect-1-arrive",
    description: "Guests arriving, cast greeting, or show opening energy.",
    where: "Home → What to expect (step 1)",
    temporary: true,
  },
  homeExpectInvestigate: {
    id: "home-expect-investigate",
    file: `${CUSTOMER_IMAGE_DIR}/01-home/expect-2-investigate`,
    width: 8,
    height: 5,
    label: "expect-2-investigate",
    description: "Guests questioning suspects or examining clue props.",
    where: "Home → What to expect (step 2)",
  },
  homeExpectReveal: {
    id: "home-expect-reveal",
    file: `${CUSTOMER_IMAGE_DIR}/01-home/expect-3-reveal`,
    width: 8,
    height: 5,
    label: "expect-3-reveal",
    description: "Accusation, cast lineup, or end-of-night energy.",
    where: "Home → What to expect (step 3)",
    temporary: true,
  },
  bookTrust1: {
    id: "book-trust-1",
    file: `${CUSTOMER_IMAGE_DIR}/02-book/trust-1`,
    width: 3,
    height: 4,
    label: "trust-1",
    description: "Audience / venue atmosphere at a live show.",
    where: "Book page trust strip",
  },
  bookTrust2: {
    id: "book-trust-2",
    file: `${CUSTOMER_IMAGE_DIR}/02-book/trust-2`,
    width: 4,
    height: 3,
    label: "trust-2",
    description: "Performer in character with guests.",
    where: "Book page trust strip",
  },
  aboutCast: {
    id: "about-cast",
    file: `${CUSTOMER_IMAGE_DIR}/03-about/cast`,
    width: 4,
    height: 3,
    label: "cast",
    description: "Cast group photo in costume.",
    where: "About page",
  },
  showGallery1: {
    id: "show-gallery-1",
    file: `${CUSTOMER_IMAGE_DIR}/04-gallery/scene-1`,
    width: 4,
    height: 3,
    label: "scene-1",
    description: "Cast lineup or venue performance still.",
    where: "Live show detail gallery",
  },
  showGallery2: {
    id: "show-gallery-2",
    file: `${CUSTOMER_IMAGE_DIR}/04-gallery/scene-2`,
    width: 4,
    height: 3,
    label: "scene-2",
    description: "Guests interacting with actors or clue props.",
    where: "Live show detail gallery",
    temporary: true,
  },
  showGallery3: {
    id: "show-gallery-3",
    file: `${CUSTOMER_IMAGE_DIR}/04-gallery/scene-3`,
    width: 4,
    height: 3,
    label: "scene-3",
    description: "Guests celebrating or interactive game moment.",
    where: "Live show detail gallery",
    temporary: true,
  },
  onlineHero: {
    id: "online-hero",
    file: `${CUSTOMER_IMAGE_DIR}/05-online/hero`,
    width: 4,
    height: 3,
    label: "hero",
    description: "At-home / Case Room / screen still — not a live venue photo.",
    where: "Online Mysteries catalog hero",
    temporary: true,
  },
} as const satisfies Record<string, ImageSlotSpec>;

/** Live (+ online) show cover inventory for checklists. */
export const SHOW_COVER_SLUGS = [
  { slug: "murder-for-real", title: "Murder for Real", temporary: false },
  { slug: "round-and-round-it-goes", title: "Round and Round it Goes", temporary: false },
  { slug: "the-final-note", title: "The Final Note", temporary: false },
  { slug: "the-missing-mascot", title: "The Missing Mascot", temporary: true },
  { slug: "the-case-of-the-missing-gems", title: "The Case of the Missing Gems", temporary: true },
  { slug: "medieval-misfortune", title: "Medieval Misfortune", temporary: true },
  { slug: "a-chance-to-die", title: "A Chance to Die", temporary: true },
  { slug: "murder-preserved", title: "Murder, Preserved", temporary: true },
  { slug: "vineyard-of-good-and-evil", title: "Vineyard of Good and Evil", temporary: true },
  { slug: "spies-in-disguise", title: "Spies in Disguise", temporary: true },
  { slug: "missing-millions", title: "Missing Millions (online)", temporary: false },
  { slug: "dog-show-debacle", title: "Dog Show Debacle (online, later)", temporary: false },
  { slug: "holiday-inheritance", title: "Holiday Inheritance (online, later)", temporary: false },
] as const;

export const SHOW_COVER = {
  width: 4,
  height: 3,
  pixelWidth: 960,
  pixelHeight: 720,
  pathForSlug(slug: string) {
    return `${CUSTOMER_IMAGE_DIR}/06-shows/${slug}-cover`;
  },
  fallbackFile: `${CUSTOMER_IMAGE_DIR}/06-shows/_fallback`,
  description:
    "Show poster / key art. Landscape 4∶3 is ideal; portrait also works (we crop).",
  where: "Show cards and show detail",
} as const;

export function showCoverSpec(slug: string, title: string): ImageSlotSpec {
  return {
    id: `${slug}-cover`,
    file: SHOW_COVER.pathForSlug(slug),
    width: SHOW_COVER.width,
    height: SHOW_COVER.height,
    label: `${slug}-cover`,
    description: `Cover / key art for “${title}”.`,
    where: SHOW_COVER.where,
  };
}

export function publicUrl(file: string) {
  return `/${file.replace(/^\/+/, "")}`;
}

export function allSiteSlots(): ImageSlotSpec[] {
  return Object.values(SITE_IMAGE_SLOTS);
}
