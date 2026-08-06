/** URL-safe slug from a title: lowercase words joined by hyphens. */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * A slug is a permanent public address, so a collision is resolved by
 * suffixing rather than by overwriting whatever already holds it.
 */
export function uniqueSlug(base: string, taken: Iterable<string>) {
  const existing = new Set(taken);
  const root = slugify(base) || "show";
  if (!existing.has(root)) return root;
  for (let suffix = 2; suffix < 1_000; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}
