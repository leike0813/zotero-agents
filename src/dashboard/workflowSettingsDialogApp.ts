// Workflow settings dialog entry: bootstrap, host message listener and the
// snapshot -> projection -> render controller.
//
// Wire protocol (frozen, mirrored from
// addon/content/dashboard/workflow-settings-dialog.js):
//   page -> host: { type: "workflow-settings-dialog:action", action, payload }
//     posted to window.parent / window.top / window.opener with targetOrigin
//     "*"; the page announces itself with the "ready" action after load.
//   host -> page: { type: "workflow-settings-dialog:init" |
//     "workflow-settings-dialog:snapshot", payload: snapshot }.

import { h, render } from "preact";

import type {
  WorkflowSettingsDialogActionEnvelopeFor,
  WorkflowSettingsDialogActionHandler,
  WorkflowSettingsDialogActionName,
  WorkflowSettingsDialogActionPayload,
} from "../shared/dashboardWireContract";
import {
  WorkflowSettingsDialogRegion,
  projectWorkflowSettingsDialogSelection,
} from "./components/WorkflowSettingsDialogRegion";

export const sendWorkflowSettingsDialogAction: WorkflowSettingsDialogActionHandler =
  function sendWorkflowSettingsDialogAction<
    Action extends WorkflowSettingsDialogActionName,
  >(
    action: Action,
    payload?: WorkflowSettingsDialogActionPayload<Action>,
  ): void {
    const message: WorkflowSettingsDialogActionEnvelopeFor<Action> = {
      type: "workflow-settings-dialog:action",
      action,
      payload,
    };
    const rawTargets = [window.parent, window.top, window.opener];
    const dedup = new Set<unknown>();
    for (const target of rawTargets) {
      if (!target || dedup.has(target)) continue;
      dedup.add(target);
      try {
        (target as Window).postMessage(message, "*");
      } catch {
        // ignore cross-window messaging failures
      }
    }
  };

export function bootstrapWorkflowSettingsDialogApp(
  root: HTMLElement,
): () => void {
  // Incremented per host message so equal-content snapshots still reset the
  // refresh-button busy state (the legacy handler cleared both flags on every
  // init/snapshot message).
  let snapshotRevision = 0;
  let disposed = false;
  const onMessage = (event: MessageEvent) => {
    if (disposed) return;
    const data = event.data as { type?: unknown; payload?: unknown } | null;
    if (!data || typeof data !== "object") {
      return;
    }
    if (
      data.type !== "workflow-settings-dialog:init" &&
      data.type !== "workflow-settings-dialog:snapshot"
    ) {
      return;
    }
    snapshotRevision += 1;
    const selection = projectWorkflowSettingsDialogSelection(
      data.payload,
      snapshotRevision,
    );
    if (selection) {
      document.title = selection.title;
    }
    render(
      selection
        ? h(WorkflowSettingsDialogRegion, {
            selection,
            onAction: sendWorkflowSettingsDialogAction,
          })
        : null,
      root,
    );
  };
  const onPageHide = () => {
    dispose();
  };
  window.addEventListener("message", onMessage);
  window.addEventListener("pagehide", onPageHide, { once: true });

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    window.removeEventListener("message", onMessage);
    window.removeEventListener("pagehide", onPageHide);
    render(null, root);
  }

  sendWorkflowSettingsDialogAction("ready");
  return dispose;
}

// Entry semantics: loading this module bootstraps the dialog page when the
// host document carries the dialog root. Tests import the factories directly
// and must not auto-bootstrap.
if (typeof document !== "undefined") {
  const root = document.querySelector<HTMLElement>(
    '#app[data-role="workflow-settings-dialog"]',
  );
  if (root) {
    bootstrapWorkflowSettingsDialogApp(root);
  }
}
