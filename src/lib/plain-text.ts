/**
 * Turns rich text that slipped in from Flask (or pasted HTML) into plain copy
 * suitable for React text nodes. Tags are removed, common entities decoded,
 * and line breaks preserved as spaces or newlines where they meant paragraphs.
 */
export function htmlToPlainText(input: string) {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n\n")
    .replace(/<\s*\/\s*div\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** True when the string still carries markup that should not be shown raw. */
export function looksLikeHtml(input: string) {
  return /<\/?[a-z][\s\S]*>/i.test(input) || /&(nbsp|amp|lt|gt|quot|#\d+);/i.test(input);
}
