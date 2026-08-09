import {
  ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
} from "../../src/shared/assistantWireContract";
import { ASSISTANT_WORKSPACE_ACTION_REGISTRY } from "../../src/modules/assistantWorkspacePublication";
import { createAssistantWorkspaceAcpChildRuntime } from "../../src/sidebar/assistantWorkspaceAcpChild.js";
import {
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "./sidebarDomEnv";

type AssistantWorkspaceAcpChildRuntime = {
  applyPublication(publication: unknown): unknown;
};

function appendRole(document: Document, role: string) {
  const element = document.createElement("div");
  element.setAttribute("data-role", role);
  document.body.appendChild(element);
  return element;
}

export function createAssistantWorkspaceAcpChildHarness(
  source: "acp-chat" | "acp-skills",
) {
  // The child runtime renders chrome through Preact, which needs a real DOM
  // (createTextNode, childNodes, ...); drive it with the shared jsdom
  // environment instead of the legacy hand-rolled fake document.
  const environment = createSidebarDomEnvironment();
  const { document } = environment;
  const childWindow = environment.window as unknown as Record<string, unknown>;
  document.body.setAttribute("data-source", source);
  for (const role of [
    "root",
    "toolbar",
    "banner",
    "message-counts",
    "context-drawer",
    "empty",
    "main",
    "conversation",
    "transcript",
    "plan",
    "interaction",
    "composer",
    "details-drawer",
  ]) {
    appendRole(document, role);
  }
  const actions: Record<string, unknown>[] = [];
  childWindow[ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY] = {
    sendAction(envelope: Record<string, unknown>) {
      actions.push(structuredClone(envelope));
    },
  };
  installSidebarDomGlobals(environment);
  const runtime = createAssistantWorkspaceAcpChildRuntime(source);
  if (!runtime) {
    throw new Error(
      `ACP child runtime failed: ${document.body.getAttribute(
        "data-acp-child-failure",
      )}`,
    );
  }
  environment.window.dispatchEvent(
    new environment.window.MessageEvent("message", {
      data: {
        type: ASSISTANT_WORKSPACE_MESSAGE_TYPES.SURFACE_BOOTSTRAP,
        payload: {
          configuration: {
            executionDisplayMode: "live",
            transcriptPaginationVirtualizationEnabled: true,
            actionRegistry: ASSISTANT_WORKSPACE_ACTION_REGISTRY,
          },
          labels: {},
        },
      },
    }),
  );
  return {
    document,
    runtime: runtime as AssistantWorkspaceAcpChildRuntime,
    actions,
    replyInput() {
      return document.querySelector(".assistant-panel-reply-input");
    },
    replyButton() {
      return document.querySelector(".assistant-panel-reply-submit");
    },
    dispose: restoreSidebarDomGlobals,
  };
}
