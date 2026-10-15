export type IntermissionLink = {
  label: string;
  url: string;
  note: string;
};

const EMPTY_LINKS: IntermissionLink[] = [
  { label: "", url: "", note: "" },
  { label: "", url: "", note: "" },
  { label: "", url: "", note: "" },
];

export function intermissionLinkSlots(value: unknown): IntermissionLink[] {
  const saved = parseIntermissionLinks(value);
  return EMPTY_LINKS.map((slot, index) => saved[index] ?? slot);
}

export function parseIntermissionLinks(value: unknown): IntermissionLink[] {
  if (!Array.isArray(value)) return [];
  const links: IntermissionLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const url = typeof record.url === "string" ? record.url.trim() : "";
    const note = typeof record.note === "string" ? record.note.trim() : "";
    if (!label || !isHttpUrl(url)) continue;
    links.push({ label, url, note });
    if (links.length === 3) break;
  }
  return links;
}

export function intermissionLinksFromForm(formData: FormData): IntermissionLink[] {
  const links: IntermissionLink[] = [];
  for (let index = 1; index <= 3; index += 1) {
    const label = field(formData, `linkLabel${index}`);
    const url = field(formData, `linkUrl${index}`);
    const note = field(formData, `linkNote${index}`);
    if (!label && !url && !note) continue;
    if (!label || !isHttpUrl(url)) continue;
    links.push({ label, url, note });
  }
  return links;
}

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
