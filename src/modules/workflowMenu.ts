import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { buildSelectionContext } from "./selectionContext";
import { executeWorkflowFromCurrentSelection } from "./workflowExecute";
import { getLoadedWorkflowSourceById } from "./workflowRuntime";
import { resolveWorkflowExecutionOptionsPreview } from "./workflowSettings";
import { appendRuntimeLog } from "./runtimeLogManager";
import { alertWindow } from "./workflowExecution/feedbackSeam";
import { shouldShowWorkflowNotifications } from "./workflowExecution/feedbackPolicy";
import { getVisibleLoadedWorkflowEntries } from "./workflowVisibility";
import type { LoadedWorkflow } from "../workflows/types";
import { canWorkflowRunWithoutSelection } from "./workflowSelectionPolicy";
import {
  compareWorkflowDisplayOrder,
  isCoreWorkflow,
  localizeWorkflowLabel,
} from "../workflows/localization";
import { evaluateWorkflowSelection } from "../workflows/workflowSelectionValidation";

const ROOT_MENU_ID = `${config.addonRef}-workflows-menu`;
const ROOT_POPUP_ID = `${config.addonRef}-workflows-popup`;
const MENU_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_play_32.png`;

export type WorkflowActionPopupBuildOptions = {
  includeSkillRunnerSidebarItem?: boolean;
  includeTaskManagerItem?: boolean;
  includeSynthesisWorkbenchItem?: boolean;
  includeWorkspaceItem?: boolean;
};

function getMenuLabel(id: string, fallback: string) {
  const localized = getString(id as any);
  const fallbackKey = `${config.addonRef}-${id}`;
  return localized === fallbackKey ? fallback : localized;
}

function getItemMenuPopup(win: _ZoteroTypes.MainWindow) {
  return win.document.getElementById("zotero-itemmenu") as XULElement | null;
}

function clearPopupChildren(popup: XULElement) {
  while (popup.firstChild) {
    popup.removeChild(popup.firstChild);
  }
}

function appendDisabledItem(
  win: _ZoteroTypes.MainWindow,
  popup: XULElement,
  label: string,
) {
  const item = win.document.createXULElement("menuitem");
  item.setAttribute("label", label);
  item.setAttribute("disabled", "true");
  popup.appendChild(item);
}

function appendWorkspaceItem(
  win: _ZoteroTypes.MainWindow,
  popup: XULElement,
) {
  const item = win.document.createXULElement("menuitem");
  item.setAttribute(
    "label",
    getMenuLabel(
      "menu-workflows-open-workspace",
      "Open Dashboard / Synthesis Workspace",
    ),
  );
  item.addEventListener("command", () => {
    void addon.hooks.onPrefsEvent("openDashboard", { window: win });
  });
  popup.appendChild(item);
}

function appendAssistantSidebarItem(
  win: _ZoteroTypes.MainWindow,
  popup: XULElement,
) {
  const item = win.document.createXULElement("menuitem");
  item.setAttribute(
    "label",
    getMenuLabel(
      "menu-workflows-open-assistant-sidebar",
      "Open Sidebar",
    ),
  );
  item.addEventListener("command", () => {
    void addon.hooks.onPrefsEvent("openSkillRunnerSidebar", { window: win });
  });
  popup.appendChild(item);
}

function appendMenuSeparator(win: _ZoteroTypes.MainWindow, popup: XULElement) {
  const separator = win.document.createXULElement("menuseparator");
  popup.appendChild(separator);
}

function compactError(error: unknown) {
  const text = String(error || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "invalid selection";
  }
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

function isNoValidInputUnitsError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "NO_VALID_INPUT_UNITS"
  ) {
    return true;
  }
  return /has no valid input units after filtering/i.test(String(error || ""));
}

function resolveDisabledReason(error: unknown) {
  if (isNoValidInputUnitsError(error)) {
    return getMenuLabel("menu-workflow-no-valid-input", "no valid input");
  }
  return compactError(error);
}

function buildTriggerFailureMessage(workflowLabel: string, error: unknown) {
  const reason = compactError(error);
  try {
    const localized = String(
      getString("workflow-execute-cannot-run" as any, {
        args: {
          workflowLabel,
          reason,
        },
      }),
    ).trim();
    if (localized && !localized.includes("workflow-execute-cannot-run")) {
      return localized;
    }
  } catch {
    // ignore localization failures
  }
  return `Workflow ${workflowLabel} cannot run: ${reason}`;
}

export async function triggerWorkflowFromUnifiedEntry(args: {
  win: _ZoteroTypes.MainWindow;
  workflow: LoadedWorkflow;
  source?: string;
}) {
  try {
    await executeWorkflowFromCurrentSelection({
      win: args.win,
      workflow: args.workflow,
      requireSettingsGate: true,
    });
  } catch (error) {
    appendRuntimeLog({
      level: "error",
      scope: "workflow-trigger",
      workflowId: args.workflow.manifest.id,
      providerId: String(args.workflow.manifest.provider || "").trim(),
      stage: "menu-trigger-failed",
      message: "workflow menu trigger failed before execution completed",
      details: {
        workflowSource: getLoadedWorkflowSourceById(args.workflow.manifest.id),
        triggerSource: args.source || "workflow-menu",
        reason: compactError(error),
      },
      error,
    });
    if (shouldShowWorkflowNotifications(args.workflow.manifest)) {
      alertWindow(
        args.win,
        buildTriggerFailureMessage(localizeWorkflowLabel(args.workflow), error),
      );
    }
  }
}

export async function rebuildWorkflowActionPopup(
  win: _ZoteroTypes.MainWindow,
  popup: XULElement,
  options?: WorkflowActionPopupBuildOptions,
) {
  const includeWorkspaceItem =
    options?.includeWorkspaceItem ?? options?.includeTaskManagerItem !== false;
  const includeSkillRunnerSidebarItem =
    options?.includeSkillRunnerSidebarItem !== false;
  clearPopupChildren(popup);
  const workflows = [...getVisibleLoadedWorkflowEntries()].sort(
    compareWorkflowDisplayOrder,
  );
  if (includeWorkspaceItem) {
    appendWorkspaceItem(win, popup);
  }
  if (includeSkillRunnerSidebarItem) {
    appendAssistantSidebarItem(win, popup);
  }
  if (includeWorkspaceItem || includeSkillRunnerSidebarItem) {
    appendMenuSeparator(win, popup);
  }
  if (workflows.length === 0) {
    appendDisabledItem(
      win,
      popup,
      getMenuLabel("menu-workflows-empty", "No workflows loaded"),
    );
    return;
  }

  const selectedItems = win.ZoteroPane?.getSelectedItems?.() || [];
  const selectionContext = await buildSelectionContext(selectedItems);
  const shouldPreflightWorkflowInputs = selectedItems.length <= 1;
  let previousWasCore = false;
  for (const workflow of workflows) {
    const currentIsCore = isCoreWorkflow(workflow);
    if (previousWasCore && !currentIsCore) {
      appendMenuSeparator(win, popup);
    }
    const menuItem = win.document.createXULElement("menuitem");
    let disabledReason = "";
    if (
      selectedItems.length === 0 &&
      !canWorkflowRunWithoutSelection(workflow.manifest)
    ) {
      disabledReason = getMenuLabel(
        "menu-workflow-no-selection",
        "no selection",
      );
    } else if (shouldPreflightWorkflowInputs) {
      try {
        const executionOptionsPreview = resolveWorkflowExecutionOptionsPreview({
          workflow,
        });
        const selectionValidation = await evaluateWorkflowSelection({
          workflow,
          selectionContext,
          mode: "menu",
          executionOptions: {
            workflowParams: executionOptionsPreview.workflowParams,
            providerOptions: executionOptionsPreview.providerOptions,
          },
        });
        if (selectionValidation.state === "disabled") {
          const error = new Error(
            `Workflow ${workflow.manifest.id} has no valid input units after filtering`,
          );
          (error as { code?: string }).code = "NO_VALID_INPUT_UNITS";
          throw error;
        }
      } catch (error) {
        disabledReason = resolveDisabledReason(error);
      }
    }

    const workflowLabel = localizeWorkflowLabel(workflow);
    const label = disabledReason
      ? `${workflowLabel} (${disabledReason})`
      : workflowLabel;
    menuItem.setAttribute("label", label);
    if (currentIsCore) {
      menuItem.setAttribute("style", "font-weight: 700;");
    }
    if (disabledReason) {
      menuItem.setAttribute("disabled", "true");
    } else {
      menuItem.addEventListener("command", () => {
        void triggerWorkflowFromUnifiedEntry({
          win,
          workflow,
          source: "workflow-menu",
        });
      });
    }
    popup.appendChild(menuItem);
    previousWasCore = currentIsCore;
  }
}

export function ensureWorkflowMenuForWindow(win: _ZoteroTypes.MainWindow) {
  const itemPopup = getItemMenuPopup(win);
  if (!itemPopup) {
    return;
  }

  const existing = win.document.getElementById(ROOT_MENU_ID);
  if (existing) {
    existing.remove();
  }

  const menu = win.document.createXULElement("menu");
  menu.id = ROOT_MENU_ID;
  menu.setAttribute(
    "label",
    getMenuLabel("menu-workflows-root", "Zotero Agents"),
  );
  menu.setAttribute("class", "menu-iconic");
  menu.setAttribute("image", MENU_ICON_URI);
  const popup = win.document.createXULElement("menupopup") as XULElement;
  popup.id = ROOT_POPUP_ID;
  popup.addEventListener("popupshowing", (event: Event) => {
    if (event.target !== popup) {
      return;
    }
    void rebuildWorkflowActionPopup(win, popup, {
      includeTaskManagerItem: true,
    });
  });
  menu.appendChild(popup);
  itemPopup.appendChild(menu);
}

export function refreshWorkflowMenus() {
  const wins = Zotero.getMainWindows?.() || [];
  for (const win of wins) {
    ensureWorkflowMenuForWindow(win);
  }
}
