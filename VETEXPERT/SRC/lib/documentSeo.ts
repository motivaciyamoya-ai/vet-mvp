import type { PublicSiteSeoDto } from "./api";

/** Fallback, если API недоступен при первом рендере (совпадает с серверными умолчаниями). */
export const SITE_SEO_FALLBACK: PublicSiteSeoDto = {
  siteName: "VetConnect",
  homeDocumentTitle: "Ветеринарное сообщество и инструменты · VetConnect",
  metaDescription:
    "VetConnect — профессиональная платформа для ветеринарных специалистов: форум, статьи, маркетплейс, мероприятия и AI‑инструменты для поддержки диагностики.",
  metaKeywords:
    "ветеринар, ветеринарный форум, ветеринарные статьи, ветеринарные мероприятия, рентген, УЗИ, AI диагностика",
  ogSiteName: "VetConnect",
  ogTitle: null,
  ogDescription:
    "Форум, статьи, маркетплейс, календарь мероприятий и AI‑инструменты для ветеринарных специалистов.",
  ogImageAbsolute: null,
  canonicalOrigin: null,
  themeColor: "#059669",
  twitterCard: "summary",
};

function upsertMetaName(name: string, content: string) {
  const sel = `meta[name="${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertMetaProperty(property: string, content: string) {
  const sel = `meta[property="${property.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function buildCanonicalUrl(origin: string, pathname: string): string {
  const o = origin.replace(/\/+$/, "");
  let p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (p !== "/" && p.endsWith("/")) {
    p = p.replace(/\/+$/, "") || "/";
  }
  if (p === "/") return `${o}/`;
  return `${o}${p}`;
}

function routePresentation(
  pathname: string,
  seo: PublicSiteSeoDto,
): {
  documentTitle: string;
  metaDescription: string;
  ogDescription: string;
  ogTitle: string;
} {
  const path = pathname || "/";
  const site = seo.siteName;

  const isHome = path === "/" || path === "";
  if (isHome) {
    const ogTitle = (seo.ogTitle?.trim() || seo.homeDocumentTitle).trim();
    return {
      documentTitle: seo.homeDocumentTitle,
      metaDescription: seo.metaDescription,
      ogDescription: seo.ogDescription,
      ogTitle,
    };
  }

  let pageLabel: string =
    path.startsWith("/forum")
      ? "Форум"
      : path.startsWith("/articles")
        ? "Статьи"
        : path.startsWith("/events")
          ? "Мероприятия"
          : path.startsWith("/specialists")
            ? "Специалисты"
            : path.startsWith("/tools")
              ? "AI‑инструменты"
              : path.startsWith("/marketplace")
                ? "Маркетплейс"
                : path.startsWith("/messages")
                  ? "Сообщения"
                  : path.startsWith("/profile")
                    ? "Профиль"
                    : path.startsWith("/privacy")
                      ? "Политика конфиденциальности"
                      : path.startsWith("/cookies")
                        ? "Cookies"
                        : site;

  const documentTitle = pageLabel === site ? site : `${pageLabel} · ${site}`;

  let metaDescription = seo.metaDescription;
  if (path.startsWith("/events")) {
    metaDescription =
      "Календарь и карточки мероприятий для ветспециалистов: вебинары, конференции, встречи.";
  } else if (path.startsWith("/tools")) {
    metaDescription =
      "AI‑инструменты для ветеринарного специалиста: анализ анамнеза и снимков (УЗИ/рентген) и рекомендации.";
  } else if (path.startsWith("/forum")) {
    metaDescription = "Форум для ветспециалистов: клинические случаи, обсуждения, помощь коллег.";
  } else if (path.startsWith("/articles")) {
    metaDescription = "Статьи и база знаний для ветеринарных специалистов.";
  } else if (path.startsWith("/marketplace")) {
    metaDescription = "Маркетплейс оборудования и предложений для ветеринарной практики.";
  }

  const ogTitle = documentTitle;
  const ogDescription = metaDescription;

  return { documentTitle, metaDescription, ogDescription, ogTitle };
}

/**
 * Обновляет заголовок и ключевые SEO‑метки в `<head>` на клиенте (SPA).
 */
export function applyClientDocumentSeo(pathname: string, seo: PublicSiteSeoDto): void {
  if (typeof document === "undefined") return;

  const originRaw =
    seo.canonicalOrigin && seo.canonicalOrigin.length > 0
      ? seo.canonicalOrigin
      : typeof window !== "undefined"
        ? window.location.origin
        : "";

  const origin = originRaw.replace(/\/+$/, "");

  const { documentTitle, metaDescription, ogDescription, ogTitle } = routePresentation(pathname, seo);

  document.title = documentTitle;

  upsertMetaName("description", metaDescription);
  upsertMetaName("keywords", seo.metaKeywords);
  upsertMetaName("theme-color", seo.themeColor);
  upsertMetaName("twitter:card", seo.twitterCard);
  upsertMetaName("twitter:title", ogTitle);
  upsertMetaName("twitter:description", ogDescription);

  upsertMetaProperty("og:type", "website");
  upsertMetaProperty("og:site_name", seo.ogSiteName);
  upsertMetaProperty("og:title", ogTitle);
  upsertMetaProperty("og:description", ogDescription);

  const canon = buildCanonicalUrl(origin, pathname || "/");
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", canon);

  upsertMetaProperty("og:url", canon);

  if (seo.ogImageAbsolute?.trim()) {
    upsertMetaProperty("og:image", seo.ogImageAbsolute.trim());
    upsertMetaName("twitter:image", seo.ogImageAbsolute.trim());
  }

  const ld = document.getElementById("ld-json-website");
  if (ld) {
    const payload = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: seo.siteName,
      url: `${origin}/`,
      inLanguage: "ru",
      description: seo.metaDescription,
    };
    ld.textContent = JSON.stringify(payload);
  }
}
