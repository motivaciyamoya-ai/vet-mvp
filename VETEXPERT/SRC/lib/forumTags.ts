/** Совпадает с эвристикой на главной форумной карточке / детальной странице. */
export function tagsLookHot(tags: string) {
  return /\b(горяч|hot|срочн|sos)\b/i.test((tags || "").toLowerCase());
}

export function urgencyFromTags(tags: string): "critical" | "high" | "medium" | undefined {
  const m = /\bURGENCY:\s*(medium|high|critical)\b/i.exec(tags || "");
  if (!m) return undefined;
  return m[1].toLowerCase() as "medium" | "high" | "critical";
}

/** Однословные маркеры «горячей» темы — в UI уже есть бейджи срочности, в списке тегов автору их не показываем. */
const HOT_MARKER_TOKENS = new Set(["hot", "горяч", "срочн", "sos"]);

/**
 * Теги, введённые автором темы, без служебных фрагментов (`URGENCY:…`) и маркеров «горячо / срочно».
 * Разделители — запятая и пробелы.
 */
export function creatorForumTagLabels(tags: string): string[] {
  let rest = (tags || "").trim();
  rest = rest.replace(/\bURGENCY:\s*(medium|high|critical)\b/gi, " ");
  rest = rest.replace(/\bURGENCY:[^\s,]*/gi, " ");
  const parts = rest
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (p.length > 80) continue;
    const lc = p.toLowerCase();
    if (HOT_MARKER_TOKENS.has(lc)) continue;
    if (/^URGENCY:/i.test(p)) continue;
    if (seen.has(lc)) continue;
    seen.add(lc);
    out.push(p);
  }
  return out;
}
