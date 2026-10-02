import { normalizeWorkflowRunOptions, } from "../../../workflows/zoteroHostAccessOptions";
export const WORKFLOW_SETTINGS_SCHEMA_VERSION = 2;
export function normalizeHostQueueMaxConcurrency(value) {
    if (value === null ||
        typeof value === "undefined" ||
        (typeof value === "string" && value.trim() === "")) {
        return { status: "valid" };
    }
    if (typeof value !== "number" && typeof value !== "string") {
        return {
            status: "invalid",
            reasonCode: "invalid_host_queue_max_concurrency",
        };
    }
    const numericValue = typeof value === "number" ? value : Number(value.trim());
    if (numericValue === 0) {
        return { status: "valid" };
    }
    if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
        return {
            status: "invalid",
            reasonCode: "invalid_host_queue_max_concurrency",
        };
    }
    return {
        status: "valid",
        maxConcurrency: numericValue,
    };
}
function parseWorkflowHostOptions(value, strict) {
    if (!isObject(value)) {
        return {};
    }
    const queue = isObject(value.queue) ? value.queue : undefined;
    if (!queue ||
        !Object.prototype.hasOwnProperty.call(queue, "maxConcurrency")) {
        return {};
    }
    const normalized = normalizeHostQueueMaxConcurrency(queue.maxConcurrency);
    if (normalized.status === "invalid") {
        if (strict) {
            throw new RangeError("Workflow Host queue maximum concurrency must be a non-negative safe integer");
        }
        return {};
    }
    return typeof normalized.maxConcurrency === "number"
        ? {
            queue: {
                maxConcurrency: normalized.maxConcurrency,
            },
        }
        : {};
}
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
export function rebaseProviderOptionsForBackendChange(args) {
    const previousBackendId = String(args.previousBackendId || "").trim();
    const nextBackendId = String(args.nextBackendId || "").trim();
    const backendChanged = previousBackendId !== nextBackendId;
    const result = {};
    for (const [key, value] of Object.entries(args.options || {})) {
        const schemaEntry = args.targetSchema[key];
        if (!schemaEntry) {
            continue;
        }
        if (backendChanged && schemaEntry.retention === "backend") {
            continue;
        }
        result[key] = value;
    }
    return result;
}
function parseWorkflowSettingsEntry(value, options = {}) {
    if (!isObject(value)) {
        return null;
    }
    const runOptions = normalizeWorkflowRunOptions(isObject(value.runOptions) ? value.runOptions : undefined);
    const hasHostOptions = Object.prototype.hasOwnProperty.call(value, "hostOptions");
    const hostOptions = parseWorkflowHostOptions(value.hostOptions, options.strictHostOptions === true);
    return {
        backendId: typeof value.backendId === "string" ? value.backendId.trim() : undefined,
        workflowParams: isObject(value.workflowParams)
            ? { ...value.workflowParams }
            : {},
        providerOptions: isObject(value.providerOptions)
            ? { ...value.providerOptions }
            : {},
        ...(Object.keys(runOptions).length > 0 ? { runOptions } : {}),
        ...(hasHostOptions ? { hostOptions } : {}),
    };
}
function resolveSettingsRecordSource(raw) {
    if (!isObject(raw)) {
        return {};
    }
    if (Object.prototype.hasOwnProperty.call(raw, "schemaVersion") &&
        Object.prototype.hasOwnProperty.call(raw, "workflows")) {
        return isObject(raw.workflows) ? raw.workflows : {};
    }
    return raw;
}
export function parseSettingsRecord(raw) {
    const source = resolveSettingsRecordSource(raw);
    if (!isObject(source)) {
        return {};
    }
    const normalized = {};
    for (const [workflowId, value] of Object.entries(source)) {
        const entry = parseWorkflowSettingsEntry(value);
        if (!entry) {
            continue;
        }
        normalized[workflowId] = entry;
    }
    return normalized;
}
export function parseExecutionOptionsPatch(value) {
    return parseWorkflowSettingsEntry(value, { strictHostOptions: true }) || {};
}
export function createWorkflowSettingsDocument(record) {
    return {
        schemaVersion: WORKFLOW_SETTINGS_SCHEMA_VERSION,
        workflows: parseSettingsRecord(record),
    };
}
export function serializeSettingsRecord(record) {
    return JSON.stringify(createWorkflowSettingsDocument(record));
}
function coerceBySchemaType(type, value) {
    if (type === "boolean") {
        if (typeof value === "boolean") {
            return value;
        }
        if (typeof value === "string") {
            return ["1", "true", "yes", "on"].includes(value.toLowerCase());
        }
        return undefined;
    }
    if (type === "number") {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === "string") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return undefined;
    }
    if (type === "string") {
        if (typeof value === "string") {
            return value;
        }
        return undefined;
    }
    if (type === "array") {
        if (!Array.isArray(value)) {
            return undefined;
        }
        const normalized = value
            .filter((entry) => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter(Boolean);
        return Array.from(new Set(normalized));
    }
    return undefined;
}
export function normalizeWorkflowParamsBySchema(manifest, source) {
    const schemas = manifest.parameters || {};
    const schemaEntries = Object.entries(schemas);
    const input = isObject(source) ? source : {};
    if (schemaEntries.length === 0) {
        return { ...input };
    }
    const normalized = {};
    for (const [key, schema] of schemaEntries) {
        const hasExplicitInput = typeof input[key] !== "undefined";
        const pickValidValue = (value) => {
            const coerced = coerceBySchemaType(schema.type, value);
            if (typeof coerced === "undefined") {
                return undefined;
            }
            const enumIsStrict = !(schema.type === "string" && schema.allowCustom === true);
            if (Array.isArray(schema.enum) && schema.enum.length > 0) {
                if (enumIsStrict &&
                    !schema.enum.some((candidate) => candidate === coerced)) {
                    return undefined;
                }
            }
            if (schema.type === "number" &&
                typeof coerced === "number" &&
                typeof schema.min === "number" &&
                coerced < schema.min) {
                return undefined;
            }
            if (schema.type === "number" &&
                typeof coerced === "number" &&
                typeof schema.max === "number" &&
                coerced > schema.max) {
                return undefined;
            }
            return coerced;
        };
        let coerced = pickValidValue(hasExplicitInput ? input[key] : schema.default);
        if (typeof coerced === "undefined" && hasExplicitInput) {
            coerced = pickValidValue(schema.default);
        }
        if (typeof coerced === "undefined") {
            continue;
        }
        normalized[key] = coerced;
    }
    return normalized;
}
function isRequiredWorkflowParameterPresent(type, value) {
    if (type === "string") {
        return typeof value === "string" && value.trim().length > 0;
    }
    if (type === "number") {
        return typeof value === "number" && Number.isFinite(value);
    }
    if (type === "boolean") {
        return typeof value === "boolean";
    }
    if (type === "array") {
        return Array.isArray(value) && value.length > 0;
    }
    return typeof value !== "undefined" && value !== null;
}
export function listMissingRequiredWorkflowParameters(manifest, workflowParams) {
    const input = isObject(workflowParams) ? workflowParams : {};
    return Object.entries(manifest.parameters || {})
        .filter(([, schema]) => schema.required === true)
        .filter(([, schema]) => {
        const condition = schema.visible_if;
        return !condition || input[condition.parameter] === condition.equals;
    })
        .filter(([key, schema]) => !isRequiredWorkflowParameterPresent(schema.type, input[key]))
        .map(([key]) => key);
}
export function assertRequiredWorkflowParameters(manifest, workflowParams) {
    const requiredFields = listMissingRequiredWorkflowParameters(manifest, workflowParams);
    if (requiredFields.length === 0) {
        return;
    }
    const error = new Error(`Missing required workflow parameter(s): ${requiredFields.join(", ")}`);
    error.code = "missing_required_workflow_parameter";
    error.requiredFields = requiredFields;
    throw error;
}
export function mergeExecutionOptions(base, override) {
    const overrideHasHostOptions = Object.prototype.hasOwnProperty.call(override || {}, "hostOptions");
    const baseHasHostOptions = Object.prototype.hasOwnProperty.call(base || {}, "hostOptions");
    const hostOptions = overrideHasHostOptions
        ? parseWorkflowHostOptions(override?.hostOptions, true)
        : parseWorkflowHostOptions(base?.hostOptions, false);
    return {
        backendId: String(override?.backendId || base?.backendId || "").trim() || undefined,
        workflowParams: mergeOptionRecord(base?.workflowParams, override?.workflowParams),
        providerOptions: mergeOptionRecord(base?.providerOptions, override?.providerOptions),
        runOptions: normalizeWorkflowRunOptions(override?.runOptions),
        ...(overrideHasHostOptions || baseHasHostOptions ? { hostOptions } : {}),
    };
}
function mergeOptionRecord(base, override) {
    const merged = { ...(base || {}) };
    if (!isObject(override)) {
        return merged;
    }
    for (const [key, value] of Object.entries(override)) {
        if (value === null || typeof value === "undefined") {
            delete merged[key];
            continue;
        }
        merged[key] = value;
    }
    return merged;
}
export function normalizeSavedWorkflowSettings(args) {
    return args.merged;
}
export function buildWorkflowSettingsDialogInitialState(saved) {
    const selectedProfile = String(saved.backendId || "").trim();
    const persistedWorkflowParams = isObject(saved.workflowParams)
        ? { ...saved.workflowParams }
        : {};
    const persistedProviderOptions = isObject(saved.providerOptions)
        ? { ...saved.providerOptions }
        : {};
    const persistedHostOptions = parseWorkflowHostOptions(saved.hostOptions, false);
    return {
        selectedProfile,
        persistedWorkflowParams,
        persistedProviderOptions,
        persistedHostOptions,
        runOnceWorkflowParams: { ...persistedWorkflowParams },
        runOnceProviderOptions: { ...persistedProviderOptions },
        runOnceRunOptions: {},
        runOnceHostOptions: {
            ...(persistedHostOptions.queue
                ? { queue: { ...persistedHostOptions.queue } }
                : {}),
        },
    };
}
