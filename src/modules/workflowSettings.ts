import {
  resolveBackendForWorkflow,
  listBackendsForProvider,
  listBackendsForWorkflow,
} from "../backends/registry";
import type { BackendInstance } from "../backends/types";
import { resolveBackendDisplayName } from "../backends/displayName";
import {
  resolveProvider,
  resolveProviderById,
  normalizeProviderRuntimeOptions,
} from "../providers/registry";
import {
  isSkillRunnerProviderScopedEngine,
  resolveSkillRunnerModelNameForProvider,
} from "../providers/skillrunner/modelCatalog";
import { projectAcpProviderModelOptionsForUi } from "./acpModelOptionFolding";
import type {
  LoadedWorkflow,
  WorkflowParameterOption,
} from "../workflows/types";
import {
  localizeWorkflowLabel,
  localizeWorkflowParameters,
} from "../workflows/localization";
import { getLoadedWorkflowEntries } from "./workflowRuntime";
import { getPref, setPref } from "../utils/prefs";
import { resolveWorkflowRequestKind } from "./workflowRequestKind";
import {
  ACP_BACKEND_TYPE,
  ACP_SKILL_RUN_REQUEST_KIND,
  BACKEND_TYPES,
  PASS_THROUGH_BACKEND_TYPE,
  SKILLRUNNER_SEQUENCE_REQUEST_KIND,
} from "../config/defaults";
import { isAcpBackendConnectionTestPassed } from "./acpBackendProbe";
import {
  type WorkflowExecutionOptions,
  type WorkflowSettingsDialogInitialState,
  type WorkflowSettingsRecord,
  buildWorkflowSettingsDialogInitialState,
  mergeExecutionOptions,
  normalizeWorkflowParamsBySchema,
  parseSettingsRecord,
  serializeSettingsRecord,
} from "./workflowSettingsDomain";
import {
  applyExecutionWorkflowParamsNormalizer,
  applyPersistedWorkflowSettingsNormalizer,
} from "./workflowSettingsNormalizer";
import { resolveWorkflowParameterOptionsSource } from "./workflowParameterOptions";
import {
  AUTO_APPROVE_ZOTERO_WRITES_PARAM,
  buildWorkflowRunOptionsForUi,
  normalizeWorkflowRunOptions,
  workflowAllowsWriteApprovalBypass,
  type WorkflowRunOptions,
} from "../workflows/zoteroHostAccessOptions";
import { isSkillRunnerInteractiveAutoReplyEnabled } from "./skillRunnerInteractiveAutoReply";

const WORKFLOW_SETTINGS_PREF_KEY = "workflowSettingsJson";

type WorkflowExecutionContext = {
  backend: BackendInstance;
  requestKind: string;
  workflowParams: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  runOptions: WorkflowRunOptions;
  providerId: string;
};

type WorkflowSettingsSchemaEntry = {
  key: string;
  type: "string" | "number" | "boolean";
  title?: string;
  description?: string;
  enumValues?: string[];
  options?: WorkflowParameterOption[];
  allowCustom?: boolean;
  defaultValue?: unknown;
  disabled?: boolean;
  visibleIfProviderOption?: {
    key: string;
    equals: boolean;
  };
  diagnostics?: Array<{
    code: string;
    message: string;
  }>;
  min?: number;
  max?: number;
};

type WorkflowSettingsProfileOption = {
  id: string;
  label: string;
};

export type WorkflowSettingsUiDescriptor = {
  workflowId: string;
  workflowLabel: string;
  providerId: string;
  requiresBackendProfile: boolean;
  profiles: WorkflowSettingsProfileOption[];
  profileEditable: boolean;
  profileMissing: boolean;
  selectedProfile: string;
  workflowParams: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  runOptions: WorkflowRunOptions;
  workflowSchemaEntries: WorkflowSettingsSchemaEntry[];
  providerSchemaEntries: WorkflowSettingsSchemaEntry[];
  runSchemaEntries: WorkflowSettingsSchemaEntry[];
  hasConfigurableSettings: boolean;
  blockedReason?: string;
};

type WorkflowSettingsCacheEntry = {
  rawText: string;
  record: WorkflowSettingsRecord;
};

const workflowSettingsReadDiagnostics = {
  prefReadCount: 0,
  parseCount: 0,
  cacheHitCount: 0,
  cacheMissCount: 0,
  writeCount: 0,
};

let workflowSettingsCache: WorkflowSettingsCacheEntry | null = null;
let workflowSettingsRevision = 0;

function dynamicOptionsUnavailableReason(args: {
  key: string;
  title?: string;
  sourceKind?: string;
  diagnostics?: Array<{ code: string; message: string }>;
}) {
  const label = String(args.title || args.key || "parameter").trim();
  const diagnostic = (args.diagnostics || [])
    .map((entry) => String(entry.message || entry.code || "").trim())
    .find(Boolean);
  if (diagnostic) {
    return `${label} options are unavailable: ${diagnostic}`;
  }
  if (args.sourceKind === "synthesis.topics") {
    return `No updatable synthesis topics are available for ${label}.`;
  }
  return `No selectable options are available for ${label}.`;
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {})) as T;
}

function cloneSettingsRecord(
  record: WorkflowSettingsRecord,
): WorkflowSettingsRecord {
  return cloneJsonValue(record);
}

function cloneExecutionOptions(
  options: WorkflowExecutionOptions | undefined,
): WorkflowExecutionOptions {
  return cloneJsonValue(options || {});
}

function readSettingsRecordCached(): WorkflowSettingsRecord {
  const rawText = String(getPref(WORKFLOW_SETTINGS_PREF_KEY) || "").trim();
  workflowSettingsReadDiagnostics.prefReadCount += 1;
  if (workflowSettingsCache?.rawText === rawText) {
    workflowSettingsReadDiagnostics.cacheHitCount += 1;
    return workflowSettingsCache.record;
  }
  workflowSettingsReadDiagnostics.cacheMissCount += 1;
  if (!rawText) {
    workflowSettingsCache = { rawText, record: {} };
    workflowSettingsRevision += 1;
    return {};
  }
  try {
    workflowSettingsReadDiagnostics.parseCount += 1;
    const record = parseSettingsRecord(JSON.parse(rawText));
    workflowSettingsCache = {
      rawText,
      record,
    };
    workflowSettingsRevision += 1;
    return record;
  } catch {
    workflowSettingsCache = { rawText, record: {} };
    workflowSettingsRevision += 1;
    return {};
  }
}

function readSettingsRecord(): WorkflowSettingsRecord {
  return cloneSettingsRecord(readSettingsRecordCached());
}

function writeSettingsRecord(record: WorkflowSettingsRecord) {
  const rawText = serializeSettingsRecord(record);
  setPref(WORKFLOW_SETTINGS_PREF_KEY, rawText);
  workflowSettingsReadDiagnostics.writeCount += 1;
  try {
    workflowSettingsCache = {
      rawText,
      record: parseSettingsRecord(JSON.parse(rawText)),
    };
  } catch {
    workflowSettingsCache = { rawText, record: {} };
  }
  workflowSettingsRevision += 1;
}

export function getWorkflowSettingsRevision() {
  readSettingsRecordCached();
  return workflowSettingsRevision;
}

export function getWorkflowSettingsReadDiagnosticsForTests() {
  return {
    ...workflowSettingsReadDiagnostics,
    revision: workflowSettingsRevision,
  };
}

export function resetWorkflowSettingsReadDiagnosticsForTests() {
  workflowSettingsReadDiagnostics.prefReadCount = 0;
  workflowSettingsReadDiagnostics.parseCount = 0;
  workflowSettingsReadDiagnostics.cacheHitCount = 0;
  workflowSettingsReadDiagnostics.cacheMissCount = 0;
  workflowSettingsReadDiagnostics.writeCount = 0;
  workflowSettingsRevision = 0;
  workflowSettingsCache = null;
}

function resolveProviderId(workflow: LoadedWorkflow) {
  const providerId = String(workflow.manifest.provider || "").trim();
  if (!providerId) {
    throw new Error(
      `Workflow ${workflow.manifest.id} does not declare provider`,
    );
  }
  return providerId;
}

function isSkillRunnerJobWorkflow(workflow: LoadedWorkflow) {
  return (
    String(workflow.manifest.request?.kind || "").trim() ===
    "skillrunner.job.v1"
  );
}

function isSkillRunnerSequenceWorkflow(workflow: LoadedWorkflow) {
  return (
    String(workflow.manifest.request?.kind || "").trim() ===
    SKILLRUNNER_SEQUENCE_REQUEST_KIND
  );
}

function isSkillRunnerContractWorkflow(workflow: LoadedWorkflow) {
  return (
    isSkillRunnerJobWorkflow(workflow) ||
    isSkillRunnerSequenceWorkflow(workflow)
  );
}

function resolveEffectiveRequestKindForBackend(args: {
  workflow: LoadedWorkflow;
  backend: BackendInstance;
}) {
  const declared = resolveWorkflowRequestKind(args.workflow, args.backend.type);
  if (
    declared === "skillrunner.job.v1" &&
    String(args.backend.type || "").trim() === ACP_BACKEND_TYPE
  ) {
    return ACP_SKILL_RUN_REQUEST_KIND;
  }
  return declared;
}

function resolveProviderIdForBackend(args: {
  workflow: LoadedWorkflow;
  backend?: BackendInstance;
}) {
  const backend = args.backend;
  if (!backend) {
    return resolveProviderId(args.workflow);
  }
  const requestKind = resolveEffectiveRequestKindForBackend({
    workflow: args.workflow,
    backend,
  });
  return resolveProvider({
    requestKind,
    backend,
  }).id;
}

function buildLocalBackendForProvider(providerId: string): BackendInstance {
  const normalizedProvider = String(providerId || "").trim();
  const backendType = (BACKEND_TYPES as readonly string[]).includes(
    normalizedProvider,
  )
    ? (normalizedProvider as BackendInstance["type"])
    : PASS_THROUGH_BACKEND_TYPE;
  return {
    id: `${backendType}-local`,
    type: backendType,
    baseUrl: `local://${backendType}`,
    auth: {
      kind: "none",
    },
  };
}

function assertWorkflowExecutionProviderSupported(providerIdRaw: string) {
  const providerId = String(providerIdRaw || "").trim();
  if (providerId === ACP_BACKEND_TYPE) {
    throw new Error(
      "ACP global chat is not available through workflow execution in phase 1",
    );
  }
}

function toStringEnum(values: unknown) {
  if (!Array.isArray(values)) {
    return [] as string[];
  }
  const normalized: string[] = [];
  for (const value of values) {
    if (typeof value === "string") {
      normalized.push(value);
    }
  }
  return normalized;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function resolveLoadedWorkflowById(workflowId: string): LoadedWorkflow | null {
  const normalizedWorkflowId = String(workflowId || "").trim();
  if (!normalizedWorkflowId) {
    return null;
  }
  return (
    getLoadedWorkflowEntries().find(
      (entry) => entry.manifest.id === normalizedWorkflowId,
    ) || null
  );
}

type SkillRunnerModeCapability = {
  applies: boolean;
  hasAuto: boolean;
  hasInteractive: boolean;
};

function resolveSkillRunnerModeCapability(
  workflow: LoadedWorkflow | null | undefined,
): SkillRunnerModeCapability {
  if (!workflow) {
    return { applies: false, hasAuto: false, hasInteractive: false };
  }
  const providerId = String(workflow.manifest.provider || "").trim();
  const requestKind = String(workflow.manifest.request?.kind || "").trim();
  if (
    providerId !== "skillrunner" &&
    requestKind !== "skillrunner.job.v1" &&
    requestKind !== SKILLRUNNER_SEQUENCE_REQUEST_KIND
  ) {
    return { applies: false, hasAuto: false, hasInteractive: false };
  }
  if (requestKind === SKILLRUNNER_SEQUENCE_REQUEST_KIND) {
    const steps = workflow.manifest.request?.sequence?.steps || [];
    if (!Array.isArray(steps) || steps.length === 0) {
      return { applies: true, hasAuto: false, hasInteractive: false };
    }
    const modes = Array.from(
      new Set(
        steps
          .map((step) =>
            String(step.mode || "")
              .trim()
              .toLowerCase(),
          )
          .filter((mode) => mode === "auto" || mode === "interactive"),
      ),
    );
    return {
      applies: true,
      hasAuto: modes.includes("auto"),
      hasInteractive: modes.includes("interactive"),
    };
  }
  const mode = String(workflow.manifest.request?.create?.mode || "")
    .trim()
    .toLowerCase();
  if (mode === "interactive") {
    return { applies: true, hasAuto: false, hasInteractive: true };
  }
  if (mode === "auto") {
    return { applies: true, hasAuto: true, hasInteractive: false };
  }
  return { applies: true, hasAuto: true, hasInteractive: true };
}

function toBooleanLike(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function toPositiveInteger(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function toNonNegativeInteger(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return undefined;
  }
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

function constrainSkillRunnerProviderOptionsByMode(args: {
  workflow: LoadedWorkflow | null | undefined;
  options: Record<string, unknown>;
}) {
  const modeCapability = resolveSkillRunnerModeCapability(args.workflow);
  if (!modeCapability.applies) {
    return { ...args.options };
  }
  const next: Record<string, unknown> = { ...args.options };
  const normalizedNoCache = toBooleanLike(next.no_cache);
  if (modeCapability.hasAuto && typeof normalizedNoCache === "boolean") {
    next.no_cache = normalizedNoCache;
  } else {
    delete next.no_cache;
  }
  const normalizedAutoReply = toBooleanLike(next.interactive_auto_reply);
  if (
    isSkillRunnerInteractiveAutoReplyEnabled() &&
    modeCapability.hasInteractive &&
    typeof normalizedAutoReply === "boolean"
  ) {
    next.interactive_auto_reply = normalizedAutoReply;
  } else {
    delete next.interactive_auto_reply;
  }
  const normalizedInteractiveReplyTimeout = toNonNegativeInteger(
    next.interactive_reply_timeout_sec,
  );
  if (
    isSkillRunnerInteractiveAutoReplyEnabled() &&
    modeCapability.hasInteractive &&
    next.interactive_auto_reply === true &&
    typeof normalizedInteractiveReplyTimeout === "number"
  ) {
    next.interactive_reply_timeout_sec = normalizedInteractiveReplyTimeout;
  } else {
    delete next.interactive_reply_timeout_sec;
  }
  const normalizedHardTimeout = toPositiveInteger(next.hard_timeout_seconds);
  if (typeof normalizedHardTimeout === "number") {
    next.hard_timeout_seconds = normalizedHardTimeout;
  } else {
    delete next.hard_timeout_seconds;
  }
  return next;
}

function normalizeProviderOptionsForUi(args: {
  workflow: LoadedWorkflow;
  backend: BackendInstance | undefined;
  options: Record<string, unknown>;
}) {
  const next: Record<string, unknown> = { ...args.options };
  const effectiveProviderId = resolveProviderIdForBackend({
    workflow: args.workflow,
    backend: args.backend,
  });
  if (
    effectiveProviderId === ACP_BACKEND_TYPE &&
    String(args.backend?.type || "").trim() === ACP_BACKEND_TYPE
  ) {
    return projectAcpProviderModelOptionsForUi({
      modelOptions: args.backend?.acp?.runtimeOptionsCache?.displayModels || [],
      options: next,
      currentDisplayModelId:
        args.backend?.acp?.runtimeOptionsCache?.currentDisplayModelId,
    });
  }
  const modeCapability = resolveSkillRunnerModeCapability(args.workflow);
  if (!modeCapability.applies) {
    return next;
  }
  const engine = String(next.engine || "").trim();
  const scope =
    args.backend &&
    typeof args.backend.id === "string" &&
    typeof args.backend.baseUrl === "string"
      ? {
          backendId: args.backend.id,
          baseUrl: args.backend.baseUrl,
        }
      : undefined;
  const isProviderScoped = isSkillRunnerProviderScopedEngine(engine, scope);
  const selectedProviderId = String(
    next.provider_id || next.model_provider || "",
  ).trim();
  const model = String(next.model || "").trim();
  delete next.model_provider;
  if (!isProviderScoped) {
    return next;
  }
  if (!selectedProviderId) {
    delete next.provider_id;
    return next;
  }
  next.provider_id = selectedProviderId;
  if (!model) {
    return next;
  }
  const uiModelName = resolveSkillRunnerModelNameForProvider({
    engine,
    provider: selectedProviderId,
    model,
    scope,
  });
  if (uiModelName) {
    next.model = uiModelName;
  }
  return next;
}

export type {
  WorkflowExecutionOptions,
  WorkflowSettingsRecord,
  WorkflowSettingsDialogInitialState,
};

export function getWorkflowSettings(
  workflowId: string,
): WorkflowExecutionOptions {
  const record = readSettingsRecordCached();
  return cloneExecutionOptions(record[String(workflowId || "").trim()]);
}

export function updateWorkflowSettings(
  workflowId: string,
  next: WorkflowExecutionOptions,
) {
  const normalizedWorkflowId = String(workflowId || "").trim();
  if (!normalizedWorkflowId) {
    throw new Error("workflowId is required");
  }
  const record = readSettingsRecord();
  const previous = record[normalizedWorkflowId];
  const merged = mergeExecutionOptions(record[normalizedWorkflowId], next);
  const normalized = applyPersistedWorkflowSettingsNormalizer({
    workflowId: normalizedWorkflowId,
    previous,
    merged,
    incoming: next,
  });
  const workflow = resolveLoadedWorkflowById(normalizedWorkflowId);
  record[normalizedWorkflowId] = {
    ...normalized,
    runOptions: undefined,
    providerOptions: constrainSkillRunnerProviderOptionsByMode({
      workflow,
      options: isObject(normalized.providerOptions)
        ? normalized.providerOptions
        : {},
    }),
  };
  writeSettingsRecord(record);
}

export function clearWorkflowSettings(workflowId: string) {
  const normalizedWorkflowId = String(workflowId || "").trim();
  if (!normalizedWorkflowId) {
    return;
  }
  const record = readSettingsRecord();
  delete record[normalizedWorkflowId];
  writeSettingsRecord(record);
}

export function listWorkflowSettingsRecord() {
  return readSettingsRecord();
}

async function toWorkflowSchemaEntries(
  workflow: LoadedWorkflow,
  options?: {
    resolveDynamicOptions?: boolean;
    workflowParams?: Record<string, unknown>;
  },
): Promise<WorkflowSettingsSchemaEntry[]> {
  const rawSchema = workflow.manifest.parameters || {};
  const schema = localizeWorkflowParameters(workflow);
  const shouldResolveDynamicOptions = options?.resolveDynamicOptions !== false;
  const entries = await Promise.all(
    Object.entries(schema).map(async ([key, entry]) => {
      const dynamic =
        entry.type === "string" && shouldResolveDynamicOptions
          ? await resolveWorkflowParameterOptionsSource(entry.optionsSource)
          : { options: [], diagnostics: [] };
      const sourceKind =
        entry.optionsSource && typeof entry.optionsSource === "object"
          ? String(entry.optionsSource.kind || "").trim()
          : "";
      const strictDynamicOptionsMissing = Boolean(
        shouldResolveDynamicOptions &&
        sourceKind &&
        entry.type === "string" &&
        entry.allowCustom !== true &&
        dynamic.options.length === 0,
      );
      const dynamicDiagnostics = [...dynamic.diagnostics];
      if (strictDynamicOptionsMissing) {
        dynamicDiagnostics.push({
          code: "dynamic_options_empty",
          message: dynamicOptionsUnavailableReason({
            key,
            title: entry.title,
            sourceKind,
            diagnostics: dynamic.diagnostics,
          }),
        });
      }
      return {
        key,
        type: entry.type,
        title: entry.title,
        description: entry.description,
        enumValues: entry.type === "string" ? toStringEnum(entry.enum) : [],
        options: dynamic.options.length > 0 ? dynamic.options : undefined,
        allowCustom: entry.type === "string" && entry.allowCustom === true,
        defaultValue: entry.default,
        disabled: strictDynamicOptionsMissing,
        diagnostics:
          dynamicDiagnostics.length > 0 ? dynamicDiagnostics : undefined,
        min: entry.type === "number" ? entry.min : undefined,
        max: entry.type === "number" ? entry.max : undefined,
      };
    }),
  );
  return entries.filter((entry) => {
    const condition = rawSchema[entry.key]?.visible_if;
    const parameter = String(condition?.parameter || "").trim();
    if (!parameter) {
      return true;
    }
    const value = options?.workflowParams?.[parameter];
    return (typeof value === "boolean" ? value : false) === condition?.equals;
  });
}

function toRunSchemaEntries(
  workflow: LoadedWorkflow,
): WorkflowSettingsSchemaEntry[] {
  if (!workflowAllowsWriteApprovalBypass(workflow.manifest)) {
    return [];
  }
  return [
    {
      key: AUTO_APPROVE_ZOTERO_WRITES_PARAM,
      type: "boolean",
      title: "自动批准写库",
      description:
        "仅对当前 workflow run 的 Zotero 写库动作生效；workflow 提交本身仍需要审批，且不会保存为默认参数。",
      defaultValue: false,
    },
  ];
}

function toProviderSchemaEntries(args: {
  workflow: LoadedWorkflow;
  backend: BackendInstance | undefined;
  providerOptions: Record<string, unknown>;
}): WorkflowSettingsSchemaEntry[] {
  const providerId = resolveProviderIdForBackend({
    workflow: args.workflow,
    backend: args.backend,
  });
  const provider = resolveProviderById(providerId);
  const schema = provider.getRuntimeOptionSchema?.() || {};
  const providerEngine = String(args.providerOptions.engine || "").trim();
  const providerScope =
    args.backend &&
    typeof args.backend.id === "string" &&
    typeof args.backend.baseUrl === "string"
      ? {
          backendId: args.backend.id,
          baseUrl: args.backend.baseUrl,
        }
      : undefined;
  const isProviderScopedFieldVisible =
    providerId === "skillrunner" &&
    isSkillRunnerProviderScopedEngine(providerEngine, providerScope);
  const baseEntries = Object.entries(schema).map(([key, entry]) => {
    const enumValues = entry.type === "string" ? toStringEnum(entry.enum) : [];
    const dynamicEnum =
      entry.type === "string"
        ? provider.getRuntimeOptionEnumValues?.({
            key,
            options: args.providerOptions,
            backend: args.backend,
          }) || []
        : [];
    const resolvedEnumValues =
      key === "effort" && entry.type === "string"
        ? toStringEnum(
            dynamicEnum.length > 0
              ? dynamicEnum
              : enumValues.length > 0
                ? enumValues
                : ["default"],
          )
        : entry.type === "string" && dynamicEnum.length > 0
          ? toStringEnum(dynamicEnum)
          : enumValues;
    return {
      key,
      type: entry.type,
      title: entry.title,
      description: entry.description,
      enumValues: resolvedEnumValues,
      defaultValue: entry.default,
      disabled:
        (key === "effort" || key === "acpReasoningEffort") &&
        entry.type === "string" &&
        resolvedEnumValues.length <= 1,
      visibleIfProviderOption:
        key === "interactive_reply_timeout_sec"
          ? {
              key: "interactive_auto_reply",
              equals: true,
            }
          : undefined,
    };
  });
  const filteredEntries = baseEntries.filter((entry) => {
    if (
      entry.key === "acpModelProvider" &&
      (!entry.enumValues || entry.enumValues.length === 0)
    ) {
      return false;
    }
    if (entry.key === "provider_id" && !isProviderScopedFieldVisible) {
      return false;
    }
    return true;
  });
  const modeCapability = resolveSkillRunnerModeCapability(args.workflow);
  if (providerId !== "skillrunner" || !modeCapability.applies) {
    return filteredEntries;
  }
  return filteredEntries.filter(
    (entry) => {
      if (entry.key === "no_cache") {
        return modeCapability.hasAuto;
      }
      if (
        entry.key === "interactive_auto_reply" ||
        entry.key === "interactive_reply_timeout_sec"
      ) {
        return (
          modeCapability.hasInteractive &&
          isSkillRunnerInteractiveAutoReplyEnabled()
        );
      }
      return true;
    },
  );
}

export async function buildWorkflowSettingsUiDescriptor(args: {
  workflow: LoadedWorkflow;
  draft?: WorkflowExecutionOptions;
  candidateBackends?: BackendInstance[];
  excludedBackendIds?: string[];
  autoSelectFallbackProfile?: boolean;
  resolveDynamicOptions?: boolean;
  ignoreSavedSettings?: boolean;
}): Promise<WorkflowSettingsUiDescriptor> {
  const manifestProviderId = resolveProviderId(args.workflow);
  if (!isSkillRunnerContractWorkflow(args.workflow)) {
    assertWorkflowExecutionProviderSupported(manifestProviderId);
  }
  const manifestProvider = resolveProviderById(manifestProviderId);
  const requiresBackendProfile =
    manifestProvider.requiresBackendProfile !== false;
  const rawCandidateBackends = Array.isArray(args.candidateBackends)
    ? args.candidateBackends
    : isSkillRunnerContractWorkflow(args.workflow)
      ? await listBackendsForWorkflow(args.workflow)
      : await listBackendsForProvider(manifestProviderId);
  const availableBackends = rawCandidateBackends.filter((backend) => {
    if (isSkillRunnerSequenceWorkflow(args.workflow)) {
      const backendType = String(backend.type || "").trim();
      if (backendType !== "skillrunner" && backendType !== ACP_BACKEND_TYPE) {
        return false;
      }
    } else if (isSkillRunnerJobWorkflow(args.workflow)) {
      const backendType = String(backend.type || "").trim();
      if (backendType !== "skillrunner" && backendType !== ACP_BACKEND_TYPE) {
        return false;
      }
    } else if (String(backend.type || "").trim() !== manifestProviderId) {
      return false;
    }
    const backendId = String(backend.id || "").trim();
    if (!backendId) {
      return false;
    }
    if (
      Array.isArray(args.excludedBackendIds) &&
      args.excludedBackendIds.some(
        (id) => String(id || "").trim() === backendId,
      )
    ) {
      return false;
    }
    return true;
  });
  const profiles = requiresBackendProfile
    ? availableBackends.map((backend) => ({
        id: backend.id,
        label: `${resolveBackendDisplayName(backend.id, backend.displayName)} (${backend.type})`,
      }))
    : [];
  const saved = args.ignoreSavedSettings
    ? {}
    : getWorkflowSettings(args.workflow.manifest.id);
  const merged = mergeExecutionOptions(saved, args.draft);
  const profileFromMerged = String(merged.backendId || "").trim();
  const canAutoSelectProfile = requiresBackendProfile && profiles.length > 0;
  const selectedProfile = profiles.some(
    (profile) => profile.id === profileFromMerged,
  )
    ? profileFromMerged
    : canAutoSelectProfile &&
        (profiles.length === 1 || args.autoSelectFallbackProfile === true)
      ? profiles[0].id
      : "";
  const selectedBackend = selectedProfile
    ? availableBackends.find((entry) => entry.id === selectedProfile)
    : undefined;
  const providerId = resolveProviderIdForBackend({
    workflow: args.workflow,
    backend: selectedBackend,
  });
  const schemaNormalizedWorkflowParams = normalizeWorkflowParamsBySchema(
    args.workflow.manifest,
    merged.workflowParams,
  );
  const workflowParams = applyExecutionWorkflowParamsNormalizer({
    workflow: args.workflow,
    rawWorkflowParams:
      (merged.workflowParams as Record<string, unknown> | undefined) || {},
    normalizedWorkflowParams: schemaNormalizedWorkflowParams,
  });
  const workflowSchemaEntries = await toWorkflowSchemaEntries(args.workflow, {
    resolveDynamicOptions: args.resolveDynamicOptions,
    workflowParams,
  });
  const runSchemaEntries = toRunSchemaEntries(args.workflow);
  const runOptions = buildWorkflowRunOptionsForUi({
    manifest: args.workflow.manifest,
    source: merged.runOptions,
  });
  const providerOptions = normalizeProviderRuntimeOptions({
    providerId,
    options: merged.providerOptions,
    backend: selectedBackend,
  });
  const constrainedProviderOptions = constrainSkillRunnerProviderOptionsByMode({
    workflow: args.workflow,
    options: providerOptions,
  });
  const uiProviderOptions = normalizeProviderOptionsForUi({
    workflow: args.workflow,
    backend: selectedBackend,
    options: constrainedProviderOptions,
  });
  const providerSchemaEntries = toProviderSchemaEntries({
    workflow: args.workflow,
    backend: selectedBackend,
    providerOptions: constrainedProviderOptions,
  });
  const blockedReason = workflowSchemaEntries
    .filter((entry) => entry.disabled === true)
    .flatMap((entry) => entry.diagnostics || [])
    .map((entry) => String(entry.message || entry.code || "").trim())
    .find(Boolean);
  const profileEditable = requiresBackendProfile && profiles.length > 1;
  const profileMissing = requiresBackendProfile && profiles.length === 0;
  const hasProfileConfigDimension =
    requiresBackendProfile && profiles.length !== 1;
  const hasConfigurableSettings =
    hasProfileConfigDimension ||
    workflowSchemaEntries.length > 0 ||
    providerSchemaEntries.length > 0 ||
    runSchemaEntries.length > 0;

  return {
    workflowId: args.workflow.manifest.id,
    workflowLabel: localizeWorkflowLabel(args.workflow),
    providerId,
    requiresBackendProfile,
    profiles,
    profileEditable,
    profileMissing,
    selectedProfile,
    workflowParams,
    providerOptions: uiProviderOptions,
    runOptions,
    workflowSchemaEntries,
    providerSchemaEntries,
    runSchemaEntries,
    hasConfigurableSettings,
    blockedReason,
  };
}

export async function isWorkflowConfigurable(args: {
  workflow: LoadedWorkflow;
  candidateBackends?: BackendInstance[];
}) {
  const descriptor = await buildWorkflowSettingsUiDescriptor({
    workflow: args.workflow,
    candidateBackends: args.candidateBackends,
    resolveDynamicOptions: false,
  });
  return descriptor.hasConfigurableSettings;
}

export function setRunOnceWorkflowOverrides(
  workflowId: string,
  overrides: WorkflowExecutionOptions,
) {
  void workflowId;
  void overrides;
}

export function clearRunOnceWorkflowOverrides(workflowId: string) {
  void workflowId;
}

export function resetRunOnceOverridesForSettingsOpen(
  workflowId: string,
): WorkflowExecutionOptions {
  const normalizedWorkflowId = String(workflowId || "").trim();
  if (!normalizedWorkflowId) {
    throw new Error("workflowId is required");
  }
  return getWorkflowSettings(normalizedWorkflowId);
}

export function getWorkflowSettingsDialogInitialState(
  workflowId: string,
): WorkflowSettingsDialogInitialState {
  const saved = resetRunOnceOverridesForSettingsOpen(workflowId);
  return buildWorkflowSettingsDialogInitialState(saved);
}

export function savePersistentWorkflowSettingsDraft(args: {
  workflowId: string;
  draft: WorkflowExecutionOptions;
}) {
  updateWorkflowSettings(args.workflowId, args.draft);
}

export function applyRunOnceWorkflowSettingsDraft(args: {
  workflowId: string;
  draft: WorkflowExecutionOptions;
}) {
  void args;
}

export async function listProviderProfilesForWorkflow(
  workflow: LoadedWorkflow,
) {
  const providerId = resolveProviderId(workflow);
  if (!isSkillRunnerContractWorkflow(workflow)) {
    assertWorkflowExecutionProviderSupported(providerId);
    return listBackendsForProvider(providerId);
  }
  return listBackendsForWorkflow(workflow);
}

export async function resolveWorkflowExecutionContext(args: {
  workflow: LoadedWorkflow;
  executionOptionsOverride?: WorkflowExecutionOptions;
  ignoreSavedSettings?: boolean;
}): Promise<WorkflowExecutionContext> {
  const manifestProviderId = resolveProviderId(args.workflow);
  if (!isSkillRunnerContractWorkflow(args.workflow)) {
    assertWorkflowExecutionProviderSupported(manifestProviderId);
  }
  const manifestProvider = resolveProviderById(manifestProviderId);
  const saved = args.ignoreSavedSettings
    ? {}
    : getWorkflowSettings(args.workflow.manifest.id);
  const merged = mergeExecutionOptions(saved, args.executionOptionsOverride);
  const hasExplicitBackendOverride = Boolean(
    String(args.executionOptionsOverride?.backendId || "").trim(),
  );

  const backend =
    manifestProvider.requiresBackendProfile === false
      ? buildLocalBackendForProvider(manifestProvider.id)
      : await resolveBackendForWorkflow(args.workflow, {
          preferredBackendId: merged.backendId,
          strictPreferredBackendId: hasExplicitBackendOverride,
        });
  const requestKind = resolveEffectiveRequestKindForBackend({
    workflow: args.workflow,
    backend,
  });
  if (
    requestKind === ACP_SKILL_RUN_REQUEST_KIND &&
    String(backend.type || "").trim() === ACP_BACKEND_TYPE &&
    !isAcpBackendConnectionTestPassed(backend)
  ) {
    const status = backend.acp?.connectionTest?.status || "untested";
    const error = backend.acp?.connectionTest?.error || "";
    throw new Error(
      `ACP Skills backend "${backend.displayName || backend.id}" is not ready. Run connection test / refresh config cache first. status=${status}${
        error ? `; error=${error}` : ""
      }`,
    );
  }
  const providerId = resolveProvider({
    requestKind,
    backend,
  }).id;
  const schemaNormalizedWorkflowParams = normalizeWorkflowParamsBySchema(
    args.workflow.manifest,
    merged.workflowParams,
  );
  const workflowParams = applyExecutionWorkflowParamsNormalizer({
    workflow: args.workflow,
    rawWorkflowParams:
      (merged.workflowParams as Record<string, unknown> | undefined) || {},
    normalizedWorkflowParams: schemaNormalizedWorkflowParams,
  });
  const providerOptions = normalizeProviderRuntimeOptions({
    providerId,
    options: merged.providerOptions,
    backend,
  });
  const constrainedProviderOptions = constrainSkillRunnerProviderOptionsByMode({
    workflow: args.workflow,
    options: providerOptions,
  });
  const runOptions = buildWorkflowRunOptionsForUi({
    manifest: args.workflow.manifest,
    source: normalizeWorkflowRunOptions(merged.runOptions),
  });

  return {
    backend,
    requestKind,
    workflowParams,
    providerOptions: constrainedProviderOptions,
    runOptions,
    providerId,
  };
}

export function resolveWorkflowExecutionOptionsPreview(args: {
  workflow: LoadedWorkflow;
  executionOptionsOverride?: WorkflowExecutionOptions;
  ignoreSavedSettings?: boolean;
}) {
  const saved = args.ignoreSavedSettings
    ? {}
    : getWorkflowSettings(args.workflow.manifest.id);
  const merged = mergeExecutionOptions(saved, args.executionOptionsOverride);
  const schemaNormalizedWorkflowParams = normalizeWorkflowParamsBySchema(
    args.workflow.manifest,
    merged.workflowParams,
  );
  const workflowParams = applyExecutionWorkflowParamsNormalizer({
    workflow: args.workflow,
    rawWorkflowParams:
      (merged.workflowParams as Record<string, unknown> | undefined) || {},
    normalizedWorkflowParams: schemaNormalizedWorkflowParams,
  });
  let providerId = "";
  let constrainedProviderOptions =
    (merged.providerOptions as Record<string, unknown> | undefined) || {};
  try {
    providerId = resolveProviderId(args.workflow);
    const provider = resolveProviderById(providerId);
    const providerOptions = normalizeProviderRuntimeOptions({
      providerId: provider.id,
      options: merged.providerOptions,
      backend: undefined,
    });
    constrainedProviderOptions = constrainSkillRunnerProviderOptionsByMode({
      workflow: args.workflow,
      options: providerOptions,
    });
  } catch {
    constrainedProviderOptions = isObject(merged.providerOptions)
      ? { ...merged.providerOptions }
      : {};
  }
  return {
    providerId,
    workflowParams,
    providerOptions: constrainedProviderOptions,
    runOptions: buildWorkflowRunOptionsForUi({
      manifest: args.workflow.manifest,
      source: normalizeWorkflowRunOptions(merged.runOptions),
    }),
  };
}
