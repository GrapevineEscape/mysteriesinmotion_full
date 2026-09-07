import Link from "next/link";
import { ImageSlot } from "@/components/image-slot";
import { showCoverSpec } from "@/lib/customer-images";
import { resolveShowCover } from "@/lib/resolve-customer-image";

export type MysteryShowCardData = {
  slug: string;
  title: string;
  shortDescription: string;
  type: string;
  kidFriendly?: boolean;
  coverImageUrl?: string | null;
  characterCount?: number;
};

export function MysteryShowCard({
  show,
  href,
  cta = "View details",
}: {
  show: MysteryShowCardData;
  href?: string;
  cta?: string;
}) {
  const link = href ?? `/shows/${show.slug}`;
  const kicker =
    show.type === "ESCAPE"
      ? "Escape mystery"
      : show.type === "ONLINE"
        ? "Online mystery"
        : "Live mystery";
  const cover = resolveShowCover(show.slug, show.coverImageUrl);

  return (
    <article className="mystery-card">
      <div className="mystery-card-media">
        <ImageSlot
          fill
          candidates={[cover]}
          spec={showCoverSpec(show.slug, show.title)}
          alt={`${show.title} cover`}
        />
      </div>
      <div className="mystery-card-copy">
        <p className="card-kicker">
          {kicker}
          {show.kidFriendly ? " · Family friendly" : ""}
        </p>
        <h3>{show.title}</h3>
        <p>{show.shortDescription}</p>
        {typeof show.characterCount === "number" && (
          <p className="card-kicker">
            {show.characterCount}{" "}
            {show.characterCount === 1 ? "character" : "characters"}
          </p>
        )}
        <Link className="button button-primary" href={link}>
          {cta}
        </Link>
      </div>
    </article>
  );
}
