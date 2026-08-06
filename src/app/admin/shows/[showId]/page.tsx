import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShowNav } from "@/components/admin-show-nav";
import { db } from "@/lib/db";
import {
  evaluateShowReadiness,
  showReadinessInclude,
} from "@/lib/show-readiness";
import { updateShowConfiguration } from "./actions";

export const metadata: Metadata = { title: "Configure Show" };

export default async function AdminShowPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const show = await db.show.findUnique({
    where: { slug: showId },
    include: {
      ...showReadinessInclude,
      _count: { select: { evidenceItems: true } },
    },
  });
  if (!show) notFound();
  const readiness = evaluateShowReadiness(show);

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">Show configuration</p>
      <h1>{show.title}</h1>
      <p className="page-intro">
        Control the customer-facing details, video sequence, decision stage,
        and Situation Room presentation.
      </p>
      <AdminShowNav active="overview" slug={show.slug} />
      <Link
        className={`show-readiness-summary ${
          readiness.readyToPublish ? "ready" : "blocked"
        }`}
        href={`/admin/shows/${show.slug}/readiness`}
      >
        <span aria-hidden="true">{readiness.readyToPublish ? "✓" : "!"}</span>
        <div>
          <strong>
            {readiness.readyToPublish
              ? "Automated launch checks passed"
              : `${readiness.blockers.length} ${
                  readiness.blockers.length === 1 ? "issue needs" : "issues need"
                } attention`}
          </strong>
          <small>Open the complete launch-readiness checklist</small>
        </div>
        <b aria-hidden="true">→</b>
      </Link>
      <form action={updateShowConfiguration} className="admin-panel">
        <input name="id" type="hidden" value={show.id} />
        <div className="question-editor-grid">
          <label>
            <span>Title</span>
            <input defaultValue={show.title} name="title" required />
          </label>
          <label>
            <span>Publication status</span>
            <select defaultValue={show.status} name="status">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
          <label className="wide-field">
            <span>Short description</span>
            <textarea defaultValue={show.shortDescription} name="shortDescription" required />
          </label>
          <label className="wide-field">
            <span>Full description</span>
            <textarea defaultValue={show.fullDescription} name="fullDescription" required rows={4} />
          </label>
          <label>
            <span>Price</span>
            <input disabled value="$10.00 per show" />
          </label>
          <label>
            <span>Artwork URL</span>
            <input defaultValue={show.coverImageUrl ?? ""} name="coverImageUrl" />
          </label>
        </div>

        <h2>Optional Introduction</h2>
        <p>
          Video fields accept either the Cloudflare Stream Video UID or the
          complete Cloudflare embed URL.
        </p>
        <label><input defaultChecked={show.introEnabled} name="introEnabled" type="checkbox" /> Enable introduction</label>
        <div className="question-editor-grid">
          <label><span>Introduction title</span><input defaultValue={show.introTitle ?? ""} name="introTitle" /></label>
          <label><span>Cloudflare Video UID or embed URL</span><input defaultValue={show.introVideoId ?? ""} name="introVideoId" /></label>
          <label><input defaultChecked={show.introSkippable} name="introSkippable" type="checkbox" /> Allow skip</label>
          <label><input defaultChecked={show.introReplayable} name="introReplayable" type="checkbox" /> Allow replay</label>
        </div>

        <h2>Act One — Required</h2>
        <div className="question-editor-grid">
          <label><span>Displayed title</span><input defaultValue={show.actOneTitle} name="actOneTitle" required /></label>
          <label><span>Cloudflare Video UID or embed URL</span><input defaultValue={show.actOneVideoId ?? ""} name="actOneVideoId" /></label>
          <label><input defaultChecked={show.actOneCanPause} name="actOneCanPause" type="checkbox" /> Allow pause</label>
          <p>Back 30 seconds is enabled. Forward seeking is disabled. Act One locks permanently on entering Intermission.</p>
        </div>

        <h2>Intermission &amp; Decision — Required</h2>
        <div className="question-editor-grid">
          <label><span>Displayed title</span><input defaultValue={show.intermissionTitle} name="intermissionTitle" required /></label>
          <label><span>Media</span><select defaultValue={show.intermissionMediaType} name="intermissionMediaType"><option value="NONE">No media</option><option value="VIDEO">Video</option><option value="IMAGE">Image</option></select></label>
          <label><span>Cloudflare Video UID or embed URL</span><input defaultValue={show.intermissionVideoId ?? ""} name="intermissionVideoId" /></label>
          <label><span>Image URL</span><input defaultValue={show.intermissionImageUrl ?? ""} name="intermissionImageUrl" /></label>
          <label><input defaultChecked={show.intermissionVideoLoops} name="intermissionVideoLoops" type="checkbox" /> Loop video while deciding</label>
          <label><input defaultChecked={show.accusationTimed} name="accusationTimed" type="checkbox" /> Timed accusation</label>
          <label><span>Timer seconds</span><input defaultValue={show.accusationSeconds ?? ""} min="1" name="accusationSeconds" type="number" /></label>
          <label><span>Warning seconds</span><input defaultValue={show.timerWarningSeconds ?? ""} min="1" name="timerWarningSeconds" type="number" /></label>
          <label><span>When time expires</span><select defaultValue={show.timerExpirationAction} name="timerExpirationAction"><option value="SUBMIT_CURRENT">Submit current answers</option><option value="MARK_UNANSWERED_INCORRECT">Mark unanswered incorrect</option></select></label>
        </div>

        <h2>Act Two &amp; Situation Room</h2>
        <div className="question-editor-grid">
          <label><span>Act Two title</span><input defaultValue={show.actTwoTitle} name="actTwoTitle" required /></label>
          <label><span>Cloudflare Video UID or embed URL</span><input defaultValue={show.actTwoVideoId ?? ""} name="actTwoVideoId" /></label>
          <label><input defaultChecked={show.actTwoCanPause} name="actTwoCanPause" type="checkbox" /> Allow pause</label>
          <label><input defaultChecked={show._count.evidenceItems > 0} name="inventoryEnabled" type="checkbox" /> Enable Case Inventory</label>
          <label><span>Situation Room title</span><input defaultValue={show.situationRoomTitle} name="situationRoomTitle" /></label>
          <label><span>Background music URL</span><input defaultValue={show.resultsMusicUrl ?? ""} name="resultsMusicUrl" /></label>
          <label><input defaultChecked={show.resultsMusicEnabled} name="resultsMusicEnabled" type="checkbox" /> Enable results music</label>
          <label><input defaultChecked={show.vaultTransitionEnabled} name="vaultTransitionEnabled" type="checkbox" /> Vault transition</label>
          <label><input defaultChecked={show.detectiveGaugeEnabled} name="detectiveGaugeEnabled" type="checkbox" /> Detective gauge</label>
        </div>

        <button className="button button-primary" type="submit">Save show configuration</button>
      </form>
      <div className="admin-action-buttons">
        <Link className="button button-ghost" href={`/admin/shows/${show.slug}/clues`}>Configure clues</Link>
        <Link className="button button-ghost" href={`/admin/shows/${show.slug}/questions`}>Configure questions</Link>
      </div>
    </section>
  );
}
