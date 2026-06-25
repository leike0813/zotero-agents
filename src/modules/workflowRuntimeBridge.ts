import { appendRuntimeLog, type RuntimeLogInput } from "./runtimeLogManager";
import { showWorkflowToast } from "./workflowExecution/feedbackSeam";
import { resolveRuntimeAddon } from "../utils/runtimeBridge";

const GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY = "__zsWorkflowRuntimeBridge";
const ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY = "workflowRuntimeBridge";

type WorkflowRuntimeBridge = {
  appendRuntimeLog: (
    input: RuntimeLogInput,
  ) => ReturnType<typeof appendRuntimeLog>;
  showToast: (args: {
    text: string;
    type?: "default" | "success" | "error";
  }) => void;
};

const workflowRuntimeBridge: WorkflowRuntimeBridge = {
  appendRuntimeLog,
  showToast: ({ text, type }) => {
    showWorkflowToast({
      text: String(text || "").trim(),
      type: type || "default",
    });
  },
};

function writeGlobalBridge(bridge: WorkflowRuntimeBridge) {
  (
    globalThis as typeof globalThis & {
      [GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY]?: WorkflowRuntimeBridge;
    }
  )[GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY] = bridge;
}

function writeAddonBridge(bridge: WorkflowRuntimeBridge) {
  const runtimeAddon = resolveRuntimeAddon();
  if (!runtimeAddon?.data) {
    return false;
  }
  (
    runtimeAddon.data as typeof runtimeAddon.data & {
      [ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY]?: WorkflowRuntimeBridge;
    }
  )[ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY] = bridge;
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
  delete (
    globalThis as typeof globalThis & {
      [GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY]?: WorkflowRuntimeBridge;
    }
  )[GLOBAL_WORKFLOW_RUNTIME_BRIDGE_KEY];
  const runtimeAddon = resolveRuntimeAddon();
  if (runtimeAddon?.data) {
    delete (
      runtimeAddon.data as typeof runtimeAddon.data & {
        [ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY]?: WorkflowRuntimeBridge;
      }
    )[ADDON_WORKFLOW_RUNTIME_BRIDGE_KEY];
  }
}
