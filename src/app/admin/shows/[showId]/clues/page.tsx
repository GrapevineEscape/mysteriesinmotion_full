import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShowNav } from "@/components/admin-show-nav";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClue, updateClue } from "./actions";

function timecode(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

export default async function ClueAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ showId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const { showId } = await params;
  const { edit } = await searchParams;
  const show = await db.show.findUnique({
    where: { slug: showId },
    include: { evidenceItems: { orderBy: { displayOrder: "asc" } } },
  });
  if (!show) notFound();
  const clueBeingEdited = edit
    ? show.evidenceItems.find((clue) => clue.id === edit)
    : undefined;

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">{show.title}</p>
      <h1>Clue Manager</h1>
      <p className="page-intro">
        Add the evidence that appears in the briefcase and choose exactly when
        each item unlocks.
      </p>
      <AdminShowNav active="clues" slug={show.slug} />
      <div className="clue-admin-layout">
        <div className="clue-list-panel">
          <h2>Current clues</h2>
          <div className="admin-clue-list">
            {show.evidenceItems.map((clue) => (
              <article
                className={clueBeingEdited?.id === clue.id ? "editing" : ""}
                key={clue.id}
              >
                <div className="admin-clue-icon">{clue.iconUrl ? "ICON" : "?"}</div>
                <div>
                  <h3>{clue.title}</h3>
                  {clue.description && <p>{clue.description}</p>}
                  <span>{clue.unlockStage === "ACT_ONE" ? "Act 1" : "Act 2"} · {timecode(clue.unlockAtSeconds)}</span>
                </div>
                <Link
                  aria-label={`Edit ${clue.title}`}
                  className="clue-edit-link"
                  href={`/admin/shows/${show.slug}/clues?edit=${clue.id}`}
                >
                  Edit
                </Link>
              </article>
            ))}
            {!show.evidenceItems.length && <p>No clues configured yet.</p>}
          </div>
        </div>
        <form
          action={clueBeingEdited ? updateClue : createClue}
          className="admin-panel clue-editor"
        >
          <input name="showId" type="hidden" value={show.id} />
          <input name="slug" type="hidden" value={show.slug} />
          {clueBeingEdited && (
            <input name="clueId" type="hidden" value={clueBeingEdited.id} />
          )}
          <p className="card-kicker">
            {clueBeingEdited ? "Editing saved clue" : "New evidence"}
          </p>
          <h2>{clueBeingEdited ? `Edit ${clueBeingEdited.title}` : "Add a clue"}</h2>
          <div className="clue-editor-grid">
            <label><span>Displayed name</span><input defaultValue={clueBeingEdited?.title ?? ""} name="title" required /></label>
            <label><span>Act</span><select defaultValue={clueBeingEdited?.unlockStage ?? "ACT_ONE"} name="unlockStage"><option value="ACT_ONE">Act 1</option><option value="ACT_TWO">Act 2</option></select></label>
            <label><span>Unlock time</span><input defaultValue={clueBeingEdited ? timecode(clueBeingEdited.unlockAtSeconds) : "00:00:00"} name="timecode" pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}" required /></label>
            <label className="wide-field"><span>Description (optional)</span><textarea defaultValue={clueBeingEdited?.description ?? ""} name="description" rows={3} /></label>
            <label><span>Clue file reference</span><input defaultValue={clueBeingEdited?.fileUrl ?? ""} name="fileUrl" placeholder="r2://bucket/path/file.jpg or HTTPS URL" /></label>
            <label>
              <span>Briefcase icon reference</span>
              <input defaultValue={clueBeingEdited?.iconUrl ?? ""} name="iconUrl" placeholder="r2://bucket/path/icon.jpg or HTTPS URL" />
              <small>Shown at 131×73 pixels. Upload at least 262×146 so it stays sharp.</small>
            </label>
            <label><input defaultChecked={clueBeingEdited?.visibleDuringReveal ?? true} name="visibleDuringReveal" type="checkbox" /> Available during Act Two</label>
          </div>
          <p>
            Private R2 files use <code>r2://bucket/object-key</code>, such as{" "}
            <code>r2://online-mystery-images/clues/file.jpg</code>. HTTPS URLs
            also remain supported. Keep the clue file and the briefcase icon as
            separate references. The icon fills a 131×73 thumbnail.
          </p>
          <div className="clue-editor-actions">
            {clueBeingEdited && (
              <Link
                className="button button-ghost"
                href={`/admin/shows/${show.slug}/clues`}
              >
                Cancel
              </Link>
            )}
            <button className="button button-primary" type="submit">
              {clueBeingEdited ? "Save changes" : "Save clue"}
            </button>
          </div>
        </form>
      </div>
      <Link className="text-link" href={`/admin/shows/${show.slug}`}>← Return to show configuration</Link>
    </section>
  );
}
