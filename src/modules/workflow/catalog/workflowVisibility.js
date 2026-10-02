import { isDebugModeEnabled } from "../../debugMode";
import { getLoadedWorkflowEntries } from "./workflowRuntime";
function toManifest(input) {
    if ("manifest" in input) {
        return input.manifest;
    }
    return input;
}
export function isWorkflowDebugOnly(input) {
    return toManifest(input).debug_only === true;
}
export function isWorkflowVisible(input) {
    if (!isWorkflowDebugOnly(input)) {
        return true;
    }
    return isDebugModeEnabled();
}
export function getVisibleLoadedWorkflowEntries() {
    return getLoadedWorkflowEntries().filter((entry) => isWorkflowVisible(entry));
}
