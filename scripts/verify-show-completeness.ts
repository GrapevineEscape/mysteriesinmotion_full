import { PrismaClient } from "@prisma/client";
import { ONLINE_SHOW_SLUGS } from "./online-content";

async function main() {
  const db = new PrismaClient();
  try {
    console.log("=== ONLINE shows ===");
    for (const slug of ONLINE_SHOW_SLUGS) {
      const show = await db.show.findUnique({
        where: { slug },
        include: {
          online: true,
          _count: {
            select: {
              roles: true,
              questions: true,
              evidenceItems: true,
              resultTiers: true,
            },
          },
        },
      });
      console.log({
        slug,
        type: show?.type,
        status: show?.status,
        roles: show?._count.roles,
        questions: show?._count.questions,
        clues: show?._count.evidenceItems,
        tiers: show?._count.resultTiers,
        act1: Boolean(show?.online?.actOneVideoId),
        act2: Boolean(show?.online?.actTwoVideoId),
        scriptUrl: Boolean(show?.scriptUrl),
      });
    }

    console.log("\n=== All shows with role counts ===");
    const shows = await db.show.findMany({
      select: {
        title: true,
        slug: true,
        type: true,
        _count: { select: { roles: true } },
      },
      orderBy: { displayOrder: "asc" },
    });
    console.table(
      shows.map((show) => ({
        title: show.title,
        type: show.type,
        roles: show._count.roles,
      })),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
