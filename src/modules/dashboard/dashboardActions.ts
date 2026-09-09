import { version } from "../../../package.json";
import type { BackendInstance } from "../../backends/types";
import {
  ACP_SKILL_RUN_REQUEST_KIND,
  PASS_THROUGH_BACKEND_TYPE,
} from "../../config/defaults";
import type { WorkflowQueueEntryId } from "../../jobQueue/workflowSubmissionQueueContracts";
import { workflowSubmissionQueue } from "../../jobQueue/workflowSubmissionQueue";
import { openRuntimeFilePicker } from "../../platform/filePicker";
import { refreshSkillRunnerModelCacheForBackend } from "../../providers/skillrunner/modelCache";
import { isSkillRunnerRunTerminalClientError } from "../../providers/skillrunner/errors";
import type {
  DashboardActionEnvelope,
  DashboardMessageType,
  DashboardRuntimeLogFilters,
} from "../../shared/dashboardWireContract";
import { parseSupportedZoteroMajor } from "../../shared/zoteroRuntimeVersion";
import { openFolderInSystemFileManager } from "../../utils/fileSystem";
import { cancelAcpSkillRun } from "../acp/skillRun/acpSkillRunActions";
import { selectAcpSkillRun } from "../acp/skillRun/acpSkillRunWorkspaceSelection";
import { listAcpSkillRunSummaries } from "../acp/skillRun/acpSkillRunStore";
import { openAssistantWorkspaceSidebar } from "../assistant/workspace/assistantWorkspaceSidebar";
import { projectDashboardActiveTasks } from "../dashboardActiveTasks";
import { isDebugModeEnabled } from "../debugMode";
import { buildSkillRunnerManagementClient } from "../skillRunner/connection/skillRunnerManagementClientFactory";
import {
  resolveSkillRunnerManagementResponseSemantic,
  settleSkillRunnerRunAsFailed,
} from "../skillRunner/run/skillRunnerRunSettlement";
import {
  isTerminal,
  normalizeStatus,
} from "../skillRunner/run/skillRunnerProviderStateMachine";
import { stopSessionSync } from "../skillRunner/run/skillRunnerSessionSyncManager";
import {
  exportSkillRunFeedbackMarkdownFile,
  exportWorkflowProductToDirectory,
  getWorkflowProduct,
  listSkillRunFeedbackProducts,
  removeWorkflowProduct,
} from "../workflow/catalog/workflowProductStore";
import { getVisibleLoadedWorkflowEntries } from "../workflow/catalog/workflowVisibility";
import {
  buildWorkflowSettingsUiDescriptor,
  rebaseWorkflowProviderOptionsForBackendChange,
  updateWorkflowSettings,
} from "../workflow/settings/workflowSettings";
import type { WorkflowExecutionOptions } from "../workflow/settings/workflowSettingsDomain";
import {
  isWorkflowSettingsStructuralRefreshChange,
  normalizeWorkflowSettingsDraftChangeOrigin,
} from "../workflow/settings/workflowSettingsDialogModel";
import { triggerWorkflowFromUnifiedEntry } from "../workflow/ui/workflowMenu";
import {
  listActiveWorkflowTaskSummaries,
  updateWorkflowTaskStateByRequest,
} from "../taskRuntime";
import {
  listTaskDashboardHistory,
  updateTaskDashboardHistoryStateByRequest,
} from "../taskDashboardHistory";
import { mergeDashboardTaskRows } from "../taskDashboardSnapshot";
import {
  listRuntimeLogs,
  type RuntimeLogListFilters,
} from "../runtimeLogManager";
import {
  DEFAULT_RUNTIME_LOG_LEVELS,
  createDefaultRuntimeLogFilters,
  filterWorkflowSubmitVisibleBackends,
  fromBackendTabKey,
  isAcpBackend,
  isAcpSkillRunnerTask,
  isSkillRunnerBackend,
  isTerminalWorkflowTaskState,
  localize,
  mapTaskRow,
  maybeBuildSkillRunnerManagementUiUrl,
  resolveDashboardLiteratureMigrationService,
  resolveHomeWorkflowQuickRun,
  toBackendTabKey,
} from "./dashboardSnapshot";

export type DashboardActionState = {
  backends: BackendInstance[];
  selectedTabKey: string;
  selectedLiteratureMigrationRunId: string;
  selectedBackendSubviewById: Map<string, "runs" | "management">;
  selectedLogTaskByBackendId: Map<string, string>;
  selectedLogEntryByBackendId: Map<string, string>;
  selectedWorkflowOptionsWorkflowId: string;
  workflowSettingsDraftById: Map<string, WorkflowExecutionOptions>;
  workflowSettingsSaveStateById: Map<
    string,
    "idle" | "saving" | "saved" | "error"
  >;
  workflowSettingsSaveErrorById: Map<string, string>;
  workflowSettingsSaveTimerById: Map<string, number>;
  runtimeLogFilters: DashboardRuntimeLogFilters;
  runtimeLogSelectedIdSet: Set<string>;
  homeWorkflowDocWorkflowId: string;
  selectedProductId: string;
  selectedProductAssetId: string;
  selectedProductSection: "products" | "feedback";
  selectedFeedbackProductId: string;
  feedbackSkillFilter: string;
  selectedFeedbackProductIds: Set<string>;
  productExportInProgress: boolean;
};

type ActionRefreshReason =
  | "init"
  | "diagnostic-update"
  | "user-action"
  | "save-state"
  | "queue-update";

type DashboardActionContext = {
  state: DashboardActionState;
  enqueueRefresh: (
    messageType: DashboardMessageType,
    reason: ActionRefreshReason,
  ) => Promise<void>;
  refresh: (reason: ActionRefreshReason) => void;
  ensureBackendInteractable: (backendId: unknown) => boolean;
  alertRuntimeWindow: (message: string) => void;
  confirmRuntimeWindow: (message: string) => boolean;
  getRuntimeWindow: () => Window;
  getChromeWindow: () => _ZoteroTypes.MainWindow | undefined;
  clearManagement: () => void;
  mountManagement: (payload: Record<string, unknown> | undefined) => void;
  invalidateHomeWorkflowSummaries: () => void;
};

export function compactError(error: unknown) {
  const text = String(error || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "unknown error";
  }
  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

function resolveAcpRuntimeCaptureEnvironment() {
  const zoteroVersion = String(Zotero?.version || "unknown").trim();
  const zoteroMajor = parseSupportedZoteroMajor(zoteroVersion);
  const platform = Zotero?.isWin ? "win32" : Zotero?.isMac ? "darwin" : "linux";
  return {
    pluginVersion: version,
    zoteroVersion,
    zoteroMajor,
    platform,
  } as const;
}

function applyDashboardManagementStatus(args: {
  backend: BackendInstance;
  requestId: string;
  status: unknown;
  message?: string;
}) {
  const status = normalizeStatus(args.status, "running");
  const updatedAt = new Date().toISOString();
  const error =
    status === "failed" || !isTerminal(status)
      ? String(args.message || "").trim() || undefined
      : undefined;
  updateWorkflowTaskStateByRequest({
    backendId: args.backend.id,
    backendType: args.backend.type,
    requestId: args.requestId,
    state: status,
    backendStatus: status,
    error,
    updatedAt,
  });
  updateTaskDashboardHistoryStateByRequest({
    backendId: args.backend.id,
    requestId: args.requestId,
    state: status,
    error,
    updatedAt,
  });
  if (isTerminal(status)) {
    stopSessionSync({
      backendId: args.backend.id,
      requestId: args.requestId,
    });
  }
  return {
    status,
    error,
    terminal: isTerminal(status),
  };
}

function normalizeDraftChangedSection(raw: unknown) {
  const section = String(raw || "").trim();
  if (
    section === "backend" ||
    section === "workflowParams" ||
    section === "providerOptions"
  ) {
    return section;
  }
  return "";
}

function normalizeDraftChangedKey(raw: unknown) {
  return String(raw || "").trim();
}

export function clearWorkflowSettingsSaveTimer(
  state: DashboardActionState,
  workflowId: string,
  hostWindow?: Window | null,
) {
  const timerWindow = hostWindow;
  if (!timerWindow) {
    return;
  }
  const keys = Array.from(state.workflowSettingsSaveTimerById.keys()).filter(
    (key) => key === workflowId || key.startsWith(`${workflowId}:`),
  );
  for (const key of keys) {
    const timer = state.workflowSettingsSaveTimerById.get(key);
    if (timer) {
      timerWindow.clearTimeout(timer);
    }
    state.workflowSettingsSaveTimerById.delete(key);
  }
}

export function normalizeFilteredHistory(args?: {
  backendId?: string;
  requestId?: string;
}) {
  return listTaskDashboardHistory(args).filter(
    (entry) => entry.backendType !== PASS_THROUGH_BACKEND_TYPE,
  );
}

export function normalizeFilteredActive(args?: {
  backendId?: string;
  requestId?: string;
}) {
  return projectDashboardActiveTasks({
    activeTasks: listActiveWorkflowTaskSummaries(args),
    acpSkillRuns: listAcpSkillRunSummaries({
      activeOnly: true,
      backendId: args?.backendId,
      requestId: args?.requestId,
    }),
    scope: args,
  });
}

export function createDashboardActionDispatcher(
  context: DashboardActionContext,
) {
  const {
    state,
    enqueueRefresh,
    refresh,
    ensureBackendInteractable,
    alertRuntimeWindow,
    confirmRuntimeWindow,
    getRuntimeWindow,
    getChromeWindow,
    clearManagement,
    mountManagement,
    invalidateHomeWorkflowSummaries,
  } = context;
  return async (envelope: DashboardActionEnvelope) => {
    const action = String(envelope.action || "").trim();
    const payload = envelope.payload || {};
    if (!action) {
      return;
    }
    if (action === "ready") {
      void enqueueRefresh("dashboard:init", "init");
      return;
    }
    if (action === "select-tab") {
      const requestedTabKey = String(payload.tabKey || "home").trim() || "home";
      const requestedBackendId = fromBackendTabKey(requestedTabKey);
      if (
        requestedBackendId &&
        !ensureBackendInteractable(requestedBackendId)
      ) {
        return;
      }
      state.selectedTabKey = requestedTabKey;
      if (state.selectedTabKey !== "home") {
        state.homeWorkflowDocWorkflowId = "";
      }
      refresh("user-action");
      return;
    }
    if (action.startsWith("literature-migration-")) {
      const service = resolveDashboardLiteratureMigrationService();
      if (!service) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-literature-migration-unavailable",
            "Literature artifact migration is unavailable in this runtime.",
          ),
        );
        return;
      }
      try {
        if (action === "literature-migration-scan") {
          const libraryId = Number(payload.libraryId);
          if (!Number.isSafeInteger(libraryId) || libraryId <= 0) {
            alertRuntimeWindow("A valid library is required for migration.");
            return;
          }
          const result = await service.scan({ libraryId });
          if (!result.ok) {
            alertRuntimeWindow(result.message);
          } else {
            state.selectedLiteratureMigrationRunId = result.runId;
          }
        } else if (action === "literature-migration-apply") {
          const result = await service.apply({
            scanOperationId: String(payload.scanOperationId || ""),
            candidateIds: Array.isArray(payload.candidateIds)
              ? payload.candidateIds
                  .map((value) => String(value || ""))
                  .filter(Boolean)
              : [],
            reviewAcceptedCandidateIds: Array.isArray(
              payload.reviewAcceptedCandidateIds,
            )
              ? payload.reviewAcceptedCandidateIds
                  .map((value) => String(value || ""))
                  .filter(Boolean)
              : [],
            migrationId: String(payload.migrationId || "") || undefined,
            definitionVersion:
              typeof payload.definitionVersion === "number"
                ? payload.definitionVersion
                : undefined,
          });
          if (!result.ok) alertRuntimeWindow(result.message);
        } else if (action === "literature-migration-stop") {
          const result = service.stop({ runId: String(payload.runId || "") });
          if (!result.ok) alertRuntimeWindow(result.message);
        } else if (action === "literature-migration-continue") {
          const result = await service.continue({
            runId: String(payload.runId || ""),
            candidateIds: Array.isArray(payload.candidateIds)
              ? payload.candidateIds
                  .map((value) => String(value || ""))
                  .filter(Boolean)
              : undefined,
          });
          if (!result.ok) alertRuntimeWindow(result.message);
          else state.selectedLiteratureMigrationRunId = result.runId;
        } else if (action === "literature-migration-select-run") {
          state.selectedLiteratureMigrationRunId = String(payload.runId || "");
        }
        refresh("user-action");
      } catch (error) {
        alertRuntimeWindow(
          `Literature migration action failed: ${compactError(error)}`,
        );
      }
      return;
    }
    if (
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
      __acp_runtime_semantic_trace_recorder_enabled__ &&
      action.startsWith("acp-trace-recorder-")
    ) {
      try {
        const recorder =
          await import("../acp/diagnostics/acpRuntimeSemanticTraceRecorder");
        if (action === "acp-trace-recorder-start") {
          await recorder.armAcpRuntimeSemanticTraceRecorder({
            sourceKind:
              payload.sourceKind === "acp-workflow-execution"
                ? "acp-workflow-execution"
                : "acp-chat-conversation",
            limits: {
              maxBytes: Number(payload.maxBytes || 0) || undefined,
              maxEvents: Number(payload.maxEvents || 0) || undefined,
              maxEventBytes: Number(payload.maxEventBytes || 0) || undefined,
            },
          });
        } else if (action === "acp-trace-recorder-finish") {
          await recorder.finishAcpRuntimeSemanticTraceRoot();
        } else if (action === "acp-trace-recorder-cancel") {
          await recorder.cancelAcpRuntimeSemanticTraceRecorder();
        } else if (action === "acp-trace-recorder-reset") {
          await recorder.resetAcpRuntimeSemanticTraceRecorder();
        } else if (action === "acp-trace-recorder-save") {
          const saved = await recorder.saveFrozenAcpRuntimeSemanticTrace();
          if (__acp_runtime_replay_profiler_enabled__) {
            const replay =
              await import("../acp/diagnostics/acpRuntimeReplayController");
            await replay.preflightAcpRuntimeReplayTrace({
              tracePath: saved.path,
            });
          }
        } else if (action === "acp-trace-recorder-open-folder") {
          const folder =
            recorder.getAcpRuntimeSemanticTraceRecorderView().folder;
          if (!folder) throw new Error("ACP trace folder is unavailable");
          openFolderInSystemFileManager(folder, { label: "ACP trace folder" });
        }
      } catch (error) {
        alertRuntimeWindow(
          `ACP Trace Recorder action failed: ${compactError(error)}`,
        );
      }
      refresh("user-action");
      return;
    }
    if (
      (typeof __debug_mode__ === "undefined"
        ? isDebugModeEnabled()
        : __debug_mode__) &&
      __acp_runtime_replay_profiler_enabled__ &&
      (action.startsWith("acp-replay-profiler-") ||
        action.startsWith("acp-replay-trace-"))
    ) {
      try {
        const replay =
          await import("../acp/diagnostics/acpRuntimeReplayController");
        if (action === "acp-replay-trace-browse") {
          replay.setAcpRuntimeReplayDraft({
            phase: String(payload.phase || ""),
            cadence: replay.parseAcpRuntimeReplayCadence(payload.cadence),
          });
          const selected = await openRuntimeFilePicker({
            title: localize(
              "task-dashboard-acp-replay-select-file-title",
              "Select ACP semantic trace",
            ),
            mode: "open",
            filters: [
              [
                localize(
                  "task-dashboard-acp-replay-trace-filter",
                  "ACP semantic trace",
                ),
                "*.ndjson",
              ],
            ],
          });
          if (typeof selected === "string") {
            await replay.preflightAcpRuntimeReplayTrace({
              tracePath: selected,
            });
          }
        } else if (action === "acp-replay-trace-preflight") {
          replay.setAcpRuntimeReplayDraft({
            phase: String(payload.phase || ""),
            cadence: replay.parseAcpRuntimeReplayCadence(payload.cadence),
          });
          await replay.preflightAcpRuntimeReplayTrace({
            tracePath: String(payload.tracePath || ""),
          });
        } else if (action === "acp-replay-profiler-set-draft") {
          replay.setAcpRuntimeReplayDraft({
            phase: String(payload.phase || ""),
            cadence: replay.parseAcpRuntimeReplayCadence(payload.cadence),
          });
        } else if (action === "acp-replay-profiler-start") {
          const environment = resolveAcpRuntimeCaptureEnvironment();
          await replay.startAcpRuntimeReplayController({
            tracePath: String(payload.tracePath || ""),
            phase: String(payload.phase || ""),
            cadence: replay.parseAcpRuntimeReplayCadence(payload.cadence),
            environment: {
              pluginVersion: environment.pluginVersion,
              zoteroVersion: environment.zoteroVersion,
              platform: environment.platform,
            },
            onViewChange: () =>
              enqueueRefresh("dashboard:snapshot", "diagnostic-update"),
          });
        } else if (action === "acp-replay-profiler-cancel") {
          replay.cancelAcpRuntimeReplayController();
        } else if (action === "acp-replay-profiler-open-folder") {
          const folder =
            replay.getAcpRuntimeReplayControllerView().resultFolder;
          if (!folder)
            throw new Error("ACP replay result folder is unavailable");
          openFolderInSystemFileManager(folder, {
            label: "ACP replay result folder",
          });
        }
      } catch (error) {
        alertRuntimeWindow(
          `ACP Replay Profiler action failed: ${compactError(error)}`,
        );
      }
      refresh("user-action");
      return;
    }
    if (action === "select-product") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "products";
      state.selectedProductId = String(payload.productId || "").trim();
      state.selectedProductAssetId = "";
      refresh("user-action");
      return;
    }
    if (action === "select-product-asset") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "products";
      state.selectedProductId = String(payload.productId || "").trim();
      state.selectedProductAssetId = String(payload.assetId || "").trim();
      refresh("user-action");
      return;
    }
    if (action === "select-product-section") {
      state.selectedTabKey = "products";
      state.selectedProductSection =
        String(payload.section || "").trim() === "feedback"
          ? "feedback"
          : "products";
      refresh("user-action");
      return;
    }
    if (action === "select-feedback-skill-filter") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      state.feedbackSkillFilter = String(payload.skillId || "").trim();
      state.selectedFeedbackProductId = "";
      state.selectedFeedbackProductIds.clear();
      refresh("user-action");
      return;
    }
    if (action === "select-feedback-product") {
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      state.selectedFeedbackProductId = String(payload.productId || "").trim();
      refresh("user-action");
      return;
    }
    if (action === "toggle-feedback-product-selected") {
      const productId = String(payload.productId || "").trim();
      if (productId) {
        if (payload.selected === true) {
          state.selectedFeedbackProductIds.add(productId);
        } else {
          state.selectedFeedbackProductIds.delete(productId);
        }
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "toggle-all-feedback-products-selected") {
      const selected = payload.selected === true;
      const visibleFeedbackProducts = listSkillRunFeedbackProducts(
        state.feedbackSkillFilter,
      );
      for (const product of visibleFeedbackProducts) {
        const productId = String(product.productId || "").trim();
        if (!productId) {
          continue;
        }
        if (selected) {
          state.selectedFeedbackProductIds.add(productId);
        } else {
          state.selectedFeedbackProductIds.delete(productId);
        }
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "export-selected-feedback") {
      const productIds = Array.from(state.selectedFeedbackProductIds);
      if (productIds.length === 0) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-feedback-export-empty",
            "Select at least one feedback record to export.",
          ),
        );
        return;
      }
      try {
        const exported = await exportSkillRunFeedbackMarkdownFile(productIds);
        const folder = String(exported.filePath || "").replace(
          /[\\/][^\\/]*$/,
          "",
        );
        if (folder) {
          openFolderInSystemFileManager(folder, {
            label: "skill feedback export folder",
          });
        }
        alertRuntimeWindow(
          localize(
            "task-dashboard-feedback-export-success",
            "Skill feedback export file created.",
          ),
        );
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
    if (action === "delete-selected-feedback") {
      const visibleFeedbackProductIds = new Set(
        listSkillRunFeedbackProducts(state.feedbackSkillFilter)
          .map((product) => String(product.productId || "").trim())
          .filter(Boolean),
      );
      const productIds = Array.from(state.selectedFeedbackProductIds).filter(
        (productId) => visibleFeedbackProductIds.has(productId),
      );
      if (productIds.length === 0) {
        state.selectedTabKey = "products";
        state.selectedProductSection = "feedback";
        refresh("user-action");
        return;
      }
      const confirmed = confirmRuntimeWindow(
        localize(
          "task-dashboard-feedback-delete-selected-confirm",
          `Delete ${productIds.length} selected feedback record(s)?`,
          { args: { count: productIds.length } },
        ),
      );
      if (!confirmed) {
        return;
      }
      for (const productId of productIds) {
        removeWorkflowProduct(productId);
        state.selectedFeedbackProductIds.delete(productId);
      }
      if (productIds.includes(state.selectedFeedbackProductId)) {
        state.selectedFeedbackProductId = "";
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "delete-all-feedback") {
      const feedbackProducts = listSkillRunFeedbackProducts(
        state.feedbackSkillFilter,
      );
      const productIds = feedbackProducts
        .map((product) => String(product.productId || "").trim())
        .filter(Boolean);
      if (productIds.length === 0) {
        state.selectedTabKey = "products";
        state.selectedProductSection = "feedback";
        refresh("user-action");
        return;
      }
      const confirmed = confirmRuntimeWindow(
        localize(
          "task-dashboard-feedback-delete-all-confirm",
          `Delete all ${productIds.length} visible feedback record(s)?`,
          { args: { count: productIds.length } },
        ),
      );
      if (!confirmed) {
        return;
      }
      for (const productId of productIds) {
        removeWorkflowProduct(productId);
        state.selectedFeedbackProductIds.delete(productId);
      }
      if (productIds.includes(state.selectedFeedbackProductId)) {
        state.selectedFeedbackProductId = "";
      }
      state.selectedTabKey = "products";
      state.selectedProductSection = "feedback";
      refresh("user-action");
      return;
    }
    if (action === "open-product-folder") {
      if (state.productExportInProgress) return;
      const product = getWorkflowProduct(
        String(payload.productId || "").trim(),
      );
      if (!product) return;
      state.productExportInProgress = true;
      refresh("user-action");
      try {
        const selected = await openRuntimeFilePicker({
          title: localize(
            "task-dashboard-products-export-title",
            "Select Product export directory",
          ),
          mode: "folder",
        });
        if (typeof selected === "string") {
          await exportWorkflowProductToDirectory({
            productId: product.productId,
            outputDir: selected,
          });
          openFolderInSystemFileManager(selected, {
            label: "product export folder",
          });
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-products-export-failed",
            "Failed to export Product: {error}",
            { args: { error: compactError(error) } },
          ),
        );
      } finally {
        state.productExportInProgress = false;
        refresh("user-action");
      }
      return;
    }
    if (action === "remove-product") {
      const productId = String(payload.productId || "").trim();
      if (productId) {
        removeWorkflowProduct(productId);
        if (state.selectedProductId === productId) {
          state.selectedProductId = "";
          state.selectedProductAssetId = "";
        }
        refresh("user-action");
      }
      return;
    }
    if (action === "select-workflow-settings-workflow") {
      state.selectedWorkflowOptionsWorkflowId = String(
        payload.workflowId || "",
      ).trim();
      refresh("user-action");
      return;
    }
    if (action === "open-home-workflow-doc") {
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        return;
      }
      state.selectedTabKey = "home";
      state.homeWorkflowDocWorkflowId = workflowId;
      refresh("user-action");
      return;
    }
    if (action === "close-home-workflow-doc") {
      state.selectedTabKey = "home";
      state.homeWorkflowDocWorkflowId = "";
      refresh("user-action");
      return;
    }
    if (action === "open-home-workflow-settings") {
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        return;
      }
      state.homeWorkflowDocWorkflowId = "";
      state.selectedTabKey = "workflow-options";
      state.selectedWorkflowOptionsWorkflowId = workflowId;
      refresh("user-action");
      return;
    }
    if (action === "run-home-workflow") {
      const workflowId = String(payload.workflowId || "").trim();
      if (!workflowId) {
        return;
      }
      const quickRun = await resolveHomeWorkflowQuickRun({
        workflowId,
        backends: state.backends,
      });
      if (!quickRun.enabled || !quickRun.workflow) {
        alertRuntimeWindow(
          quickRun.reason ||
            localize(
              "workflow-execute-cannot-run",
              "Workflow cannot run from the dashboard shortcut",
            ),
        );
        return;
      }
      const chromeWindow = getChromeWindow();
      if (!chromeWindow) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-home-workflow-run-missing-window",
            "Unable to find the Zotero window for this workflow run.",
          ),
        );
        return;
      }
      state.selectedTabKey = "home";
      state.homeWorkflowDocWorkflowId = "";
      refresh("user-action");
      void triggerWorkflowFromUnifiedEntry({
        win: chromeWindow,
        workflow: quickRun.workflow,
        source: "dashboard-home",
      });
      return;
    }
    if (action === "workflow-settings-draft") {
      const workflowId = String(payload.workflowId || "").trim();
      const executionOptions =
        (payload.executionOptions as WorkflowExecutionOptions) || {};
      const changedSection = normalizeDraftChangedSection(
        payload.changedSection,
      );
      const changedKey = normalizeDraftChangedKey(payload.changedKey);
      const changeOrigin = normalizeWorkflowSettingsDraftChangeOrigin(
        payload.changedOrigin,
      );
      if (!workflowId) {
        return;
      }
      const workflow = getVisibleLoadedWorkflowEntries().find(
        (entry) => entry.manifest.id === workflowId,
      );
      let providerOptions = executionOptions.providerOptions || {};
      if (
        workflow &&
        changedSection === "backend" &&
        changedKey === "backendId"
      ) {
        const candidateBackends = filterWorkflowSubmitVisibleBackends(
          state.backends,
        );
        const previousDescriptor = await buildWorkflowSettingsUiDescriptor({
          workflow,
          candidateBackends,
          draft: state.workflowSettingsDraftById.get(workflowId),
          resolveDynamicOptions: false,
        });
        providerOptions = rebaseWorkflowProviderOptionsForBackendChange({
          workflow,
          previousBackendId: previousDescriptor.selectedProfile,
          nextBackendId: executionOptions.backendId,
          options: providerOptions,
          candidateBackends,
        });
      }
      state.workflowSettingsDraftById.set(workflowId, {
        backendId:
          typeof executionOptions.backendId === "string"
            ? executionOptions.backendId
            : undefined,
        workflowParams: executionOptions.workflowParams || {},
        providerOptions,
        hostOptions: executionOptions.hostOptions || {},
      });
      clearWorkflowSettingsSaveTimer(state, workflowId, getRuntimeWindow());
      state.workflowSettingsSaveStateById.set(workflowId, "saving");
      state.workflowSettingsSaveErrorById.delete(workflowId);
      if (
        isWorkflowSettingsStructuralRefreshChange({
          changedSection,
          changedKey,
          origin: changeOrigin,
        })
      ) {
        refresh("user-action");
      }
      const timer = getRuntimeWindow()?.setTimeout(() => {
        try {
          const draft = state.workflowSettingsDraftById.get(workflowId) || {};
          updateWorkflowSettings(workflowId, draft);
          invalidateHomeWorkflowSummaries();
          state.workflowSettingsSaveStateById.set(workflowId, "saved");
          state.workflowSettingsSaveErrorById.delete(workflowId);
          refresh("save-state");
          const idleTimer = getRuntimeWindow()?.setTimeout(() => {
            state.workflowSettingsSaveStateById.set(workflowId, "idle");
          }, 900);
          if (idleTimer) {
            state.workflowSettingsSaveTimerById.set(
              `${workflowId}:idle`,
              idleTimer,
            );
          }
        } catch (error) {
          state.workflowSettingsSaveStateById.set(workflowId, "error");
          state.workflowSettingsSaveErrorById.set(
            workflowId,
            compactError(error),
          );
        } finally {
          state.workflowSettingsSaveTimerById.delete(workflowId);
        }
      }, 420);
      if (timer) {
        state.workflowSettingsSaveTimerById.set(workflowId, timer);
      }
      return;
    }
    if (action === "open-running-task") {
      const taskId = String(payload.taskId || "").trim();
      const backendId = String(payload.backendId || "").trim();
      const requestId = String(payload.requestId || "").trim();
      const runKey = String(payload.runKey || "").trim();
      const payloadBackendType = String(payload.backendType || "").trim();
      const requestKind = String(payload.requestKind || "").trim();
      if (
        requestId &&
        (payloadBackendType === "acp" ||
          requestKind === ACP_SKILL_RUN_REQUEST_KIND ||
          taskId.startsWith("acp-skill-run:"))
      ) {
        await selectAcpSkillRun(requestId);
        await openAssistantWorkspaceSidebar({
          window: getChromeWindow(),
          tab: "acp-skills",
          requestId,
        });
        return;
      }
      if (!taskId || !backendId) {
        return;
      }
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      const backend = state.backends.find((entry) => entry.id === backendId);
      const backendType = String(backend?.type || payloadBackendType).trim();
      if (
        isAcpSkillRunnerTask({
          backendType,
          requestKind,
        })
      ) {
        if (requestId) {
          await selectAcpSkillRun(requestId);
        }
        await openAssistantWorkspaceSidebar({
          window: getChromeWindow(),
          tab: "acp-skills",
          requestId,
        });
        return;
      }
      if (backendType === "skillrunner") {
        if (!runKey) {
          return;
        }
        if (!backend || !isSkillRunnerBackend(backend)) {
          return;
        }
        await openAssistantWorkspaceSidebar({
          window: getChromeWindow(),
          tab: "skillrunner",
          runKey,
        });
        return;
      }
      if (backendType === "generic-http") {
        if (!backend) {
          return;
        }
        state.selectedTabKey = toBackendTabKey(backendId);
        state.selectedLogTaskByBackendId.set(backendId, taskId);
        state.selectedLogEntryByBackendId.delete(backendId);
        refresh("user-action");
      }
      return;
    }
    if (action === "open-acp-skill-runs") {
      const requestId = String(payload.requestId || "").trim();
      if (requestId) {
        await selectAcpSkillRun(requestId);
      }
      await openAssistantWorkspaceSidebar({
        window: getChromeWindow(),
        tab: "acp-skills",
        requestId,
      });
      return;
    }
    if (action === "view-logs" || action === "select-log-task") {
      const backendId = String(payload.backendId || "").trim();
      const taskId = String(payload.taskId || "").trim();
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      if (backendId && taskId) {
        state.selectedTabKey = toBackendTabKey(backendId);
        state.selectedLogTaskByBackendId.set(backendId, taskId);
        state.selectedLogEntryByBackendId.delete(backendId);
      }
      refresh("user-action");
      return;
    }
    if (action === "open-log-diagnostics") {
      const backendId = String(payload.backendId || "").trim();
      const taskId = String(payload.taskId || "").trim();
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !taskId) {
        return;
      }
      const taskReadScope = { backendId: backend.id };
      const active = normalizeFilteredActive(taskReadScope);
      const history = normalizeFilteredHistory(taskReadScope);
      const rows = mergeDashboardTaskRows({
        backendId: backend.id,
        history,
        active,
      }).map((entry) => mapTaskRow(entry));
      const selected = rows.find((row) => row.id === taskId);
      if (!selected) {
        state.selectedTabKey = "runtime-logs";
        state.runtimeLogFilters = {
          ...createDefaultRuntimeLogFilters(),
          backendId: backend.id,
          backendType: backend.type,
        };
        const { setRuntimeLogDiagnosticMode } =
          await import("../runtimeLogManager");
        setRuntimeLogDiagnosticMode(true);
        refresh("user-action");
        return;
      }
      state.selectedTabKey = "runtime-logs";
      state.runtimeLogFilters = {
        ...createDefaultRuntimeLogFilters(),
        backendId: backend.id,
        backendType: backend.type,
        workflowId: selected.workflowId,
        requestId: selected.requestId,
        jobId: selected.jobId,
        runId: selected.runId,
      };
      const { setRuntimeLogDiagnosticMode } =
        await import("../runtimeLogManager");
      setRuntimeLogDiagnosticMode(true);
      refresh("user-action");
      return;
    }
    if (action === "select-log-entry") {
      const backendId = String(payload.backendId || "").trim();
      const logEntryId = String(payload.logEntryId || "").trim();
      if (backendId && logEntryId) {
        state.selectedLogEntryByBackendId.set(backendId, logEntryId);
      }
      refresh("user-action");
      return;
    }
    if (action === "open-run") {
      const backendId = String(payload.backendId || "").trim();
      const requestId = String(payload.requestId || "").trim();
      const runKey = String(payload.runKey || "").trim();
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      if (backendId) {
        const backend = state.backends.find((entry) => entry.id === backendId);
        if (backend && isSkillRunnerBackend(backend)) {
          if (!runKey) {
            return;
          }
          await openAssistantWorkspaceSidebar({
            window: getChromeWindow(),
            tab: "skillrunner",
            runKey,
          });
        } else if (backend && isAcpBackend(backend) && requestId) {
          await selectAcpSkillRun(requestId);
          await openAssistantWorkspaceSidebar({
            window: getChromeWindow(),
            tab: "acp-skills",
            requestId,
          });
        }
      }
      return;
    }
    if (action === "open-management") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      if (!ensureBackendInteractable(backendId)) {
        return;
      }
      state.selectedTabKey = toBackendTabKey(backend.id);
      state.selectedBackendSubviewById.set(backend.id, "management");
      refresh("user-action");
      return;
    }
    if (action === "show-runs") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      state.selectedTabKey = toBackendTabKey(backend.id);
      state.selectedBackendSubviewById.set(backend.id, "runs");
      clearManagement();
      refresh("user-action");
      return;
    }
    if (action === "mount-management-host") {
      mountManagement(payload);
      return;
    }
    if (action === "open-management-external") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      const managementUiUrl = maybeBuildSkillRunnerManagementUiUrl(
        backend.baseUrl,
      );
      if (!managementUiUrl) {
        return;
      }
      const runtime = globalThis as {
        Zotero?: { launchURL?: (url: string) => void };
      };
      runtime.Zotero?.launchURL?.(managementUiUrl);
      return;
    }
    if (action === "refresh-model-cache") {
      const backendId = String(payload.backendId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !isSkillRunnerBackend(backend)) {
        return;
      }
      try {
        const refreshed = await refreshSkillRunnerModelCacheForBackend({
          backend,
        });
        if (!refreshed.ok) {
          throw new Error(String(refreshed.error || "unknown error"));
        }
        alertRuntimeWindow(
          localize(
            "backend-manager-refresh-model-cache-success",
            "Model cache refreshed. updatedAt={refreshedAt}",
            {
              args: {
                refreshedAt: String(refreshed.refreshedAt || ""),
              },
            },
          ),
        );
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "backend-manager-refresh-model-cache-failed",
            "Failed to refresh model cache: {error}",
            {
              args: {
                error: compactError(error),
              },
            },
          ),
        );
      }
      return;
    }
    if (action === "cancel-queued-workflow-unit") {
      const queueId = String(payload.queueId || "").trim();
      if (queueId) {
        workflowSubmissionQueue.cancel(queueId as WorkflowQueueEntryId);
      }
      refresh("queue-update");
      return;
    }
    if (action === "cancel-run") {
      const backendId = String(payload.backendId || "").trim();
      const requestId = String(payload.requestId || "").trim();
      const backend = state.backends.find((entry) => entry.id === backendId);
      if (!backend || !requestId) {
        return;
      }
      if (isAcpBackend(backend)) {
        try {
          await cancelAcpSkillRun(requestId);
        } catch (error) {
          alertRuntimeWindow(
            localize(
              "task-dashboard-skillrunner-cancel-failed",
              "Failed to cancel run: {error}",
              {
                args: {
                  error: compactError(error),
                },
              },
            ),
          );
        }
        refresh("user-action");
        return;
      }
      if (!isSkillRunnerBackend(backend)) {
        return;
      }
      const taskReadScope = { backendId: backend.id };
      const active = normalizeFilteredActive(taskReadScope);
      const history = normalizeFilteredHistory(taskReadScope);
      const rows = mergeDashboardTaskRows({
        backendId: backend.id,
        history,
        active,
      });
      const target = rows.find((row) => row.requestId === requestId);
      if (target && isTerminalWorkflowTaskState(target.state)) {
        refresh("user-action");
        return;
      }
      try {
        const client = buildSkillRunnerManagementClient({
          backend,
          alertWindow: getRuntimeWindow() || undefined,
          localize,
        });
        const response = await client.cancelRun({
          requestId,
        });
        const semantic = resolveSkillRunnerManagementResponseSemantic({
          response,
          fallbackStatus: target
            ? normalizeStatus(target.state, "running")
            : "running",
        });
        if (
          semantic.accepted === false ||
          semantic.status !== normalizeStatus(target?.state, "running")
        ) {
          const applied = applyDashboardManagementStatus({
            backend,
            requestId,
            status: semantic.status,
            message: semantic.message,
          });
          if (
            semantic.accepted === false &&
            semantic.message &&
            !applied.terminal
          ) {
            alertRuntimeWindow(semantic.message);
          }
        }
      } catch (error) {
        if (isSkillRunnerRunTerminalClientError(error)) {
          settleSkillRunnerRunAsFailed({
            backendId: backend.id,
            backendType: backend.type,
            providerId: "skillrunner",
            workflowId: target?.workflowId,
            runId: target?.runId,
            jobId: target?.jobId,
            requestId,
            reason: compactError(error),
            source: "task-dashboard-cancel",
            error,
          });
          refresh("user-action");
          return;
        }
        alertRuntimeWindow(
          localize(
            "task-dashboard-skillrunner-cancel-failed",
            "Failed to cancel run: {error}",
            {
              args: {
                error: compactError(error),
              },
            },
          ),
        );
      }
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-toggle-diagnostic") {
      const { setRuntimeLogDiagnosticMode } =
        await import("../runtimeLogManager");
      setRuntimeLogDiagnosticMode(Boolean(payload.enabled));
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-set-filters") {
      const incomingFilters = payload.filters;
      if (incomingFilters && typeof incomingFilters === "object") {
        state.runtimeLogFilters = {
          ...state.runtimeLogFilters,
          ...incomingFilters,
        };
      }
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-clear-context") {
      const levels = Array.isArray(state.runtimeLogFilters.levels)
        ? [...state.runtimeLogFilters.levels]
        : [...DEFAULT_RUNTIME_LOG_LEVELS];
      state.runtimeLogFilters = { levels };
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-clear") {
      const { clearRuntimeLogs } = await import("../runtimeLogManager");
      await clearRuntimeLogs();
      state.runtimeLogSelectedIdSet.clear();
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-select-entries") {
      const entryIds = Array.isArray(payload.entryIds) ? payload.entryIds : [];
      state.runtimeLogSelectedIdSet.clear();
      for (const id of entryIds) {
        if (typeof id === "string" && id) {
          state.runtimeLogSelectedIdSet.add(id);
        }
      }
      refresh("user-action");
      return;
    }
    if (action === "runtime-logs-copy-selected") {
      const format = String(payload.format || "pretty-json").trim();
      const entries = listRuntimeLogs({ order: "desc" }).filter((e) =>
        state.runtimeLogSelectedIdSet.has(e.id),
      );
      if (entries.length === 0) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-empty",
            "No log entries selected to copy.",
          ),
        );
        return;
      }
      try {
        const { buildLogCopyPayload } = await import("../runtimeLogManager");
        const { copyText } = await import("../../utils/ztoolkit");
        const textToCopy = buildLogCopyPayload({
          entries,
          format: format as any,
        });

        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
    }
    if (action === "runtime-logs-copy-entry") {
      const entryId = String(payload.entryId || "").trim();
      const format = String(payload.format || "pretty-json").trim();
      const entry = entryId
        ? listRuntimeLogs({ order: "desc" }).find((e) => e.id === entryId)
        : undefined;
      if (!entry) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-empty",
            "No log entries selected to copy.",
          ),
        );
        return;
      }
      try {
        const { buildLogCopyPayload } = await import("../runtimeLogManager");
        const textToCopy = buildLogCopyPayload({
          entries: [entry],
          format: format as any,
        });

        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
    if (action === "runtime-logs-copy-diagnostic-bundle") {
      try {
        const { buildRuntimeIssueDiagnosticBundle } =
          await import("../runtimeLogManager");
        const bundle = buildRuntimeIssueDiagnosticBundle({
          filters: state.runtimeLogFilters as RuntimeLogListFilters,
        });
        const textToCopy = JSON.stringify(bundle, null, 2);
        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
    if (action === "runtime-logs-copy-issue-summary") {
      try {
        const { buildRuntimeIssueSummary } =
          await import("../runtimeLogManager");
        const textToCopy = buildRuntimeIssueSummary({
          filters: {
            ...state.runtimeLogFilters,
            levels: ["debug", "info", "warn", "error"],
          },
        });
        const helper = (Components as any).classes?.[
          "@mozilla.org/widget/clipboardhelper;1"
        ]?.getService(Components.interfaces.nsIClipboardHelper) as {
          copyString?: (value: string) => void;
        };
        if (helper?.copyString) {
          helper.copyString(textToCopy);
        }
      } catch (error) {
        alertRuntimeWindow(
          localize(
            "task-dashboard-runtime-logs-copy-failed",
            "Failed to copy logs: {error}",
            {
              args: { error: compactError(error) },
            },
          ),
        );
      }
      return;
    }
  };
}
