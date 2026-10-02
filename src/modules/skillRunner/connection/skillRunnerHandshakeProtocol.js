import { version as pluginVersion } from "../../../../package.json";
import { DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE, DEFAULT_BACKEND_TYPE, SKILLRUNNER_SEQUENCE_REQUEST_KIND, } from "../../../config/defaults";
import { ASSISTANT_INTERACTION_FILE_MAX_BYTES, ASSISTANT_INTERACTION_TOTAL_MAX_BYTES, ASSISTANT_PENDING_INTERACTION_FILE_LIMIT, } from "../../../shared/assistantInteractionContract";
export const SKILLRUNNER_HANDSHAKE_REQUEST_SCHEMA = "zotero-agents.skillrunner-handshake.request.v1";
export const SKILLRUNNER_HANDSHAKE_RESPONSE_SCHEMA = "zotero-agents.skillrunner-handshake.response.v1";
export const SKILLRUNNER_JOB_PROTOCOL = DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE[DEFAULT_BACKEND_TYPE];
export const SKILLRUNNER_SEQUENCE_PROTOCOL = SKILLRUNNER_SEQUENCE_REQUEST_KIND;
export const SKILLRUNNER_INTERACTION_FILES_PROTOCOL = "skillrunner.interaction-files.v1";
export const SKILLRUNNER_HANDSHAKE_REQUESTED_PROTOCOLS = [
    SKILLRUNNER_JOB_PROTOCOL,
    SKILLRUNNER_SEQUENCE_PROTOCOL,
    SKILLRUNNER_INTERACTION_FILES_PROTOCOL,
];
function normalizeString(value) {
    return String(value || "").trim();
}
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
export function buildSkillRunnerHandshakeRequest(args) {
    const requestedProtocols = args?.requestedProtocols && args.requestedProtocols.length > 0
        ? args.requestedProtocols
        : SKILLRUNNER_HANDSHAKE_REQUESTED_PROTOCOLS;
    const normalizedProtocols = Array.from(new Set(requestedProtocols
        .map((entry) => normalizeString(entry))
        .filter((entry) => entry.length > 0)));
    return {
        schema: SKILLRUNNER_HANDSHAKE_REQUEST_SCHEMA,
        client: {
            name: "zotero-agents",
            version: normalizeString(args?.pluginVersion) || pluginVersion,
        },
        requested_protocols: normalizedProtocols,
    };
}
export function normalizeSkillRunnerHandshakeResponse(body) {
    if (!isObject(body)) {
        throw new Error("skillrunner handshake response must be object");
    }
    const schema = normalizeString(body.schema);
    if (schema !== SKILLRUNNER_HANDSHAKE_RESPONSE_SCHEMA) {
        throw new Error("skillrunner handshake response schema is unsupported");
    }
    const backend = isObject(body.backend)
        ? {
            name: normalizeString(body.backend.name) || undefined,
            version: normalizeString(body.backend.version) || undefined,
        }
        : undefined;
    const rawProtocols = isObject(body.protocols) ? body.protocols : {};
    const protocols = {};
    for (const [protocolId, value] of Object.entries(rawProtocols)) {
        const normalizedProtocolId = normalizeString(protocolId);
        if (!normalizedProtocolId || !isObject(value)) {
            continue;
        }
        protocols[normalizedProtocolId] = {
            supported: value.supported === true,
            ...(Number.isFinite(Number(value.max_files)) &&
                Number(value.max_files) > 0
                ? { max_files: Math.floor(Number(value.max_files)) }
                : {}),
            ...(Number.isFinite(Number(value.max_file_bytes)) &&
                Number(value.max_file_bytes) > 0
                ? { max_file_bytes: Math.floor(Number(value.max_file_bytes)) }
                : {}),
            ...(Number.isFinite(Number(value.max_total_bytes)) &&
                Number(value.max_total_bytes) > 0
                ? { max_total_bytes: Math.floor(Number(value.max_total_bytes)) }
                : {}),
        };
    }
    return {
        source: "remote",
        ...(backend?.name || backend?.version ? { backend } : {}),
        protocols,
    };
}
export function createLegacySkillRunnerCapabilities() {
    return {
        source: "legacy-fallback",
        backend: {
            name: "Skill-Runner",
        },
        protocols: {
            [SKILLRUNNER_JOB_PROTOCOL]: {
                supported: true,
            },
            [SKILLRUNNER_SEQUENCE_PROTOCOL]: {
                supported: false,
            },
            [SKILLRUNNER_INTERACTION_FILES_PROTOCOL]: {
                supported: false,
            },
        },
    };
}
export function resolveSkillRunnerInteractionFileCapability(capabilities) {
    const support = capabilities.protocols[SKILLRUNNER_INTERACTION_FILES_PROTOCOL];
    const lowerPositiveLimit = (value, ceiling) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0
            ? Math.min(ceiling, Math.floor(numeric))
            : ceiling;
    };
    const maxTotalBytes = lowerPositiveLimit(support?.max_total_bytes, ASSISTANT_INTERACTION_TOTAL_MAX_BYTES);
    return {
        supported: support?.supported === true,
        maxFiles: lowerPositiveLimit(support?.max_files, ASSISTANT_PENDING_INTERACTION_FILE_LIMIT),
        maxFileBytes: Math.min(maxTotalBytes, lowerPositiveLimit(support?.max_file_bytes, ASSISTANT_INTERACTION_FILE_MAX_BYTES)),
        maxTotalBytes,
    };
}
export function listSupportedSkillRunnerProtocols(capabilities) {
    return Object.entries(capabilities.protocols)
        .filter(([, support]) => support.supported === true)
        .map(([protocolId]) => protocolId)
        .sort();
}
export function isSkillRunnerProtocolSupported(args) {
    const protocolId = normalizeString(args.protocolId);
    if (!protocolId) {
        return false;
    }
    return args.capabilities.protocols[protocolId]?.supported === true;
}
