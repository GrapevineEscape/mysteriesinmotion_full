"use client";

import { useState } from "react";
import type { ApplicationStatus } from "@prisma/client";
import { reviewApplication, reviewApplications } from "./actions";

type Row = {
  id: string;
  performer: string;
  performerEmail: string;
  role: string;
  show: string;
  showSlug: string;
  status: ApplicationStatus;
  appliedAt: string;
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Awaiting review",
  APPROVED: "On the roster",
  REJECTED: "Declined",
};

/**
 * Selecting rows drives the bulk buttons; the per-row buttons carry their own
 * identifier so a single decision never depends on what happens to be ticked.
 */
export function ApplicationTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  return (
    <form action={reviewApplications}>
      <div className="portal-bulk-bar" data-active={selected.length > 0}>
        <span>
          {selected.length
            ? `${selected.length} selected`
            : "Tick requests to review several at once"}
        </span>
        <div className="button-row">
          <button
            className="button button-small button-primary"
            disabled={!selected.length}
            name="action"
            type="submit"
            value="approve"
          >
            Add to roster
          </button>
          <button
            className="button button-small button-danger"
            disabled={!selected.length}
            name="action"
            type="submit"
            value="reject"
          >
            Decline
          </button>
        </div>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th>
                <input
                  aria-label="Select every request"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? [] : rows.map((row) => row.id))
                  }
                  type="checkbox"
                />
              </th>
              <th>Performer</th>
              <th>Role</th>
              <th>Show</th>
              <th>Requested</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    aria-label={`Select ${row.performer} for ${row.role}`}
                    checked={selected.includes(row.id)}
                    name={selected.includes(row.id) ? "applicationId" : undefined}
                    onChange={() => toggle(row.id)}
                    type="checkbox"
                    value={row.id}
                  />
                </td>
                <td>
                  <strong>{row.performer}</strong>
                  <br />
                  <small>{row.performerEmail}</small>
                </td>
                <td>{row.role}</td>
                <td>{row.show}</td>
                <td>{row.appliedAt}</td>
                <td>
                  <span className="portal-pill" data-tone={row.status.toLowerCase()}>
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
                <td>
                  <div className="button-row">
                    {row.status !== "APPROVED" && (
                      <button
                        className="button button-small button-primary"
                        formAction={reviewApplication.bind(null, row.id, "APPROVED")}
                        type="submit"
                      >
                        Approve
                      </button>
                    )}
                    {row.status !== "REJECTED" && (
                      <button
                        className="button button-small button-ghost"
                        formAction={reviewApplication.bind(null, row.id, "REJECTED")}
                        type="submit"
                      >
                        Decline
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
