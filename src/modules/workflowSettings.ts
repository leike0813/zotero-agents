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
import type { LoadedWorkflow } from "../workflows/types";
import { getLoadedWorkflowEntries } from "./workflowRuntime";
import { getPref, setPref } from "../utils/prefs";
import { resolveWorkflowRequestKind } from "./workflowRequestKind";
import {
  ACP_BACKEND_TYPE,
  ACP_SKILL_RUN_REQUEST_KIND,
  DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
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
} from "./workflowSettingsDomain";
import {
  applyExecutionWorkflowParamsNormalizer,
  applyPersistedWorkflowSettingsNormalizer,
} from "./workflowSettingsNormalizer";

const WORKFLOW_SETTINGS_PREF_KEY = "workflowSettingsJson";

type WorkflowExecutionContext = {
  backend: BackendInstance;
  requestKind: string;
  workflowParams: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  providerId: string;
};

type WorkflowSettingsSchemaEntry = {
  key: string;
  type: "string" | "number" | "boolean";
  title?: string;
  description?: string;
  enumValues?: string[];
  allowCustom?: boolean;
  defaultValue?: unknown;
  disabled?: boolean;
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
  workflowSchemaEntries: WorkflowSettingsSchemaEntry[];
  providerSchemaEntries: WorkflowSettingsSchemaEntry[];
  hasConfigurableSettings: boolean;
};

function readSettingsRecord(): WorkflowSettingsRecord {
  const rawText = String(getPref(WORKFLOW_SETTINGS_PREF_KEY) || "").trim();
  if (!rawText) {
    return {};
  }
  try {
    return parseSettingsRecord(JSON.parse(rawText));
  } catch {
    return {};
  }
}

function writeSettingsRecord(record: WorkflowSettingsRecord) {
  setPref(WORKFLOW_SETTINGS_PREF_KEY, JSON.stringify(record));
}

function resolveProviderId(workflow: LoadedWorkflow) {
  const providerId = String(workflow.manifest.provider || "").trim();
  if (!providerId) {
    const requestKind = String(workflow.manifest.request?.kind || "").trim();
    for (const [backendType, knownRequestKind] of Object.entries(
      DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE,
    )) {
      if (knownRequestKind === requestKind) {
        return backendType;
      }
    }
    throw new Error(
      `Workflow ${workflow.manifest.id} does not declare provider`,
    );
  }
  return providerId;
}

function isSkillRunnerJobWorkflow(workflow: LoadedWorkflow) {
  return String(workflow.manifest.request?.kind || "").trim() === "skillrunner.job.v1";
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
  const backendType = normalizedProvider || PASS_THROUGH_BACKEND_TYPE;
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

function resolveSkillRunnerMode(
  workflow: LoadedWorkflow | null | undefined,
): "auto" | "interactive" | "" {
  if (!workflow) {
    return "";
  }
  const providerId = String(workflow.manifest.provider || "").trim();
  const requestKind = String(workflow.manifest.request?.kind || "").trim();
  if (providerId !== "skillrunner" && requestKind !== "skillrunner.job.v1") {
    return "";
  }
  const mode = String(workflow.manifest.execution?.skillrunner_mode || "")
    .trim()
    .toLowerCase();
  if (mode === "interactive") {
    return "interactive";
  }
  if (mode === "auto") {
    return "auto";
  }
  return "";
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

function constrainSkillRunnerProviderOptionsByMode(args: {
  workflow: LoadedWorkflow | null | undefined;
  options: Record<string, unknown>;
}) {
  const mode = resolveSkillRunnerMode(args.workflow);
  if (!mode) {
    return { ...args.options };
  }
  const next: Record<string, unknown> = { ...args.options };
  const normalizedNoCache = toBooleanLike(next.no_cache);
  if (mode === "interactive") {
    delete next.no_cache;
  } else if (typeof normalizedNoCache === "boolean") {
    next.no_cache = normalizedNoCache;
  } else {
    delete next.no_cache;
  }
  const normalizedAutoReply = toBooleanLike(next.interactive_auto_reply);
  if (mode === "interactive" && typeof normalizedAutoReply === "boolean") {
    next.interactive_auto_reply = normalizedAutoReply;
  } else {
    delete next.interactive_auto_reply;
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
  const mode = resolveSkillRunnerMode(args.workflow);
  if (!mode) {
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
  const providerId = String(next.provider_id || next.model_provider || "").trim();
  const model = String(next.model || "").trim();
  delete next.model_provider;
  if (!isProviderScoped) {
    return next;
  }
  if (!providerId) {
    delete next.provider_id;
    return next;
  }
  next.provider_id = providerId;
  if (!model) {
    return next;
  }
  const uiModelName = resolveSkillRunnerModelNameForProvider({
    engine,
    provider: providerId,
    model,
    scope,
  });
  if (uiModelName) {
    next.model = uiModelName;
  }
  return next;
}

export type { WorkflowExecutionOptions, WorkflowSettingsRecord, WorkflowSettingsDialogInitialState };

export function getWorkflowSettings(workflowId: string): WorkflowExecutionOptions {
  const record = readSettingsRecord();
  return record[String(workflowId || "").trim()] || {};
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
    providerOptions: constrainSkillRunnerProviderOptionsByMode({
      workflow,
      options: isObject(normalized.providerOptions) ? normalized.providerOptions : {},
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

function toWorkflowSchemaEntries(
  workflow: LoadedWorkflow,
): WorkflowSettingsSchemaEntry[] {
  const schema = workflow.manifest.parameters || {};
  return Object.entries(schema).map(([key, entry]) => ({
    key,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    enumValues: entry.type === "string" ? toStringEnum(entry.enum) : [],
    allowCustom: entry.type === "string" && entry.allowCustom === true,
    defaultValue: entry.default,
    min: entry.type === "number" ? entry.min : undefined,
    max: entry.type === "number" ? entry.max : undefined,
  }));
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
        ? toStringEnum(dynamicEnum.length > 0 ? dynamicEnum : enumValues.length > 0 ? enumValues : ["default"])
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
    };
  });
  const filteredEntries = baseEntries.filter((entry) => {
    if (entry.key === "provider_id" && !isProviderScopedFieldVisible) {
      return false;
    }
    return true;
  });
  const mode = resolveSkillRunnerMode(args.workflow);
  if (providerId !== "skillrunner" || !mode) {
    return filteredEntries;
  }
  if (mode === "interactive") {
    return filteredEntries.filter((entry) => entry.key !== "no_cache");
  }
  return filteredEntries.filter((entry) => entry.key !== "interactive_auto_reply");
}

export async function buildWorkflowSettingsUiDescriptor(args: {
  workflow: LoadedWorkflow;
  draft?: WorkflowExecutionOptions;
  candidateBackends?: BackendInstance[];
  excludedBackendIds?: string[];
  autoSelectFallbackProfile?: boolean;
}): Promise<WorkflowSettingsUiDescriptor> {
  const manifestProviderId = resolveProviderId(args.workflow);
  if (!isSkillRunnerJobWorkflow(args.workflow)) {
    assertWorkflowExecutionProviderSupported(manifestProviderId);
  }
  const manifestProvider = resolveProviderById(manifestProviderId);
  const requiresBackendProfile = manifestProvider.requiresBackendProfile !== false;
  const rawCandidateBackends = Array.isArray(args.candidateBackends)
    ? args.candidateBackends
    : isSkillRunnerJobWorkflow(args.workflow)
      ? await listBackendsForWorkflow(args.workflow)
      : await listBackendsForProvider(manifestProviderId);
  const availableBackends = rawCandidateBackends.filter(
    (backend) => {
      if (isSkillRunnerJobWorkflow(args.workflow)) {
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
        args.excludedBackendIds.some((id) => String(id || "").trim() === backendId)
      ) {
        return false;
      }
      return true;
    },
  );
  const profiles = requiresBackendProfile
    ? availableBackends.map((backend) => ({
        id: backend.id,
        label: `${resolveBackendDisplayName(backend.id, backend.displayName)} (${backend.type})`,
      }))
    : [];
  const saved = getWorkflowSettings(args.workflow.manifest.id);
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
  const workflowSchemaEntries = toWorkflowSchemaEntries(args.workflow);
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
  const profileEditable = requiresBackendProfile && profiles.length > 1;
  const profileMissing = requiresBackendProfile && profiles.length === 0;
  const hasProfileConfigDimension =
    requiresBackendProfile && profiles.length !== 1;
  const hasConfigurableSettings =
    hasProfileConfigDimension ||
    workflowSchemaEntries.length > 0 ||
    providerSchemaEntries.length > 0;

  return {
    workflowId: args.workflow.manifest.id,
    workflowLabel: args.workflow.manifest.label,
    providerId,
    requiresBackendProfile,
    profiles,
    profileEditable,
    profileMissing,
    selectedProfile,
    workflowParams,
    providerOptions: uiProviderOptions,
    workflowSchemaEntries,
    providerSchemaEntries,
    hasConfigurableSettings,
  };
}

export async function isWorkflowConfigurable(args: {
  workflow: LoadedWorkflow;
  candidateBackends?: BackendInstance[];
}) {
  const descriptor = await buildWorkflowSettingsUiDescriptor({
    workflow: args.workflow,
    candidateBackends: args.candidateBackends,
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

export async function listProviderProfilesForWorkflow(workflow: LoadedWorkflow) {
  const providerId = resolveProviderId(workflow);
  if (!isSkillRunnerJobWorkflow(workflow)) {
    assertWorkflowExecutionProviderSupported(providerId);
    return listBackendsForProvider(providerId);
  }
  return listBackendsForWorkflow(workflow);
}

export async function resolveWorkflowExecutionContext(args: {
  workflow: LoadedWorkflow;
  executionOptionsOverride?: WorkflowExecutionOptions;
}): Promise<WorkflowExecutionContext> {
  const manifestProviderId = resolveProviderId(args.workflow);
  if (!isSkillRunnerJobWorkflow(args.workflow)) {
    assertWorkflowExecutionProviderSupported(manifestProviderId);
  }
  const manifestProvider = resolveProviderById(manifestProviderId);
  const saved = getWorkflowSettings(args.workflow.manifest.id);
  const merged = mergeExecutionOptions(saved, args.executionOptionsOverride);

  const backend =
    manifestProvider.requiresBackendProfile === false
      ? buildLocalBackendForProvider(manifestProvider.id)
      : await resolveBackendForWorkflow(args.workflow, {
          preferredBackendId: merged.backendId,
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

  return {
    backend,
    requestKind,
    workflowParams,
    providerOptions: constrainedProviderOptions,
    providerId,
  };
}

export function resolveWorkflowExecutionOptionsPreview(args: {
  workflow: LoadedWorkflow;
  executionOptionsOverride?: WorkflowExecutionOptions;
}) {
  const saved = getWorkflowSettings(args.workflow.manifest.id);
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
  };
}
