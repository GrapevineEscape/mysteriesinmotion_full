import { notFound } from "next/navigation";
import { AdminShowNav } from "@/components/admin-show-nav";
import { db } from "@/lib/db";
import { DEFAULT_SITUATION_RANK_BANDS } from "@/lib/situation-room-types";
import { updateDetectiveLevelNames } from "./actions";

export default async function DetectiveLevelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ showId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { showId } = await params;
  const { saved } = await searchParams;
  const show = await db.show.findUnique({
    where: { slug: showId },
    include: {
      resultTiers: { orderBy: { minimumPercent: "asc" } },
    },
  });
  if (!show) notFound();

  const levels = DEFAULT_SITUATION_RANK_BANDS.map((band, index) => ({
    ...band,
    name: show.resultTiers[index]?.name.trim() || band.name,
  }));

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">{show.title}</p>
      <h1>Detective Levels</h1>
      <p className="page-intro">
        Change the names players earn in the Situation Room. Score ranges stay
        fixed so every possible result always receives exactly one level.
      </p>
      <AdminShowNav active="levels" slug={show.slug} />

      {saved === "1" && (
        <div className="admin-alert" role="status">
          <strong>Detective levels saved.</strong>
          <span>The updated names will appear on future results.</span>
        </div>
      )}

      <form action={updateDetectiveLevelNames} className="admin-panel">
        <input name="showId" type="hidden" value={show.id} />
        <div className="admin-panel-heading">
          <div>
            <p className="card-kicker">Situation Room ranking</p>
            <h2>Level names</h2>
            <p>
              Only the displayed names are editable. The percentage ranges
              cannot be changed from this screen.
            </p>
          </div>
          <strong className="admin-count-badge">{levels.length}</strong>
        </div>

        <div className="detective-level-list">
          {levels.map((level, index) => (
            <article className="detective-level-row" key={level.minimumPercent}>
              <div className="detective-level-range">
                <span>Level {index + 1}</span>
                <strong>
                  {level.minimumPercent}%–{level.maximumPercent}%
                </strong>
              </div>
              <label className="admin-field">
                <span>Displayed name</span>
                <input
                  defaultValue={level.name}
                  maxLength={80}
                  name={`levelName-${level.minimumPercent}`}
                  required
                />
              </label>
            </article>
          ))}
        </div>

        <div className="admin-form-footer">
          <p>
            Saving creates a complete, gap-free set of levels for this mystery.
          </p>
          <button className="button button-primary" type="submit">
            Save detective level names
          </button>
        </div>
      </form>
    </section>
  );
}
