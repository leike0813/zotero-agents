import { getLoadedWorkflowEntries } from "../catalog/workflowRuntime";
import { mergeExecutionOptions, parseExecutionOptionsPatch, } from "./workflowSettingsDomain";
function stripWorkflowHostOptions(value) {
    if (!value) {
        return {};
    }
    const { hostOptions: _hostOptions, ...workflowOwned } = value;
    return workflowOwned;
}
function stripWorkflowHostOptionsFromUnknown(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }
    const { hostOptions: _hostOptions, ...workflowOwned } = value;
    return workflowOwned;
}
function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function resolveLoadedWorkflowById(workflowId) {
    const normalizedWorkflowId = String(workflowId || "").trim();
    if (!normalizedWorkflowId) {
        return null;
    }
    return (getLoadedWorkflowEntries().find((entry) => entry.manifest.id === normalizedWorkflowId) || null);
}
function toWorkflowParams(value) {
    if (!isObject(value)) {
        return null;
    }
    return { ...value };
}
export function applyPersistedWorkflowSettingsNormalizer(args) {
    const workflow = resolveLoadedWorkflowById(args.workflowId);
    const hook = workflow?.hooks?.normalizeSettings;
    if (!workflow || typeof hook !== "function") {
        return args.merged;
    }
    const normalized = hook({
        phase: "persisted",
        workflowId: workflow.manifest.id,
        manifest: workflow.manifest,
        previous: stripWorkflowHostOptions(args.previous),
        incoming: stripWorkflowHostOptions(args.incoming),
        merged: stripWorkflowHostOptions(args.merged),
    });
    const workflowNormalized = mergeExecutionOptions(stripWorkflowHostOptions(args.merged), parseExecutionOptionsPatch(stripWorkflowHostOptionsFromUnknown(normalized)));
    return Object.prototype.hasOwnProperty.call(args.merged, "hostOptions")
        ? {
            ...workflowNormalized,
            hostOptions: args.merged.hostOptions,
        }
        : workflowNormalized;
}
export function applyExecutionWorkflowParamsNormalizer(args) {
    const hook = args.workflow.hooks.normalizeSettings;
    if (typeof hook !== "function") {
        return args.normalizedWorkflowParams;
    }
    const normalized = hook({
        phase: "execution",
        workflowId: args.workflow.manifest.id,
        manifest: args.workflow.manifest,
        rawWorkflowParams: args.rawWorkflowParams,
        normalizedWorkflowParams: args.normalizedWorkflowParams,
    });
    const patched = toWorkflowParams(normalized);
    if (!patched) {
        return args.normalizedWorkflowParams;
    }
    return {
        ...args.normalizedWorkflowParams,
        ...patched,
    };
}
