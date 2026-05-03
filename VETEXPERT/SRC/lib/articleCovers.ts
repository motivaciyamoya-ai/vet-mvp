/** Обложки статей, пока у модели Article нет поля картинки */
export const ARTICLE_COVER_IMAGES = [
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1612363148951-15f16817648f?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1628407819300-37f37a2cd4b3?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&h=400&fit=crop",
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=400&fit=crop",
];

export function articleCoverForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ARTICLE_COVER_IMAGES[h % ARTICLE_COVER_IMAGES.length];
}

export function approximateReadTimeRu(excerpt: string, bodyHint?: string): string {
  const len = (excerpt?.length ?? 0) + (bodyHint?.length ?? 0);
  const min = Math.min(25, Math.max(3, Math.round(len / 900)));
  return `${min} мин`;
}
