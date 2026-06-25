import { config } from "../../package.json";
import { getStringOrFallback } from "../utils/locale";
import { rebuildWorkflowActionPopup } from "./workflowMenu";
import {
  installWorkspaceToolbarTaskPopover,
  uninstallWorkspaceToolbarTaskPopover,
} from "./workspaceToolbarTaskPopover";

const DASHBOARD_BUTTON_ID = `${config.addonRef}-tb-dashboard`;
const SKILLRUNNER_BUTTON_ID = `${config.addonRef}-tb-skillrunner`;
const LEGACY_SKILLRUNNER_ATTENTION_BUTTON_ID = `${config.addonRef}-tb-skillrunner-attention`;
const EXECUTE_WORKFLOW_BUTTON_ID = `${config.addonRef}-tb-execute-workflow`;
const EXECUTE_WORKFLOW_POPUP_ID = `${config.addonRef}-tb-execute-workflow-popup`;
const NOTE_ADD_BUTTON_ID = "zotero-tb-note-add";
const PRIMARY_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_workbench_32.png`;
const FALLBACK_ICON_URI = `chrome://${config.addonRef}/content/icons/favicon.png`;
const EXECUTE_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_play_32.png`;
export const SKILLRUNNER_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_sidebar_32.png`;
const SKILLRUNNER_ATTENTION_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_sidebar_glow_32.png`;

const localize = getStringOrFallback;

function resolveToolbarHost(win: _ZoteroTypes.MainWindow) {
  const doc = win.document;
  return (
    doc.getElementById("zotero-items-toolbar") ||
    doc.getElementById("zotero-toolbar-item-tree") ||
    doc.getElementById("zotero-tabs-toolbar")
  );
}

function asElementLike(
  value: unknown,
): (Element & { parentNode: Node | null }) | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as { parentNode?: unknown };
  if (!("parentNode" in candidate)) {
    return null;
  }
  return value as Element & { parentNode: Node | null };
}

function resolveDirectChildForHost(
  host: Element,
  candidate: Element | null,
): Element | null {
  if (!candidate) {
    return null;
  }
  if (candidate.parentNode === host) {
    return candidate;
  }
  let current: Element | null = candidate;
  while (current && current.parentNode && current.parentNode !== host) {
    current = asElementLike(current.parentNode);
  }
  if (current && current.parentNode === host) {
    return current;
  }
  return null;
}

function resolveNextSiblingInHost(host: Element, reference: Element) {
  const children = Array.from(
    ((host as unknown as { children?: ArrayLike<Element> }).children ||
      []) as ArrayLike<Element>,
  );
  const idx = children.indexOf(reference);
  if (idx >= 0 && idx < children.length - 1) {
    return children[idx + 1];
  }
  return null;
}

function resolveInsertAnchor(host: Element, doc: Document) {
  const directAnchorIds = [
    "zotero-tb-search",
    "zotero-tb-search-spinner",
    "zotero-tb-sync",
    "zotero-tb-sync-error",
  ];
  for (const id of directAnchorIds) {
    const anchor = doc.getElementById(id);
    if (anchor && anchor.parentNode === host) {
      return anchor;
    }
  }
  const nestedAnchor =
    doc.getElementById("zotero-tb-search") ||
    doc.getElementById("zotero-tb-search-spinner") ||
    doc.getElementById("zotero-tb-sync") ||
    doc.getElementById("zotero-tb-sync-error");
  if (!nestedAnchor) {
    return null;
  }
  let candidate: Element | null = nestedAnchor;
  while (candidate && candidate.parentNode && candidate.parentNode !== host) {
    candidate = asElementLike(candidate.parentNode);
  }
  if (candidate && candidate.parentNode === host) {
    return candidate;
  }
  return null;
}

function resolveInsertAfterSearchAnchor(host: Element, doc: Document) {
  const searchAnchor = resolveInsertAnchor(host, doc);
  if (!searchAnchor) {
    return null;
  }
  return resolveNextSiblingInHost(host, searchAnchor);
}

export function applyToolbarButtonStyling(
  button: Element & { style?: CSSStyleDeclaration },
  iconUri: string,
  sizePx = 24,
) {
  button.style?.setProperty("list-style-image", `url("${iconUri}")`);
  button.style?.setProperty("width", `${sizePx}px`);
  button.style?.setProperty("height", `${sizePx}px`);
  button.style?.setProperty("min-width", `${sizePx}px`);
  button.style?.setProperty("min-height", `${sizePx}px`);
  button.style?.setProperty("padding-inline", "0");
  button.style?.setProperty("padding-block", "0");
  button.style?.setProperty("margin-inline", "2px");
  button.style?.setProperty("--toolbarbutton-inner-padding", "0");
}

export function syncToolbarButtonIconFill(
  button: Element & {
    style?: CSSStyleDeclaration;
    querySelector?: (selector: string) => Element | null;
    getBoundingClientRect?: () => { width: number; height: number };
  },
  win: _ZoteroTypes.MainWindow,
  options: { minIconPx?: number; insetPx?: number } = {},
) {
  const apply = () => {
    const rect = button.getBoundingClientRect?.();
    const side =
      rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)
        ? Math.max(16, Math.floor(Math.min(rect.width, rect.height)))
        : 24;
    const minIconPx = Number.isFinite(options.minIconPx)
      ? Math.max(0, Math.floor(options.minIconPx as number))
      : 14;
    const insetPx = Number.isFinite(options.insetPx)
      ? Math.max(0, Math.floor(options.insetPx as number))
      : 2;
    const iconSize = `${Math.max(minIconPx, side - insetPx)}px`;
    button.style?.setProperty("--toolbarbutton-icon-fill-size", iconSize);
    const icon = button.querySelector?.(".toolbarbutton-icon") as
      | (Element & { style?: CSSStyleDeclaration })
      | null;
    icon?.style?.setProperty("width", iconSize);
    icon?.style?.setProperty("height", iconSize);
  };
  apply();
  if (typeof (win as { setTimeout?: unknown }).setTimeout === "function") {
    (
      win as { setTimeout: (handler: () => void, timeout?: number) => number }
    ).setTimeout(apply, 0);
  }
}

function insertWithAnchor(
  host: Element,
  button: Element & { style?: CSSStyleDeclaration },
  anchor: Element | null,
) {
  if (anchor) {
    host.insertBefore(button, anchor);
  } else {
    host.appendChild(button);
  }
}

function removeLegacySkillRunnerAttentionButton(doc: Document) {
  doc.getElementById(LEGACY_SKILLRUNNER_ATTENTION_BUTTON_ID)?.remove();
}

function ensureExecuteWorkflowToolbarButton(
  win: _ZoteroTypes.MainWindow,
  host: Element,
) {
  const doc = win.document;
  const existing = doc.getElementById(EXECUTE_WORKFLOW_BUTTON_ID);
  if (existing) {
    return;
  }

  const button = doc.createXULElement("toolbarbutton");
  const tooltip = localize(
    "task-dashboard-toolbar-execute-workflow",
    "Execute Workflow",
  );
  button.id = EXECUTE_WORKFLOW_BUTTON_ID;
  button.setAttribute("class", "zotero-tb-button");
  button.setAttribute("tooltiptext", tooltip);
  button.setAttribute("aria-label", tooltip);
  button.setAttribute("type", "menu");
  button.setAttribute("wantdropmarker", "false");
  button.setAttribute("image", EXECUTE_ICON_URI);
  applyToolbarButtonStyling(
    button as Element & { style?: CSSStyleDeclaration },
    EXECUTE_ICON_URI,
  );

  const popup = doc.createXULElement("menupopup") as XULElement;
  popup.id = EXECUTE_WORKFLOW_POPUP_ID;
  popup.addEventListener("popupshowing", (event: Event) => {
    if (event.target !== popup) {
      return;
    }
    void rebuildWorkflowActionPopup(win, popup, {
      includeSkillRunnerSidebarItem: false,
      includeTaskManagerItem: false,
      includeSynthesisWorkbenchItem: false,
    });
  });
  button.appendChild(popup);

  const noteAnchor = resolveDirectChildForHost(
    host,
    doc.getElementById(NOTE_ADD_BUTTON_ID),
  );
  if (noteAnchor) {
    const nextSibling = resolveNextSiblingInHost(host, noteAnchor);
    insertWithAnchor(
      host,
      button as Element & { style?: CSSStyleDeclaration },
      nextSibling,
    );
  } else {
    const fallbackAnchor = resolveInsertAnchor(host, doc);
    insertWithAnchor(
      host,
      button as Element & { style?: CSSStyleDeclaration },
      fallbackAnchor,
    );
  }

  syncToolbarButtonIconFill(
    button as Element & {
      style?: CSSStyleDeclaration;
      querySelector?: (selector: string) => Element | null;
      getBoundingClientRect?: () => { width: number; height: number };
    },
    win,
  );
}

function ensureDashboardOnlyToolbarButton(
  win: _ZoteroTypes.MainWindow,
  host: Element,
) {
  const doc = win.document;
  const existing = doc.getElementById(DASHBOARD_BUTTON_ID);
  if (existing) {
    return;
  }

  const button = doc.createXULElement("toolbarbutton");
  const tooltip = localize(
    "task-dashboard-toolbar-open",
    "Open Zotero Agents Workspace",
  );
  button.id = DASHBOARD_BUTTON_ID;
  button.setAttribute("class", "zotero-tb-button zs-workspace-toolbar-button");
  button.setAttribute("tooltiptext", tooltip);
  button.setAttribute("aria-label", tooltip);
  button.setAttribute("image", PRIMARY_ICON_URI);
  applyToolbarButtonStyling(
    button as Element & { style?: CSSStyleDeclaration },
    PRIMARY_ICON_URI,
  );
  button.addEventListener("error", () => {
    button.setAttribute("image", FALLBACK_ICON_URI);
    applyToolbarButtonStyling(
      button as Element & { style?: CSSStyleDeclaration },
      FALLBACK_ICON_URI,
    );
  });
  button.addEventListener("command", () => {
    void addon.hooks.onPrefsEvent("openDashboard", { window: win });
  });
  const anchor = resolveInsertAnchor(host, doc);
  insertWithAnchor(
    host,
    button as Element & { style?: CSSStyleDeclaration },
    anchor,
  );
  syncToolbarButtonIconFill(
    button as Element & {
      style?: CSSStyleDeclaration;
      querySelector?: (selector: string) => Element | null;
      getBoundingClientRect?: () => { width: number; height: number };
    },
    win,
  );
}

function ensureSkillRunnerToolbarButton(
  win: _ZoteroTypes.MainWindow,
  host: Element,
) {
  const doc = win.document;
  const existing = doc.getElementById(SKILLRUNNER_BUTTON_ID);
  if (existing) {
    installWorkspaceToolbarTaskPopover({
      window: win,
      anchor: existing,
    });
    return;
  }

  const button = doc.createXULElement("toolbarbutton");
  const tooltip = localize(
    "task-dashboard-toolbar-open-skillrunner",
    "Open/Close Assistant Sidebar",
  );
  button.id = SKILLRUNNER_BUTTON_ID;
  button.setAttribute(
    "class",
    "zotero-tb-button zs-skillrunner-toolbar-button",
  );
  button.setAttribute("tooltiptext", tooltip);
  button.setAttribute("aria-label", tooltip);
  button.setAttribute("image", SKILLRUNNER_ICON_URI);
  button.setAttribute("data-attention", "false");
  button.setAttribute("data-attention-count", "0");
  applyToolbarButtonStyling(
    button as Element & { style?: CSSStyleDeclaration },
    SKILLRUNNER_ICON_URI,
  );
  button.addEventListener("error", () => {
    button.setAttribute("image", FALLBACK_ICON_URI);
    applyToolbarButtonStyling(
      button as Element & { style?: CSSStyleDeclaration },
      FALLBACK_ICON_URI,
    );
  });
  button.addEventListener("command", () => {
    void addon.hooks.onPrefsEvent("toggleSkillRunnerSidebar", { window: win });
  });
  const anchor = resolveInsertAfterSearchAnchor(host, doc);
  insertWithAnchor(
    host,
    button as Element & { style?: CSSStyleDeclaration },
    anchor,
  );
  syncToolbarButtonIconFill(
    button as Element & {
      style?: CSSStyleDeclaration;
      querySelector?: (selector: string) => Element | null;
      getBoundingClientRect?: () => { width: number; height: number };
    },
    win,
  );
  installWorkspaceToolbarTaskPopover({
    window: win,
    anchor: button,
  });
}

export function updateAssistantToolbarAttention(
  win: Window | _ZoteroTypes.MainWindow,
  waitingCount: number,
) {
  const doc = (win as _ZoteroTypes.MainWindow)?.document;
  if (!doc) {
    return;
  }
  const button = doc.getElementById(SKILLRUNNER_BUTTON_ID);
  if (!button) {
    return;
  }
  const count = Math.max(0, Math.floor(Number(waitingCount) || 0));
  const hasAttention = count > 0;
  button.setAttribute("data-attention", hasAttention ? "true" : "false");
  button.setAttribute("data-attention-count", String(count));
  const iconUri = hasAttention
    ? SKILLRUNNER_ATTENTION_ICON_URI
    : SKILLRUNNER_ICON_URI;
  button.setAttribute("image", iconUri);
  applyToolbarButtonStyling(
    button as Element & { style?: CSSStyleDeclaration },
    iconUri,
  );
}

export function ensureDashboardToolbarButton(win: _ZoteroTypes.MainWindow) {
  const host = resolveToolbarHost(win);
  if (!host) {
    return;
  }
  removeLegacySkillRunnerAttentionButton(win.document);
  ensureExecuteWorkflowToolbarButton(win, host);
  ensureDashboardOnlyToolbarButton(win, host);
  ensureSkillRunnerToolbarButton(win, host);
}

export function removeDashboardToolbarButton(
  win: Window | _ZoteroTypes.MainWindow,
) {
  const doc = (win as _ZoteroTypes.MainWindow)?.document;
  if (!doc) {
    return;
  }
  const execute = doc.getElementById(EXECUTE_WORKFLOW_BUTTON_ID);
  execute?.remove();
  const skillRunner = doc.getElementById(SKILLRUNNER_BUTTON_ID);
  if (skillRunner) {
    uninstallWorkspaceToolbarTaskPopover({ anchor: skillRunner });
  }
  skillRunner?.remove();
  removeLegacySkillRunnerAttentionButton(doc);
  const existing = doc.getElementById(DASHBOARD_BUTTON_ID);
  existing?.remove();
}
