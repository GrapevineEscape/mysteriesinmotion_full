import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  attemptHasStarted,
  latestDate,
  purchaseAccessLabel,
} from "@/lib/admin-reporting";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  let text =
    value instanceof Date
      ? value.toISOString()
      : value === null || value === undefined
        ? ""
        : String(value);
  // Prevent spreadsheet applications from treating customer-entered values
  // as formulas when an administrator opens the exported CSV.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvResponse(report: string, rows: unknown[][]) {
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`\uFEFF${csv(rows)}\r\n`, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="online-mystery-${report}-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  await requireAdmin();
  const report = request.nextUrl.searchParams.get("report");
  const now = new Date();

  if (report === "customers") {
    const customers = await db.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      include: {
        purchases: {
          include: { show: { select: { title: true } } },
        },
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
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
    });

    const rows: unknown[][] = [
      [
        "Name",
        "Email",
        "Registered At",
        "Email Verified At",
        "Mysteries Purchased",
        "Purchase Records",
        "Amount Collected",
        "Amount Refunded",
        "Games Started",
        "Games Completed",
        "Last Watched",
        "Latest Sleuth Level",
        "Latest Score Percent",
        "Best Score Percent",
      ],
    ];
    for (const customer of customers) {
      const started = customer.attempts.filter(attemptHasStarted);
      const completed = customer.attempts.filter(
        (attempt) => attempt.completedAt,
      );
      const collected = customer.purchases
        .filter((purchase) => purchase.status === "PAID")
        .reduce((sum, purchase) => sum + purchase.amountCents, 0);
      const refunded = customer.purchases
        .filter((purchase) => purchase.status === "REFUNDED")
        .reduce((sum, purchase) => sum + purchase.amountCents, 0);
      const scores = completed
        .map((attempt) => attempt.scorePercent)
        .filter((score): score is number => score !== null);
      const lastWatched = latestDate(
        started.flatMap((attempt) => [
          attempt.playbackUpdatedAt,
          attempt.completedAt,
          attempt.investigationStartedAt,
        ]),
      );
      rows.push([
        customer.displayName,
        customer.email,
        customer.createdAt,
        customer.emailVerifiedAt,
        Array.from(
          new Set(customer.purchases.map((purchase) => purchase.show.title)),
        ).join("; "),
        customer.purchases.length,
        (collected / 100).toFixed(2),
        (refunded / 100).toFixed(2),
        started.length,
        completed.length,
        lastWatched,
        completed[0]?.resultTierName,
        completed[0]?.scorePercent,
        scores.length ? Math.max(...scores) : null,
      ]);
    }
    return csvResponse("customers", rows);
  }

  if (report === "purchases") {
    const purchases = await db.purchase.findMany({
      orderBy: [{ purchasedAt: "desc" }, { createdAt: "desc" }],
      include: {
        user: { select: { displayName: true, email: true } },
        show: { select: { title: true } },
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
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
    });
    const rows: unknown[][] = [
      [
        "Purchase ID",
        "Name",
        "Email",
        "Mystery",
        "Status",
        "Amount",
        "Currency",
        "Purchased At",
        "Start By",
        "First Playback",
        "Access Expires",
        "Access State",
        "Games Started",
        "Games Completed",
        "Last Watched",
        "Latest Sleuth Level",
        "Latest Score Percent",
        "Square Customer ID",
        "Square Order ID",
        "Square Payment ID",
        "Square Receipt URL",
      ],
    ];
    for (const purchase of purchases) {
      const started = purchase.attempts.filter(attemptHasStarted);
      const completed = purchase.attempts.filter(
        (attempt) => attempt.completedAt,
      );
      rows.push([
        purchase.id,
        purchase.user.displayName,
        purchase.user.email,
        purchase.show.title,
        purchase.status,
        (purchase.amountCents / 100).toFixed(2),
        purchase.currency.toUpperCase(),
        purchase.purchasedAt,
        purchase.startByAt,
        purchase.playWindowStartedAt,
        purchase.playWindowEndsAt,
        purchaseAccessLabel(purchase, now),
        started.length,
        completed.length,
        latestDate(
          started.flatMap((attempt) => [
            attempt.playbackUpdatedAt,
            attempt.completedAt,
            attempt.investigationStartedAt,
          ]),
        ),
        completed[0]?.resultTierName,
        completed[0]?.scorePercent,
        purchase.squareCustomerId,
        purchase.squareOrderId,
        purchase.squarePaymentId,
        purchase.squareReceiptUrl,
      ]);
    }
    return csvResponse("purchases", rows);
  }

  if (report === "shows") {
    const shows = await db.show.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        purchases: true,
        attempts: {
          select: {
            userId: true,
            investigationStartedAt: true,
            accusationSubmittedAt: true,
            completedAt: true,
            furthestIntroSeconds: true,
            furthestActOneSeconds: true,
            furthestActTwoSeconds: true,
            scorePercent: true,
          },
        },
      },
    });
    const rows: unknown[][] = [
      [
        "Mystery",
        "Status",
        "List Price",
        "Purchase Records",
        "Paid Purchases",
        "Complimentary Access",
        "Refunded",
        "Disputed",
        "Unique Customers",
        "Gross Sales",
        "Net Collected",
        "Games Started",
        "Games Completed",
        "Average Score Percent",
      ],
    ];
    for (const show of shows) {
      const charged = show.purchases.filter(
        (purchase) =>
          purchase.amountCents > 0 &&
          ["PAID", "REFUNDED", "DISPUTED"].includes(purchase.status),
      );
      const gross = charged.reduce(
        (sum, purchase) => sum + purchase.amountCents,
        0,
      );
      const deductions = charged
        .filter((purchase) =>
          ["REFUNDED", "DISPUTED"].includes(purchase.status),
        )
        .reduce((sum, purchase) => sum + purchase.amountCents, 0);
      const started = show.attempts.filter(attemptHasStarted);
      const scores = show.attempts
        .map((attempt) => attempt.scorePercent)
        .filter((score): score is number => score !== null);
      rows.push([
        show.title,
        show.status,
        (show.priceCents / 100).toFixed(2),
        show.purchases.length,
        show.purchases.filter((purchase) => purchase.status === "PAID").length,
        show.purchases.filter(
          (purchase) => purchase.status === "COMPLIMENTARY",
        ).length,
        show.purchases.filter((purchase) => purchase.status === "REFUNDED")
          .length,
        show.purchases.filter((purchase) => purchase.status === "DISPUTED")
          .length,
        new Set(show.purchases.map((purchase) => purchase.userId)).size,
        (gross / 100).toFixed(2),
        ((gross - deductions) / 100).toFixed(2),
        started.length,
        show.attempts.filter((attempt) => attempt.completedAt).length,
        scores.length
          ? Math.round(
              scores.reduce((sum, score) => sum + score, 0) / scores.length,
            )
          : null,
      ]);
    }
    return csvResponse("shows", rows);
  }

  return NextResponse.json(
    { error: "Choose customers, purchases, or shows." },
    { status: 400 },
  );
}
