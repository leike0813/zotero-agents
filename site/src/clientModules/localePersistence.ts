/**
 * Persists user locale selection and restores it on first visit.
 *
 * - On every navigation (except initial load), saves the current locale.
 * - On the very first page load, if the stored locale differs from the
 *   current URL and the user hasn't manually switched in this session,
 *   redirects to the stored locale using Docusaurus-generated hreflang links
 *   (which are always correct — no manual path manipulation needed).
 */

import type { ClientModule } from "@docusaurus/types";

const STORAGE_KEY = "zotero-skills-locale";

function getCurrentLocale(): string | null {
  const el = document.querySelector<HTMLMetaElement>(
    'meta[name="docusaurus_locale"]',
  );
  return el?.content ?? null;
}

/** Read the canonical <link> for a given hreflang, authored by Docusaurus. */
function getAlternateUrl(targetLocale: string): string | null {
  const link = document.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][hreflang="${targetLocale}"]`,
  );
  return link?.href ?? null;
}

function persistLocale(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
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

const localePersistence: ClientModule = {
  onRouteUpdate({ location, previousLocation }) {
    const currentLocale = getCurrentLocale();
    if (!currentLocale) return;

    // Persist after user-initiated navigations, NOT on initial load (so we
    // don't overwrite the stored preference before checking it).
    if (previousLocation !== null) {
      persistLocale(currentLocale);
      return;
    }

    // --- Initial load only ---
    // Check stored preference.  If it differs, redirect using the
    // Docusaurus-generated alternate link (reliable, no path math).
    const stored = getStoredLocale();
    if (!stored) {
      // First ever visit — persist current and move on.
      persistLocale(currentLocale);
      return;
    }
    if (stored === currentLocale) {
      persistLocale(currentLocale);
      return;
    }

    const targetUrl = getAlternateUrl(stored);
    if (targetUrl && targetUrl !== window.location.href) {
      // Persist the preference we're redirecting TO, then redirect.
      persistLocale(stored);
      window.location.replace(targetUrl);
    } else {
      // Fallback: no alternate link or already there — just remember.
      persistLocale(currentLocale);
    }
  },
};

export default localePersistence;
