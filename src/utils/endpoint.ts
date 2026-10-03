/**
 * Endpoint classification is the single source of truth for what this plugin
 * will connect to. It lives in a leaf module with no Zotero, configuration or
 * catalog dependency so the pure directory normalizer, the provider
 * configuration boundary and the catalog share one localhost/private-network
 * decision instead of re-deriving it.
 */
export function classifyPiEndpoint(raw: string): {
  baseUrl: string;
  requiresLocalNetwork: boolean;
} {
  const value = typeof raw === "string" ? raw.trim() : "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid Pi endpoint URL");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol)
  ) {
    throw new Error("Invalid Pi endpoint URL");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host.startsWith("::ffff:"))
    throw new Error("IPv4-mapped Pi endpoints are unsupported");
  const v4 = host.split(".").map(Number);
  const ipv4 =
    v4.length === 4 &&
    v4.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  const local =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    (host.includes(":") &&
      (host.startsWith("fe80:") ||
        host.startsWith("fc") ||
        host.startsWith("fd"))) ||
    (ipv4 &&
      (v4[0] === 10 ||
        v4[0] === 127 ||
        v4[0] === 0 ||
        (v4[0] === 172 && v4[1] >= 16 && v4[1] <= 31) ||
        (v4[0] === 192 && v4[1] === 168) ||
        (v4[0] === 169 && v4[1] === 254)));
  if (url.protocol !== "https:" && !local)
    throw new Error("Remote Pi endpoint requires HTTPS");
  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    requiresLocalNetwork: local,
  };
}
