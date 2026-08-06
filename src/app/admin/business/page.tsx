import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  adminDate,
  adminDateTime,
  attemptHasStarted,
  formatMoney,
  latestDate,
  parseReportPeriod,
  purchaseAccessLabel,
  reportPeriodStart,
  withinReportPeriod,
} from "@/lib/admin-reporting";

export const metadata: Metadata = { title: "Business Dashboard" };
export const dynamic = "force-dynamic";

function showList(
  purchases: Array<{ show: { title: string }; purchasedAt: Date | null }>,
) {
  return Array.from(
    new Set(
      purchases
        .filter((purchase) => purchase.purchasedAt)
        .map((purchase) => purchase.show.title),
    ),
  ).join(", ");
}

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAdmin();
  const { period: rawPeriod } = await searchParams;
  const period = parseReportPeriod(rawPeriod);
  const now = new Date();
  const periodStart = reportPeriodStart(period, now);

  const [customers, shows] = await Promise.all([
    db.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      include: {
        purchases: {
          orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
          include: {
            show: { select: { id: true, title: true } },
            attempts: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                createdAt: true,
                investigationStartedAt: true,
                accusationSubmittedAt: true,
                completedAt: true,
                playbackUpdatedAt: true,
                furthestIntroSeconds: true,
                furthestActOneSeconds: true,
                furthestActTwoSeconds: true,
                scorePercent: true,
                resultTierName: true,
              },
            },
          },
        },
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            showId: true,
            purchaseId: true,
            createdAt: true,
            investigationStartedAt: true,
            accusationSubmittedAt: true,
            completedAt: true,
            playbackUpdatedAt: true,
            furthestIntroSeconds: true,
            furthestActOneSeconds: true,
            furthestActTwoSeconds: true,
            scorePercent: true,
            resultTierName: true,
            show: { select: { title: true } },
          },
        },
      },
    }),
    db.show.findMany({
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        online: { select: { priceCents: true } },
      },
    }),
  ]);

  const allPurchases = customers.flatMap((customer) =>
    customer.purchases.map((purchase) => ({ ...purchase, customer })),
  );
  const allAttempts = customers.flatMap((customer) =>
    customer.attempts.map((attempt) => ({ ...attempt, customer })),
  );
  const periodPurchases = allPurchases.filter((purchase) =>
    withinReportPeriod(purchase.purchasedAt ?? purchase.createdAt, periodStart),
  );
  const periodAttempts = allAttempts.filter((attempt) =>
    withinReportPeriod(
      attempt.investigationStartedAt ?? attempt.createdAt,
      periodStart,
    ),
  );

  const chargedPurchases = periodPurchases.filter(
    (purchase) =>
      purchase.amountCents > 0 &&
      ["PAID", "REFUNDED", "DISPUTED"].includes(purchase.status),
  );
  const grossSalesCents = chargedPurchases.reduce(
    (sum, purchase) => sum + purchase.amountCents,
    0,
  );
  const refundedCents = chargedPurchases
    .filter((purchase) => purchase.status === "REFUNDED")
    .reduce((sum, purchase) => sum + purchase.amountCents, 0);
  const disputedCents = chargedPurchases
    .filter((purchase) => purchase.status === "DISPUTED")
    .reduce((sum, purchase) => sum + purchase.amountCents, 0);
  const netCollectedCents =
    grossSalesCents - refundedCents - disputedCents;
  const startedAttempts = periodAttempts.filter(attemptHasStarted);
  const completedAttempts = periodAttempts.filter(
    (attempt) => attempt.completedAt,
  );
  const newCustomers = customers.filter((customer) =>
    withinReportPeriod(customer.createdAt, periodStart),
  );
  const payingCustomers = new Set(
    periodPurchases
      .filter((purchase) => purchase.amountCents > 0)
      .map((purchase) => purchase.userId),
  ).size;

  const recentCustomers = customers.slice(0, 25);
  const recentPurchases = [...allPurchases]
    .sort(
      (left, right) =>
        (right.purchasedAt ?? right.createdAt).getTime() -
        (left.purchasedAt ?? left.createdAt).getTime(),
    )
    .slice(0, 30);

  const showRows = shows.map((show) => {
    const purchases = periodPurchases.filter(
      (purchase) => purchase.showId === show.id,
    );
    const attempts = periodAttempts.filter(
      (attempt) => attempt.showId === show.id,
    );
    const scored = attempts.filter(
      (attempt): attempt is typeof attempt & { scorePercent: number } =>
        attempt.scorePercent !== null,
    );
    const grossCents = purchases
      .filter(
        (purchase) =>
          purchase.amountCents > 0 &&
          ["PAID", "REFUNDED", "DISPUTED"].includes(purchase.status),
      )
      .reduce((sum, purchase) => sum + purchase.amountCents, 0);
    const deductionsCents = purchases
      .filter((purchase) =>
        ["REFUNDED", "DISPUTED"].includes(purchase.status),
      )
      .reduce((sum, purchase) => sum + purchase.amountCents, 0);
    return {
      ...show,
      purchases,
      attempts,
      completed: attempts.filter((attempt) => attempt.completedAt).length,
      uniqueCustomers: new Set(purchases.map((purchase) => purchase.userId))
        .size,
      netCents: grossCents - deductionsCents,
      averageScore: scored.length
        ? Math.round(
            scored.reduce((sum, attempt) => sum + attempt.scorePercent, 0) /
              scored.length,
          )
        : null,
    };
  });

  return (
    <section className="page-shell admin-shell business-dashboard">
      <p className="eyebrow">Administrator</p>
      <h1>Business Dashboard</h1>
      <p className="page-intro">
        Review customers, purchases, access windows, mystery activity, and
        recorded revenue. Times are shown in Central Time.
      </p>

      <nav className="business-nav" aria-label="Business reports">
        <Link href="/admin">← Show Administration</Link>
        <a href="#overview">Overview</a>
        <a href="#customers">Customers</a>
        <a href="#purchases">Purchases</a>
        <a href="#shows">Shows</a>
      </nav>

      <form className="report-period" method="get">
        <label htmlFor="report-period">Reporting period</label>
        <select defaultValue={period} id="report-period" name="period">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 12 months</option>
          <option value="all">All time</option>
        </select>
        <button className="button button-ghost" type="submit">
          Update report
        </button>
      </form>

      <section id="overview" className="business-section">
        <div className="business-heading">
          <div>
            <p className="card-kicker">At a glance</p>
            <h2>Overview</h2>
          </div>
          <span>
            {periodStart
              ? `${adminDate.format(periodStart)}–${adminDate.format(now)}`
              : "All recorded activity"}
          </span>
        </div>

        <div className="business-metrics">
          <article>
            <span>Net collected</span>
            <strong>{formatMoney(netCollectedCents)}</strong>
            <small>Gross less recorded refunds and disputes</small>
          </article>
          <article>
            <span>Gross sales</span>
            <strong>{formatMoney(grossSalesCents)}</strong>
            <small>{chargedPurchases.length} paid transaction records</small>
          </article>
          <article>
            <span>Refunds / disputes</span>
            <strong>{formatMoney(refundedCents + disputedCents)}</strong>
            <small>
              {formatMoney(refundedCents)} refunded ·{" "}
              {formatMoney(disputedCents)} disputed
            </small>
          </article>
          <article>
            <span>Customers</span>
            <strong>{customers.length}</strong>
            <small>{newCustomers.length} registered in this period</small>
          </article>
          <article>
            <span>Paying customers</span>
            <strong>{payingCustomers}</strong>
            <small>Unique customers in this period</small>
          </article>
          <article>
            <span>Games started</span>
            <strong>{startedAttempts.length}</strong>
            <small>{completedAttempts.length} completed</small>
          </article>
        </div>

        <div className="business-note">
          <strong>Revenue definition</strong>
          <p>
            This dashboard uses the amount and status saved on each purchase.
            Complimentary access is excluded. Payment-processing fees and
            partial refunds are not yet stored, so “net collected” means paid
            sales minus fully refunded or disputed transactions.
          </p>
        </div>
      </section>

      <section id="customers" className="business-section">
        <div className="business-heading">
          <div>
            <p className="card-kicker">Customer database</p>
            <h2>Customers</h2>
          </div>
          <div className="business-heading-actions">
            <Link href="/admin/customers">Open support tools</Link>
            <a href="/admin/business/export?report=customers">
              Download customers CSV
            </a>
          </div>
        </div>

        <div className="report-table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Name / email</th>
                <th>Registered</th>
                <th>Purchased mysteries</th>
                <th>Collected</th>
                <th>Games</th>
                <th>Last watched</th>
                <th>Latest level</th>
              </tr>
            </thead>
            <tbody>
              {recentCustomers.map((customer) => {
                const collectedCents = customer.purchases
                  .filter((purchase) => purchase.status === "PAID")
                  .reduce((sum, purchase) => sum + purchase.amountCents, 0);
                const started = customer.attempts.filter(attemptHasStarted);
                const completed = customer.attempts.filter(
                  (attempt) => attempt.completedAt,
                );
                const lastWatched = latestDate(
                  started.flatMap((attempt) => [
                    attempt.playbackUpdatedAt,
                    attempt.completedAt,
                    attempt.investigationStartedAt,
                  ]),
                );
                const latestResult = completed[0];
                return (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.displayName || "Name not provided"}</strong>
                      <Link
                        href={`/admin/customers?q=${encodeURIComponent(customer.email)}`}
                      >
                        {customer.email}
                      </Link>
                    </td>
                    <td>
                      {adminDateTime.format(customer.createdAt)}
                      <small>
                        {customer.emailVerifiedAt
                          ? "Email verified"
                          : "Not verified"}
                      </small>
                    </td>
                    <td>
                      {showList(customer.purchases) || "None"}
                      <small>{customer.purchases.length} access records</small>
                    </td>
                    <td>{formatMoney(collectedCents)}</td>
                    <td>
                      {started.length} started
                      <small>{completed.length} completed</small>
                    </td>
                    <td>
                      {lastWatched
                        ? adminDateTime.format(lastWatched)
                        : "Never"}
                    </td>
                    <td>
                      {latestResult?.resultTierName ?? "No result"}
                      {latestResult?.scorePercent !== null &&
                        latestResult?.scorePercent !== undefined && (
                          <small>{latestResult.scorePercent}%</small>
                        )}
                    </td>
                  </tr>
                );
              })}
              {!recentCustomers.length && (
                <tr>
                  <td colSpan={7}>No customer accounts have registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {customers.length > recentCustomers.length && (
          <p className="report-caption">
            Showing the 25 newest customers. The CSV contains all{" "}
            {customers.length} customer records.
          </p>
        )}
      </section>

      <section id="purchases" className="business-section">
        <div className="business-heading">
          <div>
            <p className="card-kicker">Money and access</p>
            <h2>Purchases</h2>
          </div>
          <a href="/admin/business/export?report=purchases">
            Download purchases CSV
          </a>
        </div>

        <div className="report-table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mystery</th>
                <th>Purchased</th>
                <th>Status / amount</th>
                <th>Access</th>
                <th>Watched</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((purchase) => {
                const started = purchase.attempts.filter(attemptHasStarted);
                const completed = purchase.attempts.filter(
                  (attempt) => attempt.completedAt,
                );
                const lastWatched = latestDate(
                  started.flatMap((attempt) => [
                    attempt.playbackUpdatedAt,
                    attempt.completedAt,
                    attempt.investigationStartedAt,
                  ]),
                );
                const latestResult = completed[0];
                return (
                  <tr key={purchase.id}>
                    <td>
                      <strong>
                        {purchase.customer.displayName || "Name not provided"}
                      </strong>
                      <Link
                        href={`/admin/customers?q=${encodeURIComponent(
                          purchase.customer.email,
                        )}`}
                      >
                        {purchase.customer.email}
                      </Link>
                    </td>
                    <td>{purchase.show.title}</td>
                    <td>
                      {purchase.purchasedAt
                        ? adminDateTime.format(purchase.purchasedAt)
                        : "Not completed"}
                    </td>
                    <td>
                      <span
                        className={`support-state ${purchase.status.toLowerCase()}`}
                      >
                        {purchase.status}
                      </span>
                      <small>
                        {purchase.amountCents
                          ? formatMoney(
                              purchase.amountCents,
                              purchase.currency,
                            )
                          : "Complimentary"}
                      </small>
                    </td>
                    <td>
                      {purchaseAccessLabel(purchase, now)}
                      <small>
                        {purchase.playWindowEndsAt
                          ? `Ends ${adminDateTime.format(
                              purchase.playWindowEndsAt,
                            )}`
                          : purchase.startByAt
                            ? `Start by ${adminDateTime.format(
                                purchase.startByAt,
                              )}`
                            : "No deadline"}
                      </small>
                    </td>
                    <td>
                      {started.length} playthroughs
                      <small>
                        {lastWatched
                          ? `Last ${adminDateTime.format(lastWatched)}`
                          : "Never started"}
                      </small>
                    </td>
                    <td>
                      {latestResult?.resultTierName ?? "No result"}
                      {latestResult?.scorePercent !== null &&
                        latestResult?.scorePercent !== undefined && (
                          <small>{latestResult.scorePercent}%</small>
                        )}
                    </td>
                  </tr>
                );
              })}
              {!recentPurchases.length && (
                <tr>
                  <td colSpan={7}>No purchase records have been created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {allPurchases.length > recentPurchases.length && (
          <p className="report-caption">
            Showing the 30 newest purchases. The CSV contains all{" "}
            {allPurchases.length} purchase records.
          </p>
        )}
      </section>

      <section id="shows" className="business-section">
        <div className="business-heading">
          <div>
            <p className="card-kicker">Mystery performance</p>
            <h2>Shows</h2>
          </div>
          <a href="/admin/business/export?report=shows">
            Download shows CSV
          </a>
        </div>

        <div className="report-table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Mystery</th>
                <th>Status</th>
                <th>Purchases</th>
                <th>Customers</th>
                <th>Net collected</th>
                <th>Games</th>
                <th>Average score</th>
              </tr>
            </thead>
            <tbody>
              {showRows.map((show) => (
                <tr key={show.id}>
                  <td>
                    <strong>{show.title}</strong>
                    <small>
                      {show.online
                        ? `List price ${formatMoney(show.online.priceCents)}`
                        : "Live performance"}
                    </small>
                  </td>
                  <td>{show.status}</td>
                  <td>{show.purchases.length}</td>
                  <td>{show.uniqueCustomers}</td>
                  <td>{formatMoney(show.netCents)}</td>
                  <td>
                    {show.attempts.filter(attemptHasStarted).length} started
                    <small>{show.completed} completed</small>
                  </td>
                  <td>
                    {show.averageScore === null
                      ? "No scores"
                      : `${show.averageScore}%`}
                  </td>
                </tr>
              ))}
              {!showRows.length && (
                <tr>
                  <td colSpan={7}>No mysteries are configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

