import { appendRuntimeLog, } from "../../runtimeLogManager";
import { showWorkflowToast } from "../../workflowExecution/feedbackSeam";
import { resolveRuntimeAddon } from "../../../utils/runtimeBridge";
const GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY = "__zsWorkflowRuntimeBridge";
const ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY = "workflowRuntimeBridge";
const workflowRuntimeBridge = {
    appendRuntimeLog,
    showToast: ({ text, type }) => {
        showWorkflowToast({
            text: String(text || "").trim(),
            type: type || "default",
            source: "workflow-runtime-bridge",
            owner: "runtime",
            scope: "workflow-runtime-bridge",
        });
    },
};
function writeGlobalBridge(bridge) {
    globalThis[GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY] = bridge;
}
function writeAddonBridge(bridge) {
    const runtimeAddon = resolveRuntimeAddon();
    if (!runtimeAddon?.data) {
        return false;
    }
    runtimeAddon.data[ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY] = bridge;
    return true;
}
export function installWorkflowRuntimeBridge() {
    writeAddonBridge(workflowRuntimeBridge);
    writeGlobalBridge(workflowRuntimeBridge);
}
export function ensureWorkflowRuntimeBridgeInstalled() {
    installWorkflowRuntimeBridge();
    return workflowRuntimeBridge;
}
export function clearWorkflowRuntimeBridgeForTests() {
    delete globalThis[GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY];
    const runtimeAddon = resolveRuntimeAddon();
    if (runtimeAddon?.data) {
        delete runtimeAddon.data[ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY];
    }
}
