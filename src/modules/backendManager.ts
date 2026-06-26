import {
  ACP_BACKEND_TYPE,
  DEFAULT_BACKEND_ID,
  DEFAULT_BACKEND_TYPE,
  DEFAULT_SKILLRUNNER_ENDPOINT,
  GENERIC_HTTP_BACKEND_TYPE,
} from "../config/defaults";
import { config } from "../../package.json";
import { refreshWorkflowMenus } from "./workflowMenu";
import { getPref, setPref } from "../utils/prefs";
import {
  createBackendsPrefsDocument,
  loadBackendsRegistry,
  syncBackendReferenceState,
} from "../backends/registry";
import { isWindowAlive } from "../utils/window";
import { getString } from "../utils/locale";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { buildSkillRunnerManagementUiUrl } from "./skillRunnerManagementDialog";
import { openZoteroSkillsWorkspaceTab } from "./workspaceTab";
import type { BackendInstance } from "../backends/types";
import { refreshSkillRunnerModelCacheForBackend } from "../providers/skillrunner/modelCache";
import { emitVerboseConsole } from "./diagnosticVerbosity";
import {
  generateBackendInternalId,
  isManagedLocalBackendId,
  normalizeBackendDisplayName,
} from "../backends/identity";
import { MANAGED_LOCAL_BACKEND_ID } from "./skillRunnerLocalRuntimeConstants";
import { stopSessionSync } from "./skillRunnerSessionSyncManager";
import {
  getSkillRunnerBackendHealthState,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
  syncSkillRunnerBackendHealthForConfiguredBackends,
  untrackSkillRunnerBackendHealth,
} from "./skillRunnerBackendHealthRegistry";
import { scheduleSkillRunnerBackendReachabilityProbe } from "./skillRunnerBackendReachabilityCoordinator";
import { purgeSkillRunnerBackendReconcileState } from "./skillRunnerTaskReconciler";
import { pruneAcpSessionSlotsForBackends } from "./acpSessionManager";
import {
  computeAcpBackendConfigFingerprint,
  probeAcpBackendRuntimeOptions,
} from "./acpBackendProbe";
import {
  createAcpBackendFromPresetOptions,
  ensureManagedAcpBackendEnvironmentDirectories,
  findAcpBackendPreset,
  getAcpBackendIsolatedEnvironmentRoot,
  listAcpBackendPresets,
} from "./acpBackendPresets";

const BACKENDS_CONFIG_PREF_KEY = "backendsConfigJson";
const PROVIDER_SECTIONS = [
  {
    type: ACP_BACKEND_TYPE,
    labelKey: "backend-manager-provider-acp",
  },
  {
    type: DEFAULT_BACKEND_TYPE,
    labelKey: "backend-manager-provider-skillrunner",
  },
  {
    type: GENERIC_HTTP_BACKEND_TYPE,
    labelKey: "backend-manager-provider-generic-http",
  },
] as const;

type BackendManagerProviderType = (typeof PROVIDER_SECTIONS)[number]["type"];

type BackendPersistenceDeps = {
  setPref: typeof setPref;
  refreshWorkflowMenus: typeof refreshWorkflowMenus;
  refreshModelCache: typeof refreshSkillRunnerModelCacheForBackend;
};

type EditableBackendRow = {
  internalId: string;
  displayName: string;
  type: string;
  enabled: boolean;
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
  _currentBackendDraftSignature?: string;
  _lastButtonId?: string;
  _nativeBeforeUnloadListener?: (event: BeforeUnloadEvent) => void;
};

type BackendManagerEnvDraftItem = {
  key: string;
  value: string;
};

type BackendManagerDraftRow = {
  internalId: string;
  displayName: string;
  type: string;
  enabled: boolean;
  baseUrl: string;
  authKind: "none" | "bearer";
  authToken: string;
  timeoutMs: string;
  command: string;
  args: string[];
  env: BackendManagerEnvDraftItem[];
  acp?: BackendInstance["acp"];
};

type BackendManagerSnapshot = {
  title: string;
  help: string;
  labels: Record<string, string>;
  initialProviderType?: string;
  providers: Array<{ type: string; label: string; title: string }>;
  rows: BackendManagerDraftRow[];
  skillRunnerHealth: Record<
    string,
    {
      enabled: boolean;
      reachable: boolean;
      status?: string;
      updatedAt?: string;
      lastReachableAt?: string;
      lastProbeAt?: string;
      lastError?: string;
    }
  >;
  acpPresets: Array<{
    id: string;
    label: string;
    bareCommand: string;
    bareArgs: string[];
    npxPackage?: string;
    npxArgs?: string[];
    defaultUseNpx: boolean;
    supportsNpx: boolean;
    agentFamily: string;
    isolation?: {
      envKey: string;
    };
  }>;
  acpPresetIsolationRoot: string;
};

type BackendManagerActionEnvelope = {
  type: "backend-manager-dialog:action";
  action: string;
  payload?: Record<string, unknown>;
};

type OpenBackendManagerDialogArgs = {
  window?: Window;
  initialProviderType?: string;
};

export type SkillRunnerManagementLaunchPayload = {
  backendId: string;
  baseUrl: string;
  uiUrl: string;
};

const HTML_NS = "http://www.w3.org/1999/xhtml";

let activeBackendManagerFrameWindow: Window | null = null;

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
  if ((control as HTMLInputElement).type === "checkbox") {
    return (control as HTMLInputElement).checked ? "true" : "false";
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
    enabled: true,
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
    enabled: backend.enabled !== false,
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

function envRecordToDraftItems(
  env: BackendInstance["env"] | undefined,
): BackendManagerEnvDraftItem[] {
  return env
    ? Object.entries(env).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }))
    : [];
}

function editableRowToDraft(row: EditableBackendRow): BackendManagerDraftRow {
  return {
    internalId: row.internalId,
    displayName: row.displayName,
    type: row.type,
    enabled: row.enabled !== false,
    baseUrl: row.baseUrl,
    authKind: row.authKind,
    authToken: row.authToken,
    timeoutMs: row.timeoutMs,
    command: row.command,
    args: parseBackendArgsText(row.argsText),
    env: envRecordToDraftItems(parseBackendEnvText(row.envText)),
    acp: row.acp,
  };
}

function normalizeDraftRows(raw: unknown): BackendManagerDraftRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      const authKind =
        String(row.authKind || "").trim() === "bearer" ? "bearer" : "none";
      const args = Array.isArray(row.args)
        ? row.args.map((item) => String(item ?? ""))
        : parseBackendArgsText(String(row.argsText || ""));
      const env = Array.isArray(row.env)
        ? row.env
            .filter((item) => item && typeof item === "object")
            .map((item) => {
              const typed = item as Record<string, unknown>;
              return {
                key: String(typed.key ?? ""),
                value: String(typed.value ?? ""),
              };
            })
        : envRecordToDraftItems(parseBackendEnvText(String(row.envText || "")));
      const acp =
        row.acp && typeof row.acp === "object" && !Array.isArray(row.acp)
          ? (row.acp as BackendInstance["acp"])
          : undefined;
      return {
        internalId: String(row.internalId || "").trim(),
        displayName: String(row.displayName || ""),
        type: String(row.type || "").trim(),
        enabled: row.enabled !== false,
        baseUrl: String(row.baseUrl || ""),
        authKind,
        authToken: String(row.authToken || ""),
        timeoutMs: String(row.timeoutMs || ""),
        command: String(row.command || ""),
        args,
        env,
        ...(acp ? { acp } : {}),
      };
    });
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
  width = "130px",
) {
  const cell = appendCell(row);
  const control = createChoiceControl({
    doc: row.ownerDocument!,
    options,
    selectedValue: selected,
  });
  control.setAttribute("data-zs-backend-field", label);
  applySelectVisualStyle(control, width);
  cell.appendChild(control);
}

function appendCheckboxCell(row: HTMLElement, label: string, checked: boolean) {
  const cell = appendCell(row);
  const input = createHtmlElement(row.ownerDocument!, "input");
  input.type = "checkbox";
  input.checked = checked;
  input.setAttribute("data-zs-backend-field", label);
  cell.appendChild(input);
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
  cell.style.whiteSpace = "nowrap";
  cell.style.minWidth =
    String(args.backendType || "").trim() === DEFAULT_BACKEND_TYPE
      ? "300px"
      : "180px";
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
  if (args.backend.type === DEFAULT_BACKEND_TYPE) {
    appendCheckboxCell(row, "enabled", args.backend.enabled !== false);
  }
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
      "110px",
    );
    appendTextCell(row, "authToken", args.backend.authToken, "96px");
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
          ...(args.provider.type === DEFAULT_BACKEND_TYPE
            ? ["backend-manager-column-enabled"]
            : []),
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
  actionBar.style.alignItems = "center";
  actionBar.style.justifyContent = "flex-end";
  actionBar.style.gap = "8px";
  actionBar.style.minHeight = "0";
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
  root.style.maxHeight = "none";
  root.style.minHeight = "0";
  root.style.minWidth = "1040px";
  root.style.overflow = "hidden";
  root.style.padding = "0";

  const scrollRegion = createHtmlElement(doc, "div");
  scrollRegion.setAttribute("data-zs-backend-scroll-region", "1");
  scrollRegion.style.flex = "1 1 0";
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

function createBackendManagerDomDraftSignature(doc: Document) {
  const rows = Array.from(
    doc.querySelectorAll("[data-zs-backend-row='1']"),
  ) as Element[];
  return JSON.stringify(
    rows.map((row) => ({
      type: String(row.getAttribute("data-zs-backend-type") || "").trim(),
      internalId: readRowInternalId(row),
      displayName: readRowField(row, "displayName"),
      enabled: readRowField(row, "enabled"),
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
  _doc: Document,
  dialogData: BackendManagerDialogData,
) {
  const initial = String(dialogData._initialBackendDraftSignature || "");
  const current = String(dialogData._currentBackendDraftSignature || initial);
  return Boolean(initial && current !== initial);
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

function editableRowFromAcpBackendPresetOptions(args: {
  presetId: string;
  useNpx?: boolean;
  isolated?: boolean;
}): EditableBackendRow {
  return normalizeRowFromBackend(
    createAcpBackendFromPresetOptions(args.presetId, {
      useNpx: args.useNpx,
      isolated: args.isolated,
    }),
  );
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
    ...(readRowField(row, "enabled") === "false" ? { enabled: false } : {}),
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
  if (readRowField(args.row, "enabled") === "false") {
    throw new Error("SkillRunner backend is disabled");
  }
  const payload = resolveSkillRunnerManagementLaunchPayloadFromRow(args.row);
  if (args.openDialog) {
    await args.openDialog(payload);
  } else {
    await openZoteroSkillsWorkspaceTab({
      initialView: "dashboard",
      initialDashboardTabKey: `backend:${payload.backendId}`,
      initialDashboardBackendSubview: "management",
    });
  }
  return payload;
}

function resolveSkillRunnerManagementLaunchPayloadFromDraft(
  row: BackendManagerDraftRow,
): SkillRunnerManagementLaunchPayload {
  const backend = collectBackendsFromDraftRows([row]).backends[0];
  if (String(backend.type || "").trim() !== DEFAULT_BACKEND_TYPE) {
    throw new Error(
      getString("backend-manager-error-unsupported-provider" as any, {
        args: { row: "?", type: backend.type },
      }),
    );
  }
  if (backend.enabled === false) {
    throw new Error("SkillRunner backend is disabled");
  }
  const uiUrl = buildSkillRunnerManagementUiUrl(backend.baseUrl);
  return {
    backendId: backend.id || DEFAULT_BACKEND_ID,
    baseUrl: backend.baseUrl,
    uiUrl,
  };
}

async function launchSkillRunnerManagementFromDraft(args: {
  row: BackendManagerDraftRow;
}) {
  const payload = resolveSkillRunnerManagementLaunchPayloadFromDraft(args.row);
  await openZoteroSkillsWorkspaceTab({
    initialView: "dashboard",
    initialDashboardTabKey: `backend:${payload.backendId}`,
    initialDashboardBackendSubview: "management",
  });
  return payload;
}

export async function refreshSkillRunnerModelCacheFromRow(args: {
  row: Element;
  refresh?: (args: { backend: BackendInstance }) => Promise<unknown>;
}) {
  const backend = resolveSkillRunnerBackendFromRow(args.row);
  if (backend.enabled === false) {
    throw new Error("SkillRunner backend is disabled");
  }
  const refresh = args.refresh || refreshSkillRunnerModelCacheForBackend;
  return refresh({
    backend,
  });
}

async function refreshSkillRunnerModelCacheFromDraft(args: {
  row: BackendManagerDraftRow;
}) {
  const backend = collectBackendsFromDraftRows([args.row]).backends[0];
  if (String(backend.type || "").trim() !== DEFAULT_BACKEND_TYPE) {
    throw new Error(
      getString("backend-manager-error-unsupported-provider" as any, {
        args: { row: "?", type: backend.type },
      }),
    );
  }
  if (backend.enabled === false) {
    throw new Error("SkillRunner backend is disabled");
  }
  return refreshSkillRunnerModelCacheForBackend({ backend });
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

async function refreshAcpRuntimeOptionsFromDraft(args: {
  row: BackendManagerDraftRow;
}) {
  const backend = collectBackendsFromDraftRows([args.row]).backends[0];
  if (String(backend.type || "").trim() !== ACP_BACKEND_TYPE) {
    throw new Error(
      getString("backend-manager-error-unsupported-provider" as any, {
        args: { row: "?", type: backend.type },
      }),
    );
  }
  return probeAcpBackendRuntimeOptions({ backend });
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
  const backends: BackendInstance[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const typeText = String(
      row.getAttribute("data-zs-backend-type") || "",
    ).trim();
    const type = normalizeBackendManagerProviderType(typeText);
    let id = readRowInternalId(row);
    const displayName = String(readRowField(row, "displayName") || "").trim();
    const baseUrl = readRowField(row, "baseUrl");
    const authKind = readRowField(row, "authKind") || "none";
    const authToken = readRowField(row, "authToken");
    const timeoutText = readRowField(row, "timeoutMs");
    const enabled = readRowField(row, "enabled") !== "false";
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
    if (!type) {
      throw new Error(
        getString("backend-manager-error-unsupported-provider" as any, {
          args: { row: i + 1, type: typeText },
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
      ...(type === DEFAULT_BACKEND_TYPE && enabled === false
        ? { enabled: false }
        : {}),
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

function normalizeDraftArgs(args: unknown) {
  return Array.isArray(args)
    ? args
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0)
    : [];
}

function normalizeDraftEnv(
  env: unknown,
  rowNumber: number | string,
): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!Array.isArray(env)) {
    return parsed;
  }
  for (const item of env) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const typed = item as Record<string, unknown>;
    const key = String(typed.key ?? "").trim();
    const value = String(typed.value ?? "");
    if (!key && !value.trim()) {
      continue;
    }
    if (!key) {
      throw new Error(
        getString("backend-manager-error-env-key-required" as any, {
          args: { row: rowNumber },
        }),
      );
    }
    parsed[key] = value;
  }
  return parsed;
}

export function collectBackendsFromDraftRows(rawRows: unknown): {
  backends: BackendInstance[];
} {
  const rows = normalizeDraftRows(rawRows);
  const seen = new Set<string>();
  const usedIds = new Set<string>();
  const backends: BackendInstance[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const typeText = String(row.type || "").trim();
    const type = normalizeBackendManagerProviderType(typeText);
    let id = String(row.internalId || "").trim();
    const displayName = String(row.displayName || "").trim();
    const baseUrl = String(row.baseUrl || "").trim();
    const authKind = row.authKind === "bearer" ? "bearer" : "none";
    const authToken = String(row.authToken || "").trim();
    const timeoutText = String(row.timeoutMs || "").trim();
    const command = String(row.command || "").trim();

    if (!displayName) {
      throw new Error(
        getString("backend-manager-error-id-required" as any, {
          args: { row: rowNumber },
        }),
      );
    }
    if (!type) {
      throw new Error(
        getString("backend-manager-error-unsupported-provider" as any, {
          args: { row: rowNumber, type: typeText },
        }),
      );
    }
    if (!id) {
      id = generateBackendInternalId({
        displayName,
        type,
        usedIds,
      });
      row.internalId = id;
    }
    usedIds.add(id);
    if (seen.has(id)) {
      throw new Error(
        getString("backend-manager-error-duplicate-id" as any, {
          args: { row: rowNumber, id },
        }),
      );
    }
    seen.add(id);

    if (type === ACP_BACKEND_TYPE) {
      if (!command) {
        throw new Error(
          getString("backend-manager-error-command-required" as any, {
            args: { row: rowNumber },
          }),
        );
      }
      const parsedEnv = normalizeDraftEnv(row.env, rowNumber);
      const backend: BackendInstance = {
        id,
        displayName: normalizeBackendDisplayName(displayName, id),
        type,
        baseUrl: `local://${id}`,
        command,
        args: normalizeDraftArgs(row.args),
        ...(Object.keys(parsedEnv).length > 0 ? { env: parsedEnv } : {}),
        ...(row.acp ? { acp: row.acp } : {}),
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
          args: { row: rowNumber },
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
          args: { row: rowNumber },
        }),
      );
    }
    if (authKind === "bearer" && !authToken) {
      throw new Error(
        getString("backend-manager-error-bearer-required" as any, {
          args: { row: rowNumber },
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
          args: { row: rowNumber },
        }),
      );
    }
    backends.push({
      id,
      displayName: normalizeBackendDisplayName(displayName, id),
      type,
      ...(type === DEFAULT_BACKEND_TYPE && row.enabled === false
        ? { enabled: false }
        : {}),
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

  return { backends };
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
      backend.enabled !== false &&
      !!backendId &&
      !args.existingSkillRunnerIds.has(backendId)
    );
  });
  for (const backend of addedBackends) {
    void args
      .refreshModelCache({ backend })
      .then((result) => {
        if (!result?.ok) {
          emitVerboseConsole(
            "warn",
            `[backend-manager] silent model cache refresh failed for backend=${backend.id}: ${String(
              result?.error || "unknown error",
            )}`,
          );
        }
      })
      .catch((error) => {
        emitVerboseConsole(
          "warn",
          `[backend-manager] silent model cache refresh threw for backend=${backend.id}: ${String(error)}`,
        );
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
  syncSkillRunnerBackendHealthForConfiguredBackends(mergedBackends, {
    prune: true,
  });
  for (const backend of mergedBackends) {
    if (
      String(backend.type || "").trim() === DEFAULT_BACKEND_TYPE &&
      backend.enabled !== false
    ) {
      scheduleSkillRunnerBackendReachabilityProbe({
        backendId: backend.id,
        source: "settings",
      });
    }
  }
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

function localizeBackendManager(
  key: string,
  fallback: string,
  options?: { args?: Record<string, unknown> },
) {
  try {
    const value = String(
      options ? getString(key as any, options) : getString(key as any),
    ).trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

function resolveBackendManagerPageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    return "about:blank";
  }
  return `chrome://${addonRef}/content/dashboard/backend-manager.html?ui=20260617-html-backend-manager-v2`;
}

function createBackendManagerFrame(doc: Document) {
  const frame = doc.createElement("iframe");
  frame.setAttribute("type", "content");
  frame.setAttribute("data-zs-role", "backend-manager-dialog-frame");
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.display = "block";
  frame.style.flex = "1 1 auto";
  frame.style.minHeight = "620px";
  frame.style.border = "none";
  return frame;
}

function resolveFrameWindow(frame: Element | null) {
  if (!frame) {
    return null;
  }
  const candidate = frame as Element & { contentWindow?: Window | null };
  return candidate.contentWindow || null;
}

function normalizeBackendManagerProviderType(
  value: unknown,
): BackendManagerProviderType | undefined {
  const text = String(value || "").trim();
  return PROVIDER_SECTIONS.some((provider) => provider.type === text)
    ? (text as BackendManagerProviderType)
    : undefined;
}

function postBackendManagerProviderSelection(providerType?: string) {
  const selectedProviderType =
    normalizeBackendManagerProviderType(providerType);
  if (!selectedProviderType) {
    return;
  }
  try {
    activeBackendManagerFrameWindow?.postMessage(
      {
        type: "backend-manager-dialog:select-provider",
        payload: { providerType: selectedProviderType },
      },
      "*",
    );
  } catch {
    activeBackendManagerFrameWindow = null;
  }
}

function createBackendManagerDraftSignature(rows: BackendManagerDraftRow[]) {
  return JSON.stringify(
    normalizeDraftRows(rows).map((row) => ({
      internalId: row.internalId,
      displayName: row.displayName,
      type: row.type,
      enabled: row.enabled !== false,
      baseUrl: row.baseUrl,
      authKind: row.authKind,
      authToken: row.authToken,
      timeoutMs: row.timeoutMs,
      command: row.command,
      args: normalizeDraftArgs(row.args),
      env: Array.isArray(row.env)
        ? row.env.map((item) => ({
            key: String(item.key || "").trim(),
            value: String(item.value || ""),
          }))
        : [],
      acp: row.acp || null,
    })),
  );
}

function buildBackendManagerLabels() {
  return {
    addProfile: localizeBackendManager(
      "backend-manager-provider-add",
      "Add { $provider } Profile",
    ),
    addAcpPreset: localizeBackendManager(
      "backend-manager-acp-preset-add",
      "Add ACP Preset",
    ),
    customAcp: localizeBackendManager(
      "backend-manager-acp-preset-custom",
      "Custom ACP",
    ),
    displayName: localizeBackendManager("backend-manager-column-id", "ID"),
    enabled: localizeBackendManager(
      "backend-manager-column-enabled",
      "Enabled",
    ),
    baseUrl: localizeBackendManager(
      "backend-manager-column-base-url",
      "Base URL",
    ),
    auth: localizeBackendManager("backend-manager-column-auth", "Auth"),
    token: localizeBackendManager("backend-manager-column-token", "Token"),
    timeoutMs: localizeBackendManager(
      "backend-manager-column-timeout-ms",
      "Timeout(ms)",
    ),
    command: localizeBackendManager(
      "backend-manager-column-command",
      "Command",
    ),
    args: localizeBackendManager("backend-manager-column-args", "Args"),
    env: localizeBackendManager("backend-manager-column-env", "Env"),
    actions: localizeBackendManager(
      "backend-manager-column-actions",
      "Actions",
    ),
    authNone: localizeBackendManager("backend-manager-auth-none", "None"),
    authBearer: localizeBackendManager("backend-manager-auth-bearer", "Bearer"),
    remove: localizeBackendManager("backend-manager-remove", "Remove"),
    save: localizeBackendManager("backend-manager-save", "Save"),
    cancel: localizeBackendManager("backend-manager-cancel", "Cancel"),
    confirm: localizeBackendManager("backend-manager-confirm", "Confirm"),
    profileId: localizeBackendManager(
      "backend-manager-profile-id",
      "Profile ID",
    ),
    agentFamily: localizeBackendManager(
      "backend-manager-agent-family",
      "Agent Family",
    ),
    acpPresetDialogTitle: localizeBackendManager(
      "backend-manager-acp-preset-dialog-title",
      "Add ACP Profile from Preset",
    ),
    acpPresetUseNpx: localizeBackendManager(
      "backend-manager-acp-preset-use-npx",
      "Use npx",
    ),
    acpPresetIsolated: localizeBackendManager(
      "backend-manager-acp-preset-isolated",
      "Isolated environment",
    ),
    acpPresetNpxWarning: localizeBackendManager(
      "backend-manager-acp-preset-npx-warning",
      "Requires Node.js and npm.",
    ),
    acpPresetNodeLink: localizeBackendManager(
      "backend-manager-acp-preset-node-link",
      "Node.js",
    ),
    acpPresetIsolationWarning: localizeBackendManager(
      "backend-manager-acp-preset-isolation-warning",
      "Using an isolated environment requires configuring and authenticating the agent in { $path }. Do not enable this if you are unsure.",
    ),
    openManagement: localizeBackendManager(
      "backend-manager-open-management",
      "Open Management",
    ),
    refreshModelCache: localizeBackendManager(
      "backend-manager-refresh-model-cache",
      "Refresh Model Cache",
    ),
    unreachable: localizeBackendManager(
      "backend-manager-status-unreachable",
      "Unreachable",
    ),
    disabled: localizeBackendManager(
      "backend-manager-status-disabled",
      "Disabled",
    ),
    statusModelCacheRefreshed: localizeBackendManager(
      "backend-manager-status-model-cache-refreshed",
      "Model cache refreshed",
    ),
    statusModelCacheRefreshFailed: localizeBackendManager(
      "backend-manager-status-model-cache-refresh-failed",
      "Model cache refresh failed",
    ),
    statusAcpRuntimeCacheRefreshed: localizeBackendManager(
      "backend-manager-status-acp-runtime-cache-refreshed",
      "ACP config cache refreshed",
    ),
    statusAcpRuntimeCacheRefreshFailed: localizeBackendManager(
      "backend-manager-status-acp-runtime-cache-refresh-failed",
      "ACP config cache refresh failed",
    ),
    refreshAcpRuntimeCache: localizeBackendManager(
      "backend-manager-refresh-acp-runtime-cache",
      "Refresh Config Cache",
    ),
    testAcpConnection: localizeBackendManager(
      "backend-manager-test-acp-connection",
      "Test Connection",
    ),
    addArg: localizeBackendManager("backend-manager-add-arg", "Add Argument"),
    addEnv: localizeBackendManager(
      "backend-manager-add-env",
      "Add Environment Variable",
    ),
    argPlaceholder: localizeBackendManager(
      "backend-manager-arg-placeholder",
      "Argument",
    ),
    envKeyPlaceholder: localizeBackendManager(
      "backend-manager-env-key-placeholder",
      "Variable",
    ),
    envValuePlaceholder: localizeBackendManager(
      "backend-manager-env-value-placeholder",
      "Value",
    ),
    noProfiles: localizeBackendManager(
      "backend-manager-empty-provider",
      "No profiles configured.",
    ),
    unsavedExitConfirm: localizeBackendManager(
      "backend-manager-unsaved-exit-confirm",
      "Discard unsaved backend changes?",
    ),
  };
}

function buildSkillRunnerHealthSnapshot(rows: BackendManagerDraftRow[]) {
  const healthById: BackendManagerSnapshot["skillRunnerHealth"] = {};
  for (const row of rows) {
    if (row.type !== DEFAULT_BACKEND_TYPE || !row.internalId) {
      continue;
    }
    const health = getSkillRunnerBackendHealthState(row.internalId);
    healthById[row.internalId] = {
      enabled: row.enabled !== false && health?.status !== "disabled",
      reachable: health?.reachable === true && health?.status === "reachable",
      status: row.enabled === false ? "disabled" : health?.status || "unknown",
      updatedAt: health?.updatedAt,
      lastReachableAt: health?.lastReachableAt,
      lastProbeAt: health?.lastProbeAt,
      ...(health?.lastError ? { lastError: health.lastError } : {}),
    };
  }
  return healthById;
}

function buildBackendManagerSnapshot(
  rows: BackendManagerDraftRow[],
  args?: { initialProviderType?: string },
): BackendManagerSnapshot {
  return {
    title: localizeBackendManager("backend-manager-title", "Backend Manager"),
    help: localizeBackendManager(
      "backend-manager-help",
      'Profiles are managed by provider. Click "Save" to persist.',
    ),
    labels: buildBackendManagerLabels(),
    initialProviderType: normalizeBackendManagerProviderType(
      args?.initialProviderType,
    ),
    providers: PROVIDER_SECTIONS.map((provider) => {
      const label = localizeBackendManager(provider.labelKey, provider.type);
      return {
        type: provider.type,
        label,
        title: localizeBackendManager(
          "backend-manager-provider-profiles-title",
          `${label} Profiles`,
          { args: { provider: label } },
        ),
      };
    }),
    rows,
    acpPresets: listAcpBackendPresets().map((preset) => ({
      id: preset.id,
      label: preset.displayName,
      bareCommand: preset.bareCommand,
      bareArgs: [...preset.bareArgs],
      npxPackage: preset.npxPackage,
      npxArgs: preset.npxArgs ? [...preset.npxArgs] : undefined,
      defaultUseNpx: preset.defaultUseNpx,
      supportsNpx: preset.supportsNpx,
      agentFamily: preset.agentFamily,
      isolation: preset.isolation
        ? {
            envKey: preset.isolation.envKey,
          }
        : undefined,
    })),
    acpPresetIsolationRoot: getAcpBackendIsolatedEnvironmentRoot(),
    skillRunnerHealth: buildSkillRunnerHealthSnapshot(rows),
  };
}

async function persistAcpBackendProbeResultFromDraft(
  row: BackendManagerDraftRow,
) {
  const backend = collectBackendsFromDraftRows([row]).backends[0];
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
  persistBackendsConfig(nextBackends);
  return backend;
}

export async function openBackendManagerDialog(
  args?: OpenBackendManagerDialogArgs,
) {
  if (isWindowAlive(addon.data.dialog?.window)) {
    addon.data.dialog?.window?.focus();
    postBackendManagerProviderSelection(args?.initialProviderType);
    return;
  }

  const alertWindow = getAlertWindow(args?.window);
  const initialProviderType = normalizeBackendManagerProviderType(
    args?.initialProviderType,
  );
  const loaded = await loadBackendsRegistry();
  const initialRows = (
    loaded.fatalError
      ? [buildFallbackBackendRow()]
      : loaded.backends
          .filter((entry) => !isManagedLocalBackendId(entry.id))
          .map((entry) => normalizeRowFromBackend(entry))
  ).map(editableRowToDraft);

  if (loaded.fatalError) {
    alertWindow?.alert?.(
      getString("backend-manager-error-invalid-config" as any, {
        args: { error: loaded.fatalError },
      }),
    );
  }

  let frameWindow: Window | null = null;
  let removeMessageListener: (() => void) | undefined;
  let currentDraftRows = normalizeDraftRows(initialRows);
  const initialSignature = createBackendManagerDraftSignature(currentDraftRows);

  const dialogData: BackendManagerDialogData = {
    _initialBackendDraftSignature: initialSignature,
    _currentBackendDraftSignature: initialSignature,
    loadCallback: () => {
      const doc = addon.data.dialog?.window?.document;
      const dialogWindow = addon.data.dialog?.window;
      if (!doc) {
        return;
      }
      const root = doc.getElementById(
        "zs-backend-manager-root",
      ) as HTMLElement | null;
      if (!root) {
        return;
      }

      root.innerHTML = "";
      const frame = createBackendManagerFrame(doc);
      const postToFrame = (
        type:
          | "backend-manager-dialog:init"
          | "backend-manager-dialog:snapshot"
          | "backend-manager-dialog:action-result",
        payload: Record<string, unknown>,
      ) => {
        const targetWindow = resolveFrameWindow(frame);
        if (!targetWindow) {
          return;
        }
        frameWindow = targetWindow;
        targetWindow.postMessage({ type, payload }, "*");
      };
      const pushSnapshot = (
        type: "backend-manager-dialog:init" | "backend-manager-dialog:snapshot",
      ) => {
        postToFrame(
          type,
          buildBackendManagerSnapshot(currentDraftRows, {
            initialProviderType,
          }),
        );
      };
      const onMessage = (event: MessageEvent) => {
        const sourceWindow =
          event.source && "postMessage" in event.source
            ? (event.source as Window)
            : null;
        const currentFrameWindow = resolveFrameWindow(frame);
        if (
          sourceWindow &&
          currentFrameWindow &&
          sourceWindow !== currentFrameWindow
        ) {
          return;
        }
        const data = event.data as { type?: unknown };
        if (!data || data.type !== "backend-manager-dialog:action") {
          return;
        }
        frameWindow = sourceWindow || currentFrameWindow;
        activeBackendManagerFrameWindow = frameWindow;
        const envelope = data as BackendManagerActionEnvelope;
        const action = String(envelope.action || "").trim();
        const payload = envelope.payload || {};
        if (action === "ready") {
          pushSnapshot("backend-manager-dialog:init");
          return;
        }
        if (action === "draft-changed") {
          currentDraftRows = normalizeDraftRows(payload.rows);
          dialogData._currentBackendDraftSignature =
            createBackendManagerDraftSignature(currentDraftRows);
          return;
        }
        if (action === "cancel") {
          dialogData._lastButtonId = "cancel";
          dialogData._allowBackendManagerClose = true;
          dialogWindow?.close();
          return;
        }
        if (action === "save") {
          void (async () => {
            try {
              currentDraftRows = normalizeDraftRows(payload.rows);
              const collected = collectBackendsFromDraftRows(currentDraftRows);
              await ensureManagedAcpBackendEnvironmentDirectories(
                collected.backends,
              );
              persistBackendsConfig(collected.backends);
              dialogData._lastButtonId = "save";
              dialogData._allowBackendManagerClose = true;
              alertWindow?.alert?.(getString("backend-manager-saved" as any));
              dialogWindow?.close();
            } catch (error) {
              alertWindow?.alert?.(
                getString("backend-manager-save-failed" as any, {
                  args: { error: String(error) },
                }),
              );
            }
          })();
          return;
        }
        if (action === "open-management") {
          void launchSkillRunnerManagementFromDraft({
            row: normalizeDraftRows([payload.row])[0],
          }).catch((error) => {
            alertWindow?.alert?.(
              getString("backend-manager-open-management-failed" as any, {
                args: { error: String(error) },
              }),
            );
          });
          return;
        }
        if (action === "refresh-model-cache") {
          const rowIndex = Number(payload.rowIndex);
          const row = normalizeDraftRows([payload.row])[0];
          const backendId = row?.internalId || "";
          void refreshSkillRunnerModelCacheFromDraft({
            row,
          })
            .then((result) => {
              const typed = (result || {}) as {
                ok?: boolean;
                refreshedAt?: string;
                error?: string;
                backendId?: string;
              };
              const resultBackendId = String(
                typed.backendId || backendId || "",
              ).trim();
              if (typed.ok === true) {
                markSkillRunnerBackendHealthSuccess(resultBackendId);
                postToFrame("backend-manager-dialog:action-result", {
                  action,
                  rowIndex,
                  backendId: resultBackendId,
                  refreshedAt: String(typed.refreshedAt || ""),
                  ok: true,
                });
                return;
              }
              throw new Error(String(typed.error || "unknown error"));
            })
            .catch((error) => {
              markSkillRunnerBackendHealthFailure({ backendId, error });
              postToFrame("backend-manager-dialog:action-result", {
                action,
                rowIndex,
                backendId,
                error: String(error),
                ok: false,
              });
            });
          return;
        }
        if (action === "refresh-acp-runtime-options") {
          const rowIndex = Number(payload.rowIndex);
          const row = normalizeDraftRows([payload.row])[0];
          const backendId = row?.internalId || "";
          void refreshAcpRuntimeOptionsFromDraft({
            row,
          })
            .then(async (result) => {
              const updatedRow = normalizeDraftRows([payload.row])[0];
              updatedRow.acp = result.backend.acp;
              await persistAcpBackendProbeResultFromDraft(updatedRow);
              postToFrame("backend-manager-dialog:action-result", {
                action,
                rowIndex,
                backendId,
                acp: result.backend.acp,
                ok: result.ok,
              });
            })
            .catch((error) => {
              postToFrame("backend-manager-dialog:action-result", {
                action,
                rowIndex,
                backendId,
                acp: {
                  connectionTest: {
                    status: "failed",
                    testedAt: new Date().toISOString(),
                    error: String(error),
                  },
                },
                error: String(error),
                ok: false,
              });
            });
          return;
        }
        if (action === "add-acp-preset") {
          try {
            const presetId = String(payload.presetId || "").trim();
            const useNpx =
              typeof payload.useNpx === "boolean" ? payload.useNpx : undefined;
            const isolated =
              typeof payload.isolated === "boolean"
                ? payload.isolated
                : undefined;
            const preset = findAcpBackendPreset(presetId);
            if (!preset) {
              throw new Error(`Unknown ACP backend preset: ${presetId}`);
            }
            const draftRow = editableRowFromAcpBackendPresetOptions({
              presetId,
              useNpx,
              isolated,
            });
            const existingIds = new Set(
              normalizeDraftRows(payload.rows || currentDraftRows)
                .map((row) => row.internalId)
                .filter(Boolean),
            );
            if (existingIds.has(draftRow.internalId)) {
              throw new Error(
                getString("backend-manager-acp-preset-exists" as any, {
                  args: { name: preset.displayName },
                }),
              );
            }
            postToFrame("backend-manager-dialog:action-result", {
              action,
              row: editableRowToDraft(draftRow),
            });
          } catch (error) {
            alertWindow?.alert?.(String(error));
          }
        }
      };
      dialogWindow?.addEventListener("message", onMessage);
      removeMessageListener = () => {
        dialogWindow?.removeEventListener("message", onMessage);
      };
      frame.addEventListener("load", () => {
        frameWindow = resolveFrameWindow(frame);
        activeBackendManagerFrameWindow = frameWindow;
        pushSnapshot("backend-manager-dialog:init");
      });
      root.appendChild(frame);
      frame.src = resolveBackendManagerPageUrl();
      installBackendManagerBeforeUnloadPrompt(doc, dialogData);
    },
    unloadCallback: () => {
      if (removeMessageListener) {
        removeMessageListener();
        removeMessageListener = undefined;
      }
      frameWindow = null;
      activeBackendManagerFrameWindow = null;
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
        width: "100%",
        height: "100%",
        minWidth: "1040px",
        minHeight: "620px",
        padding: "0",
        margin: "0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      },
    })
    .setDialogData(dialogData)
    .open(getString("backend-manager-title" as any), {
      centerscreen: true,
      resizable: true,
      fitContent: false,
      width: 1180,
      height: 700,
    });

  addon.data.dialog = dialogHelper;
  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;
  addon.data.dialog = undefined;
}
