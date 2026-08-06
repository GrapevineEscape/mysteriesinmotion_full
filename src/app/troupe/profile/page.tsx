import type { Metadata } from "next";
/* eslint-disable @next/next/no-img-element */
import { requireTroupe } from "@/lib/auth";
import { secureR2Reference } from "@/lib/cloudflare-r2";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function TroupeProfilePage() {
  const member = await requireTroupe();
  const headshotUrl = await secureR2Reference(member.headshotUrl);

  return (
    <>
      <header className="portal-topbar">
        <h1>Profile</h1>
      </header>
      <div className="portal-content">
        <p className="page-intro">
          Keep your contact details and headshot current. Casting works from
          what is here.
        </p>

        <section className="portal-panel">
          <ProfileForm member={member} />
        </section>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Current headshot</h2>
          </div>
          {headshotUrl ? (
            // Signed R2 URLs expire, so the optimizer would cache a dead source.
            <img
              alt="Your headshot"
              className="portal-headshot"
              src={headshotUrl}
              width={180}
            />
          ) : (
            <div className="admin-empty-state">
              <strong>No headshot yet</strong>
              <p>Upload one above so directors can put a face to your name.</p>
            </div>
          )}
        </section>

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Signing in</h2>
          </div>
          <p className="muted">
            There is no password to manage. Each time you sign in we email a
            one-time code to <strong>{member.email}</strong>. If that address
            should change, ask an administrator.
          </p>
        </section>
      </div>
    </>
  );
}
