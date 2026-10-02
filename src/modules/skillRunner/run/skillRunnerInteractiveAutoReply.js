export const SKILLRUNNER_INTERACTIVE_AUTO_REPLY_ENABLED = true;
let featureOverrideForTests;
export function isSkillRunnerInteractiveAutoReplyEnabled() {
    return featureOverrideForTests ?? SKILLRUNNER_INTERACTIVE_AUTO_REPLY_ENABLED;
}
export function setSkillRunnerInteractiveAutoReplyEnabledForTests(enabled) {
    featureOverrideForTests = enabled;
}
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function normalizeString(value) {
    return String(value || "").trim();
}
function normalizeBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }
    const text = normalizeString(value).toLowerCase();
    if (text === "true" || text === "1" || text === "yes" || text === "on") {
        return true;
    }
    if (text === "false" || text === "0" || text === "no" || text === "off") {
        return false;
    }
    return undefined;
}
function normalizeNonNegativeInteger(value) {
    const parsed = Number(String(value ?? "").trim());
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        return undefined;
    }
    return parsed;
}
function normalizeExecutionMode(value) {
    return normalizeString(value).toLowerCase() === "interactive"
        ? "interactive"
        : "auto";
}
export function buildSkillRunnerRunRecordRequestPayload(args) {
    if (!isRecord(args.request)) {
        return args.request;
    }
    const payload = { ...args.request };
    const providerOptions = isRecord(args.providerOptions)
        ? args.providerOptions
        : {};
    const runtimeOptions = isRecord(payload.runtime_options)
        ? { ...payload.runtime_options }
        : {};
    const executionMode = normalizeExecutionMode(runtimeOptions.execution_mode);
    runtimeOptions.execution_mode = executionMode;
    if (isSkillRunnerInteractiveAutoReplyEnabled() &&
        executionMode === "interactive" &&
        normalizeBoolean(providerOptions.interactive_auto_reply) === true) {
        runtimeOptions.interactive_auto_reply = true;
        const timeoutSeconds = normalizeNonNegativeInteger(providerOptions.interactive_reply_timeout_sec);
        if (typeof timeoutSeconds === "number") {
            runtimeOptions.interactive_reply_timeout_sec = timeoutSeconds;
        }
        else {
            delete runtimeOptions.interactive_reply_timeout_sec;
        }
    }
    else {
        delete runtimeOptions.interactive_auto_reply;
        delete runtimeOptions.interactive_reply_timeout_sec;
    }
    delete payload.providerOptions;
    payload.runtime_options = runtimeOptions;
    return payload;
}
export function isSkillRunnerInteractiveAutoReplyRequested(value) {
    if (!isRecord(value)) {
        return false;
    }
    const runtimeOptions = isRecord(value.runtime_options)
        ? value.runtime_options
        : {};
    return (normalizeBoolean(runtimeOptions.interactive_auto_reply) === true ||
        normalizeBoolean(value.interactive_auto_reply) === true);
}
export function shouldEnableSkillRunnerAutoReplyForRun(args) {
    if (!isSkillRunnerInteractiveAutoReplyEnabled()) {
        return false;
    }
    const mode = normalizeString(args.executionMode).toLowerCase() ||
        (isRecord(args.requestPayload) &&
            isRecord(args.requestPayload.runtime_options)
            ? normalizeString(args.requestPayload.runtime_options.execution_mode).toLowerCase()
            : "");
    if (mode !== "interactive") {
        return false;
    }
    return (isSkillRunnerInteractiveAutoReplyRequested(args.providerOptions) ||
        isSkillRunnerInteractiveAutoReplyRequested(args.requestPayload));
}
