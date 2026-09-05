// Page-side panel DTO and controller state types for the dashboard bundle.
//
// The page consumes the shared concrete wire snapshot directly. Region
// components in ./components define and export their render-ready selection
// types, which this module assembles into the panel DTO consumed by the chrome
// renderer.

import type {
  DashboardActionHandler,
  DashboardActionName,
  DashboardHostActionName,
  DashboardSnapshot,
} from "../shared/dashboardWireContract";
import type { DashboardLabels } from "./dashboardLabels";
import type { DashboardTabBarSelection } from "./components/TabBarRegion";
import type { DashboardHomeSelection } from "./components/HomeRegion";
import type { DashboardProductsSelection } from "./components/ProductsRegion";
import type { DashboardWorkflowOptionsSelection } from "./components/WorkflowOptionsRegion";
import type { DashboardRuntimeLogsSelection } from "./components/RuntimeLogsRegion";
import type {
  DashboardSynthesisSidecarSelection,
  DashboardSynthesisSidecarUiState,
} from "./components/SynthesisSidecarRegion";
import type { DashboardSkillrunnerAuditSelection } from "./components/SkillrunnerAuditRegion";
import type { DashboardAcpTraceReplaySelection } from "./components/AcpTraceReplayRegion";
import type { DashboardBackendSelection } from "./components/BackendRegion";

export type DashboardPageSnapshot = DashboardSnapshot;

/** Host-bound action sender. Page-local actions use DashboardActionDispatcher. */
export type DashboardActionSender =
  DashboardActionHandler<DashboardHostActionName>;

/** Controller action channel, including page-local synthesis trace actions. */
export type DashboardActionDispatcher =
  DashboardActionHandler<DashboardActionName>;

// Local UI state owned by the dashboard controller (plain object, no Preact
// store). These fields mirror the legacy page's imperative `state` slots
// that are driven by user interaction rather than by host snapshots.
export type DashboardUiState = {
  // Optimistic override of snapshot.selectedTabKey between a tab click and
  // the host's echo snapshot; cleared on every applied snapshot.
  selectedTabKey: string;
  // Synthesis sidecar trace filter/selection (legacy state.synthesisTraceFilter
  // / state.synthesisTraceId). The region's select/filter interactions are UI
  // intents: the controller writes them back here and re-projects
  // synchronously; they never reach the host.
  synthesisSidecar: DashboardSynthesisSidecarUiState;
  // Legacy state.backendTaskScrollTopByTabKey. Written via the Backend
  // region's onTaskTableScroll seam and read back as taskScrollTop when the
  // scroll key changes. Deliberately outside every region selection.
  backendTaskScrollTopByTabKey: Record<string, number>;
};

export type DashboardUiPatch = {
  selectedTabKey?: string;
  synthesisSidecar?: Partial<DashboardSynthesisSidecarUiState>;
};

// Region selections, one per surface. Only the selected tab's view is
// non-null (same rule as Home): hidden-tab data changes never enter a
// visible region's equality input.
export type DashboardPanelViews = {
  products: DashboardProductsSelection | null;
  workflowOptions: DashboardWorkflowOptionsSelection | null;
  runtimeLogs: DashboardRuntimeLogsSelection | null;
  synthesisSidecar: DashboardSynthesisSidecarSelection | null;
  skillrunnerConnectionAudit: DashboardSkillrunnerAuditSelection | null;
  acpTraceReplay: DashboardAcpTraceReplaySelection | null;
  backend: DashboardBackendSelection | null;
};

export type DashboardPanel = {
  title: string;
  labels: DashboardLabels;
  selectedTabKey: string;
  backendLoadError: string;
  tabbar: DashboardTabBarSelection;
  home: DashboardHomeSelection | null;
  views: DashboardPanelViews;
  // SkillRunner audit copy payload (legacy copies the whole view, including
  // generatedAt). Kept outside the region selection so the high-frequency
  // timestamp never enters the region's equality input; the chrome renderer
  // reads it from the latest panel when the copy button fires.
  auditCopy: { json: string; toastMessage: string } | null;
};

export type DashboardControllerState = {
  snapshot: DashboardPageSnapshot | null;
  ui: DashboardUiState;
};
