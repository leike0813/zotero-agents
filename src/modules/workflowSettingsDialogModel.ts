import { resolveProviderById } from "../providers/registry";
import { isSkillRunnerProviderScopedEngine } from "../providers/skillrunner/modelCatalog";
import { projectAcpProviderModelOptionsForUi } from "./acpModelOptionFolding";
import { localizeProviderRuntimeOptionText } from "./workflowSettingsOptionLocalization";
import type { ProviderRuntimeOptionSchemaEntry } from "../providers/types";
import type { BackendInstance } from "../backends/types";
import type { WorkflowParameterSchema } from "../workflows/types";
import type { WorkflowParameterOption } from "../workflows/types";
import type {
  WorkflowExecutionOptions,
  WorkflowHostOptions,
  WorkflowSettingsDialogInitialState,
} from "./workflowSettingsDomain";
import { normalizeHostQueueMaxConcurrency } from "./workflowSettingsDomain";

export type FormSchemaType = "string" | "number" | "boolean" | "array";

export type FormSchemaEntry = {
  key: string;
  type: FormSchemaType;
  visibleIf?: {
    parameter: string;
    equals: boolean;
  };
  title?: string;
  description?: string;
  placeholder?: string;
  enumValues?: string[];
  options?: WorkflowParameterOption[];
  allowCustom?: boolean;
  defaultValue?: unknown;
  required?: boolean;
  disabled?: boolean;
};

export type WorkflowSettingsDialogProfileItem = {
  id: string;
  label: string;
};

export type WorkflowExecutionUnitPreview = Readonly<{
  unitId: string;
  taskName: string;
  inputUnitIdentity?: string;
  memberCount: number;
}>;

export type WorkflowExecutionUnitPreviewState =
  | Readonly<{ status: "loading" }>
  | Readonly<{
      status: "success";
      units: ReadonlyArray<WorkflowExecutionUnitPreview>;
    }>
  | Readonly<{
      status: "empty";
      units: ReadonlyArray<WorkflowExecutionUnitPreview>;
    }>
  | Readonly<{ status: "failure"; reasonCode: string }>;

export type WorkflowSettingsDialogLayout = Readonly<{
  mode: "single-region" | "multi-unit";
  showExecutionUnitPreview: boolean;
  showHostMaximumConcurrency: boolean;
}>;

export type WorkflowHostOptionDescriptor = Readonly<{
  queueSupported: boolean;
  maxConcurrency?: number;
}>;

export type WorkflowSettingsDialogRenderModel = {
  providerId: string;
  selectedProfile: string;
  profileItems: WorkflowSettingsDialogProfileItem[];
  workflowSchemaEntries: FormSchemaEntry[];
  persistedWorkflowParams: Record<string, unknown>;
  persistedProviderOptions: Record<string, unknown>;
  runOnceWorkflowParams: Record<string, unknown>;
  runOnceProviderOptions: Record<string, unknown>;
  hostOptions?: WorkflowHostOptionDescriptor;
  executionUnitPreview?: WorkflowExecutionUnitPreviewState;
  layout: WorkflowSettingsDialogLayout;
};

export function resolveWorkflowSettingsDialogLayout(args: {
  hostQueueSupported: boolean;
  executionUnitPreview?: WorkflowExecutionUnitPreviewState;
}): WorkflowSettingsDialogLayout {
  const units =
    args.executionUnitPreview?.status === "success"
      ? args.executionUnitPreview.units
      : [];
  const showMultiUnitRegion =
    args.hostQueueSupported === true && units.length > 1;
  return Object.freeze({
    mode: showMultiUnitRegion ? "multi-unit" : "single-region",
    showExecutionUnitPreview: showMultiUnitRegion,
    showHostMaximumConcurrency: showMultiUnitRegion,
  });
}

function normalizeEnum(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    normalized.push(value);
  }
  return normalized;
}

function fromWorkflowParameterSchema(
  parameters: Record<string, WorkflowParameterSchema> | undefined,
) {
  if (!parameters) {
    return [] as FormSchemaEntry[];
  }
  return Object.entries(parameters).map(([key, schema]) => ({
    key,
    type: schema.type,
    visibleIf: schema.visible_if
      ? {
          parameter: String(schema.visible_if.parameter || "").trim(),
          equals: schema.visible_if.equals === true,
        }
      : undefined,
    title: schema.title,
    description: schema.description,
    enumValues: schema.type === "string" ? normalizeEnum(schema.enum) : [],
    allowCustom: schema.type === "string" && schema.allowCustom === true,
    defaultValue: schema.default,
    required: schema.required === true,
  }));
}

function fromProviderOptionSchema(
  providerId: string,
  schema: Record<string, ProviderRuntimeOptionSchemaEntry>,
) {
  return Object.entries(schema).map(([key, entry]) => {
    const localizedText = localizeProviderRuntimeOptionText({
      providerId,
      optionKey: key,
      entry,
    });
    return {
      key,
      type: entry.type,
      title: localizedText.title,
      description: localizedText.description,
      placeholder: localizedText.placeholder,
      enumValues: entry.type === "string" ? normalizeEnum(entry.enum) : [],
      defaultValue: entry.default,
      disabled: entry.disabled === true,
    };
  });
}

function getElementValue(control: Element) {
  if (control.getAttribute("data-zs-choice-control") === "1") {
    return String(control.getAttribute("data-zs-choice-value") || "").trim();
  }
  return String(
    (control as HTMLInputElement | HTMLSelectElement).value || "",
  ).trim();
}

function parseStringArray(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

export function resolveProviderSchemaEntries(args: {
  providerId: string;
  currentValues?: Record<string, unknown>;
  backend?: BackendInstance;
}) {
  try {
    const provider = resolveProviderById(args.providerId);
    const schema = provider.getRuntimeOptionSchema?.() || {};
    const entries = fromProviderOptionSchema(args.providerId, schema);
    const values =
      args.providerId === "acp" &&
      String(args.backend?.type || "").trim() === "acp"
        ? projectAcpProviderModelOptionsForUi({
            modelOptions:
              args.backend?.acp?.runtimeOptionsCache?.displayModels || [],
            options: args.currentValues || {},
            currentDisplayModelId:
              args.backend?.acp?.runtimeOptionsCache?.currentDisplayModelId,
          })
        : args.currentValues || {};
    const engine = String(values.engine || "").trim();
    const scope =
      args.backend &&
      typeof args.backend.id === "string" &&
      typeof args.backend.baseUrl === "string"
        ? {
            backendId: args.backend.id,
            baseUrl: args.backend.baseUrl,
          }
        : undefined;
    const isSkillRunnerScopedProviderField =
      args.providerId === "skillrunner" &&
      isSkillRunnerProviderScopedEngine(engine, scope);
    return entries
      .map((entry) => {
        if (entry.type !== "string") {
          return entry;
        }
        const dynamicEnum = provider.getRuntimeOptionEnumValues?.({
          key: entry.key,
          options: values,
          backend: args.backend,
        });
        if (Array.isArray(dynamicEnum) && dynamicEnum.length > 0) {
          const enumValues = normalizeEnum(dynamicEnum);
          return {
            ...entry,
            enumValues,
            defaultValue:
              typeof values[entry.key] !== "undefined"
                ? values[entry.key]
                : entry.defaultValue,
            disabled:
              (entry.key === "effort" || entry.key === "acpReasoningEffort") &&
              enumValues.length <= 1,
          };
        }
        if (entry.key === "effort") {
          return {
            ...entry,
            enumValues: ["default"],
            disabled: true,
          };
        }
        return entry;
      })
      .filter((entry) => {
        if (
          entry.key === "acpModelProvider" &&
          (!entry.enumValues || entry.enumValues.length === 0)
        ) {
          return false;
        }
        if (entry.key === "provider_id" && !isSkillRunnerScopedProviderField) {
          return false;
        }
        return true;
      });
  } catch {
    return [] as FormSchemaEntry[];
  }
}

export function buildWorkflowSettingsDialogRenderModel(args: {
  providerId: string;
  profileItems: WorkflowSettingsDialogProfileItem[];
  initialState: WorkflowSettingsDialogInitialState;
  workflowParameters?: Record<string, WorkflowParameterSchema>;
  hostQueueSupported?: boolean;
  executionUnitPreview?: WorkflowExecutionUnitPreviewState;
}): WorkflowSettingsDialogRenderModel {
  return {
    providerId: String(args.providerId || "").trim(),
    selectedProfile: String(args.initialState.selectedProfile || "").trim(),
    profileItems: args.profileItems.map((entry) => ({
      id: String(entry.id || "").trim(),
      label: String(entry.label || "").trim(),
    })),
    workflowSchemaEntries: fromWorkflowParameterSchema(args.workflowParameters),
    persistedWorkflowParams: { ...args.initialState.persistedWorkflowParams },
    persistedProviderOptions: { ...args.initialState.persistedProviderOptions },
    runOnceWorkflowParams: { ...args.initialState.runOnceWorkflowParams },
    runOnceProviderOptions: { ...args.initialState.runOnceProviderOptions },
    ...(typeof args.hostQueueSupported === "boolean"
      ? {
          hostOptions: {
            queueSupported: args.hostQueueSupported,
            maxConcurrency:
              args.initialState.runOnceHostOptions?.queue?.maxConcurrency ??
              args.initialState.persistedHostOptions?.queue?.maxConcurrency,
          },
        }
      : {}),
    ...(args.executionUnitPreview
      ? { executionUnitPreview: args.executionUnitPreview }
      : {}),
    layout: resolveWorkflowSettingsDialogLayout({
      hostQueueSupported: args.hostQueueSupported === true,
      executionUnitPreview: args.executionUnitPreview,
    }),
  };
}

export type WorkflowHostOptionsDraftResult =
  | Readonly<{
      status: "valid";
      hostOptions: WorkflowHostOptions;
    }>
  | Readonly<{
      status: "invalid";
      reasonCode: "invalid_host_queue_max_concurrency";
    }>;

export function buildWorkflowHostOptionsDraft(
  rawMaxConcurrency: unknown,
): WorkflowHostOptionsDraftResult {
  const normalized = normalizeHostQueueMaxConcurrency(rawMaxConcurrency);
  if (normalized.status === "invalid") {
    return normalized;
  }
  return {
    status: "valid",
    hostOptions:
      typeof normalized.maxConcurrency === "number"
        ? {
            queue: {
              maxConcurrency: normalized.maxConcurrency,
            },
          }
        : {},
  };
}

export function collectSchemaValues(container: HTMLElement) {
  const result: Record<string, unknown> = {};
  const controls = Array.from(
    container.querySelectorAll("[data-zs-option-key][data-zs-option-type]"),
  ) as Element[];

  for (const control of controls) {
    const key = String(control.getAttribute("data-zs-option-key") || "").trim();
    const type = String(
      control.getAttribute("data-zs-option-type") || "",
    ).trim() as FormSchemaType;
    if (!key) {
      continue;
    }

    if (type === "boolean") {
      const maybeInput = control as HTMLInputElement;
      if (String(maybeInput.type || "").toLowerCase() === "checkbox") {
        result[key] = !!maybeInput.checked;
      }
      continue;
    }

    const raw = getElementValue(control);
    if (!raw) {
      if (type === "number") {
        result[key] = null;
      } else if (type === "string") {
        result[key] = "";
      } else if (type === "array") {
        result[key] = [];
      }
      continue;
    }
    if (type === "number") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        result[key] = parsed;
      }
      continue;
    }
    if (type === "array") {
      result[key] = parseStringArray(raw);
      continue;
    }
    result[key] = raw;
  }

  return result;
}

export function buildWorkflowSettingsDialogDraft(args: {
  persistedProfile: string;
  onceProfile: string;
  persistedWorkflowFields: HTMLElement;
  persistedProviderFields: HTMLElement;
  onceWorkflowFields: HTMLElement;
  onceProviderFields: HTMLElement;
  persistedHostMaxConcurrency?: unknown;
  onceHostMaxConcurrency?: unknown;
}): {
  persistent: WorkflowExecutionOptions;
  runOnce: WorkflowExecutionOptions;
} {
  const hasPersistedHostValue = Object.prototype.hasOwnProperty.call(
    args,
    "persistedHostMaxConcurrency",
  );
  const hasOnceHostValue = Object.prototype.hasOwnProperty.call(
    args,
    "onceHostMaxConcurrency",
  );
  const persistedHost = buildWorkflowHostOptionsDraft(
    args.persistedHostMaxConcurrency,
  );
  const onceHost = buildWorkflowHostOptionsDraft(args.onceHostMaxConcurrency);
  if (hasPersistedHostValue && persistedHost.status === "invalid") {
    throw new RangeError("Workflow Host queue maximum concurrency is invalid");
  }
  if (hasOnceHostValue && onceHost.status === "invalid") {
    throw new RangeError("Workflow Host queue maximum concurrency is invalid");
  }
  return {
    persistent: {
      backendId: String(args.persistedProfile || "").trim() || undefined,
      workflowParams: collectSchemaValues(args.persistedWorkflowFields),
      providerOptions: collectSchemaValues(args.persistedProviderFields),
      ...(hasPersistedHostValue && persistedHost.status === "valid"
        ? { hostOptions: persistedHost.hostOptions }
        : {}),
    },
    runOnce: {
      backendId: String(args.onceProfile || "").trim() || undefined,
      workflowParams: collectSchemaValues(args.onceWorkflowFields),
      providerOptions: collectSchemaValues(args.onceProviderFields),
      ...(hasOnceHostValue && onceHost.status === "valid"
        ? { hostOptions: onceHost.hostOptions }
        : {}),
    },
  };
}
