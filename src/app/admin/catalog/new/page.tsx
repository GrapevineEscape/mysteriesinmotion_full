import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ShowForm } from "../show-form";

export const metadata: Metadata = { title: "Add a show" };

export default async function NewShowPage() {
  await requireAdmin();

  return (
    <>
      <header className="portal-topbar">
        <h1>Add a show</h1>
        <Link className="button button-small button-ghost" href="/admin/catalog">
          Back to catalog
        </Link>
      </header>
      <div className="portal-content">
        <section className="portal-panel">
          <p className="page-intro">
            Save the basics first. Roles, artwork, and the script can be added on
            the next screen.
          </p>
          <ShowForm />
        </section>
      </div>
    </>
  );
}
