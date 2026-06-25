/**
 * Persists the visible locale and auto-selects a locale on the first visit.
 *
 * The URL is authoritative once the user reaches a locale-specific page. This
 * keeps Docusaurus' locale dropdown from being immediately overwritten by a
 * stale stored preference.
 */

import type { ClientModule } from "@docusaurus/types";

const STORAGE_KEY = "zotero-agents-locale";
const LEGACY_STORAGE_KEY = "zotero-skills-locale";
const AUTO_REDIRECT_SESSION_KEY = "zotero-agents-locale-auto-redirected";
const DEFAULT_LOCALE = "en";

function getCurrentLocale(): string | null {
  const el = document.querySelector<HTMLMetaElement>(
    'meta[name="docusaurus_locale"]',
  );
  return el?.content ?? null;
}

function getAvailableLocales(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][hreflang]',
    ),
  )
    .map((link) => link.hreflang)
    .filter((locale) => locale && locale !== "x-default");
}

/** Read the canonical <link> for a given hreflang, authored by Docusaurus. */
function getAlternateUrl(targetLocale: string): string | null {
  const link = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][hreflang]',
    ),
  ).find((candidate) => candidate.hreflang === targetLocale);
  return link?.href ?? null;
}

function persistLocale(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

function getStoredLocale(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
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

    // Persist after user-initiated navigations.
    if (previousLocation !== null) {
      persistLocale(currentLocale);
      return;
    }

    // Initial load. Locale-specific URLs always win over local persistence.
    if (currentLocale !== DEFAULT_LOCALE) {
      persistLocale(currentLocale);
      return;
    }

    // Do not force a stored locale over the default URL. This keeps manual
    // switches back to English from bouncing to the previous locale.
    if (getStoredLocale() || hasAutoRedirectedInSession()) {
      persistLocale(currentLocale);
      return;
    }

    const targetLocale = resolveNavigatorLocale();
    if (!targetLocale || targetLocale === currentLocale) {
      persistLocale(currentLocale);
      return;
    }

    const targetUrl = getAlternateUrl(targetLocale);
    if (targetUrl && targetUrl !== window.location.href) {
      persistLocale(targetLocale);
      markAutoRedirectedInSession();
      window.location.replace(targetUrl);
    } else {
      persistLocale(currentLocale);
    }
  },
};

export default localePersistence;
