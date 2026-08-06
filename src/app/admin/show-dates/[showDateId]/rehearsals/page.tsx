import type { Metadata } from "next";
import Link from "next/link";
import { formatDateTime, toLocalDateTimeInput } from "@/lib/app-time";
import {
  defaultTechDate,
  MAX_SUGGESTED_REHEARSALS,
  suggestRehearsalDates,
} from "@/lib/rehearsal-schedule";
import { WizardSteps } from "@/components/admin/wizard-steps";
import { requireDraftShowDate } from "../wizard-data";
import { RehearsalForm } from "./rehearsal-form";

export const metadata: Metadata = { title: "Schedule rehearsals" };

const DEFAULT_COUNT = 4;

export default async function WizardRehearsalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ showDateId: string }>;
  searchParams: Promise<{ count?: string }>;
}) {
  const [{ showDateId }, { count }] = await Promise.all([params, searchParams]);
  const showDate = await requireDraftShowDate(showDateId);

  const requested = Number(count);
  const wanted = Number.isFinite(requested)
    ? Math.max(0, Math.min(requested, MAX_SUGGESTED_REHEARSALS))
    : showDate.rehearsals.length || showDate.requiredRehearsals || DEFAULT_COUNT;

  const timeframe = showDate.rehearsalTimeframe || 14;
  // A revisit shows the schedule already saved; a fresh visit, or a changed
  // count, shows fresh suggestions.
  const useSaved = showDate.rehearsals.length === wanted && !count;
  const dates = useSaved
    ? showDate.rehearsals.map((rehearsal) => rehearsal.date)
    : suggestRehearsalDates(showDate.date, timeframe, wanted);

  const counts = [0, 2, 3, 4, 5, 6];

  return (
    <>
      <header className="portal-topbar">
        <h1>{showDate.show.title}</h1>
        <Link className="button button-small button-ghost" href="/admin/show-dates">
          Save and exit
        </Link>
      </header>
      <div className="portal-content">
        <WizardSteps current="rehearsals" />

        <section className="portal-panel">
          <div className="portal-panel-heading">
            <h2>Rehearsals before {formatDateTime(showDate.date)}</h2>
          </div>
          <p className="page-intro">
            Suggested dates are spread across the {timeframe} days before the
            performance, each at 7pm. Adjust anything that does not suit, untick
            what you do not need, and performers will see the schedule when they
            put themselves forward.
          </p>

          <div className="portal-filter-bar">
            <div className="portal-filter-group">
              {counts.map((option) => (
                <Link
                  aria-current={option === wanted ? "true" : undefined}
                  href={`/admin/show-dates/${showDate.id}/rehearsals?count=${option}`}
                  key={option}
                >
                  {option === 0 ? "None" : `${option} rehearsals`}
                </Link>
              ))}
            </div>
          </div>

          <RehearsalForm
            count={dates.length}
            defaultLocation={showDate.location ?? ""}
            defaultTech={toLocalDateTimeInput(
              showDate.techDate ?? defaultTechDate(showDate.date),
            )}
            hasTech={Boolean(showDate.techDate)}
            showDateId={showDate.id}
            suggestions={dates.map((date) => ({
              value: toLocalDateTimeInput(date),
              label: formatDateTime(date),
            }))}
            timeframe={timeframe}
          />
        </section>
      </div>
    </>
  );
}
