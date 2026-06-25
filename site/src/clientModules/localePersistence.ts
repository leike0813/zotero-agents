/**
 * Persists the visible locale and auto-selects a locale on the first visit.
 *
 * The URL is authoritative once the user reaches a locale-specific page. This
 * keeps Docusaurus' locale dropdown from being immediately overwritten by a
 * stale stored preference.
 */

import type { ClientModule } from "@docusaurus/types";

const STORAGE_KEY = "zotero-agents-locale";
const MANUAL_STORAGE_KEY = "zotero-agents-manual-locale";
const LEGACY_STORAGE_KEY = "zotero-skills-locale";
const AUTO_REDIRECT_SESSION_KEY = "zotero-agents-locale-auto-redirected";
const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = [
  "en",
  "zh-CN",
  "fr",
  "ja",
  "de",
  "es",
  "it",
  "ko",
  "ru",
];
const DEFAULT_BASE_PATH = "/zotero-agents/";

function getCurrentLocale(): string | null {
  const el = document.querySelector<HTMLMetaElement>(
    'meta[name="docusaurus_locale"]',
  );
  return el?.content ?? inferLocaleFromPath(window.location.pathname);
}

function getAvailableLocales(): string[] {
  const locales = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][hreflang]',
    ),
  )
    .map((link) => link.hreflang)
    .filter((locale) => locale && locale !== "x-default");
  return locales.length ? locales : SUPPORTED_LOCALES;
}

/** Read the canonical <link> for a given hreflang, authored by Docusaurus. */
function getAlternateUrl(targetLocale: string): string | null {
  const link = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][hreflang]',
    ),
  ).find((candidate) => candidate.hreflang === targetLocale);
  return link?.href ?? buildLocaleUrl(targetLocale);
}

function getBasePath(): string {
  const base = document.querySelector("base")?.getAttribute("href");
  if (base?.startsWith("/")) {
    return base.endsWith("/") ? base : `${base}/`;
  }
  return DEFAULT_BASE_PATH;
}

function getPathWithinBase(pathname: string): string {
  const basePath = getBasePath();
  if (pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length);
  }
  return pathname.replace(/^\/+/, "");
}

function inferLocaleFromPath(pathname: string): string {
  const pathWithinBase = getPathWithinBase(pathname);
  const firstSegment = pathWithinBase.split("/")[0];
  return SUPPORTED_LOCALES.includes(firstSegment) ? firstSegment : DEFAULT_LOCALE;
}

function stripLocalePrefix(pathWithinBase: string): string {
  const firstSegment = pathWithinBase.split("/")[0];
  if (!SUPPORTED_LOCALES.includes(firstSegment) || firstSegment === DEFAULT_LOCALE) {
    return pathWithinBase;
  }
  return pathWithinBase.slice(firstSegment.length).replace(/^\/+/, "");
}

function buildLocaleUrl(targetLocale: string): string | null {
  if (!SUPPORTED_LOCALES.includes(targetLocale)) return null;

  const basePath = getBasePath();
  const contentPath = stripLocalePrefix(
    getPathWithinBase(window.location.pathname),
  );
  const localizedPath =
    targetLocale === DEFAULT_LOCALE
      ? `${basePath}${contentPath}`
      : `${basePath}${targetLocale}/${contentPath}`;
  const normalizedPath = localizedPath.replace(/\/{2,}/g, "/");
  return `${window.location.origin}${normalizedPath}${window.location.search}${window.location.hash}`;
}

function persistVisibleLocale(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

function persistManualLocale(locale: string): void {
  try {
    localStorage.setItem(MANUAL_STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable
  }
}

function getManualLocale(): string | null {
  try {
    return localStorage.getItem(MANUAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

function hasAutoRedirectedInSession(): boolean {
  try {
    return sessionStorage.getItem(AUTO_REDIRECT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markAutoRedirectedInSession(): void {
  try {
    sessionStorage.setItem(AUTO_REDIRECT_SESSION_KEY, "1");
  } catch {
    // sessionStorage unavailable
  }
}

function resolveNavigatorLocale(): string | null {
  const availableLocales = getAvailableLocales();
  const availableByLowerCase = new Map(
    availableLocales.map((locale) => [locale.toLowerCase(), locale]),
  );
  const preferredLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const rawLanguage of preferredLanguages) {
    if (!rawLanguage) continue;

    const language = rawLanguage.toLowerCase();
    const exactMatch = availableByLowerCase.get(language);
    if (exactMatch) return exactMatch;

    const baseLanguage = language.split("-")[0];
    if (baseLanguage === "zh") {
      const simplifiedChinese = availableByLowerCase.get("zh-cn");
      if (simplifiedChinese) return simplifiedChinese;
    }

    const baseMatch = availableLocales.find(
      (locale) => locale.toLowerCase().split("-")[0] === baseLanguage,
    );
    if (baseMatch) return baseMatch;
  }

  return null;
}

const localePersistence: ClientModule = {
  onRouteUpdate({ previousLocation }) {
    const currentLocale = getCurrentLocale();
    if (!currentLocale) return;

    // Persist after user-initiated navigations. A locale change during SPA
    // routing is treated as an explicit user choice.
    if (previousLocation !== null) {
      const previousLocale = inferLocaleFromPath(previousLocation.pathname);
      persistVisibleLocale(currentLocale);
      if (previousLocale !== currentLocale) {
        persistManualLocale(currentLocale);
      }
      return;
    }

    // Initial load. Locale-specific URLs always win over local persistence.
    if (currentLocale !== DEFAULT_LOCALE) {
      persistVisibleLocale(currentLocale);
      if (!hasAutoRedirectedInSession()) {
        persistManualLocale(currentLocale);
      }
      return;
    }

    // A manual choice wins over browser-language auto detection. This keeps
    // explicit switches back to English from bouncing to another locale.
    if (getManualLocale() || hasAutoRedirectedInSession()) {
      persistVisibleLocale(currentLocale);
      return;
    }

    const targetLocale = resolveNavigatorLocale();
    if (!targetLocale || targetLocale === currentLocale) {
      persistVisibleLocale(currentLocale);
      return;
    }

    const targetUrl = getAlternateUrl(targetLocale);
    if (targetUrl && targetUrl !== window.location.href) {
      persistVisibleLocale(targetLocale);
      markAutoRedirectedInSession();
      window.location.replace(targetUrl);
    } else {
      persistVisibleLocale(currentLocale);
    }
  },
};

export default localePersistence;
