import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { pendingTroupeInvites } from "@/lib/troupe-invites";
import {
  cancelTroupeInvite,
  changeMemberRole,
  inviteTroupeMember,
} from "./actions";

export const metadata: Metadata = { title: "Troupe Access" };

const adminDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Chicago",
});

function memberName(member: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}) {
  const full = [member.firstName, member.lastName].filter(Boolean).join(" ");
  return full || member.displayName || "Name not provided";
}

export default async function TroupeAccessPage() {
  const [members, invites] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["PERFORMER", "ADMIN"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    pendingTroupeInvites(),
  ]);

  return (
    <section className="page-shell admin-shell">
      <p className="eyebrow">Administrator</p>
      <h1>Troupe Access</h1>
      <p className="page-intro">
        Invite performers and directors by email. There is no shared
        registration code and no password: an invited person signs in with a
        one-time code and receives troupe access automatically.
      </p>
      <div className="admin-top-actions">
        <Link className="button button-ghost" href="/admin">
          ← Show Administration
        </Link>
      </div>

      <form action={inviteTroupeMember} className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="card-kicker">New invitation</p>
            <h2>Invite someone to the troupe</h2>
          </div>
        </div>
        <div className="question-editor-grid">
          <label>
            <span>Email address</span>
            <input
              name="email"
              placeholder="performer@example.com"
              required
              type="email"
            />
          </label>
          <label>
            <span>Access level</span>
            <select defaultValue="PERFORMER" name="role">
              <option value="PERFORMER">Performer</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </label>
        </div>
        <button className="button button-primary" type="submit">
          Send invitation
        </button>
      </form>

      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="card-kicker">Awaiting first sign-in</p>
            <h2>Pending invitations</h2>
          </div>
          <strong className="admin-count-badge">{invites.length}</strong>
        </div>
        {invites.length ? (
          <div className="support-access-list">
            {invites.map((invite) => (
              <article key={invite.id}>
                <div>
                  <h4>{invite.email}</h4>
                  <p>
                    {invite.role === "ADMIN" ? "Administrator" : "Performer"} ·
                    expires {adminDate.format(invite.expiresAt)}
                  </p>
                  <small>
                    Invited {adminDate.format(invite.createdAt)}
                    {invite.createdBy
                      ? ` by ${invite.createdBy.displayName ?? invite.createdBy.email}`
                      : ""}
                  </small>
                </div>
                <form action={cancelTroupeInvite}>
                  <input name="id" type="hidden" value={invite.id} />
                  <button className="button button-ghost" type="submit">
                    Cancel invitation
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>No pending invitations</strong>
            <p>Everyone invited so far has signed in at least once.</p>
          </div>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="card-kicker">Current access</p>
            <h2>Troupe members</h2>
          </div>
          <strong className="admin-count-badge">{members.length}</strong>
        </div>
        <div className="support-access-list">
          {members.map((member) => (
            <article key={member.id}>
              <div>
                <h4>{memberName(member)}</h4>
                <p>
                  {member.email}
                  {member.phone ? ` · ${member.phone}` : ""}
                </p>
                <small>
                  {member.role === "ADMIN" ? "Administrator" : "Performer"} ·
                  joined {adminDate.format(member.createdAt)}
                  {member.emailVerifiedAt ? "" : " · email not yet verified"}
                </small>
              </div>
              <form action={changeMemberRole}>
                <input name="id" type="hidden" value={member.id} />
                <label>
                  <span>Access level</span>
                  <select defaultValue={member.role} name="role">
                    <option value="PERFORMER">Performer</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="CUSTOMER">Remove troupe access</option>
                  </select>
                </label>
                <button className="button button-ghost" type="submit">
                  Update
                </button>
              </form>
            </article>
          ))}
          {!members.length && (
            <p>No troupe members yet. Send an invitation to get started.</p>
          )}
        </div>
      </div>
    </section>
  );
}
