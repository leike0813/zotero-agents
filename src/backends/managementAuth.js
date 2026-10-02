import { getPref, setPref } from "../utils/prefs";
import { createBackendsPrefsDocument } from "./registry";
const BACKENDS_CONFIG_PREF_KEY = "backendsConfigJson";
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function parseBackendsDocument(raw) {
    if (!raw.trim()) {
        return { entries: [] };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
        return {
            entries: parsed.filter(isObject),
        };
    }
    if (!isObject(parsed) || !Array.isArray(parsed.backends)) {
        return { entries: [] };
    }
    return {
        entries: parsed.backends.filter(isObject),
    };
}
function normalizeManagementAuth(value) {
    if (!isObject(value)) {
        return undefined;
    }
    const kind = String(value.kind || "").trim();
    if (kind === "basic") {
        const username = String(value.username || "").trim();
        const password = String(value.password || "").trim();
        if (!username || !password) {
            return undefined;
        }
        return {
            kind: "basic",
            username,
            password,
        };
    }
    if (kind === "none") {
        return {
            kind: "none",
        };
    }
    return undefined;
}
export function resolveBackendManagementAuth(backend) {
    return normalizeManagementAuth(backend?.management_auth);
}
export function encodeBasicAuthHeader(args) {
    const source = `${args.username}:${args.password}`;
    const runtime = globalThis;
    const token = typeof btoa === "function"
        ? btoa(source)
        : runtime.Buffer
            ? runtime.Buffer.from(source, "utf-8").toString("base64")
            : "";
    if (!token) {
        throw new Error("basic auth base64 encoding is unavailable in current runtime");
    }
    return `Basic ${token}`;
}
export function readBackendsConfigWithManagementAuth() {
    const raw = String(getPref(BACKENDS_CONFIG_PREF_KEY) || "");
    try {
        const parsed = parseBackendsDocument(raw);
        return parsed.entries.map((entry) => ({
            ...entry,
            management_auth: normalizeManagementAuth(entry.management_auth),
        }));
    }
    catch {
        return [];
    }
}
export function updateBackendManagementAuth(args) {
    const backendId = String(args.backendId || "").trim();
    if (!backendId) {
        throw new Error("backendId is required");
    }
    const normalizedAuth = normalizeManagementAuth(args.auth);
    if (!normalizedAuth) {
        throw new Error("management_auth is invalid");
    }
    const raw = String(getPref(BACKENDS_CONFIG_PREF_KEY) || "").trim();
    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.backends)
            ? parsed.backends
            : [];
    const nextEntries = [];
    let updated = false;
    for (const entry of entries) {
        if (!isObject(entry)) {
            continue;
        }
        const id = String(entry.id || "").trim();
        if (!id) {
            continue;
        }
        if (id !== backendId) {
            nextEntries.push({ ...entry });
            continue;
        }
        nextEntries.push({
            ...entry,
            management_auth: normalizedAuth,
        });
        updated = true;
    }
    if (!updated) {
        throw new Error(`backend "${backendId}" not found`);
    }
    setPref(BACKENDS_CONFIG_PREF_KEY, JSON.stringify(createBackendsPrefsDocument(nextEntries)));
    return normalizedAuth;
}
