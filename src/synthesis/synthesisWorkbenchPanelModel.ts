// Pure projection: SynthesisWorkbenchPageSnapshot + controller state ->
// SynthesisWorkbenchPanel DTO, plus the per-region equality selectors used by
// both the chrome renderer's Preact memo boundaries and imperative guards.
//
// A region's selector must contain only that region's user-visible content
// and open/collapsed state; high-frequency fields owned by other regions
// (surface payloads, graph pages, reader stashes) must never enter (see
// src/shared/regionEquality.ts).

import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../shared/synthesisWorkbenchI18nContract";
import { projectBusinessSurface } from "./synthesisSurfaceProjection";
import type { SynthesisBusinessSurface } from "./synthesisSurfaceProjection";
import type { SynthesisRegistryReviewState } from "./components/registry/registryTypes";
import type { SynthesisReviewCenterReferenceReviewControl } from "./components/reviewCenter/ReviewCenterRegion";
import type {
  SynthesisWorkbenchActionOperation,
  SynthesisWorkbenchBackgroundJobRow,
  SynthesisWorkbenchHostShape,
  SynthesisWorkbenchMessageKey,
  SynthesisWorkbenchNavTab,
  SynthesisWorkbenchSurfaceName,
  SynthesisWorkbenchTab,
} from "../shared/synthesisWorkbenchWireContract";
import type {
  SynthesisWorkbenchChromeSelection,
  SynthesisWorkbenchSidecarSelection,
  SynthesisWorkbenchStatusbarJobView,
  SynthesisWorkbenchStatusbarMode,
} from "./components/ChromeRegion";
import type {
  SynthesisWorkbenchNavTabView,
  SynthesisWorkbenchShellSelection,
  SynthesisWorkbenchTopbarSelection,
} from "./components/ShellRegion";
import type {
  SynthesisWorkbenchI18nState,
  SynthesisWorkbenchPageSnapshot,
  SynthesisWorkbenchPanel,
  SynthesisWorkbenchSurfacePlaceholderSelection,
  SynthesisWorkbenchSurfaceRuntime,
  SynthesisWorkbenchUiState,
} from "./synthesisWorkbenchTypes";

export type SynthesisWorkbenchText = (
  key: SynthesisWorkbenchMessageKey,
  args?: Record<string, unknown>,
) => string;

export function createSynthesisWorkbenchText(
  i18n: SynthesisWorkbenchI18nState,
): SynthesisWorkbenchText {
  return (key, args = {}) =>
    formatSynthesisWorkbenchMessage(
      i18n.messages[key] || SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
      args,
    );
}

// ---------------------------------------------------------------------------
// Tab / surface vocabulary
// ---------------------------------------------------------------------------

export function synthesisWorkbenchSurfaceForTab(
  tab: SynthesisWorkbenchTab,
): SynthesisWorkbenchSurfaceName {
  if (tab === "overview") return "home";
  if (tab === "artifacts") return "topics";
  if (tab === "registry") return "index";
  if (tab === "reviews") return "review";
  return tab;
}

const NAV_TABS: ReadonlyArray<{
  tab: SynthesisWorkbenchNavTab;
  labelKey: SynthesisWorkbenchMessageKey;
  iconName: string;
  iconClass: string;
}> = [
  {
    tab: "overview",
    labelKey: "synthesis-tab-home",
    iconName: "home",
    iconClass: "zs-icon-home",
  },
  {
    tab: "artifacts",
    labelKey: "synthesis-tab-topics",
    iconName: "topics",
    iconClass: "zs-icon-topic",
  },
  {
    tab: "concepts",
    labelKey: "synthesis-tab-concepts",
    iconName: "concepts",
    iconClass: "zs-icon-lightbulb",
  },
  {
    tab: "graph",
    labelKey: "synthesis-tab-graph",
    iconName: "graph",
    iconClass: "zs-icon-hub",
  },
  {
    tab: "registry",
    labelKey: "synthesis-tab-index",
    iconName: "index",
    iconClass: "zs-icon-manage-search",
  },
  {
    tab: "tags",
    labelKey: "synthesis-tab-tags",
    iconName: "tags",
    iconClass: "zs-icon-sell",
  },
  {
    tab: "reviews",
    labelKey: "synthesis-tab-review",
    iconName: "review",
    iconClass: "zs-icon-fact-check",
  },
];

const SURFACE_LABEL_KEYS: Record<
  SynthesisWorkbenchSurfaceName,
  SynthesisWorkbenchMessageKey
> = {
  home: "synthesis-tab-home",
  topics: "synthesis-tab-topics",
  index: "synthesis-tab-index",
  review: "synthesis-tab-review",
  graph: "synthesis-tab-citation-graph",
  tags: "synthesis-tab-tags",
  concepts: "synthesis-tab-concepts",
  reader: "synthesis-tab-reader",
};

const TAB_TITLE_KEYS: Record<
  Exclude<SynthesisWorkbenchTab, "reader">,
  SynthesisWorkbenchMessageKey
> = {
  overview: "synthesis-tab-home",
  artifacts: "synthesis-tab-topics",
  registry: "synthesis-tab-index",
  reviews: "synthesis-tab-review",
  tags: "synthesis-tab-tags",
  concepts: "synthesis-tab-concepts",
  graph: "synthesis-tab-citation-graph",
};

// ---------------------------------------------------------------------------
// Projection context
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchProjectionContext = {
  hostShape: SynthesisWorkbenchHostShape;
  i18n: SynthesisWorkbenchI18nState;
  // Locally tracked operations merged into the statusbar (legacy
  // state.localPendingActions / state.lastLocalAction).
  localPendingActions: ReadonlyMap<string, SynthesisWorkbenchActionOperation>;
  lastLocalAction?: SynthesisWorkbenchActionOperation;
  // Timed statusbar entries (failed/warning/completed) expire after a fixed
  // window; the expiration map is controller-owned and mutated here, exactly
  // like the legacy state.statusbarExpirations.
  statusbarExpirations: Map<string, number>;
  now: number;
  // Resolved reader title (topic detail / artifact reader), already narrowed
  // by the controller from the opaque topic-detail slot.
  readerTitle: string;
  visibleSurface: SynthesisWorkbenchSurfaceName;
  surfaceRuntime?: SynthesisWorkbenchSurfaceRuntime;
  topicDetail?: unknown;
  artifactReader?: unknown;
  digestResult?: unknown;
  standaloneDigests?: unknown;
  registryReview?: SynthesisRegistryReviewState;
  referenceReview?: SynthesisReviewCenterReferenceReviewControl;
  retainedBusiness?: SynthesisBusinessSurface;
};

// ---------------------------------------------------------------------------
// Shell / topbar
// ---------------------------------------------------------------------------

function projectShell(
  snapshot: SynthesisWorkbenchPageSnapshot,
  ui: SynthesisWorkbenchUiState,
  t: SynthesisWorkbenchText,
): SynthesisWorkbenchShellSelection {
  const tabs: SynthesisWorkbenchNavTabView[] = NAV_TABS.map((entry) => ({
    tab: entry.tab,
    label: t(entry.labelKey),
    iconName: entry.iconName,
    iconClass: entry.iconClass,
    active: snapshot.selectedTab === entry.tab,
  }));
  return {
    brandAlt: t("synthesis-brand-alt"),
    libraryLabel: t("synthesis-library-label", {
      libraryId: snapshot.libraryId,
    }),
    expanded: ui.sidebarExpanded,
    collapseLabel: t("synthesis-nav-collapse"),
    expandLabel: t("synthesis-nav-expand"),
    tabs,
  };
}

function projectTopbar(
  snapshot: SynthesisWorkbenchPageSnapshot,
  context: SynthesisWorkbenchProjectionContext,
  t: SynthesisWorkbenchText,
): SynthesisWorkbenchTopbarSelection {
  const tab = snapshot.selectedTab;
  const title =
    tab === "reader"
      ? context.readerTitle || t("synthesis-tab-topic-detail")
      : t(TAB_TITLE_KEYS[tab]);
  return { title };
}

// ---------------------------------------------------------------------------
// Chrome: action statusbar
// ---------------------------------------------------------------------------

const STATUSBAR_COMPLETED_TIMEOUT_MS = 4000;
const STATUSBAR_FAILED_TIMEOUT_MS = 8000;
const STATUSBAR_WARNING_TIMEOUT_MS = 8000;

function textValue(value: unknown, fallback = ""): string {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function actionStatusbarKey(
  entry: SynthesisWorkbenchActionOperation,
  statusOverride: string | undefined,
) {
  return `${statusOverride || entry.status}:${entry.key || entry.command}`;
}

/**
 * Legacy shouldShowTimedStatusbarEntry: the first projection of an entry
 * starts its expiration window; later projections within the window keep
 * showing it. Mutates the controller-owned expiration map.
 */
export function resolveTimedStatusbarEntry(
  entry: SynthesisWorkbenchActionOperation | undefined,
  timeoutMs: number,
  expirations: Map<string, number>,
  now: number,
  statusOverride:
    | SynthesisWorkbenchActionOperation["status"]
    | "warning"
    | undefined = entry?.status,
): boolean {
  if (!entry || !statusOverride) return false;
  const key = actionStatusbarKey(entry, statusOverride);
  let expiresAt = expirations.get(key);
  if (!expiresAt) {
    expiresAt = now + timeoutMs;
    expirations.set(key, expiresAt);
  }
  return expiresAt > now;
}

/** Earliest future statusbar expiration, for controller re-render scheduling. */
export function nextStatusbarExpiryDelayMs(
  expirations: ReadonlyMap<string, number>,
  now: number,
): number | undefined {
  let earliest: number | undefined;
  for (const expiresAt of expirations.values()) {
    if (expiresAt <= now) continue;
    if (earliest === undefined || expiresAt < earliest) earliest = expiresAt;
  }
  return earliest === undefined ? undefined : earliest - now;
}

function statusbarMessage(entry: SynthesisWorkbenchActionOperation): string {
  const label = textValue(entry.label, entry.command || "Action");
  const message = textValue(entry.message);
  return message ? `${label} - ${message}` : label;
}

function activeActionPriority(
  status: SynthesisWorkbenchActionOperation["status"],
): number {
  if (status === "running") return 0;
  if (status === "pending") return 1;
  if (status === "queued") return 2;
  return 3;
}

function listActiveActionOperations(
  snapshot: SynthesisWorkbenchPageSnapshot,
  localPendingActions: ReadonlyMap<string, SynthesisWorkbenchActionOperation>,
): SynthesisWorkbenchActionOperation[] {
  const rows = new Map<string, SynthesisWorkbenchActionOperation>();
  const accept = (entry: SynthesisWorkbenchActionOperation | undefined) => {
    if (!entry || entry.status === "completed" || entry.status === "failed") {
      return;
    }
    const key = entry.key || entry.command;
    if (!key) return;
    const existing = rows.get(key);
    if (
      !existing ||
      textValue(entry.started_at).localeCompare(
        textValue(existing.started_at),
      ) >= 0
    ) {
      rows.set(key, { ...entry, key });
    }
  };
  for (const entry of snapshot.actions?.inFlight || []) accept(entry);
  for (const entry of localPendingActions.values()) accept(entry);
  return Array.from(rows.values()).sort(
    (left, right) =>
      activeActionPriority(left.status) - activeActionPriority(right.status) ||
      textValue(right.started_at).localeCompare(textValue(left.started_at)),
  );
}

function backgroundJobPriority(
  status: SynthesisWorkbenchBackgroundJobRow["status"],
): number {
  if (status === "running") return 0;
  if (status === "waiting") return 1;
  if (status === "queued") return 2;
  if (status === "submitted") return 3;
  return 4;
}

export function listSynthesisWorkbenchBackgroundJobs(
  snapshot: SynthesisWorkbenchPageSnapshot,
): SynthesisWorkbenchBackgroundJobRow[] {
  const rows = new Map<string, SynthesisWorkbenchBackgroundJobRow>();
  for (const entry of snapshot.maintenance?.backgroundJobs?.rows || []) {
    if (!entry) continue;
    const existing = rows.get(entry.job_id);
    if (
      !existing ||
      textValue(entry.updated_at).localeCompare(
        textValue(existing.updated_at),
      ) >= 0
    ) {
      rows.set(entry.job_id, entry);
    }
  }
  return Array.from(rows.values()).sort(
    (left, right) =>
      backgroundJobPriority(left.status) -
        backgroundJobPriority(right.status) ||
      textValue(right.updated_at).localeCompare(textValue(left.updated_at)),
  );
}

function statusLabelForJob(
  status: SynthesisWorkbenchBackgroundJobRow["status"],
  t: SynthesisWorkbenchText,
): string {
  if (status === "queued") return t("synthesis-status-queued");
  if (status === "running") return t("synthesis-status-running");
  if (status === "failed") return t("synthesis-status-failed");
  if (status === "submitted") return "Submitted";
  return "Waiting";
}

function sourceLabelForJob(source: string): string {
  const labels: Record<string, string> = {
    workbench: "Workbench",
    operation: "Operation",
    citation_graph_layout: "Graph layout",
    webdav_sync: "WebDAV Sync",
    canonical_maintenance: "Canonical",
  };
  return labels[source] || source || "Synthesis";
}

function progressLabel(
  progress: SynthesisWorkbenchBackgroundJobRow["progress"],
): string {
  if (!progress) return "";
  if (progress.mode === "determinate") {
    if (progress.label) return `${progress.label} - ${progress.percent}%`;
    if (progress.total) return `${progress.current || 0}/${progress.total}`;
    return `${progress.percent}%`;
  }
  return progress.label || "In progress";
}

function projectJobView(
  job: SynthesisWorkbenchBackgroundJobRow,
  t: SynthesisWorkbenchText,
): SynthesisWorkbenchStatusbarJobView {
  const isRunning = job.status === "running";
  return {
    jobId: job.job_id,
    status: job.status,
    statusLabel: statusLabelForJob(job.status, t),
    sourceLabel: sourceLabelForJob(job.source),
    title: job.label,
    detail: [job.detail, isRunning ? progressLabel(job.progress) : ""]
      .filter(Boolean)
      .join(" - "),
    progressPercent:
      job.progress?.mode === "determinate" ? job.progress.percent : undefined,
    progressLabel: progressLabel(job.progress),
    command: job.command,
    targetTab: job.targetTab,
  };
}

function backgroundJobStatusbarOperation(
  job: SynthesisWorkbenchBackgroundJobRow | undefined,
): SynthesisWorkbenchActionOperation | undefined {
  if (!job) return undefined;
  return {
    key: `background:${job.job_id}`,
    command: (job.command ||
      "backgroundJob") as SynthesisWorkbenchActionOperation["command"],
    status: "failed",
    label: job.label,
    started_at: job.updated_at,
    completed_at: job.updated_at,
    message: job.detail,
  };
}

function projectChrome(
  snapshot: SynthesisWorkbenchPageSnapshot,
  ui: SynthesisWorkbenchUiState,
  context: SynthesisWorkbenchProjectionContext,
  t: SynthesisWorkbenchText,
): SynthesisWorkbenchChromeSelection {
  const jobs = listSynthesisWorkbenchBackgroundJobs(snapshot);
  const activeJobs = jobs.filter((job) => job.status !== "failed");
  const activeActions = listActiveActionOperations(
    snapshot,
    context.localPendingActions,
  );
  const failedJob = jobs.find((job) => job.status === "failed");
  const showFailedJob = resolveTimedStatusbarEntry(
    backgroundJobStatusbarOperation(failedJob),
    STATUSBAR_FAILED_TIMEOUT_MS,
    context.statusbarExpirations,
    context.now,
    "failed",
  );
  const statusbarJobs = activeJobs.length || showFailedJob ? jobs : activeJobs;
  const latestWarning = (snapshot.actions?.warnings || []).slice(-1)[0];
  const failed =
    snapshot.actions?.lastFailed ||
    (context.lastLocalAction?.status === "failed"
      ? context.lastLocalAction
      : undefined);
  const completed =
    snapshot.actions?.lastCompleted ||
    (context.lastLocalAction?.status === "completed"
      ? context.lastLocalAction
      : undefined);

  let mode: SynthesisWorkbenchStatusbarMode = "idle";
  let stateLabel = t("synthesis-status-ready");
  let message = "";
  let progressDeterminate = false;
  let progressPercent: number | undefined;
  let extraCount = 0;

  if (activeJobs.length) {
    const latest = activeJobs[0];
    mode = "busy";
    stateLabel = statusLabelForJob(latest.status, t);
    message = [latest.label, latest.detail].filter(Boolean).join(" - ");
    progressDeterminate = latest.progress?.mode === "determinate";
    progressPercent =
      latest.progress?.mode === "determinate"
        ? latest.progress.percent
        : undefined;
    extraCount = Math.max(0, activeJobs.length - 1);
  } else if (activeActions.length) {
    const latest = activeActions[0];
    mode = "busy";
    stateLabel =
      latest.status === "running"
        ? t("synthesis-status-running")
        : t("synthesis-status-queued");
    message = statusbarMessage(latest);
    extraCount = Math.max(0, activeActions.length - 1);
  } else if (failedJob && showFailedJob) {
    mode = "danger";
    stateLabel = t("synthesis-status-failed");
    message = [failedJob.label, failedJob.detail].filter(Boolean).join(" - ");
  } else if (
    resolveTimedStatusbarEntry(
      failed,
      STATUSBAR_FAILED_TIMEOUT_MS,
      context.statusbarExpirations,
      context.now,
      "failed",
    )
  ) {
    mode = "danger";
    stateLabel = t("synthesis-status-failed");
    message = statusbarMessage(failed!);
  } else if (
    resolveTimedStatusbarEntry(
      latestWarning,
      STATUSBAR_WARNING_TIMEOUT_MS,
      context.statusbarExpirations,
      context.now,
      "warning",
    )
  ) {
    mode = "warn";
    stateLabel = t("synthesis-status-warning");
    message = statusbarMessage(latestWarning!);
  } else if (
    resolveTimedStatusbarEntry(
      completed,
      STATUSBAR_COMPLETED_TIMEOUT_MS,
      context.statusbarExpirations,
      context.now,
      "completed",
    )
  ) {
    mode = "ok";
    stateLabel = t("synthesis-status-completed");
    message = statusbarMessage(completed!);
  }

  return {
    mode,
    stateLabel,
    message,
    progressDeterminate,
    progressPercent,
    extraCount,
    jobCount: statusbarJobs.length,
    popoverOpen: ui.jobPopoverOpen,
    jobsShowLabel: t("synthesis-jobs-show"),
    jobsTitle: t("synthesis-jobs-title"),
    jobsEmptyText: t("synthesis-jobs-empty"),
    closeLabel: t("synthesis-action-close"),
    jobs: statusbarJobs.slice(0, 10).map((job) => projectJobView(job, t)),
  };
}

// ---------------------------------------------------------------------------
// Chrome: sidecar runtime indicator
// ---------------------------------------------------------------------------

function projectSidecar(
  snapshot: SynthesisWorkbenchPageSnapshot,
  t: SynthesisWorkbenchText,
): SynthesisWorkbenchSidecarSelection {
  const status = snapshot.sidecarStatus;
  const activeJobs = (snapshot.maintenance?.backgroundJobs?.rows || []).filter(
    (job) => job.status === "running" || job.status === "queued",
  ).length;
  const inFlight = snapshot.actions?.inFlight?.length || 0;

  let state: SynthesisWorkbenchSidecarSelection["state"] = "offline";
  let label = t("synthesis-sidecar-offline");
  if (!status) {
    // offline
  } else if (
    status.lifecycle === "incompatible" ||
    status.recoveryState === "manual-recovery-required"
  ) {
    state = "error";
    label = t("synthesis-sidecar-error");
  } else if (
    status.lifecycle === "starting" ||
    status.lifecycle === "stopping" ||
    status.recoveryState === "scheduled"
  ) {
    state = "recovering";
    label = t("synthesis-sidecar-recovering");
  } else if (status.computePool?.state === "degraded") {
    state = "degraded";
    label = t("synthesis-sidecar-degraded");
  } else if (status.lifecycle === "unavailable") {
    state = "error";
    label = t("synthesis-sidecar-error");
  } else if (
    status.lifecycle === "ready" &&
    (status.computePool?.state === "busy" ||
      (status.computePool?.active || 0) > 0 ||
      (status.computePool?.queued || 0) > 0 ||
      activeJobs > 0 ||
      inFlight > 0)
  ) {
    state = "busy";
    label = t("synthesis-sidecar-busy");
  } else if (status.lifecycle === "ready") {
    state = "ready";
    label = t("synthesis-sidecar-ready");
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: t("synthesis-sidecar-state"), value: label },
    {
      label: t("synthesis-sidecar-version"),
      value: status?.serviceVersion || "—",
    },
    {
      label: t("synthesis-sidecar-instance"),
      value: status?.serviceInstanceId?.slice(-8) || "—",
    },
    {
      label: t("synthesis-sidecar-compute"),
      value: status?.computePool
        ? `${status.computePool.state} · ${status.computePool.active}/${status.computePool.queued}`
        : "—",
    },
  ];
  if (status?.reasonCode) {
    rows.push({
      label: t("synthesis-sidecar-reason"),
      value: status.reasonCode,
    });
  }
  if (status?.nextRestartAt) {
    rows.push({
      label: t("synthesis-sidecar-next-recovery"),
      value: status.nextRestartAt,
    });
  }

  return {
    state,
    label,
    ariaLabel: `${t("synthesis-sidecar-status")}: ${label}`,
    statusTitle: t("synthesis-sidecar-status"),
    rows,
    showDiagnostics: state === "error" || state === "degraded",
    diagnosticsLabel: t("synthesis-diagnostics"),
  };
}

// ---------------------------------------------------------------------------
// Surface loading/error fallback
// ---------------------------------------------------------------------------

function projectSurfacePlaceholder(
  context: SynthesisWorkbenchProjectionContext,
  t: SynthesisWorkbenchText,
): SynthesisWorkbenchSurfacePlaceholderSelection {
  const runtime = context.surfaceRuntime;
  const isError = runtime?.status === "failed";
  return {
    surface: context.visibleSurface,
    status: runtime?.status || "missing",
    title: isError
      ? t("synthesis-surface-error-label")
      : t("synthesis-surface-loading-title", {
          surface: t(SURFACE_LABEL_KEYS[context.visibleSurface]),
        }),
    subtitle: isError
      ? runtime?.error || t("synthesis-surface-error-message")
      : t("synthesis-surface-loading-subtitle"),
    isError,
  };
}

// ---------------------------------------------------------------------------
// Panel assembly + region equality inputs
// ---------------------------------------------------------------------------

export function projectSynthesisWorkbenchPanel(
  snapshot: SynthesisWorkbenchPageSnapshot | null,
  ui: SynthesisWorkbenchUiState,
  context: SynthesisWorkbenchProjectionContext,
): SynthesisWorkbenchPanel | null {
  if (!snapshot) return null;
  const t = createSynthesisWorkbenchText(context.i18n);
  const hosted = context.hostShape === "hosted";
  return {
    hostShape: context.hostShape,
    selectedTab: snapshot.selectedTab,
    i18n: context.i18n,
    business:
      context.retainedBusiness ||
      (context.visibleSurface !== "graph" &&
      (context.surfaceRuntime?.status === "loading" ||
        (context.surfaceRuntime?.status === "failed" &&
          !context.surfaceRuntime.snapshot))
        ? undefined
        : projectBusinessSurface(
            context.surfaceRuntime?.status === "failed"
              ? context.surfaceRuntime.snapshot || snapshot
              : snapshot,
            context,
            t,
          )),
    referenceReview: context.referenceReview,
    shell: hosted ? projectShell(snapshot, ui, t) : null,
    // The standalone topic export shell keeps a minimal header with the
    // reader title; the graph-only export has no chrome at all.
    topbar:
      context.hostShape === "standaloneGraphOnly"
        ? null
        : projectTopbar(snapshot, context, t),
    chrome: hosted ? projectChrome(snapshot, ui, context, t) : null,
    sidecar: hosted ? projectSidecar(snapshot, t) : null,
    surface:
      context.hostShape === "standaloneGraphOnly"
        ? null
        : projectSurfacePlaceholder(context, t),
  };
}

export function synthesisWorkbenchShellEqualityInput(
  panel: SynthesisWorkbenchPanel | null,
) {
  return panel?.shell ?? null;
}

export function synthesisWorkbenchTopbarEqualityInput(
  panel: SynthesisWorkbenchPanel | null,
) {
  return panel?.topbar ?? null;
}

export function synthesisWorkbenchChromeEqualityInput(
  panel: SynthesisWorkbenchPanel | null,
) {
  return panel?.chrome ?? null;
}

export function synthesisWorkbenchSidecarEqualityInput(
  panel: SynthesisWorkbenchPanel | null,
) {
  return panel?.sidecar ?? null;
}

export function synthesisWorkbenchSurfaceEqualityInput(
  panel: SynthesisWorkbenchPanel | null,
) {
  return panel?.surface ?? null;
}

/**
 * Chrome signature gate (legacy snapshotChromeSignature): the controller
 * compares this between messages to decide whether the chrome regions need a
 * re-projection. Region memoization uses the equality inputs above; this gate
 * only skips redundant projection work.
 */
export function synthesisWorkbenchChromeSignatureInput(args: {
  snapshot: SynthesisWorkbenchPageSnapshot | null;
  localPendingActions: ReadonlyMap<string, SynthesisWorkbenchActionOperation>;
  jobPopoverOpen: boolean;
}) {
  const { snapshot } = args;
  if (!snapshot) return null;
  return {
    actions: snapshot.actions || {},
    localPendingActions: Array.from(args.localPendingActions.values()).map(
      (entry) => [entry.key, entry.command, entry.status, entry.started_at],
    ),
    backgroundJobs: snapshot.maintenance?.backgroundJobs || {},
    sidecarStatus: snapshot.sidecarStatus || {},
    sync: snapshot.sync?.status,
    jobPopoverOpen: args.jobPopoverOpen,
  };
}
