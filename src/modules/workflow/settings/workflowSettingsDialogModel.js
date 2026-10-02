import { resolveProviderById } from "../../../providers/registry";
import { isSkillRunnerProviderScopedEngine } from "../../../providers/skillrunner/modelCatalog";
import { projectAcpProviderModelOptionsForUi } from "../../acp/chat/acpModelOptionFolding";
import { localizeProviderRuntimeOptionText } from "./workflowSettingsOptionLocalization";
import { normalizeHostQueueMaxConcurrency } from "./workflowSettingsDomain";
export function normalizeWorkflowSettingsDraftChangeOrigin(value) {
    return value === "text" ? "text" : "choice";
}
export function isWorkflowSettingsStructuralRefreshChange(args) {
    if (args.origin === "text") {
        return false;
    }
    if (args.changedSection === "backend" && args.changedKey === "backendId") {
        return true;
    }
    return (args.changedSection === "providerOptions" &&
        (args.changedKey === "engine" ||
            args.changedKey === "provider_id" ||
            args.changedKey === "model" ||
            args.changedKey === "acpModelProvider" ||
            args.changedKey === "acpModelId"));
}
export function resolveWorkflowSettingsDialogLayout(args) {
    const units = args.executionUnitPreview?.status === "success"
        ? args.executionUnitPreview.units
        : [];
    const showMultiUnitRegion = args.hostQueueSupported === true && units.length > 1;
    return Object.freeze({
        mode: showMultiUnitRegion ? "multi-unit" : "single-region",
        showExecutionUnitPreview: showMultiUnitRegion,
        showHostMaximumConcurrency: showMultiUnitRegion,
    });
}
function normalizeEnum(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    const normalized = [];
    for (const value of values) {
        if (typeof value !== "string") {
            continue;
        }
        normalized.push(value);
    }
    return normalized;
}
function fromWorkflowParameterSchema(parameters) {
    if (!parameters) {
        return [];
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
        min: schema.type === "number" ? schema.min : undefined,
        max: schema.type === "number" ? schema.max : undefined,
        integer: schema.type === "number" && schema.integer === true,
    }));
}
function fromProviderOptionSchema(providerId, schema) {
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
function getElementValue(control) {
    if (control.getAttribute("data-zs-choice-control") === "1") {
        return String(control.getAttribute("data-zs-choice-value") || "").trim();
    }
    return String(control.value || "").trim();
}
function parseStringArray(value) {
    return Array.from(new Set(value
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean)));
}
export function resolveProviderSchemaEntries(args) {
    try {
        const provider = resolveProviderById(args.providerId);
        const schema = provider.getRuntimeOptionSchema?.() || {};
        const entries = fromProviderOptionSchema(args.providerId, schema);
        const values = args.providerId === "acp" &&
            String(args.backend?.type || "").trim() === "acp"
            ? projectAcpProviderModelOptionsForUi({
                modelOptions: args.backend?.acp?.runtimeOptionsCache?.displayModels || [],
                options: args.currentValues || {},
                currentDisplayModelId: args.backend?.acp?.runtimeOptionsCache?.currentDisplayModelId,
            })
            : args.currentValues || {};
        const engine = String(values.engine || "").trim();
        const scope = args.backend &&
            typeof args.backend.id === "string" &&
            typeof args.backend.baseUrl === "string"
            ? {
                backendId: args.backend.id,
                baseUrl: args.backend.baseUrl,
            }
            : undefined;
        const isSkillRunnerScopedProviderField = args.providerId === "skillrunner" &&
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
                    defaultValue: typeof values[entry.key] !== "undefined"
                        ? values[entry.key]
                        : entry.defaultValue,
                    disabled: (entry.key === "effort" || entry.key === "acpReasoningEffort") &&
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
            if (entry.key === "acpModelProvider" &&
                (!entry.enumValues || entry.enumValues.length === 0)) {
                return false;
            }
            if (entry.key === "provider_id" && !isSkillRunnerScopedProviderField) {
                return false;
            }
            return true;
        });
    }
    catch {
        return [];
    }
}
export function buildWorkflowSettingsDialogRenderModel(args) {
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
                    maxConcurrency: args.initialState.runOnceHostOptions?.queue?.maxConcurrency ??
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
export function buildWorkflowHostOptionsDraft(rawMaxConcurrency) {
    const normalized = normalizeHostQueueMaxConcurrency(rawMaxConcurrency);
    if (normalized.status === "invalid") {
        return normalized;
    }
    return {
        status: "valid",
        hostOptions: typeof normalized.maxConcurrency === "number"
            ? {
                queue: {
                    maxConcurrency: normalized.maxConcurrency,
                },
            }
            : {},
    };
}
export function collectSchemaValues(container) {
    const result = {};
    const controls = Array.from(container.querySelectorAll("[data-zs-option-key][data-zs-option-type]"));
    for (const control of controls) {
        const key = String(control.getAttribute("data-zs-option-key") || "").trim();
        const type = String(control.getAttribute("data-zs-option-type") || "").trim();
        if (!key) {
            continue;
        }
        if (type === "boolean") {
            const maybeInput = control;
            if (String(maybeInput.type || "").toLowerCase() === "checkbox") {
                result[key] = !!maybeInput.checked;
            }
            continue;
        }
        const raw = getElementValue(control);
        if (!raw) {
            if (type === "number") {
                result[key] = null;
            }
            else if (type === "string") {
                result[key] = "";
            }
            else if (type === "array") {
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
export function buildWorkflowSettingsDialogDraft(args) {
    const hasPersistedHostValue = Object.prototype.hasOwnProperty.call(args, "persistedHostMaxConcurrency");
    const hasOnceHostValue = Object.prototype.hasOwnProperty.call(args, "onceHostMaxConcurrency");
    const persistedHost = buildWorkflowHostOptionsDraft(args.persistedHostMaxConcurrency);
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
