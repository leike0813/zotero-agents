import type { WorkflowManifest } from "../workflows/types";
import type { ProviderRuntimeOptionSchema } from "../providers/types";
import {
  type WorkflowRunOptions,
  normalizeWorkflowRunOptions,
} from "../workflows/zoteroHostAccessOptions";

export type WorkflowExecutionOptions = {
  backendId?: string;
  workflowParams?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
  runOptions?: WorkflowRunOptions;
  hostOptions?: WorkflowHostOptions;
};

export type WorkflowHostQueueOptions = {
  maxConcurrency?: number;
};

export type WorkflowHostOptions = {
  queue?: WorkflowHostQueueOptions;
};

export type HostQueueMaxConcurrencyNormalization =
  | {
      status: "valid";
      maxConcurrency?: number;
    }
  | {
      status: "invalid";
      reasonCode: "invalid_host_queue_max_concurrency";
    };

export type WorkflowSettingsRecord = Record<string, WorkflowExecutionOptions>;

export const WORKFLOW_SETTINGS_SCHEMA_VERSION = 2;

export type WorkflowSettingsDocument = {
  schemaVersion: typeof WORKFLOW_SETTINGS_SCHEMA_VERSION;
  workflows: WorkflowSettingsRecord;
};

export type WorkflowSettingsDialogInitialState = {
  selectedProfile: string;
  persistedWorkflowParams: Record<string, unknown>;
  persistedProviderOptions: Record<string, unknown>;
  persistedHostOptions?: WorkflowHostOptions;
  runOnceWorkflowParams: Record<string, unknown>;
  runOnceProviderOptions: Record<string, unknown>;
  runOnceRunOptions: WorkflowRunOptions;
  runOnceHostOptions?: WorkflowHostOptions;
};

export function normalizeHostQueueMaxConcurrency(
  value: unknown,
): HostQueueMaxConcurrencyNormalization {
  if (
    value === null ||
    typeof value === "undefined" ||
    (typeof value === "string" && value.trim() === "")
  ) {
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

function parseWorkflowHostOptions(
  value: unknown,
  strict: boolean,
): WorkflowHostOptions {
  if (!isObject(value)) {
    return {};
  }
  const queue = isObject(value.queue) ? value.queue : undefined;
  if (
    !queue ||
    !Object.prototype.hasOwnProperty.call(queue, "maxConcurrency")
  ) {
    return {};
  }
  const normalized = normalizeHostQueueMaxConcurrency(queue.maxConcurrency);
  if (normalized.status === "invalid") {
    if (strict) {
      throw new RangeError(
        "Workflow Host queue maximum concurrency must be a non-negative safe integer",
      );
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

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function rebaseProviderOptionsForBackendChange(args: {
  previousBackendId?: string;
  nextBackendId?: string;
  targetSchema: ProviderRuntimeOptionSchema;
  options?: Record<string, unknown>;
}) {
  const previousBackendId = String(args.previousBackendId || "").trim();
  const nextBackendId = String(args.nextBackendId || "").trim();
  const backendChanged = previousBackendId !== nextBackendId;
  const result: Record<string, unknown> = {};
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

function parseWorkflowSettingsEntry(
  value: unknown,
  options: { strictHostOptions?: boolean } = {},
): WorkflowExecutionOptions | null {
  if (!isObject(value)) {
    return null;
  }
  const runOptions = normalizeWorkflowRunOptions(
    isObject(value.runOptions) ? value.runOptions : undefined,
  );
  const hasHostOptions = Object.prototype.hasOwnProperty.call(
    value,
    "hostOptions",
  );
  const hostOptions = parseWorkflowHostOptions(
    value.hostOptions,
    options.strictHostOptions === true,
  );
  return {
    backendId:
      typeof value.backendId === "string" ? value.backendId.trim() : undefined,
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

function resolveSettingsRecordSource(raw: unknown): unknown {
  if (!isObject(raw)) {
    return {};
  }
  if (
    Object.prototype.hasOwnProperty.call(raw, "schemaVersion") &&
    Object.prototype.hasOwnProperty.call(raw, "workflows")
  ) {
    return isObject(raw.workflows) ? raw.workflows : {};
  }
  return raw;
}

export function parseSettingsRecord(raw: unknown): WorkflowSettingsRecord {
  const source = resolveSettingsRecordSource(raw);
  if (!isObject(source)) {
    return {};
  }
  const normalized: WorkflowSettingsRecord = {};
  for (const [workflowId, value] of Object.entries(source)) {
    const entry = parseWorkflowSettingsEntry(value);
    if (!entry) {
      continue;
    }
    normalized[workflowId] = entry;
  }
  return normalized;
}

export function parseExecutionOptionsPatch(
  value: unknown,
): WorkflowExecutionOptions {
  return parseWorkflowSettingsEntry(value, { strictHostOptions: true }) || {};
}

export function createWorkflowSettingsDocument(
  record: WorkflowSettingsRecord,
): WorkflowSettingsDocument {
  return {
    schemaVersion: WORKFLOW_SETTINGS_SCHEMA_VERSION,
    workflows: parseSettingsRecord(record),
  };
}

export function serializeSettingsRecord(record: WorkflowSettingsRecord) {
  return JSON.stringify(createWorkflowSettingsDocument(record));
}

function coerceBySchemaType(type: string, value: unknown) {
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
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }
  return undefined;
}

export function normalizeWorkflowParamsBySchema(
  manifest: WorkflowManifest,
  source: unknown,
) {
  const schemas = manifest.parameters || {};
  const schemaEntries = Object.entries(schemas);
  const input = isObject(source) ? source : {};
  if (schemaEntries.length === 0) {
    return { ...input };
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, schema] of schemaEntries) {
    const hasExplicitInput = typeof input[key] !== "undefined";
    const pickValidValue = (value: unknown) => {
      const coerced = coerceBySchemaType(schema.type, value);
      if (typeof coerced === "undefined") {
        return undefined;
      }
      const enumIsStrict = !(
        schema.type === "string" && schema.allowCustom === true
      );
      if (Array.isArray(schema.enum) && schema.enum.length > 0) {
        if (
          enumIsStrict &&
          !schema.enum.some((candidate) => candidate === coerced)
        ) {
          return undefined;
        }
      }
      if (
        schema.type === "number" &&
        typeof coerced === "number" &&
        typeof schema.min === "number" &&
        coerced < schema.min
      ) {
        return undefined;
      }
      if (
        schema.type === "number" &&
        typeof coerced === "number" &&
        typeof schema.max === "number" &&
        coerced > schema.max
      ) {
        return undefined;
      }
      return coerced;
    };

    let coerced = pickValidValue(
      hasExplicitInput ? input[key] : schema.default,
    );
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

function isRequiredWorkflowParameterPresent(type: string, value: unknown) {
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

export function listMissingRequiredWorkflowParameters(
  manifest: WorkflowManifest,
  workflowParams: unknown,
) {
  const input = isObject(workflowParams) ? workflowParams : {};
  return Object.entries(manifest.parameters || {})
    .filter(([, schema]) => schema.required === true)
    .filter(
      ([key, schema]) =>
        !isRequiredWorkflowParameterPresent(schema.type, input[key]),
    )
    .map(([key]) => key);
}

export function assertRequiredWorkflowParameters(
  manifest: WorkflowManifest,
  workflowParams: unknown,
) {
  const requiredFields = listMissingRequiredWorkflowParameters(
    manifest,
    workflowParams,
  );
  if (requiredFields.length === 0) {
    return;
  }
  const error = new Error(
    `Missing required workflow parameter(s): ${requiredFields.join(", ")}`,
  ) as Error & {
    code?: string;
    requiredFields?: string[];
  };
  error.code = "missing_required_workflow_parameter";
  error.requiredFields = requiredFields;
  throw error;
}

export function mergeExecutionOptions(
  base: WorkflowExecutionOptions | undefined,
  override: WorkflowExecutionOptions | undefined,
): WorkflowExecutionOptions {
  const overrideHasHostOptions = Object.prototype.hasOwnProperty.call(
    override || {},
    "hostOptions",
  );
  const baseHasHostOptions = Object.prototype.hasOwnProperty.call(
    base || {},
    "hostOptions",
  );
  const hostOptions = overrideHasHostOptions
    ? parseWorkflowHostOptions(override?.hostOptions, true)
    : parseWorkflowHostOptions(base?.hostOptions, false);
  return {
    backendId:
      String(override?.backendId || base?.backendId || "").trim() || undefined,
    workflowParams: mergeOptionRecord(
      base?.workflowParams,
      override?.workflowParams,
    ),
    providerOptions: mergeOptionRecord(
      base?.providerOptions,
      override?.providerOptions,
    ),
    runOptions: normalizeWorkflowRunOptions(override?.runOptions),
    ...(overrideHasHostOptions || baseHasHostOptions ? { hostOptions } : {}),
  };
}

function mergeOptionRecord(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined,
) {
  const merged: Record<string, unknown> = { ...(base || {}) };
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

export function normalizeSavedWorkflowSettings(args: {
  workflowId: string;
  previous: WorkflowExecutionOptions | undefined;
  merged: WorkflowExecutionOptions;
  incoming: WorkflowExecutionOptions;
}) {
  return args.merged;
}

export function buildWorkflowSettingsDialogInitialState(
  saved: WorkflowExecutionOptions,
): WorkflowSettingsDialogInitialState {
  const selectedProfile = String(saved.backendId || "").trim();
  const persistedWorkflowParams = isObject(saved.workflowParams)
    ? { ...saved.workflowParams }
    : {};
  const persistedProviderOptions = isObject(saved.providerOptions)
    ? { ...saved.providerOptions }
    : {};
  const persistedHostOptions = parseWorkflowHostOptions(
    saved.hostOptions,
    false,
  );
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
