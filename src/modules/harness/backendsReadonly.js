import { normalizeBackendDisplayName } from "../../backends/identity";
import { ACP_BACKEND_TYPE, BACKEND_TYPES, } from "../../config/defaults";
import { getPref } from "../../utils/prefs";
const BACKENDS_CONFIG_PREF_KEY = "backendsConfigJson";
const LEGACY_REMOVED_BACKEND_IDS = new Set(["skillrunner-local"]);
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function cleanString(value) {
    return String(value || "").trim();
}
function stringArray(value) {
    return Array.isArray(value)
        ? value.map(cleanString).filter(Boolean)
        : [];
}
function stringMap(value) {
    if (!isObject(value))
        return {};
    return Object.fromEntries(Object.entries(value)
        .map(([key, entry]) => [cleanString(key), cleanString(entry)])
        .filter(([key, entry]) => key && entry));
}
function normalizeBackendType(value) {
    const normalized = cleanString(value);
    return BACKEND_TYPES.includes(normalized)
        ? normalized
        : null;
}
function normalizeBackendEntry(entry, index) {
    if (!isObject(entry)) {
        return { error: `entry[${index}] must be an object` };
    }
    const id = cleanString(entry.id);
    const typeRaw = cleanString(entry.type);
    const type = normalizeBackendType(typeRaw);
    if (!id)
        return { error: `entry[${index}] missing id` };
    if (!type) {
        return {
            error: `entry[${index}] (${id}) type must be one of ${BACKEND_TYPES.join(", ")}`,
        };
    }
    if (LEGACY_REMOVED_BACKEND_IDS.has(id)) {
        return { error: `entry[${index}] (${id}) is a removed legacy backend` };
    }
    const backend = {
        id,
        type,
        displayName: normalizeBackendDisplayName(entry.displayName, id),
        baseUrl: cleanString(entry.baseUrl) ||
            (type === ACP_BACKEND_TYPE ? `local://${id}` : ""),
        command: cleanString(entry.command) || undefined,
        args: stringArray(entry.args),
        env: stringMap(entry.env),
        auth: isObject(entry.auth)
            ? {
                kind: cleanString(entry.auth.kind) === "bearer" ? "bearer" : "none",
                token: cleanString(entry.auth.token) || undefined,
            }
            : undefined,
        defaults: isObject(entry.defaults)
            ? {
                headers: stringMap(entry.defaults.headers),
                timeout_ms: Number.isFinite(Number(entry.defaults.timeout_ms))
                    ? Number(entry.defaults.timeout_ms)
                    : undefined,
            }
            : undefined,
        management_auth: isObject(entry.management_auth)
            ? {
                kind: cleanString(entry.management_auth.kind) === "basic"
                    ? "basic"
                    : "none",
                username: cleanString(entry.management_auth.username) || undefined,
                password: cleanString(entry.management_auth.password) || undefined,
            }
            : undefined,
        acp: isObject(entry.acp)
            ? {
                agentFamily: cleanString(entry.acp.agentFamily),
                skillRoots: stringArray(entry.acp.skillRoots),
                connectionTest: isObject(entry.acp.connectionTest)
                    ? { ...entry.acp.connectionTest }
                    : undefined,
                runtimeOptionsCache: isObject(entry.acp.runtimeOptionsCache)
                    ? { ...entry.acp.runtimeOptionsCache }
                    : undefined,
            }
            : undefined,
    };
    return { backend };
}
function parseBackendsDocument(raw) {
    const parsed = raw ? JSON.parse(raw) : { backends: [] };
    if (Array.isArray(parsed))
        return parsed;
    if (isObject(parsed) && Array.isArray(parsed.backends)) {
        return parsed.backends;
    }
    throw new Error("Backends config must be an array or object with backends[]");
}
export async function loadBackendsRegistryReadonly() {
    const warnings = [];
    const errors = [];
    const invalidBackends = {};
    const raw = cleanString(getPref(BACKENDS_CONFIG_PREF_KEY));
    let entries = [];
    try {
        entries = parseBackendsDocument(raw);
    }
    catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }
    const backends = [];
    const seenIds = new Set();
    entries.forEach((entry, index) => {
        const normalized = normalizeBackendEntry(entry, index);
        if (!normalized.backend) {
            const reason = normalized.error || `entry[${index}] invalid`;
            errors.push(reason);
            return;
        }
        if (seenIds.has(normalized.backend.id)) {
            const reason = `duplicated backend id "${normalized.backend.id}"`;
            errors.push(reason);
            invalidBackends[normalized.backend.id] = reason;
            return;
        }
        seenIds.add(normalized.backend.id);
        backends.push(normalized.backend);
    });
    for (const reason of errors) {
        const idMatch = reason.match(/(?:\(|id ")([^)"\s]+)(?:\)|")?/);
        if (idMatch?.[1]) {
            invalidBackends[idMatch[1]] = reason;
        }
    }
    if (!raw) {
        warnings.push("Readonly harness did not find backendsConfigJson.");
    }
    return {
        sourcePath: "zotero-prefs:backendsConfigJson",
        backends,
        warnings,
        errors,
        invalidBackends,
    };
}
