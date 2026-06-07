import { resolveProviderById } from "../providers/registry";
import { isSkillRunnerProviderScopedEngine } from "../providers/skillrunner/modelCatalog";
import type { ProviderRuntimeOptionSchemaEntry } from "../providers/types";
import type { BackendInstance } from "../backends/types";
import type { WorkflowParameterSchema } from "../workflows/types";
import type { WorkflowParameterOption } from "../workflows/types";
import type {
  WorkflowExecutionOptions,
  WorkflowSettingsDialogInitialState,
} from "./workflowSettingsDomain";

export type FormSchemaType = "string" | "number" | "boolean";

export type FormSchemaEntry = {
  key: string;
  type: FormSchemaType;
  visibleIf?: {
    parameter: string;
    equals: boolean;
  };
  title?: string;
  description?: string;
  enumValues?: string[];
  options?: WorkflowParameterOption[];
  allowCustom?: boolean;
  defaultValue?: unknown;
  disabled?: boolean;
};

export type WorkflowSettingsDialogProfileItem = {
  id: string;
  label: string;
};

export type WorkflowSettingsDialogRenderModel = {
  providerId: string;
  selectedProfile: string;
  profileItems: WorkflowSettingsDialogProfileItem[];
  workflowSchemaEntries: FormSchemaEntry[];
  persistedWorkflowParams: Record<string, unknown>;
  persistedProviderOptions: Record<string, unknown>;
  runOnceWorkflowParams: Record<string, unknown>;
  runOnceProviderOptions: Record<string, unknown>;
};

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
  }));
}

function fromProviderOptionSchema(
  schema: Record<string, ProviderRuntimeOptionSchemaEntry>,
) {
  return Object.entries(schema).map(([key, entry]) => ({
    key,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    enumValues: entry.type === "string" ? normalizeEnum(entry.enum) : [],
    defaultValue: entry.default,
    disabled: entry.disabled === true,
  }));
}

function getElementValue(control: Element) {
  if (control.getAttribute("data-zs-choice-control") === "1") {
    return String(control.getAttribute("data-zs-choice-value") || "").trim();
  }
  return String((control as HTMLInputElement | HTMLSelectElement).value || "").trim();
}

export function resolveProviderSchemaEntries(args: {
  providerId: string;
  currentValues?: Record<string, unknown>;
  backend?: BackendInstance;
}) {
  try {
    const provider = resolveProviderById(args.providerId);
    const schema = provider.getRuntimeOptionSchema?.() || {};
    const entries = fromProviderOptionSchema(schema);
    const values = args.currentValues || {};
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
      .filter((entry) => {
        if (entry.key === "provider_id" && !isSkillRunnerScopedProviderField) {
          return false;
        }
        return true;
      })
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
        return {
          ...entry,
          enumValues: normalizeEnum(dynamicEnum),
          disabled:
            entry.key === "effort" && normalizeEnum(dynamicEnum).length <= 1,
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
      continue;
    }
    if (type === "number") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        result[key] = parsed;
      }
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
}): {
  persistent: WorkflowExecutionOptions;
  runOnce: WorkflowExecutionOptions;
} {
  return {
    persistent: {
      backendId: String(args.persistedProfile || "").trim() || undefined,
      workflowParams: collectSchemaValues(args.persistedWorkflowFields),
      providerOptions: collectSchemaValues(args.persistedProviderFields),
    },
    runOnce: {
      backendId: String(args.onceProfile || "").trim() || undefined,
      workflowParams: collectSchemaValues(args.onceWorkflowFields),
      providerOptions: collectSchemaValues(args.onceProviderFields),
    },
  };
}
