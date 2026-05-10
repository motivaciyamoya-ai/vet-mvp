import type { ImgHTMLAttributes } from "react";

export type OptimizedPictureProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string;
  alt: string;
  /** Полный URL AVIF (CDN / второй файл), если есть. */
  avifSrc?: string;
  /** Полный URL WebP, если отличается от `src` (например CDN-вариант). */
  webpSrc?: string;
};

/**
 * Обертка над `<picture>` + lazy/async. Если `webpSrc`/`avifSrc` не заданы — обычный `<img>`.
 * Новые загрузки на бэкенде отдаются как WebP; для старых JPG/PNG достаточно `src`.
 */
export default function OptimizedPicture({
  src,
  alt,
  webpSrc,
  avifSrc,
  loading = "lazy",
  decoding = "async",
  className,
  ...rest
}: OptimizedPictureProps) {
  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      {...rest}
    />
  );

  if (!webpSrc && !avifSrc) {
    return img;
  }

  return (
    <picture>
      {avifSrc ? <source srcSet={avifSrc} type="image/avif" /> : null}
      {webpSrc ? <source srcSet={webpSrc} type="image/webp" /> : null}
      {img}
    </picture>
  );
}
