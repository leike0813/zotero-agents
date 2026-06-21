import type { WorkflowManifest } from "../workflows/types";
import {
  type WorkflowRunOptions,
  normalizeWorkflowRunOptions,
} from "../workflows/zoteroHostAccessOptions";

export type WorkflowExecutionOptions = {
  backendId?: string;
  workflowParams?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
  runOptions?: WorkflowRunOptions;
};

export type WorkflowSettingsRecord = Record<string, WorkflowExecutionOptions>;

export const WORKFLOW_SETTINGS_SCHEMA_VERSION = 1;

export type WorkflowSettingsDocument = {
  schemaVersion: typeof WORKFLOW_SETTINGS_SCHEMA_VERSION;
  workflows: WorkflowSettingsRecord;
};

export type WorkflowSettingsDialogInitialState = {
  selectedProfile: string;
  persistedWorkflowParams: Record<string, unknown>;
  persistedProviderOptions: Record<string, unknown>;
  runOnceWorkflowParams: Record<string, unknown>;
  runOnceProviderOptions: Record<string, unknown>;
  runOnceRunOptions: WorkflowRunOptions;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseWorkflowSettingsEntry(
  value: unknown,
): WorkflowExecutionOptions | null {
  if (!isObject(value)) {
    return null;
  }
  const runOptions = normalizeWorkflowRunOptions(
    isObject(value.runOptions) ? value.runOptions : undefined,
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
  return parseWorkflowSettingsEntry(value) || {};
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

export function mergeExecutionOptions(
  base: WorkflowExecutionOptions | undefined,
  override: WorkflowExecutionOptions | undefined,
): WorkflowExecutionOptions {
  return {
    backendId:
      String(override?.backendId || base?.backendId || "").trim() || undefined,
    workflowParams: {
      ...(base?.workflowParams || {}),
      ...(override?.workflowParams || {}),
    },
    providerOptions: {
      ...(base?.providerOptions || {}),
      ...(override?.providerOptions || {}),
    },
    runOptions: normalizeWorkflowRunOptions(override?.runOptions),
  };
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
  return {
    selectedProfile,
    persistedWorkflowParams,
    persistedProviderOptions,
    runOnceWorkflowParams: { ...persistedWorkflowParams },
    runOnceProviderOptions: { ...persistedProviderOptions },
    runOnceRunOptions: {},
  };
}
