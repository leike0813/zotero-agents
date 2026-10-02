function isObjectRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
export function normalizeSkillRunnerExecutionMode(value, fallback = "auto") {
    const normalized = String(value || "")
        .trim()
        .toLowerCase();
    if (normalized === "interactive") {
        return "interactive";
    }
    if (normalized === "auto") {
        return "auto";
    }
    return fallback;
}
export function resolveSkillRunnerExecutionModeFromRequest(request, fallback = "auto") {
    if (!isObjectRecord(request)) {
        return fallback;
    }
    const runtimeOptions = isObjectRecord(request.runtime_options)
        ? request.runtime_options
        : null;
    if (!runtimeOptions) {
        return fallback;
    }
    return normalizeSkillRunnerExecutionMode(runtimeOptions.execution_mode, fallback);
}
