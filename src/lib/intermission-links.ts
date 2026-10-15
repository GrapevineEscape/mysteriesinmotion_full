export type IntermissionLink = {
  label: string;
  url: string;
  note: string;
  pictureUrl: string;
};

export const MAX_INTERMISSION_LINKS = 5;

export function parseIntermissionLinks(value: unknown): IntermissionLink[] {
  if (!Array.isArray(value)) return [];
  const links: IntermissionLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const url = typeof record.url === "string" ? record.url.trim() : "";
    const note = typeof record.note === "string" ? record.note.trim() : "";
    const pictureUrl =
      typeof record.pictureUrl === "string" ? record.pictureUrl.trim() : "";
    if (!label || !isHttpUrl(url)) continue;
    links.push({
      label,
      url,
      note,
      pictureUrl: isPictureReference(pictureUrl) ? pictureUrl : "",
    });
    if (links.length === MAX_INTERMISSION_LINKS) break;
  }
  return links;
}

export function intermissionLinksFromForm(formData: FormData): IntermissionLink[] {
  const labels = formData.getAll("linkLabel");
  const urls = formData.getAll("linkUrl");
  const notes = formData.getAll("linkNote");
  const pictures = formData.getAll("linkPicture");
  const links: IntermissionLink[] = [];
  const count = Math.min(labels.length, urls.length, MAX_INTERMISSION_LINKS);
  for (let index = 0; index < count; index += 1) {
    const label = text(labels[index]);
    const url = text(urls[index]);
    const note = text(notes[index]);
    const pictureUrl = text(pictures[index]);
    if (!label || !isHttpUrl(url)) continue;
    links.push({
      label,
      url,
      note,
      pictureUrl: isPictureReference(pictureUrl) ? pictureUrl : "",
    });
  }
  return links;
}

function text(value: FormDataEntryValue | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function isPictureReference(value: string) {
  if (!value) return false;
  return value.startsWith("r2://") || isHttpUrl(value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
