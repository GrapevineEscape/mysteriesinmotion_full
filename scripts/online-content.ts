/**
 * Reads Case Room content for the three ONLINE shows from the legacy Online
 * Mystery Postgres and restores it into a unified-schema database.
 *
 * The source may still store playback fields on "Show" (pre-unify) or on
 * "OnlineShowDetail" (post-unify). Both shapes are normalised into the current
 * Prisma models so the pack can be imported into a fresh Render database.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { Client, type QueryResultRow } from "pg";
import type { PrismaClient, Prisma } from "@prisma/client";

export const ONLINE_SHOW_SLUGS = [
  "missing-millions",
  "dog-show-debacle",
  "holiday-inheritance",
] as const;

export type OnlineShowSlug = (typeof ONLINE_SHOW_SLUGS)[number];

const ONLINE_DETAIL_FIELDS = [
  "introEnabled",
  "introTitle",
  "introVideoId",
  "introSkippable",
  "introReplayable",
  "actOneTitle",
  "actOneVideoId",
  "actOneCanPause",
  "actOneRewindSeconds",
  "lockActOneAfterIntermission",
  "intermissionTitle",
  "intermissionMediaType",
  "intermissionVideoId",
  "intermissionImageUrl",
  "intermissionVideoLoops",
  "accusationTimed",
  "accusationSeconds",
  "timerWarningSeconds",
  "timerExpirationAction",
  "actTwoTitle",
  "actTwoVideoId",
  "actTwoCanPause",
  "actTwoRewindSeconds",
  "inventoryEnabled",
  "situationRoomTitle",
  "resultsMusicEnabled",
  "resultsMusicUrl",
  "vaultTransitionEnabled",
  "detectiveGaugeEnabled",
  "priceCents",
  "currency",
  "investigationMinutes",
  "revealMinutes",
] as const;

export type OnlineDetailPayload = {
  [K in (typeof ONLINE_DETAIL_FIELDS)[number]]?: unknown;
};

export type OnlineContentPack = {
  version: 1;
  exportedAt: string;
  sourceHasOnlineShowDetailTable: boolean;
  shows: Array<{
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    fullDescription: string;
    coverImageUrl: string | null;
    status: string;
    displayOrder: number;
    difficulty: string | null;
    ageRecommendation: string | null;
    contentAdvisory: string | null;
    online: OnlineDetailPayload;
    suspects: Array<Record<string, unknown>>;
    questions: Array<Record<string, unknown> & { choices: Array<Record<string, unknown>> }>;
    evidenceItems: Array<Record<string, unknown>>;
    resultTiers: Array<Record<string, unknown>>;
  }>;
};

export type InventoryRow = {
  slug: string;
  title: string | null;
  showId: string | null;
  status: string | null;
  hasOnlineDetail: boolean;
  suspects: number;
  questions: number;
  answerChoices: number;
  evidenceItems: number;
  resultTiers: number;
  introVideoId: boolean;
  actOneVideoId: boolean;
  actTwoVideoId: boolean;
  intermissionVideoId: boolean;
  notes: string[];
};

function sslFor(url: string) {
  return /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false };
}

export function onlineClient(connectionString: string) {
  return new Client({ connectionString, ssl: sslFor(connectionString) });
}

async function tableExists(client: Client, name: string) {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [name],
  );
  return Boolean(rows[0]?.exists);
}

async function columnExists(client: Client, table: string, column: string) {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS exists`,
    [table, column],
  );
  return Boolean(rows[0]?.exists);
}

function pickDetail(row: QueryResultRow): OnlineDetailPayload {
  const detail: OnlineDetailPayload = {};
  for (const field of ONLINE_DETAIL_FIELDS) {
    if (field in row) detail[field] = row[field];
  }
  return detail;
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, entry) => {
      if (entry instanceof Date) return entry.toISOString();
      return entry;
    }),
  ) as T;
}

export async function inventoryOnlineContent(client: Client): Promise<InventoryRow[]> {
  const hasDetail = await tableExists(client, "OnlineShowDetail");
  const rows: InventoryRow[] = [];

  for (const slug of ONLINE_SHOW_SLUGS) {
    const notes: string[] = [];
    const showResult = await client.query<QueryResultRow>(
      `SELECT * FROM "Show" WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    const show = showResult.rows[0];
    if (!show) {
      rows.push({
        slug,
        title: null,
        showId: null,
        status: null,
        hasOnlineDetail: false,
        suspects: 0,
        questions: 0,
        answerChoices: 0,
        evidenceItems: 0,
        resultTiers: 0,
        introVideoId: false,
        actOneVideoId: false,
        actTwoVideoId: false,
        intermissionVideoId: false,
        notes: ["Show row missing from source database"],
      });
      continue;
    }

    let detail: QueryResultRow | null = null;
    if (hasDetail) {
      const detailResult = await client.query<QueryResultRow>(
        `SELECT * FROM "OnlineShowDetail" WHERE "showId" = $1 LIMIT 1`,
        [show.id],
      );
      detail = detailResult.rows[0] ?? null;
      if (!detail) notes.push("OnlineShowDetail row missing");
    } else {
      detail = show;
      notes.push("Source is pre-unify; playback fields live on Show");
    }

    const showId = String(show.id);
    const [{ count: suspects }] = (
      await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "Suspect" WHERE "showId" = $1`,
        [showId],
      )
    ).rows;
    const [{ count: questions }] = (
      await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "Question" WHERE "showId" = $1`,
        [showId],
      )
    ).rows;
    const [{ count: answerChoices }] = (
      await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM "AnswerChoice" c
         JOIN "Question" q ON q.id = c."questionId"
         WHERE q."showId" = $1`,
        [showId],
      )
    ).rows;
    const [{ count: evidenceItems }] = (
      await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "EvidenceItem" WHERE "showId" = $1`,
        [showId],
      )
    ).rows;
    const [{ count: resultTiers }] = (
      await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM "ResultTier" WHERE "showId" = $1`,
        [showId],
      )
    ).rows;

    const q = Number(questions);
    const e = Number(evidenceItems);
    if (q === 0) notes.push("No questions");
    if (e === 0) notes.push("No evidence/clues");
    if (!detail?.actOneVideoId) notes.push("actOneVideoId empty");
    if (!detail?.actTwoVideoId) notes.push("actTwoVideoId empty");

    rows.push({
      slug,
      title: String(show.title ?? ""),
      showId,
      status: String(show.status ?? ""),
      hasOnlineDetail: Boolean(detail),
      suspects: Number(suspects),
      questions: q,
      answerChoices: Number(answerChoices),
      evidenceItems: e,
      resultTiers: Number(resultTiers),
      introVideoId: Boolean(detail?.introVideoId),
      actOneVideoId: Boolean(detail?.actOneVideoId),
      actTwoVideoId: Boolean(detail?.actTwoVideoId),
      intermissionVideoId: Boolean(detail?.intermissionVideoId),
      notes,
    });
  }

  return rows;
}

export async function exportOnlineContent(client: Client): Promise<OnlineContentPack> {
  const hasDetail = await tableExists(client, "OnlineShowDetail");
  const hasDifficulty = await columnExists(client, "Show", "difficulty");
  const shows: OnlineContentPack["shows"] = [];

  for (const slug of ONLINE_SHOW_SLUGS) {
    const showResult = await client.query<QueryResultRow>(
      `SELECT * FROM "Show" WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    const show = showResult.rows[0];
    if (!show) {
      throw new Error(`Source database is missing show slug "${slug}".`);
    }

    let online: OnlineDetailPayload;
    if (hasDetail) {
      const detailResult = await client.query<QueryResultRow>(
        `SELECT * FROM "OnlineShowDetail" WHERE "showId" = $1 LIMIT 1`,
        [show.id],
      );
      if (!detailResult.rows[0]) {
        throw new Error(`Source database is missing OnlineShowDetail for "${slug}".`);
      }
      online = pickDetail(detailResult.rows[0]);
    } else {
      online = pickDetail(show);
    }

    const suspects = (
      await client.query<QueryResultRow>(
        `SELECT * FROM "Suspect" WHERE "showId" = $1 ORDER BY "displayOrder" ASC, name ASC`,
        [show.id],
      )
    ).rows;
    const questions = (
      await client.query<QueryResultRow>(
        `SELECT * FROM "Question" WHERE "showId" = $1 ORDER BY "displayOrder" ASC, id ASC`,
        [show.id],
      )
    ).rows;
    const choices = (
      await client.query<QueryResultRow>(
        `SELECT c.*
         FROM "AnswerChoice" c
         JOIN "Question" q ON q.id = c."questionId"
         WHERE q."showId" = $1
         ORDER BY c."displayOrder" ASC, c.id ASC`,
        [show.id],
      )
    ).rows;
    const evidenceItems = (
      await client.query<QueryResultRow>(
        `SELECT * FROM "EvidenceItem" WHERE "showId" = $1 ORDER BY "displayOrder" ASC, id ASC`,
        [show.id],
      )
    ).rows;
    const resultTiers = (
      await client.query<QueryResultRow>(
        `SELECT * FROM "ResultTier" WHERE "showId" = $1 ORDER BY "minimumPercent" ASC, id ASC`,
        [show.id],
      )
    ).rows;

    const choicesByQuestion = new Map<string, Array<Record<string, unknown>>>();
    for (const choice of choices) {
      const questionId = String(choice.questionId);
      const list = choicesByQuestion.get(questionId) ?? [];
      list.push(jsonSafe(choice));
      choicesByQuestion.set(questionId, list);
    }

    shows.push({
      id: String(show.id),
      title: String(show.title),
      slug: String(show.slug),
      shortDescription: String(show.shortDescription ?? ""),
      fullDescription: String(show.fullDescription ?? ""),
      coverImageUrl: (show.coverImageUrl as string | null) ?? null,
      status: String(show.status ?? "DRAFT"),
      displayOrder: Number(show.displayOrder ?? 0),
      difficulty: hasDifficulty ? ((show.difficulty as string | null) ?? null) : null,
      ageRecommendation: hasDifficulty
        ? ((show.ageRecommendation as string | null) ?? null)
        : null,
      contentAdvisory: hasDifficulty
        ? ((show.contentAdvisory as string | null) ?? null)
        : null,
      online: jsonSafe(online),
      suspects: suspects.map((row) => jsonSafe(row)),
      questions: questions.map((row) => ({
        ...jsonSafe(row),
        choices: choicesByQuestion.get(String(row.id)) ?? [],
      })),
      evidenceItems: evidenceItems.map((row) => jsonSafe(row)),
      resultTiers: resultTiers.map((row) => jsonSafe(row)),
    });
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sourceHasOnlineShowDetailTable: hasDetail,
    shows,
  };
}

export async function writeOnlineContentPack(pack: OnlineContentPack, filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
}

export async function readOnlineContentPack(filePath: string): Promise<OnlineContentPack> {
  const raw = await readFile(filePath, "utf8");
  const pack = JSON.parse(raw) as OnlineContentPack;
  if (pack.version !== 1 || !Array.isArray(pack.shows)) {
    throw new Error(`Unrecognised online content pack at ${filePath}`);
  }
  return pack;
}

function onlineCreateData(online: OnlineDetailPayload): Prisma.OnlineShowDetailCreateWithoutShowInput {
  return {
    introEnabled: Boolean(online.introEnabled ?? false),
    introTitle: (online.introTitle as string | null | undefined) ?? null,
    introVideoId: (online.introVideoId as string | null | undefined) ?? null,
    introSkippable: Boolean(online.introSkippable ?? false),
    introReplayable: Boolean(online.introReplayable ?? false),
    actOneTitle: String(online.actOneTitle ?? "Act One"),
    actOneVideoId: (online.actOneVideoId as string | null | undefined) ?? null,
    actOneCanPause: online.actOneCanPause === undefined ? true : Boolean(online.actOneCanPause),
    actOneRewindSeconds: Number(online.actOneRewindSeconds ?? 30),
    lockActOneAfterIntermission:
      online.lockActOneAfterIntermission === undefined
        ? true
        : Boolean(online.lockActOneAfterIntermission),
    intermissionTitle: String(online.intermissionTitle ?? "Make Your Accusation"),
    intermissionMediaType: (online.intermissionMediaType as "NONE" | "VIDEO" | "IMAGE" | undefined) ?? "NONE",
    intermissionVideoId: (online.intermissionVideoId as string | null | undefined) ?? null,
    intermissionImageUrl: (online.intermissionImageUrl as string | null | undefined) ?? null,
    intermissionVideoLoops:
      online.intermissionVideoLoops === undefined ? true : Boolean(online.intermissionVideoLoops),
    accusationTimed: Boolean(online.accusationTimed ?? false),
    accusationSeconds: (online.accusationSeconds as number | null | undefined) ?? null,
    timerWarningSeconds: (online.timerWarningSeconds as number | null | undefined) ?? null,
    timerExpirationAction:
      (online.timerExpirationAction as
        | "SUBMIT_CURRENT"
        | "MARK_UNANSWERED_INCORRECT"
        | undefined) ?? "SUBMIT_CURRENT",
    actTwoTitle: String(online.actTwoTitle ?? "The Reveal"),
    actTwoVideoId: (online.actTwoVideoId as string | null | undefined) ?? null,
    actTwoCanPause: online.actTwoCanPause === undefined ? true : Boolean(online.actTwoCanPause),
    actTwoRewindSeconds: Number(online.actTwoRewindSeconds ?? 30),
    inventoryEnabled: Boolean(online.inventoryEnabled ?? false),
    situationRoomTitle: String(online.situationRoomTitle ?? "So, how did you do?"),
    resultsMusicEnabled: Boolean(online.resultsMusicEnabled ?? false),
    resultsMusicUrl: (online.resultsMusicUrl as string | null | undefined) ?? null,
    vaultTransitionEnabled:
      online.vaultTransitionEnabled === undefined ? true : Boolean(online.vaultTransitionEnabled),
    detectiveGaugeEnabled:
      online.detectiveGaugeEnabled === undefined ? true : Boolean(online.detectiveGaugeEnabled),
    priceCents: Number(online.priceCents ?? 1000),
    currency: String(online.currency ?? "usd"),
    investigationMinutes: (online.investigationMinutes as number | null | undefined) ?? null,
    revealMinutes: (online.revealMinutes as number | null | undefined) ?? null,
  };
}

export type ImportResult = {
  showsUpserted: number;
  onlineUpserted: number;
  suspects: number;
  questions: number;
  answerChoices: number;
  evidenceItems: number;
  resultTiers: number;
};

/**
 * Replaces Case Room content for the packed shows. Catalog shell fields are
 * upserted; questions/clues/tiers/suspects for those show ids are cleared and
 * rewritten so a re-run is idempotent without duplicating rows.
 */
export async function importOnlineContent(
  db: PrismaClient,
  pack: OnlineContentPack,
): Promise<ImportResult> {
  const result: ImportResult = {
    showsUpserted: 0,
    onlineUpserted: 0,
    suspects: 0,
    questions: 0,
    answerChoices: 0,
    evidenceItems: 0,
    resultTiers: 0,
  };

  await db.$transaction(
    async (tx) => {
      for (const show of pack.shows) {
        await tx.show.upsert({
          where: { slug: show.slug },
          create: {
            id: show.id,
            title: show.title,
            slug: show.slug,
            type: "ONLINE",
            shortDescription: show.shortDescription,
            fullDescription: show.fullDescription,
            coverImageUrl: show.coverImageUrl,
            status: show.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
            displayOrder: show.displayOrder,
            difficulty: show.difficulty,
            ageRecommendation: show.ageRecommendation,
            contentAdvisory: show.contentAdvisory,
            online: { create: onlineCreateData(show.online) },
          },
          update: {
            title: show.title,
            type: "ONLINE",
            shortDescription: show.shortDescription,
            fullDescription: show.fullDescription,
            coverImageUrl: show.coverImageUrl,
            status: show.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
            displayOrder: show.displayOrder,
            difficulty: show.difficulty,
            ageRecommendation: show.ageRecommendation,
            contentAdvisory: show.contentAdvisory,
          },
        });
        result.showsUpserted += 1;

        // Prefer the packed id when the shell was created by migrations with
        // the same stable ids; otherwise attach to the slug match.
        const target = await tx.show.findUniqueOrThrow({
          where: { slug: show.slug },
          select: { id: true },
        });

        await tx.onlineShowDetail.upsert({
          where: { showId: target.id },
          create: { showId: target.id, ...onlineCreateData(show.online) },
          update: onlineCreateData(show.online),
        });
        result.onlineUpserted += 1;

        // Clear gameplay content for this show so re-imports replace rather
        // than accumulate. Runtime attempts must go first: SubmittedAnswer
        // refuses to delete a Question that still has answers.
        await tx.caseAttempt.deleteMany({ where: { showId: target.id } });
        await tx.purchase.deleteMany({ where: { showId: target.id } });
        await tx.answerChoice.deleteMany({
          where: { question: { showId: target.id } },
        });
        await tx.question.deleteMany({ where: { showId: target.id } });
        await tx.evidenceItem.deleteMany({ where: { showId: target.id } });
        await tx.resultTier.deleteMany({ where: { showId: target.id } });
        // Suspects may be referenced by AnswerChoice; choices already deleted.
        await tx.suspect.deleteMany({ where: { showId: target.id } });

        for (const suspect of show.suspects) {
          await tx.suspect.create({
            data: {
              id: String(suspect.id),
              showId: target.id,
              name: String(suspect.name),
              description: (suspect.description as string | null | undefined) ?? null,
              imageUrl: (suspect.imageUrl as string | null | undefined) ?? null,
              displayOrder: Number(suspect.displayOrder ?? 0),
              isSelectable:
                suspect.isSelectable === undefined ? true : Boolean(suspect.isSelectable),
            },
          });
          result.suspects += 1;
        }

        for (const question of show.questions) {
          await tx.question.create({
            data: {
              id: String(question.id),
              showId: target.id,
              prompt: String(question.prompt),
              type: (question.type as "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_TEXT") ?? "SINGLE_CHOICE",
              pointValue: Number(question.pointValue ?? 0),
              imageUrl: (question.imageUrl as string | null | undefined) ?? null,
              matchMode:
                (question.matchMode as "EXACT" | "NORMALIZED" | "AI_ASSISTED") ?? "EXACT",
              acceptedAnswers: Array.isArray(question.acceptedAnswers)
                ? (question.acceptedAnswers as string[])
                : [],
              aiGradingRubric: (question.aiGradingRubric as string | null | undefined) ?? null,
              resultExplanation: (question.resultExplanation as string | null | undefined) ?? null,
              displayOrder: Number(question.displayOrder ?? 0),
              required: question.required === undefined ? true : Boolean(question.required),
            },
          });
          result.questions += 1;

          for (const choice of question.choices) {
            await tx.answerChoice.create({
              data: {
                id: String(choice.id),
                questionId: String(question.id),
                suspectId: (choice.suspectId as string | null | undefined) ?? null,
                label: String(choice.label),
                isCorrect: Boolean(choice.isCorrect ?? false),
                displayOrder: Number(choice.displayOrder ?? 0),
              },
            });
            result.answerChoices += 1;
          }
        }

        for (const evidence of show.evidenceItems) {
          await tx.evidenceItem.create({
            data: {
              id: String(evidence.id),
              showId: target.id,
              title: String(evidence.title),
              description: (evidence.description as string | null | undefined) ?? null,
              fileUrl: (evidence.fileUrl as string | null | undefined) ?? null,
              fileMimeType: (evidence.fileMimeType as string | null | undefined) ?? null,
              iconUrl: (evidence.iconUrl as string | null | undefined) ?? null,
              unlockStage: (evidence.unlockStage as "ACT_ONE" | "ACT_TWO") ?? "ACT_ONE",
              unlockAtSeconds: Number(evidence.unlockAtSeconds ?? 0),
              displayOrder: Number(evidence.displayOrder ?? 0),
              visibleDuringReveal:
                evidence.visibleDuringReveal === undefined
                  ? true
                  : Boolean(evidence.visibleDuringReveal),
            },
          });
          result.evidenceItems += 1;
        }

        for (const tier of show.resultTiers) {
          await tx.resultTier.create({
            data: {
              id: String(tier.id),
              showId: target.id,
              name: String(tier.name),
              description: String(tier.description),
              minimumPercent: Number(tier.minimumPercent),
              maximumPercent: Number(tier.maximumPercent),
            },
          });
          result.resultTiers += 1;
        }
      }
    },
    { timeout: 10 * 60_000, maxWait: 60_000 },
  );

  return result;
}

export function defaultPackPath() {
  return path.join(process.cwd(), "tmp", "online-content-pack.json");
}

export function reportInventory(rows: InventoryRow[]) {
  console.log("\n=== Online Mystery Case Room inventory ===");
  console.table(
    rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      status: row.status,
      suspects: row.suspects,
      questions: row.questions,
      choices: row.answerChoices,
      clues: row.evidenceItems,
      tiers: row.resultTiers,
      intro: row.introVideoId,
      act1: row.actOneVideoId,
      act2: row.actTwoVideoId,
      intermission: row.intermissionVideoId,
    })),
  );

  const problems = rows.flatMap((row) =>
    row.notes.map((note) => `${row.slug}: ${note}`),
  );
  if (problems.length) {
    console.log(`\n=== Things worth your attention (${problems.length}) ===`);
    for (const note of problems) console.log(`  - ${note}`);
  } else {
    console.log("\nAll three shows have questions, clues, and act video ids.");
  }
}
