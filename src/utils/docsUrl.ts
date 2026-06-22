import { isDebugModeEnabled } from "../modules/debugMode";

const GITHUB_ORG = "leike0813";
const REPO_NAME = "zotero-agents";

const GITHUB_PAGES_URL = `https://${GITHUB_ORG}.github.io/${REPO_NAME}/`;
const GITEE_PAGES_URL = `https://${GITHUB_ORG}.gitee.io/${REPO_NAME}/`;
const LOCAL_DOCS_URL = `http://localhost:3000/${REPO_NAME}/`;

const ZH_CN_LOCALE = "zh-CN";

function getUserLocale(): string {
  const zotero = (globalThis as Record<string, unknown>).Zotero as
    | Record<string, unknown>
    | undefined;
  return String(
    zotero?.locale ??
      (typeof navigator !== "undefined" ? navigator.language : undefined) ??
      "en-US",
  );
}

function isZhCnLocale(locale: string): boolean {
  return locale.trim().toLowerCase() === ZH_CN_LOCALE.toLowerCase();
}

function trimSlash(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeDocsPath(path = ""): string {
  return trimSlash(String(path || ""));
}

function stripLocalePrefix(path: string): string {
  const normalized = normalizeDocsPath(path);
  const lower = normalized.toLowerCase();
  const prefix = `${ZH_CN_LOCALE.toLowerCase()}/`;
  if (lower === ZH_CN_LOCALE.toLowerCase()) {
    return "";
  }
  if (lower.startsWith(prefix)) {
    return normalized.slice(ZH_CN_LOCALE.length + 1);
  }
  return normalized;
}

function joinDocsUrl(base: string, path: string): string {
  const normalizedPath = normalizeDocsPath(path);
  if (!normalizedPath) {
    return base;
  }
  return `${base}${normalizedPath}/`.replace(/\/$/, "");
}

/**
 * Resolve the user-facing documentation base URL based on the user's locale.
 *
 * Debug mode → local Docusaurus server
 * zh-CN      → Gitee Pages (accessible within mainland China)
 * All others → GitHub Pages
 */
export function getDocsBaseUrl(): string {
  if (isDebugModeEnabled()) {
    return LOCAL_DOCS_URL;
  }

  return isZhCnLocale(getUserLocale()) ? GITEE_PAGES_URL : GITHUB_PAGES_URL;
}

/**
 * Resolve the full URL for a documentation page path.
 *
 * @param path - Path relative to the docs root. Omit to open the docs home.
 */
export function getDocsUrl(path = ""): string {
  const base = getDocsBaseUrl();
  const normalizedPath = stripLocalePrefix(path);
  if (!normalizedPath) {
    return base;
  }
  if (!isDebugModeEnabled() && isZhCnLocale(getUserLocale())) {
    return joinDocsUrl(base, `${ZH_CN_LOCALE}/${normalizedPath}`);
  }
  return joinDocsUrl(base, normalizedPath);
}
