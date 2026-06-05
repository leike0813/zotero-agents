import {
  ACP_BACKEND_TYPE,
  DEFAULT_BACKEND_ID,
  DEFAULT_BACKEND_TYPE,
  DEFAULT_SKILLRUNNER_ENDPOINT,
} from "../config/defaults";
import { refreshWorkflowMenus } from "./workflowMenu";
import { getPref, setPref } from "../utils/prefs";
import {
  createBackendsPrefsDocument,
  loadBackendsRegistry,
  syncBackendReferenceState,
} from "../backends/registry";
import { isWindowAlive } from "../utils/window";
import { getString } from "../utils/locale";
import {
  buildSkillRunnerManagementUiUrl,
  openSkillRunnerManagementDialog,
} from "./skillRunnerManagementDialog";
import type { BackendInstance } from "../backends/types";
import { refreshSkillRunnerModelCacheForBackend } from "../providers/skillrunner/modelCache";
import {
  generateBackendInternalId,
  isManagedLocalBackendId,
  normalizeBackendDisplayName,
} from "../backends/identity";
import { MANAGED_LOCAL_BACKEND_ID } from "./skillRunnerLocalRuntimeConstants";
import { stopSessionSync } from "./skillRunnerSessionSyncManager";
import { untrackSkillRunnerBackendHealth } from "./skillRunnerBackendHealthRegistry";
import { purgeSkillRunnerBackendReconcileState } from "./skillRunnerTaskReconciler";
import { pruneAcpSessionSlotsForBackends } from "./acpSessionManager";
import {
  computeAcpBackendConfigFingerprint,
  probeAcpBackendRuntimeOptions,
} from "./acpBackendProbe";
import {
  createAcpBackendFromPreset,
  findAcpBackendPreset,
  listAcpBackendPresets,
} from "./acpBackendPresets";

const BACKENDS_CONFIG_PREF_KEY = "backendsConfigJson";
const PROVIDER_SECTIONS = [
  {
    type: DEFAULT_BACKEND_TYPE,
    labelKey: "backend-manager-provider-skillrunner",
  },
  {
    type: "generic-http",
    labelKey: "backend-manager-provider-generic-http",
  },
  {
    type: ACP_BACKEND_TYPE,
    labelKey: "backend-manager-provider-acp",
  },
];

type BackendPersistenceDeps = {
  setPref: typeof setPref;
  refreshWorkflowMenus: typeof refreshWorkflowMenus;
  refreshModelCache: typeof refreshSkillRunnerModelCacheForBackend;
};

type EditableBackendRow = {
  internalId: string;
  displayName: string;
  type: string;
  baseUrl: string;
  authKind: "none" | "bearer";
  authToken: string;
  timeoutMs: string;
  command: string;
  argsText: string;
  envText: string;
  acp?: BackendInstance["acp"];
};

type BackendManagerDialogData = Record<string, unknown> & {
  _allowBackendManagerClose?: boolean;
  _initialBackendDraftSignature?: string;
  _lastButtonId?: string;
  _nativeBeforeUnloadListener?: (event: BeforeUnloadEvent) => void;
};

export type SkillRunnerManagementLaunchPayload = {
  backendId: string;
  baseUrl: string;
  uiUrl: string;
};

const HTML_NS = "http://www.w3.org/1999/xhtml";

function createHtmlElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
) {
  return doc.createElementNS(HTML_NS, tag) as HTMLElementTagNameMap[K];
}

function applySelectVisualStyle(control: HTMLElement, width?: string) {
  if (width) {
    control.style.width = width;
  }
  control.style.boxSizing = "border-box";
  control.style.position = "relative";
  control.style.display = "inline-block";
}

function getChoiceTrigger(control: Element) {
  return control.querySelector(
    "[data-zs-choice-trigger='1']",
  ) as HTMLButtonElement | null;
}

function getChoiceList(control: Element) {
  return control.querySelector(
    "[data-zs-choice-list='1']",
  ) as HTMLDivElement | null;
}

function closeChoiceList(control: Element) {
  const list = getChoiceList(control);
  if (list) {
    list.hidden = true;
    list.style.display = "none";
  }
}

function closeAllChoiceLists(doc: Document) {
  const lists = Array.from(
    doc.querySelectorAll("[data-zs-choice-list='1']"),
  ) as HTMLDivElement[];
  for (const list of lists) {
    list.hidden = true;
    list.style.display = "none";
  }
}

function closeAllAcpPresetMenus(doc: Document) {
  const menus = Array.from(
    doc.querySelectorAll("[data-zs-acp-preset-menu='1']"),
  ) as HTMLDivElement[];
  for (const menu of menus) {
    menu.hidden = true;
    menu.style.display = "none";
  }
}

function dispatchChoiceChange(control: Element) {
  const doc = control.ownerDocument;
  if (!doc) {
    return;
  }
  const ev = doc.createEvent("Event");
  ev.initEvent("change", true, true);
  control.dispatchEvent(ev);
}

function setChoiceSelection(args: {
  control: Element;
  value: string;
  label: string;
  dispatchChange?: boolean;
}) {
  const { control, value, label, dispatchChange } = args;
  control.setAttribute("data-zs-choice-value", value);
  (control as { value?: string }).value = value;
  const triggerLabel = control.querySelector(
    "[data-zs-choice-trigger-label='1']",
  ) as HTMLSpanElement | null;
  if (triggerLabel) {
    triggerLabel.textContent = label || getString("choice-empty" as any);
  }
  if (dispatchChange) {
    dispatchChoiceChange(control);
  }
}

function getElementValue(control: Element) {
  if (control.getAttribute("data-zs-choice-control") === "1") {
    return String(control.getAttribute("data-zs-choice-value") || "").trim();
  }
  return String(
    (control as HTMLInputElement | HTMLSelectElement).value || "",
  ).trim();
}

function setChoiceControlOptions(args: {
  control: Element;
  options: Array<{ value: string; text: string }>;
  selectedValue: string;
}) {
  const { control, options, selectedValue } = args;
  const list = getChoiceList(control);
  if (!list) {
    return;
  }
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
  for (const option of options) {
    const node = createHtmlElement(control.ownerDocument!, "button");
    node.type = "button";
    node.textContent = option.text;
    node.style.width = "100%";
    node.style.textAlign = "left";
    node.style.padding = "4px 6px";
    node.style.border = "none";
    node.style.background = "transparent";
    node.style.cursor = "pointer";
    node.style.color = "#111";
    node.addEventListener("mouseenter", () => {
      node.style.backgroundColor = "#f1f3f5";
    });
    node.addEventListener("mouseleave", () => {
      node.style.backgroundColor = "transparent";
    });
    const pick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setChoiceSelection({
        control,
        value: option.value,
        label: option.text,
        dispatchChange: true,
      });
      closeAllChoiceLists(control.ownerDocument!);
    };
    node.addEventListener("mousedown", pick);
    node.addEventListener("click", pick);
    node.addEventListener("command", pick as EventListener);
    list.appendChild(node);
  }
  const finalValue =
    options.find((entry) => entry.value === selectedValue)?.value ||
    (options[0]?.value ?? "");
  const finalLabel =
    options.find((entry) => entry.value === finalValue)?.text ||
    (options[0]?.text ?? "(empty)");
  setChoiceSelection({
    control,
    value: finalValue,
    label: finalLabel,
  });
}

function createChoiceControl(args: {
  doc: Document;
  options: Array<{ value: string; text: string }>;
  selectedValue: string;
}) {
  const { doc, options, selectedValue } = args;
  const select = createHtmlElement(doc, "div");
  select.setAttribute("data-zs-choice-control", "1");
  applySelectVisualStyle(select);

  const trigger = createHtmlElement(doc, "button");
  trigger.type = "button";
  trigger.setAttribute("data-zs-choice-trigger", "1");
  trigger.style.width = "100%";
  trigger.style.boxSizing = "border-box";
  trigger.style.padding = "2px 24px 2px 6px";
  trigger.style.border = "1px solid #8f8f9d";
  trigger.style.borderRadius = "4px";
  trigger.style.backgroundColor = "#fff";
  trigger.style.color = "#111";
  trigger.style.textAlign = "left";
  trigger.style.cursor = "pointer";
  trigger.style.position = "relative";
  select.appendChild(trigger);

  const triggerLabel = createHtmlElement(doc, "span");
  triggerLabel.setAttribute("data-zs-choice-trigger-label", "1");
  trigger.appendChild(triggerLabel);

  const arrow = createHtmlElement(doc, "span");
  arrow.textContent = "▾";
  arrow.style.position = "absolute";
  arrow.style.right = "8px";
  arrow.style.top = "50%";
  arrow.style.transform = "translateY(-50%)";
  arrow.style.pointerEvents = "none";
  trigger.appendChild(arrow);

  const list = createHtmlElement(doc, "div");
  list.setAttribute("data-zs-choice-list", "1");
  list.style.display = "none";
  list.hidden = true;
  list.style.position = "absolute";
  list.style.left = "0";
  list.style.right = "0";
  list.style.top = "calc(100% + 2px)";
  list.style.zIndex = "99999";
  list.style.border = "1px solid #8f8f9d";
  list.style.borderRadius = "4px";
  list.style.backgroundColor = "#fff";
  list.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  list.style.maxHeight = "260px";
  list.style.overflowY = "auto";
  select.appendChild(list);

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const shouldOpen = list.style.display === "none";
    closeAllChoiceLists(doc);
    list.hidden = !shouldOpen;
    list.style.display = shouldOpen ? "block" : "none";
  });
  doc.addEventListener("click", (event) => {
    const target = event.target as Node | null;
    if (!target || !select.contains(target)) {
      closeAllChoiceLists(doc);
    }
  });

  setChoiceControlOptions({
    control: select,
    options,
    selectedValue,
  });
  return select;
}

function createAcpPresetMenu(args: { doc: Document; providerType: string }) {
  const { doc } = args;
  const wrapper = createHtmlElement(doc, "div");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  const button = createHtmlElement(doc, "button");
  button.type = "button";
  button.textContent = getString("backend-manager-acp-preset-add" as any);
  button.setAttribute("data-zs-backend-action", "toggle-acp-preset-menu");
  button.setAttribute("data-zs-provider-type", args.providerType);
  wrapper.appendChild(button);

  const menu = createHtmlElement(doc, "div");
  menu.hidden = true;
  menu.style.display = "none";
  menu.style.position = "absolute";
  menu.style.right = "0";
  menu.style.top = "calc(100% + 2px)";
  menu.style.zIndex = "99999";
  menu.style.minWidth = "220px";
  menu.style.padding = "4px 0";
  menu.style.border = "1px solid #8f8f9d";
  menu.style.borderRadius = "4px";
  menu.style.backgroundColor = "#fff";
  menu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  menu.setAttribute("data-zs-acp-preset-menu", "1");
  wrapper.appendChild(menu);

  const appendItem = (label: string, attrs: Record<string, string>) => {
    const item = createHtmlElement(doc, "button");
    item.type = "button";
    item.textContent = label;
    item.style.display = "block";
    item.style.width = "100%";
    item.style.padding = "4px 8px";
    item.style.border = "none";
    item.style.background = "transparent";
    item.style.color = "#111";
    item.style.textAlign = "left";
    item.style.cursor = "pointer";
    for (const [key, value] of Object.entries(attrs)) {
      item.setAttribute(key, value);
    }
    item.addEventListener("mouseenter", () => {
      item.style.backgroundColor = "#f1f3f5";
    });
    item.addEventListener("mouseleave", () => {
      item.style.backgroundColor = "transparent";
    });
    menu.appendChild(item);
  };

  for (const preset of listAcpBackendPresets()) {
    appendItem(preset.displayName, {
      "data-zs-backend-action": "add-acp-preset",
      "data-zs-provider-type": args.providerType,
      "data-zs-acp-preset-id": preset.id,
    });
  }

  const separator = createHtmlElement(doc, "div");
  separator.style.height = "1px";
  separator.style.margin = "4px 0";
  separator.style.backgroundColor = "#d0d0d7";
  separator.setAttribute("role", "separator");
  menu.appendChild(separator);

  appendItem(getString("backend-manager-acp-preset-custom" as any), {
    "data-zs-backend-action": "add",
    "data-zs-provider-type": args.providerType,
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const shouldOpen = menu.style.display === "none";
    closeAllAcpPresetMenus(doc);
    menu.hidden = !shouldOpen;
    menu.style.display = shouldOpen ? "block" : "none";
  });
  doc.addEventListener("click", (event) => {
    const target = event.target as Node | null;
    if (!target || !wrapper.contains(target)) {
      closeAllAcpPresetMenus(doc);
    }
  });

  return wrapper;
}

function buildFallbackBackendRow(): EditableBackendRow {
  return {
    internalId: DEFAULT_BACKEND_ID,
    displayName: DEFAULT_BACKEND_ID,
    type: DEFAULT_BACKEND_TYPE,
    baseUrl: String(
      getPref("skillRunnerEndpoint") || DEFAULT_SKILLRUNNER_ENDPOINT,
    ).trim(),
    authKind: "none",
    authToken: "",
    timeoutMs: "600000",
    command: "",
    argsText: "",
    envText: "",
    acp: undefined,
  };
}

function normalizeRowFromBackend(backend: BackendInstance): EditableBackendRow {
  return {
    internalId: backend.id,
    displayName: normalizeBackendDisplayName(backend.displayName, backend.id),
    type: backend.type,
    baseUrl: backend.baseUrl,
    authKind: backend.auth?.kind === "bearer" ? "bearer" : "none",
    authToken: backend.auth?.kind === "bearer" ? backend.auth.token || "" : "",
    timeoutMs:
      typeof backend.defaults?.timeout_ms === "number"
        ? String(backend.defaults.timeout_ms)
        : "",
    command: backend.command || "",
    argsText: Array.isArray(backend.args) ? backend.args.join("\n") : "",
    envText: backend.env
      ? Object.entries(backend.env)
          .map(([key, value]) => `${key}=${value}`)
          .join("\n")
      : "",
    acp: backend.acp,
  };
}

function appendCell(row: HTMLElement) {
  const doc = row.ownerDocument!;
  const cell = createHtmlElement(doc, "td");
  row.appendChild(cell);
  return cell;
}

function appendTextCell(
  row: HTMLElement,
  label: string,
  value: string,
  width = "220px",
) {
  const cell = appendCell(row);
  const input = createHtmlElement(row.ownerDocument!, "input");
  input.type = "text";
  input.value = value;
  input.setAttribute("data-zs-backend-field", label);
  input.style.width = width;
  cell.appendChild(input);
}

function appendTextAreaCell(
  row: HTMLElement,
  label: string,
  value: string,
  width = "260px",
) {
  const cell = appendCell(row);
  const textarea = createHtmlElement(row.ownerDocument!, "textarea");
  textarea.value = value;
  textarea.setAttribute("data-zs-backend-field", label);
  textarea.style.width = width;
  textarea.style.minHeight = "56px";
  textarea.style.boxSizing = "border-box";
  cell.appendChild(textarea);
}

function appendSelectCell(
  row: HTMLElement,
  label: string,
  options: Array<{ value: string; text: string }>,
  selected: string,
) {
  const cell = appendCell(row);
  const control = createChoiceControl({
    doc: row.ownerDocument!,
    options,
    selectedValue: selected,
  });
  control.setAttribute("data-zs-backend-field", label);
  applySelectVisualStyle(control, "130px");
  cell.appendChild(control);
}

function readAcpMetadataFromRow(
  row: Element,
): BackendInstance["acp"] | undefined {
  const raw = String(row.getAttribute("data-zs-backend-acp") || "").trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as BackendInstance["acp"])
      : undefined;
  } catch {
    return undefined;
  }
}

function writeAcpMetadataToRow(
  row: Element,
  acp: BackendInstance["acp"] | undefined,
) {
  if (acp) {
    row.setAttribute("data-zs-backend-acp", JSON.stringify(acp));
  } else {
    row.removeAttribute("data-zs-backend-acp");
  }
  const chip = row.querySelector(
    "[data-zs-acp-connection-status='1']",
  ) as HTMLElement | null;
  if (chip) {
    const status = acp?.connectionTest?.status || "untested";
    styleAcpBackendStatusChip({
      chip,
      status,
    });
  }
  const button = row.querySelector(
    "[data-zs-backend-action='refresh-acp-runtime-options']",
  ) as HTMLButtonElement | null;
  if (button) {
    button.disabled = false;
    button.textContent = getAcpBackendActionLabel(acp);
  }
}

function getAcpBackendActionLabel(acp: BackendInstance["acp"] | undefined) {
  return acp?.connectionTest?.status === "passed"
    ? getString("backend-manager-refresh-acp-runtime-cache" as any)
    : getString("backend-manager-test-acp-connection" as any);
}

function styleAcpBackendStatusChip(args: {
  chip: HTMLElement;
  status: string;
  text?: string;
}) {
  const { chip, status, text } = args;
  chip.textContent = text || status;
  chip.style.backgroundColor =
    status === "passed"
      ? "#dcfce7"
      : status === "failed"
        ? "#fee2e2"
        : status === "testing" || status === "refreshing"
          ? "#fef3c7"
          : "#f3f4f6";
  chip.style.color =
    status === "passed"
      ? "#166534"
      : status === "failed"
        ? "#991b1b"
        : status === "testing" || status === "refreshing"
          ? "#92400e"
          : "#374151";
}

function setAcpBackendRowBusy(row: Element, busy: boolean) {
  const button = row.querySelector(
    "[data-zs-backend-action='refresh-acp-runtime-options']",
  ) as HTMLButtonElement | null;
  const chip = row.querySelector(
    "[data-zs-acp-connection-status='1']",
  ) as HTMLElement | null;
  const acp = readAcpMetadataFromRow(row);
  const wasPassed = acp?.connectionTest?.status === "passed";
  if (button) {
    button.disabled = busy;
    button.textContent = busy
      ? getString(
          (wasPassed
            ? "backend-manager-acp-refreshing"
            : "backend-manager-acp-testing") as any,
        )
      : getAcpBackendActionLabel(acp);
  }
  if (chip) {
    if (busy) {
      styleAcpBackendStatusChip({
        chip,
        status: wasPassed ? "refreshing" : "testing",
        text: getString(
          (wasPassed
            ? "backend-manager-acp-refreshing"
            : "backend-manager-acp-testing") as any,
        ),
      });
    } else {
      const status = acp?.connectionTest?.status || "untested";
      styleAcpBackendStatusChip({
        chip,
        status,
      });
    }
  }
}

export function getBackendRowActionKindsForType(type: string) {
  const normalizedType = String(type || "").trim();
  if (normalizedType === DEFAULT_BACKEND_TYPE) {
    return ["manage-ui", "refresh-model-cache", "remove"] as const;
  }
  if (normalizedType === ACP_BACKEND_TYPE) {
    return ["refresh-acp-runtime-options", "remove"] as const;
  }
  return ["remove"] as const;
}

function appendActionCell(args: {
  row: HTMLElement;
  backendType: string;
  onOpenManagement?: (row: HTMLElement) => void;
  onRefreshModelCache?: (row: HTMLElement) => void;
  onRefreshAcpRuntimeOptions?: (row: HTMLElement) => void;
}) {
  const cell = appendCell(args.row);
  if (String(args.backendType || "").trim() === DEFAULT_BACKEND_TYPE) {
    const manageButton = createHtmlElement(args.row.ownerDocument!, "button");
    manageButton.type = "button";
    manageButton.textContent = getString(
      "backend-manager-open-management" as any,
    );
    manageButton.setAttribute("data-zs-backend-action", "open-management");
    manageButton.addEventListener("click", () => {
      if (typeof args.onOpenManagement === "function") {
        args.onOpenManagement(args.row);
      }
    });
    manageButton.style.marginRight = "6px";
    cell.appendChild(manageButton);

    const refreshButton = createHtmlElement(args.row.ownerDocument!, "button");
    refreshButton.type = "button";
    refreshButton.textContent = getString(
      "backend-manager-refresh-model-cache" as any,
    );
    refreshButton.setAttribute("data-zs-backend-action", "refresh-model-cache");
    refreshButton.addEventListener("click", () => {
      if (typeof args.onRefreshModelCache === "function") {
        args.onRefreshModelCache(args.row);
      }
    });
    refreshButton.style.marginRight = "6px";
    cell.appendChild(refreshButton);
  }
  if (String(args.backendType || "").trim() === ACP_BACKEND_TYPE) {
    const refreshButton = createHtmlElement(args.row.ownerDocument!, "button");
    refreshButton.type = "button";
    const status =
      readAcpMetadataFromRow(args.row)?.connectionTest?.status || "untested";
    refreshButton.textContent = getAcpBackendActionLabel(
      readAcpMetadataFromRow(args.row),
    );
    refreshButton.setAttribute(
      "data-zs-backend-action",
      "refresh-acp-runtime-options",
    );
    refreshButton.addEventListener("click", () => {
      if (typeof args.onRefreshAcpRuntimeOptions === "function") {
        args.onRefreshAcpRuntimeOptions(args.row);
      }
    });
    refreshButton.style.marginRight = "6px";
    cell.appendChild(refreshButton);
    const chip = createHtmlElement(args.row.ownerDocument!, "span");
    chip.setAttribute("data-zs-acp-connection-status", "1");
    chip.style.padding = "2px 6px";
    chip.style.borderRadius = "999px";
    styleAcpBackendStatusChip({
      chip,
      status,
    });
    cell.appendChild(chip);
  }
  const button = createHtmlElement(args.row.ownerDocument!, "button");
  button.type = "button";
  button.textContent = getString("backend-manager-remove" as any);
  button.setAttribute("data-zs-backend-action", "remove");
  button.addEventListener("click", () => {
    args.row.remove();
  });
  cell.appendChild(button);
}

function appendBackendRow(args: {
  tbody: HTMLElement;
  backend: EditableBackendRow;
  onOpenManagement?: (row: HTMLElement) => void;
  onRefreshModelCache?: (row: HTMLElement) => void;
  onRefreshAcpRuntimeOptions?: (row: HTMLElement) => void;
}) {
  const row = createHtmlElement(args.tbody.ownerDocument!, "tr");
  row.setAttribute("data-zs-backend-row", "1");
  row.setAttribute("data-zs-backend-type", args.backend.type);
  row.setAttribute("data-zs-backend-internal-id", args.backend.internalId);
  if (args.backend.acp) {
    row.setAttribute("data-zs-backend-acp", JSON.stringify(args.backend.acp));
  }

  appendTextCell(row, "displayName", args.backend.displayName, "190px");
  if (args.backend.type === ACP_BACKEND_TYPE) {
    appendTextCell(row, "command", args.backend.command, "180px");
    appendTextAreaCell(row, "args", args.backend.argsText, "240px");
    appendTextAreaCell(row, "env", args.backend.envText, "260px");
  } else {
    appendTextCell(row, "baseUrl", args.backend.baseUrl, "320px");
    appendSelectCell(
      row,
      "authKind",
      [
        {
          value: "none",
          text: getString("backend-manager-auth-none" as any),
        },
        {
          value: "bearer",
          text: getString("backend-manager-auth-bearer" as any),
        },
      ],
      args.backend.authKind,
    );
    appendTextCell(row, "authToken", args.backend.authToken, "220px");
    appendTextCell(row, "timeoutMs", args.backend.timeoutMs, "110px");
  }
  appendActionCell({
    row,
    backendType: args.backend.type,
    onOpenManagement: args.onOpenManagement,
    onRefreshModelCache: args.onRefreshModelCache,
    onRefreshAcpRuntimeOptions: args.onRefreshAcpRuntimeOptions,
  });
  args.tbody.appendChild(row);
}

function appendProviderSection(args: {
  root: HTMLElement;
  provider: { type: string; labelKey: string };
}) {
  const doc = args.root.ownerDocument!;

  const section = createHtmlElement(doc, "div");
  section.style.marginBottom = "12px";
  section.setAttribute("data-zs-provider-section", args.provider.type);

  const header = createHtmlElement(doc, "div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.marginBottom = "6px";

  const title = createHtmlElement(doc, "h4");
  title.textContent = getString(
    "backend-manager-provider-profiles-title" as any,
    {
      args: { provider: getString(args.provider.labelKey as any) },
    },
  );
  title.style.margin = "0";
  header.appendChild(title);

  const actions = createHtmlElement(doc, "div");
  actions.style.display = "flex";
  actions.style.alignItems = "center";
  actions.style.gap = "6px";

  if (args.provider.type === ACP_BACKEND_TYPE) {
    actions.appendChild(
      createAcpPresetMenu({ doc, providerType: args.provider.type }),
    );
  }

  if (args.provider.type !== ACP_BACKEND_TYPE) {
    const addButton = createHtmlElement(doc, "button");
    addButton.type = "button";
    addButton.textContent = getString("backend-manager-provider-add" as any, {
      args: { provider: getString(args.provider.labelKey as any) },
    });
    addButton.setAttribute("data-zs-backend-action", "add");
    addButton.setAttribute("data-zs-provider-type", args.provider.type);
    actions.appendChild(addButton);
  }
  header.appendChild(actions);

  section.appendChild(header);

  const table = createHtmlElement(doc, "table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.setAttribute("data-zs-backend-table", args.provider.type);

  const thead = createHtmlElement(doc, "thead");
  const headerRow = createHtmlElement(doc, "tr");
  const columnKeys =
    args.provider.type === ACP_BACKEND_TYPE
      ? [
          "backend-manager-column-id",
          "backend-manager-column-command",
          "backend-manager-column-args",
          "backend-manager-column-env",
          "backend-manager-column-actions",
        ]
      : [
          "backend-manager-column-id",
          "backend-manager-column-base-url",
          "backend-manager-column-auth",
          "backend-manager-column-token",
          "backend-manager-column-timeout-ms",
          "backend-manager-column-actions",
        ];
  columnKeys.forEach((columnKey) => {
    const th = createHtmlElement(doc, "th");
    th.textContent = getString(columnKey as any);
    th.style.textAlign = "left";
    th.style.padding = "4px";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = createHtmlElement(doc, "tbody");
  tbody.setAttribute("data-zs-backend-body", "1");
  tbody.setAttribute("data-zs-provider-type", args.provider.type);
  table.appendChild(tbody);

  section.appendChild(table);
  args.root.appendChild(section);
}

function createBackendManagerActionButton(args: {
  doc: Document;
  labelKey: "backend-manager-save" | "backend-manager-cancel";
  action: "save" | "cancel";
  primary?: boolean;
}) {
  const button = createHtmlElement(args.doc, "button");
  button.type = "button";
  button.textContent = getString(args.labelKey as any);
  button.setAttribute("data-zs-backend-dialog-action", args.action);
  button.style.minWidth = "84px";
  button.style.padding = "4px 12px";
  if (args.primary) {
    button.style.fontWeight = "600";
  }
  return button;
}

function createBackendManagerActionBar(args: {
  doc: Document;
  dialogData: BackendManagerDialogData;
}) {
  const actionBar = createHtmlElement(args.doc, "div");
  actionBar.setAttribute("data-zs-backend-action-bar", "1");
  actionBar.style.display = "flex";
  actionBar.style.flex = "0 0 auto";
  actionBar.style.justifyContent = "flex-end";
  actionBar.style.gap = "8px";
  actionBar.style.padding = "8px 10px";
  actionBar.style.borderTop = "1px solid #d0d0d7";
  actionBar.style.backgroundColor = "Canvas";
  actionBar.style.boxShadow = "0 -2px 8px rgba(0, 0, 0, 0.08)";
  actionBar.style.zIndex = "2";

  const cancelButton = createBackendManagerActionButton({
    doc: args.doc,
    labelKey: "backend-manager-cancel",
    action: "cancel",
  });
  cancelButton.addEventListener("click", () => {
    if (!confirmBackendManagerClose(args.doc, args.dialogData)) {
      return;
    }
    args.dialogData._lastButtonId = "cancel";
    args.dialogData._allowBackendManagerClose = true;
    args.doc.defaultView?.close();
  });

  const saveButton = createBackendManagerActionButton({
    doc: args.doc,
    labelKey: "backend-manager-save",
    action: "save",
    primary: true,
  });
  saveButton.addEventListener("click", () => {
    args.dialogData._lastButtonId = "save";
    args.dialogData._allowBackendManagerClose = true;
    args.doc.defaultView?.close();
  });

  actionBar.append(cancelButton, saveButton);
  return actionBar;
}

function ensureTableSkeleton(
  doc: Document,
  root: HTMLElement,
  dialogData: BackendManagerDialogData,
) {
  root.innerHTML = "";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.height = "100%";
  root.style.maxHeight = "min(78vh, 720px)";
  root.style.minHeight = "0";
  root.style.minWidth = "1040px";
  root.style.padding = "0";

  const scrollRegion = createHtmlElement(doc, "div");
  scrollRegion.setAttribute("data-zs-backend-scroll-region", "1");
  scrollRegion.style.flex = "1 1 auto";
  scrollRegion.style.minHeight = "0";
  scrollRegion.style.overflow = "auto";
  scrollRegion.style.padding = "6px";

  const wrapper = createHtmlElement(doc, "div");
  wrapper.style.minWidth = "1040px";

  PROVIDER_SECTIONS.forEach((provider) => {
    appendProviderSection({
      root: wrapper,
      provider,
    });
  });

  const help = createHtmlElement(doc, "p");
  help.textContent = getString("backend-manager-help" as any);
  help.style.marginTop = "8px";
  wrapper.appendChild(help);

  scrollRegion.appendChild(wrapper);
  root.append(scrollRegion, createBackendManagerActionBar({ doc, dialogData }));
}

function readRowField(row: Element, field: string) {
  const control = row.querySelector(
    `[data-zs-backend-field="${field}"]`,
  ) as Element | null;
  if (!control) {
    return "";
  }
  return getElementValue(control);
}

function readRowInternalId(row: Element) {
  return String(row.getAttribute("data-zs-backend-internal-id") || "").trim();
}

function createBackendManagerDraftSignature(doc: Document) {
  const rows = Array.from(
    doc.querySelectorAll("[data-zs-backend-row='1']"),
  ) as Element[];
  return JSON.stringify(
    rows.map((row) => ({
      type: String(row.getAttribute("data-zs-backend-type") || "").trim(),
      internalId: readRowInternalId(row),
      displayName: readRowField(row, "displayName"),
      baseUrl: readRowField(row, "baseUrl"),
      authKind: readRowField(row, "authKind"),
      authToken: readRowField(row, "authToken"),
      timeoutMs: readRowField(row, "timeoutMs"),
      command: readRowField(row, "command"),
      args: readRowField(row, "args"),
      env: readRowField(row, "env"),
      acp: String(row.getAttribute("data-zs-backend-acp") || "").trim(),
    })),
  );
}

function hasBackendManagerUnsavedChanges(
  doc: Document,
  dialogData: BackendManagerDialogData,
) {
  const initial = String(dialogData._initialBackendDraftSignature || "");
  return Boolean(initial && createBackendManagerDraftSignature(doc) !== initial);
}

function confirmBackendManagerClose(
  doc: Document,
  dialogData: BackendManagerDialogData,
) {
  if (
    dialogData._allowBackendManagerClose ||
    !hasBackendManagerUnsavedChanges(doc, dialogData)
  ) {
    return true;
  }
  const message = getString("backend-manager-unsaved-exit-confirm" as any);
  const dialogWindow = doc.defaultView as Window | null;
  const confirmWindow =
    dialogWindow && typeof dialogWindow.confirm === "function"
      ? dialogWindow
      : (ztoolkit.getGlobal("window") as Window | undefined);
  if (typeof confirmWindow?.confirm !== "function") {
    return true;
  }
  return confirmWindow.confirm(message);
}

function installBackendManagerBeforeUnloadPrompt(
  doc: Document,
  dialogData: BackendManagerDialogData,
) {
  const win = doc.defaultView;
  if (!win || dialogData._nativeBeforeUnloadListener) {
    return;
  }
  const listener = (event: BeforeUnloadEvent) => {
    if (confirmBackendManagerClose(doc, dialogData)) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  };
  win.addEventListener("beforeunload", listener);
  dialogData._nativeBeforeUnloadListener = listener;
}

function removeBackendManagerBeforeUnloadPrompt(
  doc: Document | undefined,
  dialogData: BackendManagerDialogData,
) {
  const win = doc?.defaultView;
  const listener = dialogData._nativeBeforeUnloadListener;
  if (win && listener) {
    win.removeEventListener("beforeunload", listener);
  }
  dialogData._nativeBeforeUnloadListener = undefined;
}

function hasBackendRowInternalId(doc: Document, internalId: string) {
  const expected = String(internalId || "").trim();
  if (!expected) {
    return false;
  }
  const rows = Array.from(
    doc.querySelectorAll("[data-zs-backend-row='1']"),
  ) as HTMLElement[];
  return rows.some((row) => readRowInternalId(row) === expected);
}

function editableRowFromAcpBackendPreset(presetId: string): EditableBackendRow {
  const preset = findAcpBackendPreset(presetId);
  if (!preset) {
    throw new Error(`Unknown ACP backend preset: ${presetId}`);
  }
  return normalizeRowFromBackend(createAcpBackendFromPreset(preset));
}

export function resolveSkillRunnerManagementLaunchPayloadFromRow(
  row: Element,
): SkillRunnerManagementLaunchPayload {
  const backendId = readRowInternalId(row);
  const baseUrl = String(readRowField(row, "baseUrl") || "").trim();
  const uiUrl = buildSkillRunnerManagementUiUrl(baseUrl);
  return {
    backendId: backendId || DEFAULT_BACKEND_ID,
    baseUrl,
    uiUrl,
  };
}

function resolveSkillRunnerBackendFromRow(row: Element): BackendInstance {
  const type = String(row.getAttribute("data-zs-backend-type") || "").trim();
  if (type !== DEFAULT_BACKEND_TYPE) {
    throw new Error(
      getString("backend-manager-error-unsupported-provider" as any, {
        args: { row: "?", type },
      }),
    );
  }
  const backendId = readRowInternalId(row);
  if (!backendId) {
    throw new Error(
      getString("backend-manager-error-model-cache-id-required" as any),
    );
  }
  const displayName = String(readRowField(row, "displayName") || "").trim();
  const baseUrl = String(readRowField(row, "baseUrl") || "").trim();
  if (!baseUrl) {
    throw new Error(
      getString("backend-manager-error-management-base-url-required" as any),
    );
  }
  try {
    const parsed = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("protocol");
    }
  } catch {
    throw new Error(
      getString("backend-manager-error-management-base-url-invalid" as any),
    );
  }
  const authKind = String(readRowField(row, "authKind") || "none").trim();
  const authToken = String(readRowField(row, "authToken") || "").trim();
  if (authKind === "bearer" && !authToken) {
    throw new Error(
      getString("backend-manager-error-model-cache-bearer-required" as any),
    );
  }
  return {
    id: backendId,
    displayName: normalizeBackendDisplayName(displayName, backendId),
    type: DEFAULT_BACKEND_TYPE,
    baseUrl,
    auth:
      authKind === "bearer"
        ? {
            kind: "bearer",
            token: authToken,
          }
        : {
            kind: "none",
          },
  };
}

function parseBackendEnvText(envText: string) {
  const parsedEnv: Record<string, string> = {};
  for (const line of String(envText || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key) {
      continue;
    }
    parsedEnv[key] = trimmed.slice(equalsIndex + 1);
  }
  return parsedEnv;
}

function parseBackendArgsText(argsText: string) {
  return String(argsText || "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveAcpBackendFromRow(row: Element): BackendInstance {
  const type = String(row.getAttribute("data-zs-backend-type") || "").trim();
  if (type !== ACP_BACKEND_TYPE) {
    throw new Error(
      getString("backend-manager-error-unsupported-provider" as any, {
        args: { row: "?", type },
      }),
    );
  }
  let backendId = readRowInternalId(row);
  const displayName = String(readRowField(row, "displayName") || "").trim();
  const command = String(readRowField(row, "command") || "").trim();
  if (!displayName) {
    throw new Error(
      getString("backend-manager-error-id-required" as any, {
        args: { row: "?" },
      }),
    );
  }
  if (!backendId) {
    backendId = generateBackendInternalId({
      displayName,
      type,
      usedIds: new Set(),
    });
    row.setAttribute("data-zs-backend-internal-id", backendId);
  }
  if (!command) {
    throw new Error(
      getString("backend-manager-error-command-required" as any, {
        args: { row: "?" },
      }),
    );
  }
  const metadata = readAcpMetadataFromRow(row);
  const backend: BackendInstance = {
    id: backendId,
    displayName: normalizeBackendDisplayName(displayName, backendId),
    type,
    baseUrl: `local://${backendId}`,
    command,
    args: parseBackendArgsText(readRowField(row, "args")),
    ...(Object.keys(parseBackendEnvText(readRowField(row, "env"))).length > 0
      ? { env: parseBackendEnvText(readRowField(row, "env")) }
      : {}),
    ...(metadata ? { acp: metadata } : {}),
  };
  const expectedFingerprint = computeAcpBackendConfigFingerprint(backend);
  if (
    backend.acp?.connectionTest?.configFingerprint &&
    backend.acp.connectionTest.configFingerprint !== expectedFingerprint
  ) {
    backend.acp = {
      ...backend.acp,
      connectionTest: {
        ...backend.acp.connectionTest,
        status: "stale",
        error: "Backend command, args, env, or ACP overrides changed.",
      },
    };
  }
  return backend;
}

export async function launchSkillRunnerManagementFromRow(args: {
  row: Element;
  openDialog?: (payload: SkillRunnerManagementLaunchPayload) => Promise<void>;
}) {
  const payload = resolveSkillRunnerManagementLaunchPayloadFromRow(args.row);
  const openDialog = args.openDialog || openSkillRunnerManagementDialog;
  await openDialog(payload);
  return payload;
}

export async function refreshSkillRunnerModelCacheFromRow(args: {
  row: Element;
  refresh?: (args: { backend: BackendInstance }) => Promise<unknown>;
}) {
  const backend = resolveSkillRunnerBackendFromRow(args.row);
  const refresh = args.refresh || refreshSkillRunnerModelCacheForBackend;
  return refresh({
    backend,
  });
}

export async function refreshAcpRuntimeOptionsFromRow(args: {
  row: Element;
  probe?: typeof probeAcpBackendRuntimeOptions;
}) {
  const backend = resolveAcpBackendFromRow(args.row);
  const probe = args.probe || probeAcpBackendRuntimeOptions;
  const result = await probe({
    backend,
  });
  writeAcpMetadataToRow(args.row, result.backend.acp);
  return result;
}

export async function persistAcpBackendProbeResultFromRow(
  row: Element,
  deps: Partial<BackendPersistenceDeps> = {},
) {
  const backend = resolveAcpBackendFromRow(row);
  const loaded = await loadBackendsRegistry();
  if (loaded.fatalError) {
    throw new Error(loaded.fatalError);
  }
  let replaced = false;
  const nextBackends = loaded.backends.map((entry) => {
    if (entry.id !== backend.id) {
      return entry;
    }
    replaced = true;
    return backend;
  });
  if (!replaced) {
    nextBackends.push(backend);
  }
  persistBackendsConfig(nextBackends, deps);
  return backend;
}

export function collectBackendsFromDialog(doc: Document): {
  backends: BackendInstance[];
} {
  const rows = Array.from(
    doc.querySelectorAll("[data-zs-backend-row='1']"),
  ) as HTMLElement[];

  const seen = new Set<string>();
  const usedIds = new Set<string>();
  const supportedTypes = new Set(PROVIDER_SECTIONS.map((entry) => entry.type));
  const backends: BackendInstance[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const type = String(row.getAttribute("data-zs-backend-type") || "").trim();
    let id = readRowInternalId(row);
    const displayName = String(readRowField(row, "displayName") || "").trim();
    const baseUrl = readRowField(row, "baseUrl");
    const authKind = readRowField(row, "authKind") || "none";
    const authToken = readRowField(row, "authToken");
    const timeoutText = readRowField(row, "timeoutMs");
    const command = readRowField(row, "command");
    const argsText = readRowField(row, "args");
    const envText = readRowField(row, "env");

    if (!displayName) {
      throw new Error(
        getString("backend-manager-error-id-required" as any, {
          args: { row: i + 1 },
        }),
      );
    }
    if (!id) {
      id = generateBackendInternalId({
        displayName,
        type,
        usedIds,
      });
      row.setAttribute("data-zs-backend-internal-id", id);
    }
    usedIds.add(id);
    if (seen.has(id)) {
      throw new Error(
        getString("backend-manager-error-duplicate-id" as any, {
          args: { row: i + 1, id },
        }),
      );
    }
    seen.add(id);
    if (!type || !supportedTypes.has(type)) {
      throw new Error(
        getString("backend-manager-error-unsupported-provider" as any, {
          args: { row: i + 1, type },
        }),
      );
    }
    if (type === ACP_BACKEND_TYPE) {
      if (!command) {
        throw new Error(
          getString("backend-manager-error-command-required" as any, {
            args: { row: i + 1 },
          }),
        );
      }
      const parsedEnv = parseBackendEnvText(envText);
      const metadata = readAcpMetadataFromRow(row);
      const backend: BackendInstance = {
        id,
        displayName: normalizeBackendDisplayName(displayName, id),
        type,
        baseUrl: `local://${id}`,
        command,
        args: parseBackendArgsText(argsText),
        ...(Object.keys(parsedEnv).length > 0 ? { env: parsedEnv } : {}),
        ...(metadata ? { acp: metadata } : {}),
      };
      const expectedFingerprint = computeAcpBackendConfigFingerprint(backend);
      if (
        backend.acp?.connectionTest?.configFingerprint &&
        backend.acp.connectionTest.configFingerprint !== expectedFingerprint
      ) {
        backend.acp = {
          ...backend.acp,
          connectionTest: {
            ...backend.acp.connectionTest,
            status: "stale",
            error: "Backend command, args, env, or ACP overrides changed.",
          },
        };
      }
      backends.push(backend);
      continue;
    }

    if (!baseUrl) {
      throw new Error(
        getString("backend-manager-error-base-url-required" as any, {
          args: { row: i + 1 },
        }),
      );
    }
    try {
      const parsed = new URL(baseUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("protocol");
      }
    } catch {
      throw new Error(
        getString("backend-manager-error-base-url-invalid" as any, {
          args: { row: i + 1 },
        }),
      );
    }
    if (authKind === "bearer" && !authToken) {
      throw new Error(
        getString("backend-manager-error-bearer-required" as any, {
          args: { row: i + 1 },
        }),
      );
    }
    const timeoutMs = timeoutText ? Number(timeoutText) : undefined;
    if (
      typeof timeoutMs !== "undefined" &&
      (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    ) {
      throw new Error(
        getString("backend-manager-error-timeout-invalid" as any, {
          args: { row: i + 1 },
        }),
      );
    }

    backends.push({
      id,
      displayName: normalizeBackendDisplayName(displayName, id),
      type,
      baseUrl,
      auth:
        authKind === "bearer"
          ? {
              kind: "bearer",
              token: authToken,
            }
          : {
              kind: "none",
            },
      ...(typeof timeoutMs === "number"
        ? {
            defaults: {
              timeout_ms: timeoutMs,
            },
          }
        : {}),
    });
  }

  return {
    backends,
  };
}

const defaultBackendPersistenceDeps: BackendPersistenceDeps = {
  setPref,
  refreshWorkflowMenus,
  refreshModelCache: refreshSkillRunnerModelCacheForBackend,
};

function readPersistedManagementAuthByBackendId() {
  const map = new Map<string, BackendInstance["management_auth"]>();
  const raw = String(getPref(BACKENDS_CONFIG_PREF_KEY) || "").trim();
  if (!raw) {
    return map;
  }
  try {
    const parsed = JSON.parse(raw) as {
      backends?: Array<{ id?: unknown; management_auth?: unknown }>;
    };
    const entries = Array.isArray(parsed?.backends) ? parsed.backends : [];
    for (const entry of entries) {
      const id = String(entry?.id || "").trim();
      if (!id) {
        continue;
      }
      const managementAuth = entry?.management_auth;
      if (!managementAuth || typeof managementAuth !== "object") {
        continue;
      }
      const typed = managementAuth as {
        kind?: unknown;
        username?: unknown;
        password?: unknown;
      };
      const kind = String(typed.kind || "").trim();
      if (kind === "basic") {
        const username = String(typed.username || "").trim();
        const password = String(typed.password || "").trim();
        if (!username || !password) {
          continue;
        }
        map.set(id, {
          kind: "basic",
          username,
          password,
        });
        continue;
      }
      map.set(id, { kind: "none" });
    }
  } catch {
    return map;
  }
  return map;
}

function triggerSilentModelCacheRefreshForAddedSkillRunnerBackends(args: {
  existingSkillRunnerIds: Set<string>;
  mergedBackends: BackendInstance[];
  refreshModelCache: typeof refreshSkillRunnerModelCacheForBackend;
}) {
  const addedBackends = args.mergedBackends.filter((backend) => {
    const backendId = String(backend.id || "").trim();
    return (
      String(backend.type || "").trim() === "skillrunner" &&
      !!backendId &&
      !args.existingSkillRunnerIds.has(backendId)
    );
  });
  for (const backend of addedBackends) {
    void args
      .refreshModelCache({ backend })
      .then((result) => {
        if (!result?.ok && typeof console !== "undefined") {
          console.warn(
            `[backend-manager] silent model cache refresh failed for backend=${backend.id}: ${String(
              result?.error || "unknown error",
            )}`,
          );
        }
      })
      .catch((error) => {
        if (typeof console !== "undefined") {
          console.warn(
            `[backend-manager] silent model cache refresh threw for backend=${backend.id}: ${String(error)}`,
          );
        }
      });
  }
}

export function persistBackendsConfig(
  backends: BackendInstance[],
  deps: Partial<BackendPersistenceDeps> = {},
) {
  const resolved = {
    ...defaultBackendPersistenceDeps,
    ...deps,
  };
  const existingManagementAuth = readPersistedManagementAuthByBackendId();
  const mergedBackends = backends.map((backend) => {
    const explicit = backend.management_auth;
    if (explicit && typeof explicit === "object") {
      return backend;
    }
    const persisted = existingManagementAuth.get(backend.id);
    if (!persisted) {
      return backend;
    }
    return {
      ...backend,
      management_auth: persisted,
    };
  });
  const idMapping = new Map<string, string>();
  const removedIds = new Set<string>();
  const existingSkillRunnerIds = new Set<string>();
  const raw = String(getPref(BACKENDS_CONFIG_PREF_KEY) || "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { backends?: BackendInstance[] };
      const existing = Array.isArray(parsed?.backends) ? parsed.backends : [];
      for (const entry of existing) {
        const existingId = String(entry?.id || "").trim();
        if (!existingId) {
          continue;
        }
        if (String(entry?.type || "").trim() === "skillrunner") {
          existingSkillRunnerIds.add(existingId);
        }
      }
      const managed = existing.find((entry) =>
        isManagedLocalBackendId(entry.id),
      );
      const existingIds = new Set(
        existing
          .map((entry) => String(entry.id || "").trim())
          .filter((id) => id && !isManagedLocalBackendId(id)),
      );
      const nextIds = new Set(
        mergedBackends
          .map((entry) => String(entry.id || "").trim())
          .filter((id) => id && !isManagedLocalBackendId(id)),
      );
      for (const existingId of existingIds) {
        if (!nextIds.has(existingId)) {
          removedIds.add(existingId);
        }
      }
      if (
        managed &&
        !mergedBackends.some((entry) => isManagedLocalBackendId(entry.id))
      ) {
        if (String(managed.id || "").trim() === MANAGED_LOCAL_BACKEND_ID) {
          const normalizedManaged = {
            ...managed,
            id: MANAGED_LOCAL_BACKEND_ID,
            displayName: normalizeBackendDisplayName(
              managed.displayName,
              "Local Backend",
            ),
          };
          mergedBackends.push(normalizedManaged);
        } else {
          removedIds.add(String(managed.id || "").trim());
        }
      }
    } catch {
      // ignore parse failures and keep current mergedBackends
    }
  }
  resolved.setPref(
    BACKENDS_CONFIG_PREF_KEY,
    JSON.stringify(createBackendsPrefsDocument(mergedBackends)),
  );
  syncBackendReferenceState({
    idMapping,
    removedIds,
  });
  for (const removedId of removedIds.values()) {
    stopSessionSync({
      backendId: removedId,
    });
    purgeSkillRunnerBackendReconcileState(removedId);
    untrackSkillRunnerBackendHealth(removedId);
  }
  resolved.refreshWorkflowMenus();
  triggerSilentModelCacheRefreshForAddedSkillRunnerBackends({
    existingSkillRunnerIds,
    mergedBackends,
    refreshModelCache: resolved.refreshModelCache,
  });
  pruneAcpSessionSlotsForBackends(mergedBackends);
}

function getAlertWindow(window?: Window) {
  if (window && typeof window.alert === "function") {
    return window;
  }
  return ztoolkit.getGlobal("window") as Window | undefined;
}

export async function openBackendManagerDialog(args?: { window?: Window }) {
  if (isWindowAlive(addon.data.dialog?.window)) {
    addon.data.dialog?.window?.focus();
    return;
  }

  const alertWindow = getAlertWindow(args?.window);
  const loaded = await loadBackendsRegistry();
  const initialRows = loaded.fatalError
    ? [buildFallbackBackendRow()]
    : loaded.backends
        .filter((entry) => !isManagedLocalBackendId(entry.id))
        .map((entry) => normalizeRowFromBackend(entry));

  if (loaded.fatalError) {
    alertWindow?.alert?.(
      getString("backend-manager-error-invalid-config" as any, {
        args: { error: loaded.fatalError },
      }),
    );
  }

  const dialogData: BackendManagerDialogData = {
    loadCallback: () => {
      const doc = addon.data.dialog?.window?.document;
      if (!doc) {
        return;
      }
      const root = doc.getElementById(
        "zs-backend-manager-root",
      ) as HTMLElement | null;
      if (!root) {
        return;
      }

      ensureTableSkeleton(doc, root, dialogData);
      installBackendManagerBeforeUnloadPrompt(doc, dialogData);
      const bodies = Array.from(
        doc.querySelectorAll(
          "[data-zs-backend-body='1'][data-zs-provider-type]",
        ),
      ) as HTMLElement[];
      const bodyMap = new Map<string, HTMLElement>();
      bodies.forEach((body) => {
        const type = String(
          body.getAttribute("data-zs-provider-type") || "",
        ).trim();
        if (type) {
          bodyMap.set(type, body);
        }
      });

      const openManagementFromRow = (row: HTMLElement) => {
        void launchSkillRunnerManagementFromRow({
          row,
        }).catch((error) => {
          alertWindow?.alert?.(
            getString("backend-manager-open-management-failed" as any, {
              args: { error: String(error) },
            }),
          );
        });
      };
      const refreshModelCacheFromRow = (row: HTMLElement) => {
        void refreshSkillRunnerModelCacheFromRow({
          row,
        })
          .then((result) => {
            const typed = (result || {}) as {
              ok?: boolean;
              refreshedAt?: string;
              error?: string;
            };
            if (typed.ok === true) {
              alertWindow?.alert?.(
                getString(
                  "backend-manager-refresh-model-cache-success" as any,
                  {
                    args: {
                      refreshedAt: String(typed.refreshedAt || ""),
                    },
                  },
                ),
              );
              return;
            }
            throw new Error(String(typed.error || "unknown error"));
          })
          .catch((error) => {
            alertWindow?.alert?.(
              getString("backend-manager-refresh-model-cache-failed" as any, {
                args: { error: String(error) },
              }),
            );
          });
      };
      const refreshAcpRuntimeOptions = (row: HTMLElement) => {
        const button = row.querySelector(
          "[data-zs-backend-action='refresh-acp-runtime-options']",
        ) as HTMLButtonElement | null;
        if (button?.disabled) {
          return;
        }
        setAcpBackendRowBusy(row, true);
        void refreshAcpRuntimeOptionsFromRow({
          row,
        })
          .then(async (result) => {
            await persistAcpBackendProbeResultFromRow(row);
            if (result.ok) {
              alertWindow?.alert?.(
                getString(
                  "backend-manager-refresh-acp-runtime-cache-success" as any,
                  {
                    args: {
                      refreshedAt: String(
                        result.backend.acp?.runtimeOptionsCache?.refreshedAt ||
                          "",
                      ),
                    },
                  },
                ),
              );
              return;
            }
            throw new Error(String(result.error || "unknown error"));
          })
          .catch((error) => {
            alertWindow?.alert?.(
              getString(
                "backend-manager-refresh-acp-runtime-cache-failed" as any,
                {
                  args: { error: String(error) },
                },
              ),
            );
          })
          .finally(() => {
            setAcpBackendRowBusy(row, false);
          });
      };

      initialRows.forEach((backend) => {
        const tbody = bodyMap.get(backend.type);
        if (!tbody) {
          return;
        }
        appendBackendRow({
          tbody,
          backend,
          onOpenManagement: openManagementFromRow,
          onRefreshModelCache: refreshModelCacheFromRow,
          onRefreshAcpRuntimeOptions: refreshAcpRuntimeOptions,
        });
      });

      const addButtons = Array.from(
        doc.querySelectorAll(
          "[data-zs-backend-action='add'][data-zs-provider-type]",
        ),
      ) as HTMLButtonElement[];
      addButtons.forEach((button) => {
        button.addEventListener("click", () => {
          closeAllAcpPresetMenus(doc);
          const providerType = String(
            button.getAttribute("data-zs-provider-type") || "",
          ).trim();
          const tbody = bodyMap.get(providerType);
          if (!tbody) {
            return;
          }
          appendBackendRow({
            tbody,
            backend: {
              internalId: "",
              displayName: "",
              type: providerType,
              baseUrl: "",
              authKind: "none",
              authToken: "",
              timeoutMs: "",
              command: "",
              argsText: "",
              envText: "",
            },
            onOpenManagement: openManagementFromRow,
            onRefreshModelCache: refreshModelCacheFromRow,
            onRefreshAcpRuntimeOptions: refreshAcpRuntimeOptions,
          });
        });
      });

      const presetButtons = Array.from(
        doc.querySelectorAll(
          "[data-zs-backend-action='add-acp-preset'][data-zs-provider-type='acp']",
        ),
      ) as HTMLButtonElement[];
      presetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          closeAllAcpPresetMenus(doc);
          const presetId = String(
            button.getAttribute("data-zs-acp-preset-id") || "",
          ).trim();
          const preset = findAcpBackendPreset(presetId);
          const tbody = bodyMap.get(ACP_BACKEND_TYPE);
          if (!preset || !tbody) {
            return;
          }
          if (hasBackendRowInternalId(doc, preset.backendId)) {
            alertWindow?.alert?.(
              getString("backend-manager-acp-preset-exists" as any, {
                args: { name: preset.displayName },
              }),
            );
            return;
          }
          appendBackendRow({
            tbody,
            backend: editableRowFromAcpBackendPreset(preset.id),
            onOpenManagement: openManagementFromRow,
            onRefreshModelCache: refreshModelCacheFromRow,
            onRefreshAcpRuntimeOptions: refreshAcpRuntimeOptions,
          });
        });
      });

      dialogData._initialBackendDraftSignature =
        createBackendManagerDraftSignature(doc);
    },
    unloadCallback: () => {
      removeBackendManagerBeforeUnloadPrompt(
        addon.data.dialog?.window?.document,
        dialogData,
      );
    },
  };

  const dialogHelper = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-backend-manager-root",
      styles: {
        padding: "0",
      },
    })
    .setDialogData(dialogData)
    .open(getString("backend-manager-title" as any), {
      centerscreen: true,
      resizable: true,
      fitContent: false,
      width: 1180,
      height: 760,
    });

  addon.data.dialog = dialogHelper;
  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;
  addon.data.dialog = undefined;

  if (dialogData._lastButtonId !== "save") {
    return;
  }

  try {
    const doc = dialogHelper.window?.document;
    if (!doc) {
      throw new Error(
        getString("backend-manager-error-window-unavailable" as any),
      );
    }
    const collected = collectBackendsFromDialog(doc);
    persistBackendsConfig(collected.backends);
    alertWindow?.alert?.(getString("backend-manager-saved" as any));
  } catch (error) {
    alertWindow?.alert?.(
      getString("backend-manager-save-failed" as any, {
        args: { error: String(error) },
      }),
    );
  }
}
