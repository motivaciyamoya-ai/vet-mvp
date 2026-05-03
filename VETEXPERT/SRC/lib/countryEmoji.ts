/** ISO 3166-1 alpha-2 → композит emoji флага (региональные индикаторы). */
export function flagEmojiFromAlpha2(code: string): string {
  const clean = code.replace(/[^a-z]/gi, "").toUpperCase();
  if (clean.length !== 2) return "🌍";
  const base = 0x1f1e6;
  const pts = [...clean].map((c) => base + (c.charCodeAt(0) - 65));
  try {
    return String.fromCodePoint(...pts);
  } catch {
    return "🌍";
  }
}

export function pluralRuNoun(
  n: number,
  forms: { one: string; few: string; many: string },
): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${forms.one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}
