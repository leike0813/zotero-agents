const GITHUB_ORG = "leike0813";
const REPO_NAME = "Zotero-Skills";

const GITHUB_PAGES_URL = `https://${GITHUB_ORG}.github.io/${REPO_NAME}/`;
const GITEE_PAGES_URL = `https://${GITHUB_ORG}.gitee.io/${REPO_NAME}/`;

/**
 * Resolve the user-facing documentation base URL based on the user's locale.
 *
 * Chinese locale → Gitee Pages (accessible within mainland China)
 * All others    → GitHub Pages
 */
export function getDocsBaseUrl(): string {
  const zotero = (globalThis as Record<string, unknown>).Zotero as
    | Record<string, unknown>
    | undefined;
  const locale =
    zotero?.locale ??
    (typeof navigator !== "undefined" ? navigator.language : undefined) ??
    "en-US";

  return String(locale).startsWith("zh") ? GITEE_PAGES_URL : GITHUB_PAGES_URL;
}

/**
 * Resolve the full URL for a documentation page path.
 *
 * @param path - Path relative to the docs root, e.g. "en/installation" or "/zh-CN/getting-started"
 */
export function getDocsUrl(path: string): string {
  const base = getDocsBaseUrl();
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${normalizedPath}`;
}
