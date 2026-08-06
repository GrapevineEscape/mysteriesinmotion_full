import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canStartNewGame, gameCanContinue } from "@/lib/entitlements";

const accessDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});

export default async function MysteryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ access?: string }>;
}) {
  const [{ slug }, { access }, user] = await Promise.all([
    params,
    searchParams,
    currentUser(),
  ]);
  const show = await db.show.findUnique({
    where: { slug },
    include: { online: true },
  });
  // The streaming catalog only lists online productions.
  if (!show?.online) notFound();

  const [purchases, activeAttempt] = user
    ? await Promise.all([
        db.purchase.findMany({
          where: { userId: user.id, showId: show.id },
          orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
        }),
        db.caseAttempt.findFirst({
          where: {
            userId: user.id,
            showId: show.id,
            completedAt: null,
          },
          include: { purchase: true },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], null];
  const activeGame = Boolean(
    user?.role === "ADMIN" ||
      (activeAttempt && gameCanContinue(activeAttempt)),
  );
  const currentEntitlement = purchases.find((purchase) =>
    canStartNewGame(purchase),
  );
  const entitled = Boolean(
    user?.role === "ADMIN" || activeGame || currentEntitlement,
  );
  const accessMessage =
    user?.role === "ADMIN"
      ? "Administrator access does not expire."
      : activeGame
        ? "Your active game remains available until you complete it."
        : currentEntitlement?.playWindowEndsAt
          ? `Your 48-hour replay window ends ${accessDate.format(
              currentEntitlement.playWindowEndsAt,
            )}.`
          : currentEntitlement?.startByAt
            ? `Begin by ${accessDate.format(
                currentEntitlement.startByAt,
              )}. Your first successful stream opens 48 hours of unlimited replays.`
            : null;

  return (
    <section className="page-shell narrow-shell">
      <p className="eyebrow">Original online mystery</p>
      <h1>{show.title}</h1>
      <p className="page-intro">{show.fullDescription}</p>
      <p className="card-kicker">
        ${(show.online.priceCents / 100).toFixed(2)} per show
      </p>
      {access === "required" && (
        <p role="alert">This mystery must be purchased before it can be played.</p>
      )}
      {access === "expired" && (
        <p role="alert">
          This mystery&apos;s access period has ended. Purchase it again to
          begin a new game.
        </p>
      )}
      {accessMessage && <p>{accessMessage}</p>}
      {entitled ? (
        <Link className="button button-primary" href={`/play/${show.slug}`}>
          Enter the Case Room
        </Link>
      ) : user ? (
        <button className="button button-disabled" disabled>
          {purchases.length
            ? "Purchase again — Square coming next"
            : "Square checkout coming next"}
        </button>
      ) : (
        <Link
          className="button button-primary"
          href={`/sign-in?next=${encodeURIComponent(`/mysteries/${show.slug}`)}`}
        >
          Sign in to purchase
        </Link>
      )}
    </section>
  );
}
