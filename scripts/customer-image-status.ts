/**
 * Prints / writes which customer image slots are present, temporary, or missing.
 * Usage: npm run images:status
 */
import fs from "fs";
import path from "path";
import {
  SHOW_COVER,
  SHOW_COVER_SLUGS,
  SITE_IMAGE_SLOTS,
  type ImageSlotSpec,
} from "../src/lib/customer-images";

const PUBLIC = path.join(process.cwd(), "public");
const OUT = path.join(PUBLIC, "images/customer/STATUS.md");
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"];

function findFile(relativeWithoutExt: string): string | null {
  const base = relativeWithoutExt.replace(/\.(jpe?g|png|webp)$/i, "");
  for (const ext of EXTENSIONS) {
    const rel = `${base}${ext}`.replace(/\\/g, "/");
    if (fs.existsSync(path.join(PUBLIC, rel))) return rel;
  }
  return null;
}

type Row = {
  folder: string;
  filename: string;
  where: string;
  status: "OK" | "TEMPORARY" | "MISSING";
  note?: string;
};

function rowForSlot(slot: ImageSlotSpec): Row {
  const found = findFile(slot.file);
  const folder = path.posix.dirname(slot.file).replace(/^images\/customer\/?/, "") || ".";
  const filename = `${slot.label}.jpg (or .png / .webp)`;
  if (!found) {
    return { folder, filename, where: slot.where, status: "MISSING" };
  }
  if (slot.temporary) {
    return {
      folder,
      filename: path.posix.basename(found),
      where: slot.where,
      status: "TEMPORARY",
      note: "File present but marked as stand-in — replace with correct photo",
    };
  }
  return {
    folder,
    filename: path.posix.basename(found),
    where: slot.where,
    status: "OK",
  };
}

const siteRows = Object.values(SITE_IMAGE_SLOTS).map(rowForSlot);

const showRows: Row[] = SHOW_COVER_SLUGS.map((entry) => {
  const found = findFile(SHOW_COVER.pathForSlug(entry.slug));
  const folder = "06-shows";
  const filename = `${entry.slug}-cover.jpg (or .png)`;
  if (!found) {
    return {
      folder,
      filename,
      where: entry.title,
      status: "MISSING",
    };
  }
  if (entry.temporary) {
    return {
      folder,
      filename: path.posix.basename(found),
      where: entry.title,
      status: "TEMPORARY",
      note: "Stand-in from another photo — replace with real cover for this show",
    };
  }
  return {
    folder,
    filename: path.posix.basename(found),
    where: entry.title,
    status: "OK",
  };
});

const all = [...siteRows, ...showRows];
const missing = all.filter((r) => r.status === "MISSING");
const temporary = all.filter((r) => r.status === "TEMPORARY");
const ok = all.filter((r) => r.status === "OK");

function mark(status: Row["status"]) {
  if (status === "OK") return "[OK]";
  if (status === "TEMPORARY") return "[TEMP]";
  return "[MISSING]";
}

const lines: string[] = [];
lines.push("# Customer image status");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push(`- **OK:** ${ok.length}`);
lines.push(`- **TEMPORARY (replace):** ${temporary.length}`);
lines.push(`- **MISSING:** ${missing.length}`);
lines.push("");
lines.push("Re-run anytime: `npm run images:status`");
lines.push("");
lines.push("## By folder");
lines.push("");

const folders = [...new Set(all.map((r) => r.folder))].sort();
for (const folder of folders) {
  lines.push(`### \`${folder}/\``);
  lines.push("");
  for (const row of all.filter((r) => r.folder === folder)) {
    lines.push(
      `- ${mark(row.status)} **${row.filename}** — ${row.where}${
        row.note ? ` _(${row.note})_` : ""
      }`,
    );
  }
  lines.push("");
}

if (missing.length || temporary.length) {
  lines.push("## What to do next");
  lines.push("");
  if (temporary.length) {
    lines.push("### Replace these stand-ins first");
    for (const row of temporary) {
      lines.push(`- \`${row.folder}/${row.filename}\` → ${row.where}`);
    }
    lines.push("");
  }
  if (missing.length) {
    lines.push("### Still missing (no file at all)");
    for (const row of missing) {
      lines.push(`- \`${row.folder}/\` needs **${row.filename}** — ${row.where}`);
    }
    lines.push("");
  }
}

fs.writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(lines.join("\n"));
console.log(`\nWrote ${OUT}`);
