/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { equalBySignature } from "../../shared/regionEquality";
import { SYNTHESIS_WORKBENCH_MESSAGE_KEYS } from "../../shared/synthesisWorkbenchI18nContract";
import { RetrievalPanel } from "./RetrievalPanel";
import type {
  SynthesisEncodingIdentity,
  SynthesisRetrievalProgress,
  SynthesisRetrievalScope,
  SynthesisRetrievalStatus,
  SynthesisWorkbenchActionName,
  SynthesisWorkbenchMessageKey,
} from "../../shared/synthesisWorkbenchWireContract";

// Home / overview surface of the synthesis workbench: library insight cards,
// compact sync/retrieval controls, conflict review dialog and
// the top-topics grid. This file owns the surface's selection types, the
// defensive narrowing from the wire snapshot (host-owned row slots arrive as
// unknown) and the region component; the panel model calls
// projectSynthesisWorkbenchHomeSelection and mounts HomeRegion.

export type SynthesisWorkbenchHomeText = (
  key: SynthesisWorkbenchMessageKey,
  args?: Record<string, unknown>,
) => string;

export type SynthesisWorkbenchHomeAction = (
  action: SynthesisWorkbenchActionName,
  payload?: Record<string, unknown>,
) => void;

// ---------------------------------------------------------------------------
// Selection types (user-visible content only; feeds equalBySignature)
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchHomeTopicRow = {
  id: string;
  title: string;
  definition: string;
  paperCount: number;
  sourceMaterialsPercent: number;
  sourceMaterialsStatus: "complete" | "partial" | "missing";
  freshness: string;
  candidateCount: number;
  updatedAt: string;
};

export type SynthesisWorkbenchHomeConflictAsset = {
  assetPath: string;
  reason: string;
  baseHash: string;
  localHash: string;
  remoteHash: string;
};

export type SynthesisWorkbenchHomeSyncSelection = {
  queueState: string;
  paused: boolean;
  adapterConfigured: boolean;
  configStatus: string;
  baseUrl: string;
  remotePath: string;
  allowedActions: string[];
  conflictActions: string[];
  conflictAssets: SynthesisWorkbenchHomeConflictAsset[];
};

/** UI projection of the latest public maintenance operation for retrieval. */
export type SynthesisWorkbenchHomeRetrievalMaintenance = {
  operationId: string;
  status: "pending" | "running" | "completed" | "failed" | "canceled";
  phase?: string;
};

export type SynthesisWorkbenchHomeRetrievalSelection = {
  enabled: boolean;
  status: SynthesisRetrievalStatus;
  pendingIdentity?: SynthesisEncodingIdentity;
  activeScope?: SynthesisRetrievalScope;
  pendingScope?: SynthesisRetrievalScope;
  publication: string;
  progress: Omit<SynthesisRetrievalProgress, "completedFragments">;
  issueCount: number;
  performanceWarningCount: number;
  performance?: {
    firstQueryMs: number;
    firstQuerySuccesses: number;
    warmQueryMs: number;
    warmQuerySuccesses: number;
    pairRoundMs: number[];
    pairRoundSuccesses: number[];
    slowestPairMs: number;
    documentBatchMs: number;
    documentSuccesses: number;
    maxConcurrency: 1 | 2;
    testedAt: string;
    display: {
      capacity: string;
      measurements: string;
      reliability: string;
      warnings: string[];
    };
  };
  configured: boolean;
  maintenance?: SynthesisWorkbenchHomeRetrievalMaintenance;
};

export type SynthesisWorkbenchHomeSelection = {
  insights: {
    registeredPapers: number;
    topicCount: number;
    graphNodes: number;
    graphEdges: number;
    reviewOpenCount: number;
    reviewIndexCount: number;
    reviewConceptCount: number;
    reviewTopicGraphCount: number;
  };
  sync: SynthesisWorkbenchHomeSyncSelection;
  retrieval: SynthesisWorkbenchHomeRetrievalSelection;
  // Operation keys (legacy operationKey vocabulary) currently pending, scoped
  // to the commands this surface renders buttons for; drives busy/disabled.
  pendingOperationKeys: string[];
  topics: Omit<SynthesisWorkbenchHomeTopicRow, "updatedAt">[];
};

// ---------------------------------------------------------------------------
// Projection input (structural supertype of the wire snapshot sections)
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchHomeProjectionInput = {
  snapshot: {
    actions?: {
      inFlight?: unknown;
      lastCompleted?: unknown;
      lastFailed?: unknown;
    } | null;
    artifacts?: { rows?: unknown } | null;
    registry?: {
      rows?: unknown;
      cleanupProposals?: unknown;
      matchProposals?: unknown;
    } | null;
    reviews?: { summary?: unknown } | null;
    concepts?: { reviewItems?: unknown } | null;
    topicGraph?: { reviewItems?: unknown } | null;
    graph?: { visibleNodes?: unknown; visibleEdges?: unknown } | null;
    sync?: unknown;
    retrieval?: unknown;
  };
  localPendingOperationKeys?: Iterable<string>;
};

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

const SYNC_OPERATION_COMMANDS = [
  "syncWebDavNow",
  "retryWebDavSync",
  "pauseWebDavSync",
  "resumeWebDavSync",
  "resolveWebDavSyncConflict",
];

// Retrieval commands the Home surface renders pending-aware buttons for. The
// per-paper recommend command belongs to the reader surface and is excluded.
const RETRIEVAL_COMMANDS = [
  "retrievalBuildIndex",
  "retrievalRebuildIndex",
  "retrievalUpdateIndex",
  "retrievalCancelIndex",
  "retrievalRetryIndex",
  "retrievalContinueIndex",
  "retrievalCleanupIndex",
];

// Commands this surface renders pending-aware buttons for. Topic cards use
// openTopicArtifact:<topicId> keys; every other relevant command keys on the
// bare command name (legacy operationKey default branch).
const PENDING_COMMAND_PREFIXES = ["openTopicArtifact:"];
const PENDING_COMMANDS = [
  ...SYNC_OPERATION_COMMANDS,
  ...RETRIEVAL_COMMANDS,
  "openPreferences",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function textOf(value: unknown, fallback = ""): string {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

/** Exact string read for values whose whitespace is semantic (prefixes). */
function rawTextOf(value: unknown): string {
  return value == null ? "" : String(value);
}

function countOf(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function percentOf(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(100, Math.floor(number)))
    : 0;
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordOf(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => textOf(entry)).filter(Boolean)
    : [];
}

export function narrowSynthesisWorkbenchHomeTopicRow(
  value: unknown,
): SynthesisWorkbenchHomeTopicRow | null {
  if (!isRecord(value)) return null;
  const status = textOf(value.source_materials_status, "missing");
  return {
    id: textOf(value.id),
    title: textOf(value.title),
    definition: textOf(value.definition),
    paperCount: countOf(value.paper_count),
    sourceMaterialsPercent: percentOf(value.source_materials_percent),
    sourceMaterialsStatus:
      status === "complete" || status === "partial" ? status : "missing",
    freshness: textOf(value.freshness),
    candidateCount: countOf(value.candidate_count),
    updatedAt: textOf(value.updated_at),
  };
}

function openReviewRowCount(value: unknown): number {
  return recordArray(value).filter((row) => textOf(row.status) === "open")
    .length;
}

function isPendingKeyRelevant(key: string): boolean {
  return (
    PENDING_COMMANDS.includes(key) ||
    PENDING_COMMAND_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

function narrowSyncSelection(
  sync: unknown,
): SynthesisWorkbenchHomeSyncSelection {
  const root = isRecord(sync) ? sync : {};
  const webdav = isRecord(root.webdav) ? root.webdav : {};
  return {
    queueState: textOf(webdav.queue_state),
    paused: webdav.paused === true,
    adapterConfigured: webdav.adapter_configured === true,
    configStatus: textOf(webdav.config_status),
    baseUrl:
      webdav.queue_state === "blocked_conflict" ? textOf(webdav.base_url) : "",
    remotePath:
      webdav.queue_state === "blocked_conflict"
        ? textOf(webdav.remote_path)
        : "",
    allowedActions: stringList(webdav.allowedActions),
    conflictActions: stringList(webdav.conflictActions),
    conflictAssets: recordArray(webdav.conflict_assets).map((asset) => ({
      assetPath: textOf(asset.asset_path),
      reason: textOf(asset.reason),
      baseHash: textOf(asset.base_hash),
      localHash: textOf(asset.local_hash),
      remoteHash: textOf(asset.remote_hash),
    })),
  };
}

// ---------------------------------------------------------------------------
// Projection (wire snapshot -> region selection)
// ---------------------------------------------------------------------------

function narrowRetrievalIdentity(
  value: unknown,
): SynthesisEncodingIdentity | undefined {
  if (!isRecord(value)) return undefined;
  const dimensions = countOf(value.dimensions);
  const modelId = textOf(value.modelId);
  if (!dimensions || !modelId) return undefined;
  return {
    modelId,
    dimensions,
    queryPrefix: rawTextOf(value.queryPrefix),
    documentPrefix: rawTextOf(value.documentPrefix),
    ...(typeof value.encodingOptionsKey === "string"
      ? { encodingOptionsKey: value.encodingOptionsKey }
      : {}),
  };
}

function narrowRetrievalScope(
  value: unknown,
): SynthesisRetrievalScope | undefined {
  if (!isRecord(value)) return undefined;
  const sourceKinds = stringList(value.sourceKinds).filter(
    (kind): kind is SynthesisRetrievalScope["sourceKinds"][number] =>
      kind === "metadata" || kind === "fulltext" || kind === "analysis",
  );
  return {
    libraryIds: Array.isArray(value.libraryIds)
      ? value.libraryIds
          .map((entry) => countOf(entry))
          .filter((entry) => entry > 0)
      : [],
    sourceKinds,
    includeTopics: value.includeTopics === true,
  };
}

function narrowRetrievalProgress(
  value: unknown,
): SynthesisWorkbenchHomeRetrievalSelection["progress"] {
  const row = isRecord(value) ? value : {};
  return {
    completedGroups: countOf(row.completedGroups),
    totalGroups: countOf(row.totalGroups),
    failedGroups: countOf(row.failedGroups),
    missingGroups: countOf(row.missingGroups),
  };
}

function narrowRetrievalMaintenance(
  value: unknown,
): SynthesisWorkbenchHomeRetrievalMaintenance | undefined {
  if (!isRecord(value)) return undefined;
  const operationId = textOf(value.operation_id);
  if (!operationId) return undefined;
  const status = textOf(value.status);
  return {
    operationId,
    status:
      status === "running"
        ? "running"
        : status === "completed"
          ? "completed"
          : status === "canceled"
            ? "canceled"
            : status === "failed" ||
                status === "timed_out" ||
                status === "not_found"
              ? "failed"
              : "pending",
    phase:
      value.phase === "continuation_required"
        ? "continuation_required"
        : undefined,
  };
}

export function narrowSynthesisWorkbenchHomeRetrieval(
  value: unknown,
): SynthesisWorkbenchHomeRetrievalSelection {
  const present = isRecord(value);
  const row: Record<string, unknown> = present
    ? (value as Record<string, unknown>)
    : {};
  const status = textOf(row.status);
  const activeScope = narrowRetrievalScope(row.activeScope);
  const pendingScope = narrowRetrievalScope(row.pendingScope);
  const primaryId = textOf(row.primaryConnectionId);
  const primary = recordArray(row.connections).find(
    (connection) => connection.id === primaryId,
  );
  const metrics = isRecord(primary?.performance)
    ? primary.performance
    : undefined;
  const rounds = Array.isArray(metrics?.pairRounds)
    ? metrics.pairRounds.filter(isRecord)
    : [];
  const display = recordOf(primary?.performanceDisplay);
  const testedAt = textOf(primary?.performanceTestedAt);
  const maxConcurrency = primary?.maxConcurrency;
  const performance =
    primary?.tested === true &&
    metrics &&
    textOf(display.capacity) &&
    textOf(display.measurements) &&
    textOf(display.reliability) &&
    (maxConcurrency === 1 || maxConcurrency === 2) &&
    Number.isFinite(Date.parse(testedAt))
      ? {
          firstQueryMs: countOf(recordOf(metrics.firstQuery).latencyMs),
          firstQuerySuccesses: countOf(
            recordOf(metrics.firstQuery).successCount,
          ),
          warmQueryMs: countOf(recordOf(metrics.warmQuery).latencyMs),
          warmQuerySuccesses: countOf(recordOf(metrics.warmQuery).successCount),
          pairRoundMs: rounds.map((round) => countOf(round.latencyMs)),
          pairRoundSuccesses: rounds.map((round) =>
            countOf(round.successCount),
          ),
          slowestPairMs: countOf(metrics.slowestPairMs),
          documentBatchMs: countOf(recordOf(metrics.documentBatch).latencyMs),
          documentSuccesses: countOf(
            recordOf(metrics.documentBatch).successCount,
          ),
          maxConcurrency: maxConcurrency as 1 | 2,
          testedAt,
          display: {
            capacity: textOf(display.capacity),
            measurements: textOf(display.measurements),
            reliability: textOf(display.reliability),
            warnings: stringList(display.warnings),
          },
        }
      : undefined;
  return {
    enabled: row.enabled === true,
    status: status === "ready" || status === "paused" ? status : "missing",
    pendingIdentity: narrowRetrievalIdentity(row.pendingIdentity),
    activeScope,
    pendingScope,
    publication: textOf(row.publication),
    progress: narrowRetrievalProgress(row.progress),
    issueCount: recordArray(row.issues).length,
    performanceWarningCount: recordArray(row.connections).reduce(
      (count, connection) =>
        count +
        (connection.tested === true
          ? recordArray(connection.performanceDiagnostics).length
          : 0),
      0,
    ),
    performance,
    configured: recordArray(row.connections).length > 0,
    maintenance: narrowRetrievalMaintenance(row.maintenance),
  };
}

export function projectSynthesisWorkbenchHomeSelection(
  input: SynthesisWorkbenchHomeProjectionInput,
): SynthesisWorkbenchHomeSelection {
  const snapshot = input.snapshot || {};
  const artifactRows = recordArray(snapshot.artifacts?.rows);
  const topics = artifactRows
    .map(narrowSynthesisWorkbenchHomeTopicRow)
    .filter((row): row is SynthesisWorkbenchHomeTopicRow => !!row)
    .sort(
      (left, right) =>
        right.paperCount - left.paperCount ||
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, 8);

  const summary = isRecord(snapshot.reviews?.summary)
    ? snapshot.reviews.summary
    : {};
  const indexCount = Math.max(
    countOf(summary.indexCount),
    openReviewRowCount(snapshot.registry?.cleanupProposals) +
      openReviewRowCount(snapshot.registry?.matchProposals),
  );
  const conceptCount = Math.max(
    countOf(summary.conceptCount),
    openReviewRowCount(snapshot.concepts?.reviewItems),
  );
  const topicGraphCount = Math.max(
    countOf(summary.topicGraphCount),
    openReviewRowCount(snapshot.topicGraph?.reviewItems),
  );

  const inFlightRows = recordArray(snapshot.actions?.inFlight);
  const pendingKeys = new Set<string>();
  for (const entry of inFlightRows) {
    const key = textOf(entry.key);
    if (key && isPendingKeyRelevant(key)) pendingKeys.add(key);
  }
  for (const key of input.localPendingOperationKeys || []) {
    const text = textOf(key);
    if (text && isPendingKeyRelevant(text)) pendingKeys.add(text);
  }

  return {
    insights: {
      registeredPapers: Array.isArray(snapshot.registry?.rows)
        ? snapshot.registry.rows.length
        : 0,
      topicCount: artifactRows.length,
      graphNodes: Array.isArray(snapshot.graph?.visibleNodes)
        ? snapshot.graph.visibleNodes.length
        : 0,
      graphEdges: Array.isArray(snapshot.graph?.visibleEdges)
        ? snapshot.graph.visibleEdges.length
        : 0,
      reviewOpenCount: Math.max(
        countOf(summary.openCount),
        indexCount + conceptCount + topicGraphCount,
      ),
      reviewIndexCount: indexCount,
      reviewConceptCount: conceptCount,
      reviewTopicGraphCount: topicGraphCount,
    },
    sync: narrowSyncSelection(snapshot.sync),
    retrieval: narrowSynthesisWorkbenchHomeRetrieval(snapshot.retrieval),
    pendingOperationKeys: Array.from(pendingKeys).sort(),
    topics: topics.map((topic) => {
      const { updatedAt, ...visible } = topic;
      void updatedAt;
      return visible;
    }),
  };
}

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

const MESSAGE_KEY_SET = new Set<string>(SYNTHESIS_WORKBENCH_MESSAGE_KEYS);

function messageKey(name: string): SynthesisWorkbenchMessageKey | undefined {
  return MESSAGE_KEY_SET.has(name)
    ? (name as SynthesisWorkbenchMessageKey)
    : undefined;
}

function operationLabel(t: SynthesisWorkbenchHomeText, command: string) {
  const key = messageKey(`synthesis-operation-${command}`);
  return key ? t(key) : command;
}

// Legacy maybeLocalizedValue, reduced to the branches reachable from this
// surface's data: freshness values resolve through synthesis-status-*;
// anything else renders as the raw value.
function localizedStatusValue(t: SynthesisWorkbenchHomeText, value: string) {
  const text = value.trim();
  if (!text) return "";
  const key = messageKey(
    `synthesis-status-${text.replace(/_/g, "-").toLowerCase()}`,
  );
  return key ? t(key) : text;
}

function freshnessTone(value: string) {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  return "warn";
}

function sourceMaterialsLabel(
  t: SynthesisWorkbenchHomeText,
  row: Omit<SynthesisWorkbenchHomeTopicRow, "updatedAt">,
) {
  if (row.sourceMaterialsStatus === "complete") {
    return t("synthesis-source-materials-ready");
  }
  if (row.sourceMaterialsStatus === "missing") {
    return t("synthesis-source-materials-missing");
  }
  return t("synthesis-source-materials-percent-ready", {
    percent: row.sourceMaterialsPercent,
  });
}

// ---------------------------------------------------------------------------
// View components
// ---------------------------------------------------------------------------

type RegionProps = {
  selection: SynthesisWorkbenchHomeSelection;
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
};

function InsightCard(props: { label: string; value: number; detail: string }) {
  return (
    <div class="insight-card">
      <span class="insight-label">{props.label}</span>
      <strong class="insight-value">{String(props.value)}</strong>
      <span class="insight-detail">{props.detail}</span>
    </div>
  );
}

function CommandButton(props: {
  label: string;
  command: string;
  args?: Record<string, unknown>;
  disabled?: boolean;
  pending: boolean;
  primary?: boolean;
  icon?: string;
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const busy = props.pending;
  return (
    <button
      type="button"
      class={[props.primary ? "primary" : "", busy ? "is-busy" : ""].join(" ")}
      disabled={props.disabled || busy}
      aria-busy={busy ? "true" : undefined}
      title={
        busy
          ? props.t("synthesis-operation-in-progress", {
              operation: operationLabel(props.t, props.command),
            })
          : undefined
      }
      onClick={() =>
        props.onAction(
          "hostCommand",
          props.args
            ? { command: props.command, args: props.args }
            : { command: props.command },
        )
      }
    >
      {busy ? (
        <span class="button-spinner" aria-hidden="true" />
      ) : props.icon ? (
        <span class={`zs-icon zs-icon-sm ${props.icon}`} aria-hidden="true" />
      ) : null}
      {props.label}
    </button>
  );
}

function SyncConflictPanel(props: {
  sync: SynthesisWorkbenchHomeSyncSelection;
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const { sync, t } = props;
  if (sync.queueState !== "blocked_conflict" || !sync.conflictAssets.length) {
    return null;
  }
  const asset = sync.conflictAssets[0];
  const command = "resolveWebDavSyncConflict";
  const commandAllowed = sync.allowedActions.includes(command);
  const pending = props.pendingOperationKeys.includes(command);
  const conflictButton = (label: string, action: string) => (
    <CommandButton
      key={action}
      label={label}
      command={command}
      args={{ action }}
      disabled={!commandAllowed || !sync.conflictActions.includes(action)}
      pending={pending}
      t={t}
      onAction={props.onAction}
    />
  );
  const details: Array<[string, string]> = [
    [t("synthesis-field-reason"), asset.reason || "both_changed"],
    ["base", asset.baseHash || "-"],
    ["local", asset.localHash || "-"],
    ["remote", asset.remoteHash || "-"],
    [t("synthesis-field-queue-state"), sync.queueState],
    [
      t("synthesis-field-remote"),
      sync.baseUrl || t("synthesis-field-not-configured"),
    ],
    [t("synthesis-field-remote-path"), sync.remotePath || "-"],
  ];
  return (
    <section class="review-panel review-panel-enter sync-review-panel">
      <article class="review-card">
        <div class="review-card-header">
          <div class="review-card-title">
            <span class="badge warn">{t("synthesis-sync-review")}</span>
            <strong>
              {asset.assetPath || t("synthesis-sync-conflict-title")}
            </strong>
          </div>
          <span class="muted">
            {sync.conflictAssets.length > 1
              ? t("synthesis-sync-more-assets", {
                  count: String(sync.conflictAssets.length - 1),
                })
              : t("synthesis-sync-one-asset")}
          </span>
        </div>
        <p class="review-card-body">
          {t("synthesis-sync-conflict-body-webdav")}
        </p>
        <div class="review-card-details review-card-metadata">
          {details.map(([label, value]) => (
            <div class="detail-row" key={label}>
              <span class="muted">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div class="action-group">
          {conflictButton(t("synthesis-action-keep-local"), "keep_local")}
          {conflictButton(
            t("synthesis-action-save-remote-copy"),
            "save_remote_copy",
          )}
          {conflictButton(
            t("synthesis-action-recheck-sync"),
            "clear_after_manual_edit",
          )}
          {conflictButton(t("synthesis-action-use-remote"), "use_remote")}
          {conflictButton(
            t("synthesis-action-needs-attention"),
            "mark_needs_attention",
          )}
        </div>
      </article>
    </section>
  );
}

function syncState(
  sync: SynthesisWorkbenchHomeSyncSelection,
  pending: string[],
) {
  if (sync.configStatus === "disabled")
    return { key: "synthesis-sync-state-disabled", tone: "warning" } as const;
  if (!sync.adapterConfigured)
    return { key: "synthesis-sync-not-configured", tone: "warning" } as const;
  if (sync.queueState === "blocked_conflict")
    return { key: "synthesis-sync-state-conflict", tone: "danger" } as const;
  if (
    sync.queueState === "syncing" ||
    pending.includes("syncWebDavNow") ||
    pending.includes("retryWebDavSync")
  )
    return { key: "synthesis-sync-state-syncing", tone: "accent" } as const;
  if (sync.paused)
    return { key: "synthesis-sync-paused", tone: "warning" } as const;
  if (sync.queueState === "disabled")
    return { key: "synthesis-sync-state-disabled", tone: "warning" } as const;
  if (sync.queueState.startsWith("failed"))
    return { key: "synthesis-status-failed", tone: "danger" } as const;
  if (sync.queueState === "queued")
    return { key: "synthesis-sync-state-queued", tone: "accent" } as const;
  return { key: "synthesis-status-ready", tone: "success" } as const;
}

function SyncPanel(props: RegionProps) {
  const { selection, t, onAction } = props;
  const sync = selection.sync;
  const allowed = sync.allowedActions;
  const pending = selection.pendingOperationKeys;
  const state = syncState(sync, pending);
  const [reviewOpen, setReviewOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const conflicted =
    sync.queueState === "blocked_conflict" && sync.conflictAssets.length > 0;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (reviewOpen && conflicted) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
      if (reviewOpen) setReviewOpen(false);
    }
  }, [reviewOpen, conflicted]);

  const closeReview = () => {
    dialogRef.current?.close();
    setReviewOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <section
      class="home-service-card sync-panel"
      aria-labelledby="home-sync-title"
    >
      <div class="home-service-heading">
        <div class="home-service-title">
          <span class="zs-icon zs-icon-inventory-2" aria-hidden="true" />
          <h3 id="home-sync-title">{t("synthesis-home-sync")}</h3>
        </div>
        <div class="home-service-state" role="status">
          <strong class={`zs-badge zs-badge--${state.tone}`}>
            {t(state.key)}
          </strong>
        </div>
      </div>
      {sync.adapterConfigured ? (
        <div class="toolbar home-service-actions">
          <CommandButton
            label={t("synthesis-action-webdav-sync-now")}
            command="syncWebDavNow"
            primary
            disabled={!allowed.includes("syncWebDavNow")}
            pending={pending.includes("syncWebDavNow")}
            t={t}
            onAction={onAction}
          />
          <CommandButton
            label={t(
              sync.paused
                ? "synthesis-action-resume-webdav-sync"
                : "synthesis-action-pause-webdav-sync",
            )}
            command={sync.paused ? "resumeWebDavSync" : "pauseWebDavSync"}
            disabled={
              !allowed.includes(
                sync.paused ? "resumeWebDavSync" : "pauseWebDavSync",
              )
            }
            pending={pending.includes(
              sync.paused ? "resumeWebDavSync" : "pauseWebDavSync",
            )}
            t={t}
            onAction={onAction}
          />
          {sync.queueState.startsWith("failed") ? (
            <CommandButton
              label={t("synthesis-action-retry-webdav-sync")}
              command="retryWebDavSync"
              disabled={!allowed.includes("retryWebDavSync")}
              pending={pending.includes("retryWebDavSync")}
              t={t}
              onAction={onAction}
            />
          ) : null}
          {conflicted ? (
            <button
              type="button"
              ref={triggerRef}
              onClick={() => setReviewOpen(true)}
            >
              {t("synthesis-action-resolve-sync-conflict")}
            </button>
          ) : null}
        </div>
      ) : null}
      <dialog
        ref={dialogRef}
        class="home-conflict-dialog"
        aria-labelledby="home-conflict-title"
        onCancel={(event) => {
          event.preventDefault();
          closeReview();
        }}
        onClose={() => {
          setReviewOpen(false);
          triggerRef.current?.focus();
        }}
      >
        {reviewOpen && conflicted ? (
          <>
            <div class="home-conflict-header">
              <h2 id="home-conflict-title">
                {t("synthesis-sync-conflict-title")}
              </h2>
              <button type="button" onClick={closeReview} autoFocus>
                {t("synthesis-action-close")}
              </button>
            </div>
            <div class="home-conflict-content">
              <SyncConflictPanel
                sync={sync}
                pendingOperationKeys={pending}
                t={t}
                onAction={onAction}
              />
            </div>
          </>
        ) : null}
      </dialog>
    </section>
  );
}

function TopicCard(props: {
  row: Omit<SynthesisWorkbenchHomeTopicRow, "updatedAt">;
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const { row, t } = props;
  const title = row.title || row.id || t("synthesis-topic-untitled");
  const definition = row.definition.trim();
  const discoveryBadge =
    row.candidateCount > 0
      ? {
          text: t(
            row.candidateCount === 1
              ? "synthesis-discovery-candidate"
              : "synthesis-discovery-candidates",
            { count: row.candidateCount },
          ),
          tone: row.candidateCount < 5 ? "orange" : "danger",
        }
      : { text: t("synthesis-discovery-none"), tone: "ok" };
  return (
    <button
      type="button"
      class="topic-card"
      onClick={() =>
        props.onAction("hostCommand", {
          command: "openTopicArtifact",
          args: { topicId: row.id },
        })
      }
    >
      <div class="topic-card-head">
        <strong>{title}</strong>
        <span class={`badge ${freshnessTone(row.freshness)}`}>
          {localizedStatusValue(t, row.freshness) || "-"}
        </span>
      </div>
      <p class="topic-card-summary">
        {definition || t("synthesis-topic-no-definition")}
      </p>
      <div class="topic-meter">
        <span style={{ width: `${row.sourceMaterialsPercent}%` }} />
      </div>
      <div class="topic-card-meta">
        <span>
          {t("synthesis-topic-paper-count", { count: row.paperCount })}
        </span>
        <span>{sourceMaterialsLabel(t, row)}</span>
        <span class={`badge ${discoveryBadge.tone} topic-discovery-badge`}>
          {discoveryBadge.text}
        </span>
      </div>
    </button>
  );
}

export const HomeRegion = memo(
  function HomeRegion(props: RegionProps) {
    const { selection, t, onAction } = props;
    const insights = selection.insights;
    return (
      <div class="home-shell zs-fill-col" data-region-content="synthesis-home">
        <div class="zs-scroll-region home-scroll">
          <section class="workspace-section">
            <div class="section-heading">
              <h2>{t("synthesis-home-library-insights")}</h2>
            </div>
            <div class="insight-grid">
              <InsightCard
                label={t("synthesis-home-registered-papers")}
                value={insights.registeredPapers}
                detail={t("synthesis-home-registered-papers-detail")}
              />
              <InsightCard
                label={t("synthesis-tab-topics")}
                value={insights.topicCount}
                detail={t("synthesis-home-generated-artifacts")}
              />
              <InsightCard
                label={t("synthesis-tab-graph")}
                value={insights.graphNodes}
                detail={t("synthesis-graph-shown-count", {
                  nodes: insights.graphNodes,
                  edges: insights.graphEdges,
                })}
              />
              <InsightCard
                label={t("synthesis-home-review-items")}
                value={insights.reviewOpenCount}
                detail={t("synthesis-home-review-items-detail", {
                  index: insights.reviewIndexCount,
                  concepts: insights.reviewConceptCount,
                  topicGraph: insights.reviewTopicGraphCount,
                })}
              />
            </div>
          </section>
          <section class="workspace-section home-services">
            <div class="section-heading">
              <h2>{t("synthesis-home-services")}</h2>
              <CommandButton
                label={t("synthesis-home-settings")}
                command="openPreferences"
                icon="zs-icon-settings-applications"
                pending={selection.pendingOperationKeys.includes(
                  "openPreferences",
                )}
                t={t}
                onAction={onAction}
              />
            </div>
            <div class="home-service-grid">
              <SyncPanel selection={selection} t={t} onAction={onAction} />
              <RetrievalPanel
                selection={selection.retrieval}
                pendingOperationKeys={selection.pendingOperationKeys}
                t={t}
                onAction={onAction}
              />
            </div>
          </section>
          <section class="workspace-section">
            <div class="section-heading">
              <h2>{t("synthesis-home-top-topics")}</h2>
              <button
                type="button"
                class=""
                onClick={() => onAction("selectTab", { tab: "artifacts" })}
              >
                {t("synthesis-action-view-all")}
              </button>
            </div>
            <div class="topic-grid">
              {selection.topics.length === 0 ? (
                <div class="empty-state empty-state-info">
                  <strong class="empty-state-title">
                    {t("synthesis-empty-no-topics")}
                  </strong>
                  <p class="empty-state-message">
                    {t("synthesis-home-empty-message")}
                  </p>
                </div>
              ) : (
                selection.topics.map((row) => (
                  <TopicCard
                    key={row.id || row.title}
                    row={row}
                    t={t}
                    onAction={onAction}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    prev.t === next.t &&
    equalBySignature(prev.selection, next.selection),
);
