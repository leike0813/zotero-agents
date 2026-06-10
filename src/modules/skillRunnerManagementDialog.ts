import { getString } from "../utils/locale";

export function buildSkillRunnerManagementUiUrl(baseUrl: string) {
  const normalizedBaseUrl = String(baseUrl || "").trim();
  if (!normalizedBaseUrl) {
    throw new Error(
      getString("backend-manager-error-management-base-url-required" as any),
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(normalizedBaseUrl);
  } catch {
    throw new Error(
      getString("backend-manager-error-management-base-url-invalid" as any),
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(
      getString("backend-manager-error-management-base-url-invalid" as any),
    );
  }
  const pathWithoutTrailingSlash = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = pathWithoutTrailingSlash.endsWith("/ui")
    ? pathWithoutTrailingSlash
    : `${pathWithoutTrailingSlash}/ui`;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}
