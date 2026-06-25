import {
  buildSelectionContext,
  type SelectionContext,
} from "./selectionContext";
import { isDebugModeEnabled } from "./debugMode";
import {
  openWorkflowEditorSession,
  type WorkflowEditorRenderer,
} from "./workflowEditorHost";
import { copyText } from "../utils/ztoolkit";
import { appendRuntimeLog } from "./runtimeLogManager";
import {
  resolveRuntimeAddon,
  resolveRuntimeHostCapabilities,
} from "../utils/runtimeBridge";
import {
  createWorkflowHostApi,
  summarizeWorkflowHostApiCapabilities,
  WORKFLOW_HOST_API_VERSION,
} from "../workflows/hostApi";
import {
  getWorkflowRegistryState,
  getLoadedWorkflowSourceById,
} from "./workflowRuntime";
import {
  getVisibleLoadedWorkflowEntries,
  isWorkflowDebugOnly,
} from "./workflowVisibility";
import { resolveWorkflowExecutionContext } from "./workflowSettings";
import { resolveProvider } from "../providers/registry";
import { summarizeWorkflowExecutionError } from "../workflows/errorMeta";
import { summarizeWorkflowRuntimeCapabilities } from "./workflowPackageDiagnostics";
import type { LoadedWorkflow } from "../workflows/types";
import { evaluateWorkflowSelection } from "../workflows/workflowSelectionValidation";

export type WorkflowDebugProbeCheck = {
  workflowId: string;
  workflowLabel: string;
  packageId?: string;
  workflowSource: string;
  executionMode?: string;
  contract?: string;
  provider?: string;
  canRun: boolean;
  disabledReason?: string;
  failedStage?: string;
  requestCount?: number;
  hostApiVersion?: number;
  hostApiSummary: Record<string, unknown>;
  runtimeCapabilitySummary?: Record<string, unknown>;
  compiledHookSource?: string;
  capabilitySource?: string;
  error?: {
    message?: string;
    stack?: string;
  };
};

export type WorkflowDebugProbeResult = {
  generatedAt: string;
  debugMode: boolean;
  selectionSummary: {
    selectionType: string;
    selectedItemIds: number[];
    summary: Record<string, unknown>;
    warnings: string[];
  };
  runtimeSummary: {
    builtinWorkflowsDir: string;
    officialWorkflowsDir: string;
    workflowsDir: string;
    loadedWorkflowCount: number;
    loadedBuiltinWorkflowCount: number;
    loadedOfficialWorkflowCount: number;
    loadedUserWorkflowCount: number;
    zoteroVersion?: string;
    latestBuiltinSync?: unknown;
    latestContentInstall?: unknown;
  };
  workflowChecks: WorkflowDebugProbeCheck[];
};

type WorkflowDebugProbeBridge = {
  run: (args: {
    selectionContext: unknown;
    workflowId?: string;
  }) => Promise<WorkflowDebugProbeResult>;
};

function compactError(error: unknown) {
  const text = String(error || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "unknown error";
  }
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function escapeHtml(input: string) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    return "no valid input";
  }
  return compactError(error);
}

function resolveFailureStage(error: unknown, fallback: string) {
  const summary = summarizeWorkflowExecutionError(error);
  if (summary.hookName) {
    return summary.hookName;
  }
  return fallback;
}

function extractSelectionItemIds(selectionContext: unknown) {
  const context = (selectionContext || {}) as {
    items?: {
      parents?: Array<{ item?: { id?: number } }>;
      children?: Array<{ item?: { id?: number } }>;
      attachments?: Array<{ item?: { id?: number } }>;
      notes?: Array<{ item?: { id?: number } }>;
    };
  };
  const ids = new Set<number>();
  const groups = context.items || {};
  const collect = (entries?: Array<{ item?: { id?: number } }>) => {
    for (const entry of entries || []) {
      const id = Number(entry?.item?.id || 0);
      if (Number.isFinite(id) && id > 0) {
        ids.add(Math.floor(id));
      }
    }
  };
  collect(groups.parents);
  collect(groups.children);
  collect(groups.attachments);
  collect(groups.notes);
  return Array.from(ids.values());
}

function resolveSelectedItemsFromSelectionContext(selectionContext: unknown) {
  const ids = extractSelectionItemIds(selectionContext);
  const items: Zotero.Item[] = [];
  for (const id of ids) {
    const item = Zotero.Items.get(id);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

function createRuntimeCapabilitySummary() {
  const hostCapabilities = resolveRuntimeHostCapabilities();
  return summarizeWorkflowRuntimeCapabilities({
    zotero: hostCapabilities.zotero,
    addon: hostCapabilities.addon,
    fetch: hostCapabilities.fetch,
    Buffer: hostCapabilities.Buffer,
    btoa: hostCapabilities.btoa,
    atob: hostCapabilities.atob,
    TextEncoder: hostCapabilities.TextEncoder,
    TextDecoder: hostCapabilities.TextDecoder,
    FileReader: hostCapabilities.FileReader,
    navigator: hostCapabilities.navigator,
  });
}

function createHostApiSummary() {
  return summarizeWorkflowHostApiCapabilities(createWorkflowHostApi());
}

export async function collectWorkflowDebugProbeChecks(args: {
  selectionContext: SelectionContext;
  workflows?: LoadedWorkflow[];
  excludeWorkflowIds?: string[];
}) {
  const excluded = new Set(
    (args.excludeWorkflowIds || [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean),
  );
  const workflows = (
    args.workflows || getVisibleLoadedWorkflowEntries()
  ).filter(
    (entry) => !excluded.has(entry.manifest.id) && !isWorkflowDebugOnly(entry),
  );
  const runtimeCapabilitySummary = createRuntimeCapabilitySummary();
  const hostApiSummary = createHostApiSummary();
  const checks: WorkflowDebugProbeCheck[] = [];
  for (const workflow of workflows) {
    const base = {
      workflowId: workflow.manifest.id,
      workflowLabel: workflow.manifest.label,
      packageId: workflow.packageId,
      workflowSource: getLoadedWorkflowSourceById(workflow.manifest.id),
      executionMode: workflow.hookExecutionMode || "node-native-module",
      contract:
        workflow.hookExecutionMode === "precompiled-host-hook"
          ? "package-host-api-facade"
          : "legacy-runtime-context",
      hostApiVersion: WORKFLOW_HOST_API_VERSION,
      hostApiSummary,
      runtimeCapabilitySummary,
      compiledHookSource:
        workflow.hookExecutionMode === "precompiled-host-hook"
          ? "scan-time-precompile"
          : undefined,
    };
    let executionContext:
      | Awaited<ReturnType<typeof resolveWorkflowExecutionContext>>
      | undefined;
    try {
      executionContext = await resolveWorkflowExecutionContext({
        workflow,
      });
    } catch (error) {
      const normalized = summarizeWorkflowExecutionError(error);
      checks.push({
        ...base,
        canRun: false,
        provider: String(workflow.manifest.provider || "").trim() || undefined,
        disabledReason: resolveDisabledReason(error),
        failedStage: "execution-context",
        capabilitySource: normalized.capabilitySource,
        error: {
          message: normalized.message,
          stack: normalized.stack,
        },
      });
      continue;
    }
    let providerId = executionContext.providerId;
    try {
      const provider = resolveProvider({
        requestKind: executionContext.requestKind,
        backend: executionContext.backend,
      });
      providerId = provider.id;
    } catch (error) {
      const normalized = summarizeWorkflowExecutionError(error);
      checks.push({
        ...base,
        canRun: false,
        provider: providerId,
        disabledReason: resolveDisabledReason(error),
        failedStage: "provider-resolution",
        capabilitySource: normalized.capabilitySource,
        error: {
          message: normalized.message,
          stack: normalized.stack,
        },
      });
      continue;
    }
    try {
      const selectionValidation = await evaluateWorkflowSelection({
        workflow,
        selectionContext: args.selectionContext,
        mode: "menu",
        executionOptions: {
          workflowParams: executionContext.workflowParams,
          providerOptions: executionContext.providerOptions,
        },
      });
      if (selectionValidation.state === "disabled") {
        const error = new Error(
          `Workflow ${workflow.manifest.id} has no valid input units after filtering`,
        );
        (error as { code?: string }).code = "NO_VALID_INPUT_UNITS";
        throw error;
      }
      checks.push({
        ...base,
        provider: providerId,
        canRun: true,
        requestCount: selectionValidation.stats.validUnits,
      });
    } catch (error) {
      const normalized = summarizeWorkflowExecutionError(error);
      checks.push({
        ...base,
        canRun: false,
        provider: providerId,
        disabledReason: resolveDisabledReason(error),
        failedStage: resolveFailureStage(error, "selection-validation"),
        capabilitySource: normalized.capabilitySource,
        error: {
          message: normalized.message,
          stack: normalized.stack,
        },
      });
    }
  }
  return checks;
}

function buildProbeRenderer(
  result: WorkflowDebugProbeResult,
): WorkflowEditorRenderer {
  return {
    render(args: {
      doc: Document;
      root: HTMLElement;
      state: unknown;
      host: {
        rerender: () => void;
        patchState: (updater: (state: unknown) => void) => void;
        closeWithAction: (actionId?: string) => void;
        setFooterVisible: (visible: boolean) => void;
      };
    }) {
      const { doc, root } = args;
      root.innerHTML = "";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.gap = "12px";
      root.style.width = "100%";
      root.style.minWidth = "0";
      root.style.boxSizing = "border-box";

      const make = <K extends keyof HTMLElementTagNameMap>(tag: K) =>
        doc.createElementNS(
          "http://www.w3.org/1999/xhtml",
          tag,
        ) as HTMLElementTagNameMap[K];

      const title = make("h2");
      title.textContent = "Workflow Debug Probe";
      title.style.margin = "0";
      root.appendChild(title);

      const summary = make("div");
      summary.style.fontSize = "13px";
      summary.style.lineHeight = "1.5";
      summary.innerHTML = [
        `<div><strong>Debug Mode:</strong> ${result.debugMode ? "on" : "off"}</div>`,
        `<div><strong>Selection:</strong> ${result.selectionSummary.selectionType} / ids=${result.selectionSummary.selectedItemIds.join(",") || "-"}</div>`,
        `<div><strong>Workflows Root:</strong> ${result.runtimeSummary.workflowsDir || "-"}</div>`,
        `<div><strong>Official Root:</strong> ${result.runtimeSummary.officialWorkflowsDir || result.runtimeSummary.builtinWorkflowsDir || "-"}</div>`,
        `<div><strong>Loaded Workflows:</strong> ${String(result.runtimeSummary.loadedWorkflowCount || 0)}</div>`,
        `<div><strong>Loaded Official:</strong> ${String(result.runtimeSummary.loadedOfficialWorkflowCount || result.runtimeSummary.loadedBuiltinWorkflowCount || 0)}</div>`,
        `<div><strong>Loaded User:</strong> ${String(result.runtimeSummary.loadedUserWorkflowCount || 0)}</div>`,
        `<div><strong>Zotero Version:</strong> ${escapeHtml(result.runtimeSummary.zoteroVersion || "-")}</div>`,
        result.runtimeSummary.latestContentInstall ||
        result.runtimeSummary.latestBuiltinSync
          ? `<pre>${escapeHtml(JSON.stringify(result.runtimeSummary.latestContentInstall || result.runtimeSummary.latestBuiltinSync, null, 2))}</pre>`
          : "",
      ].join("");
      root.appendChild(summary);

      const tableWrap = make("div");
      tableWrap.style.overflow = "auto";
      tableWrap.style.maxHeight = "520px";
      tableWrap.style.border = "1px solid #d0d7de";
      tableWrap.style.borderRadius = "6px";
      root.appendChild(tableWrap);

      const table = make("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      tableWrap.appendChild(table);

      const thead = make("thead");
      const headerRow = make("tr");
      for (const label of [
        "Workflow",
        "Package",
        "Source",
        "Preflight",
        "Reason",
      ]) {
        const th = make("th");
        th.textContent = label;
        th.style.textAlign = "left";
        th.style.padding = "8px";
        th.style.borderBottom = "1px solid #d0d7de";
        th.style.background = "#f6f8fa";
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = make("tbody");
      for (const check of result.workflowChecks) {
        const row = make("tr");
        const values = [
          check.workflowLabel || check.workflowId,
          check.packageId || "-",
          check.workflowSource || "-",
          check.canRun ? "enabled" : check.failedStage || "disabled",
          check.canRun
            ? `requestCount=${String(check.requestCount || 0)}`
            : check.disabledReason || check.error?.message || "-",
        ];
        for (const value of values) {
          const td = make("td");
          td.textContent = value;
          td.style.padding = "8px";
          td.style.borderBottom = "1px solid #eaeef2";
          td.style.verticalAlign = "top";
          row.appendChild(td);
        }
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
    },
    serialize() {
      return result;
    },
  };
}

async function openWorkflowDebugProbeDialog(args: {
  result: WorkflowDebugProbeResult;
}) {
  const renderer = buildProbeRenderer(args.result);
  const dialogArgs = {
    rendererId: "workflow-debug-probe-renderer",
    title: "Workflow Debug Probe",
    initialState: {},
    renderer,
    layout: {
      width: 1180,
      minWidth: 900,
      maxWidth: 1500,
      height: 760,
      minHeight: 620,
      maxHeight: 980,
    },
    actions: [
      {
        id: "copy-json",
        label: "Copy JSON",
        noClose: true,
        onClick: () => {
          copyText(JSON.stringify(args.result, null, 2));
        },
      },
      {
        id: "close",
        label: "Close",
      },
    ],
    closeActionId: "close",
  };
  await openWorkflowEditorSession(dialogArgs);
}

export async function runWorkflowDebugProbe(args: {
  selectionContext: unknown;
  workflowId?: string;
}) {
  const selectedItems = resolveSelectedItemsFromSelectionContext(
    args.selectionContext,
  );
  const rebuiltSelectionContext = await buildSelectionContext(selectedItems);
  const workflowChecks = await collectWorkflowDebugProbeChecks({
    selectionContext: rebuiltSelectionContext,
    excludeWorkflowIds: [String(args.workflowId || "").trim()],
  });
  const registryState = getWorkflowRegistryState();
  const result: WorkflowDebugProbeResult = {
    generatedAt: new Date().toISOString(),
    debugMode: isDebugModeEnabled(),
    selectionSummary: {
      selectionType: rebuiltSelectionContext.selectionType,
      selectedItemIds: extractSelectionItemIds(rebuiltSelectionContext),
      summary: { ...rebuiltSelectionContext.summary },
      warnings: [...rebuiltSelectionContext.warnings],
    },
    runtimeSummary: {
      builtinWorkflowsDir: registryState.builtinWorkflowsDir,
      officialWorkflowsDir: registryState.officialWorkflowsDir,
      workflowsDir: registryState.workflowsDir,
      loadedWorkflowCount: registryState.loaded.workflows.length,
      loadedBuiltinWorkflowCount:
        registryState.loadedFromBuiltin.workflows.length,
      loadedOfficialWorkflowCount:
        registryState.loadedFromOfficial.workflows.length,
      loadedUserWorkflowCount: registryState.loadedFromUser.workflows.length,
      zoteroVersion: String(
        (globalThis as { Zotero?: { version?: unknown } }).Zotero?.version ||
          "",
      ),
      latestBuiltinSync: registryState.latestBuiltinSync,
      latestContentInstall: registryState.latestContentInstall,
    },
    workflowChecks,
  };
  appendRuntimeLog({
    level: "info",
    scope: "workflow-trigger",
    workflowId: String(args.workflowId || "workflow-debug-probe").trim(),
    providerId: "pass-through",
    stage: "workflow-debug-probe-finished",
    message: "workflow debug probe finished",
    details: result,
  });
  await openWorkflowDebugProbeDialog({
    result,
  });
  return result;
}

export function installWorkflowDebugProbeBridge() {
  const bridge: WorkflowDebugProbeBridge = {
    run: (args) =>
      runWorkflowDebugProbe({
        selectionContext: args.selectionContext,
        workflowId: args.workflowId,
      }),
  };
  const runtimeAddon = resolveRuntimeAddon();
  if (!runtimeAddon?.data) {
    return bridge;
  }
  (
    runtimeAddon.data as unknown as {
      workflowDebugProbe?: WorkflowDebugProbeBridge;
    }
  ).workflowDebugProbe = bridge;
  return bridge;
}

export const __workflowDebugProbeTestOnly = {
  buildProbeRenderer,
  extractSelectionItemIds,
  resolveSelectedItemsFromSelectionContext,
};
