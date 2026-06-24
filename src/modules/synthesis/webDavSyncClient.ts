import { readSynthesisWebDavSyncCredential } from "./webDavSyncCredentialPrefs";

export type SynthesisWebDavHttpResult = {
  status: number;
  ok: boolean;
  text?: string;
  etag?: string;
  headers?: Record<string, string>;
};

export type SynthesisWebDavHttpRequest = {
  method: "GET" | "PUT" | "PROPFIND" | "MKCOL";
  url: string;
  body?: string;
  headers?: Record<string, string>;
  username?: string;
  credential?: string;
};

export type SynthesisWebDavHttpClient = {
  request: (
    request: SynthesisWebDavHttpRequest,
  ) => Promise<SynthesisWebDavHttpResult>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export function sanitizeWebDavUrl(value: unknown) {
  return cleanString(value)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+)@/gi, "$1[redacted]@")
    .replace(
      /([?&](?:token|password|secret|access_token)=)[^&#]+/gi,
      "$1[redacted]",
    );
}

function joinUrl(baseUrlRaw: string, relativePathRaw: string) {
  const baseUrl = cleanString(baseUrlRaw).replace(/\/+$/g, "");
  const relativePath = cleanString(relativePathRaw)
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "");
  return relativePath ? `${baseUrl}/${relativePath}` : baseUrl;
}

export function webDavRemoteUrl(args: {
  baseUrl: string;
  remotePath: string;
  relativePath?: string;
}) {
  return joinUrl(
    joinUrl(args.baseUrl, args.remotePath),
    args.relativePath || "",
  );
}

function responseHeader(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") {
    return "";
  }
  const lowerName = name.toLowerCase();
  const record = headers as {
    get?: (key: string) => string | null;
    entries?: () => IterableIterator<[string, string]>;
    [key: string]: unknown;
  };
  if (typeof record.get === "function") {
    return record.get(name) || record.get(lowerName) || "";
  }
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === lowerName) {
      return String(value || "");
    }
  }
  return "";
}

const DEFAULT_WEBDAV_REQUEST_TIMEOUT_MS = 60000;

export function createDefaultSynthesisWebDavHttpClient(): SynthesisWebDavHttpClient {
  return {
    async request(request) {
      const headers: Record<string, string> = { ...(request.headers || {}) };
      if (request.username || request.credential) {
        const credential = `${request.username || ""}:${request.credential || ""}`;
        const runtime = globalThis as {
          btoa?: (value: string) => string;
          Buffer?: {
            from: (value: string) => { toString: (encoding: string) => string };
          };
        };
        const encoded =
          typeof runtime.btoa === "function"
            ? runtime.btoa(credential)
            : runtime.Buffer?.from(credential).toString("base64");
        if (encoded) {
          headers.Authorization = `Basic ${encoded}`;
        }
      }
      const fetchLike = (globalThis as { fetch?: typeof fetch }).fetch;
      if (!fetchLike) {
        throw new Error("fetch() is unavailable for WebDAV Sync");
      }
      const abort =
        typeof AbortController === "function"
          ? new AbortController()
          : undefined;
      const timeout = globalThis.setTimeout(() => {
        abort?.abort();
      }, DEFAULT_WEBDAV_REQUEST_TIMEOUT_MS);
      try {
        const response = await fetchLike(request.url, {
          method: request.method,
          headers,
          body: request.body,
          signal: abort?.signal,
        });
        const text = await response.text().catch(() => "");
        const etag = responseHeader(response.headers, "etag");
        return {
          status: response.status,
          ok: response.ok,
          text,
          etag,
        };
      } catch (error) {
        if (abort?.signal.aborted) {
          throw new Error("WebDAV request timed out.");
        }
        throw error;
      } finally {
        globalThis.clearTimeout(timeout);
      }
    },
  };
}

export async function webDavCredentialForRequest() {
  const credential = await readSynthesisWebDavSyncCredential();
  return credential.ok ? credential.credential : "";
}
