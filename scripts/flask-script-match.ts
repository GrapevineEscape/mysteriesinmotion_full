/**
 * Works out which PDF in the Flask static/MIMscripts folder belongs to a show.
 *
 * The Flask app stored script_path as "/static/MIMscripts/<title>_script.pdf",
 * a name the uploaded files rarely actually had, so it fell back to matching
 * titles against the filenames on disk. Attaching the wrong script to a show is
 * both easy and invisible, so this is a faithful port of that resolution order
 * rather than a fresh guess, and it is tested against the real filenames.
 */

/** Significant words in a title or filename, mirroring Flask's `_words`. */
function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((word) => word.length > 2);
}

function stem(filename: string) {
  return filename.replace(/\.[^.]*$/, "");
}

/** The filename a stored path points at, tolerating Windows separators. */
export function storedFilename(scriptPath: string | null | undefined) {
  if (!scriptPath) return null;
  const name = scriptPath.replace(/\\/g, "/").split("/").pop() ?? "";
  if (!name || name === "." || name === "..") return null;
  return name;
}

export type ScriptMatch = {
  filename: string;
  /** How the file was found, so a migration report can flag the weaker rules. */
  how: "stored-path" | "title-convention" | "title-in-filename" | "title-phrase" | "word-overlap";
};

/**
 * Returns the script for a show, or null when nothing plausible is on disk.
 * `available` is the list of PDF filenames in the scripts folder.
 */
export function matchScript(
  show: { title: string; scriptPath?: string | null },
  available: readonly string[],
): ScriptMatch | null {
  const pdfs = [...available].sort();
  const present = new Set(pdfs);

  const stored = storedFilename(show.scriptPath);
  if (stored && present.has(stored)) {
    return { filename: stored, how: "stored-path" };
  }

  const conventional = `${show.title}_script.pdf`;
  if (present.has(conventional)) {
    return { filename: conventional, how: "title-convention" };
  }

  const title = show.title.trim().toLowerCase();
  if (!title) return null;

  for (const filename of pdfs) {
    if (filename.toLowerCase().includes(title)) {
      return { filename, how: "title-in-filename" };
    }
  }

  const titleWords = words(title);
  // Longest run of leading title words that appears in a filename wins, so
  // "Murder for Real" prefers its own script over "Murder Preserved".
  for (let count = titleWords.length; count > 1; count -= 1) {
    const phrase = titleWords.slice(0, count).join(" ");
    for (const filename of pdfs) {
      if (words(stem(filename)).join(" ").includes(phrase)) {
        return { filename, how: "title-phrase" };
      }
    }
  }

  const distinct = new Set(titleWords);
  if (!distinct.size) return null;

  const needed = Math.min(2, distinct.size);
  let best: string | null = null;
  let bestScore = 0;
  for (const filename of pdfs) {
    const candidate = new Set(words(stem(filename)));
    let score = 0;
    for (const word of distinct) if (candidate.has(word)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = filename;
    }
  }

  return best && bestScore >= needed ? { filename: best, how: "word-overlap" } : null;
}
