/**
 * Reports Case Room completeness for the three ONLINE shows in the legacy
 * Online Mystery Postgres. Read-only.
 *
 *   ONLINE_DATABASE_URL=... npm run inventory:online
 */
import {
  inventoryOnlineContent,
  onlineClient,
  reportInventory,
} from "./online-content";

async function main() {
  const sourceUrl = process.env.ONLINE_DATABASE_URL;
  if (!sourceUrl) {
    throw new Error("Set ONLINE_DATABASE_URL to the Online Mystery Postgres connection string.");
  }

  const client = onlineClient(sourceUrl);
  try {
    await client.connect();
    const rows = await inventoryOnlineContent(client);
    reportInventory(rows);

    // Only published shows are expected to be playable. Draft shells with no
    // Case Room content yet are reported above but do not fail the inventory.
    const fatal = rows.filter(
      (row) =>
        !row.showId ||
        (row.status === "PUBLISHED" &&
          (row.questions === 0 || row.evidenceItems === 0 || !row.actOneVideoId)),
    );
    if (fatal.length) {
      process.exitCode = 1;
      console.error(
        `\nPublished shows incomplete: ${fatal.map((row) => row.slug).join(", ")}`,
      );
    } else {
      const emptyDrafts = rows.filter(
        (row) => row.status !== "PUBLISHED" && (row.questions === 0 || !row.actOneVideoId),
      );
      if (emptyDrafts.length) {
        console.log(
          `\nDraft shells with no Case Room content yet (ok to migrate as shells): ${emptyDrafts.map((row) => row.slug).join(", ")}`,
        );
      }
    }
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
