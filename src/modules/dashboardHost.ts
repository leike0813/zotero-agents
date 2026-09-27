import type { DialogHelper } from "zotero-plugin-toolkit";

import { getString } from "../utils/locale";
import { isWindowAlive } from "../utils/window";
import {
  createTaskDashboardRuntime,
  type DashboardManagementHost,
  type DashboardSelection,
  type MountedTaskDashboardRuntime,
} from "./dashboard/dashboardRuntime";

export type { DashboardManagementHost, MountedTaskDashboardRuntime };

type OpenTaskDashboardArgs = {
  initialTabKey?: string;
  initialWorkflowId?: string;
  initialBackendSubview?: "runs" | "management";
  embeddedRoot?: HTMLElement;
  hostWindow?: Window;
  chromeWindow?: _ZoteroTypes.MainWindow;
  managementHost?: DashboardManagementHost;
};

let taskDashboardDialog: DialogHelper | undefined;
let standaloneRuntime: MountedTaskDashboardRuntime | undefined;
let externalSelectTab: ((selection: DashboardSelection) => void) | undefined;

function localize(key: string, fallback: string) {
  try {
    return String(getString(key as any)).trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function openTaskDashboard(args?: OpenTaskDashboardArgs) {
  const isEmbedded = !!args?.embeddedRoot && !!args.hostWindow;
  if (isEmbedded) {
    return createTaskDashboardRuntime({
      root: args.embeddedRoot!,
      hostWindow: args.hostWindow!,
      chromeWindow: args.chromeWindow,
      initialTabKey: args.initialTabKey,
      initialWorkflowId: args.initialWorkflowId,
      initialBackendSubview: args.initialBackendSubview,
      managementHost: args.managementHost,
    });
  }
  if (isWindowAlive(taskDashboardDialog?.window)) {
    externalSelectTab?.({
      tabKey: args?.initialTabKey,
      workflowId: args?.initialWorkflowId,
      backendSubview: args?.initialBackendSubview,
    });
    taskDashboardDialog?.window?.focus();
    return;
  }

  const dialogData: Record<string, unknown> = {
    loadCallback: () => {
      const dialogWindow = taskDashboardDialog?.window;
      const root = dialogWindow?.document.getElementById(
        "zs-task-dashboard-root",
      ) as HTMLElement | null;
      if (!dialogWindow || !root) return;
      try {
        dialogWindow.resizeTo(1480, 920);
      } catch {
        // ignore
      }
      standaloneRuntime = createTaskDashboardRuntime({
        root,
        hostWindow: dialogWindow,
        chromeWindow: args?.chromeWindow,
        initialTabKey: args?.initialTabKey,
        initialWorkflowId: args?.initialWorkflowId,
        initialBackendSubview: args?.initialBackendSubview,
        managementHost: args?.managementHost,
        onSelectTabReady: (selectTab) => {
          externalSelectTab = selectTab;
        },
      });
    },
    unloadCallback: () => {
      standaloneRuntime?.cleanup();
      standaloneRuntime = undefined;
      externalSelectTab = undefined;
    },
  };

  taskDashboardDialog = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-task-dashboard-root",
      styles: {
        width: "100%",
        height: "100%",
        minWidth: "1100px",
        minHeight: "700px",
        padding: "0",
        margin: "0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    })
    .addButton(localize("task-dashboard-close", "Close"), "close")
    .setDialogData(dialogData)
    .open(localize("task-dashboard-title", "Task Dashboard"));

  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;
  taskDashboardDialog = undefined;
}

export async function mountTaskDashboardRuntime(args: {
  root: HTMLElement;
  hostWindow: Window;
  chromeWindow?: _ZoteroTypes.MainWindow;
  initialTabKey?: string;
  initialWorkflowId?: string;
  initialBackendSubview?: "runs" | "management";
  managementHost?: DashboardManagementHost;
}) {
  return createTaskDashboardRuntime(args);
}

export async function resetTaskDashboardHostForTests() {
  externalSelectTab = undefined;
  standaloneRuntime?.cleanup();
  standaloneRuntime = undefined;
  if (isWindowAlive(taskDashboardDialog?.window)) {
    taskDashboardDialog?.window?.close();
    await Promise.resolve();
  }
  taskDashboardDialog = undefined;
}
