import { readSynthesisWebDavSyncCredential } from "./webDavSyncCredentialPrefs";
import { resolveNativeAbortControllerConstructor } from "../../utils/wait";
export { sanitizeWebDavUrl, webDavRemoteUrl } from "./webDavSyncRemote";
function responseHeader(headers, name) {
    if (!headers || typeof headers !== "object") {
        return "";
    }
    const lowerName = name.toLowerCase();
    const record = headers;
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
export function createDefaultSynthesisWebDavHttpClient() {
    return {
        async request(request) {
            const headers = { ...(request.headers || {}) };
            if (request.username || request.credential) {
                const credential = `${request.username || ""}:${request.credential || ""}`;
                const runtime = globalThis;
                const encoded = typeof runtime.btoa === "function"
                    ? runtime.btoa(credential)
                    : runtime.Buffer?.from(credential).toString("base64");
                if (encoded) {
                    headers.Authorization = `Basic ${encoded}`;
                }
            }
            const fetchLike = globalThis.fetch;
            if (!fetchLike) {
                throw new Error("fetch() is unavailable for WebDAV Sync");
            }
            const AbortControllerCtor = resolveNativeAbortControllerConstructor();
            const abort = AbortControllerCtor ? new AbortControllerCtor() : undefined;
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
            }
            catch (error) {
                if (abort?.signal.aborted) {
                    throw new Error("WebDAV request timed out.");
                }
                throw error;
            }
            finally {
                globalThis.clearTimeout(timeout);
            }
        },
    };
}
export async function webDavCredentialForRequest() {
    const credential = await readSynthesisWebDavSyncCredential();
    return credential.ok ? credential.credential : "";
}
