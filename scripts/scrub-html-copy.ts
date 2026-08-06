/**
 * Strips leftover HTML from show and role copy in DATABASE_URL.
 *
 * Flask stored some descriptions with tags like <b>. The public site renders
 * plain text, so those tags showed up literally. Safe to re-run.
 *
 *   npm run scrub:html
 */
import { PrismaClient } from "@prisma/client";
import { htmlToPlainText, looksLikeHtml } from "@/lib/plain-text";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL to the database to scrub.");
  }

  const db = new PrismaClient();
  let shows = 0;
  let roles = 0;

  try {
    const catalog = await db.show.findMany({
      select: { id: true, title: true, shortDescription: true, fullDescription: true },
    });
    for (const show of catalog) {
      const shortDescription = looksLikeHtml(show.shortDescription)
        ? htmlToPlainText(show.shortDescription)
        : show.shortDescription;
      const fullDescription = looksLikeHtml(show.fullDescription)
        ? htmlToPlainText(show.fullDescription)
        : show.fullDescription;
      if (
        shortDescription === show.shortDescription &&
        fullDescription === show.fullDescription
      ) {
        continue;
      }
      await db.show.update({
        where: { id: show.id },
        data: { shortDescription, fullDescription },
      });
      shows += 1;
      console.log(`  scrubbed show: ${show.title}`);
    }

    const cast = await db.role.findMany({
      select: { id: true, name: true, description: true, show: { select: { title: true } } },
    });
    for (const role of cast) {
      if (!looksLikeHtml(role.description)) continue;
      await db.role.update({
        where: { id: role.id },
        data: { description: htmlToPlainText(role.description) },
      });
      roles += 1;
      console.log(`  scrubbed role: ${role.show.title} / ${role.name}`);
    }

    console.log(`\nDone. Scrubbed ${shows} show(s) and ${roles} role(s).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
