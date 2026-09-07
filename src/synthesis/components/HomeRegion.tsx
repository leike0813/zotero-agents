/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";
import { SYNTHESIS_WORKBENCH_MESSAGE_KEYS } from "../../shared/synthesisWorkbenchI18nContract";
import type {
  SynthesisWorkbenchActionName,
  SynthesisWorkbenchMessageKey,
  SynthesisWorkbenchSyncDiagnostic,
} from "../../shared/synthesisWorkbenchWireContract";

// Home / overview surface of the synthesis workbench: library insight cards,
// the WebDAV sync panel (summary, actions, feedback log, conflict review) and
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
  summary: string;
  markdownPreview: string;
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

export type SynthesisWorkbenchHomeConnectionTest = {
  ok: boolean;
  testedAt: string;
  diagnostics: SynthesisWorkbenchSyncDiagnostic[];
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
  rootDiagnostics: SynthesisWorkbenchSyncDiagnostic[];
  diagnostics: SynthesisWorkbenchSyncDiagnostic[];
  connectionTest?: SynthesisWorkbenchHomeConnectionTest;
  lastRunStatus: string;
  lastRunAt: string;
  conflictAssets: SynthesisWorkbenchHomeConflictAsset[];
};

export type SynthesisWorkbenchHomeSyncLogEntry = {
  command: string;
  label: string;
  message?: string;
};

export type SynthesisWorkbenchHomeSyncLogSelection = {
  // Whether the host reports any in-flight operation at all (sync or not);
  // gates the local-pending fallback line exactly like the legacy page.
  anyInFlight: boolean;
  inFlight: SynthesisWorkbenchHomeSyncLogEntry[];
  lastFailed?: SynthesisWorkbenchHomeSyncLogEntry;
  lastCompleted?: SynthesisWorkbenchHomeSyncLogEntry;
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
  syncLog: SynthesisWorkbenchHomeSyncLogSelection;
  // Operation keys (legacy operationKey vocabulary) currently pending, scoped
  // to the commands this surface renders buttons for; drives busy/disabled.
  pendingOperationKeys: string[];
  topics: SynthesisWorkbenchHomeTopicRow[];
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

// Commands this surface renders pending-aware buttons for. Topic cards use
// openTopicArtifact:<topicId> keys; every other relevant command keys on the
// bare command name (legacy operationKey default branch).
const PENDING_COMMAND_PREFIXES = ["openTopicArtifact:"];
const PENDING_COMMANDS = [...SYNC_OPERATION_COMMANDS, "openPreferences"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function textOf(value: unknown, fallback = ""): string {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
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

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => textOf(entry)).filter(Boolean)
    : [];
}

function narrowDiagnostics(value: unknown): SynthesisWorkbenchSyncDiagnostic[] {
  return recordArray(value).map((entry) => ({
    code: textOf(entry.code),
    severity:
      entry.severity === "error" || entry.severity === "warning"
        ? entry.severity
        : "info",
    message: textOf(entry.message),
  }));
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
    summary: textOf(value.summary),
    markdownPreview: textOf(value.markdown_preview),
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

function narrowSyncOperationEntry(
  value: unknown,
): SynthesisWorkbenchHomeSyncLogEntry | undefined {
  if (!isRecord(value)) return undefined;
  const command = textOf(value.command);
  if (!SYNC_OPERATION_COMMANDS.includes(command)) return undefined;
  return {
    command,
    label: textOf(value.label),
    message: textOf(value.message) || undefined,
  };
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
  const connectionTest = isRecord(webdav.connection_test)
    ? {
        ok: webdav.connection_test.ok === true,
        testedAt: textOf(webdav.connection_test.tested_at),
        diagnostics: narrowDiagnostics(webdav.connection_test.diagnostics),
      }
    : undefined;
  return {
    queueState: textOf(webdav.queue_state),
    paused: webdav.paused === true,
    adapterConfigured: webdav.adapter_configured === true,
    configStatus: textOf(webdav.config_status),
    baseUrl: textOf(webdav.base_url),
    remotePath: textOf(webdav.remote_path),
    allowedActions: stringList(webdav.allowedActions),
    conflictActions: stringList(webdav.conflictActions),
    rootDiagnostics: narrowDiagnostics(root.diagnostics),
    diagnostics: narrowDiagnostics(webdav.diagnostics),
    connectionTest,
    lastRunStatus: textOf(webdav.last_run_status),
    lastRunAt: textOf(webdav.last_run_at),
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
    syncLog: {
      anyInFlight: inFlightRows.length > 0,
      inFlight: inFlightRows
        .map(narrowSyncOperationEntry)
        .filter(
          (entry): entry is SynthesisWorkbenchHomeSyncLogEntry => !!entry,
        ),
      lastFailed: narrowSyncOperationEntry(snapshot.actions?.lastFailed),
      lastCompleted: narrowSyncOperationEntry(snapshot.actions?.lastCompleted),
    },
    pendingOperationKeys: Array.from(pendingKeys).sort(),
    topics,
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
  row: SynthesisWorkbenchHomeTopicRow,
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

function InsightCard(props: {
  label: string;
  value: number;
  detail: string;
  tone?: string;
}) {
  return (
    <div class={`insight-card ${props.tone || ""}`.trim()}>
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
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const busy = props.pending;
  return (
    <button
      type="button"
      class={busy ? "is-busy" : ""}
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
      {busy ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.label}
    </button>
  );
}

type SyncLogLine = {
  level: "info" | "ok" | "warn" | "error";
  source: string;
  message: string;
};

function diagnosticLevel(
  severity: SynthesisWorkbenchSyncDiagnostic["severity"],
): SyncLogLine["level"] {
  if (severity === "error") return "error";
  if (severity === "warning") return "warn";
  return "info";
}

function buildSyncLogLines(
  selection: SynthesisWorkbenchHomeSelection,
  t: SynthesisWorkbenchHomeText,
): SyncLogLine[] {
  const lines: SyncLogLine[] = [];
  const { sync, syncLog } = selection;
  for (const entry of syncLog.inFlight) {
    lines.push({
      level: "info",
      source: t("synthesis-sync-log-pending"),
      message: `${entry.label || entry.command} ${t(
        "synthesis-sync-log-running",
      )}`,
    });
  }
  const syncPending =
    selection.pendingOperationKeys.includes("syncWebDavNow") ||
    selection.pendingOperationKeys.includes("retryWebDavSync");
  if (syncPending && !syncLog.anyInFlight) {
    lines.push({
      level: "info",
      source: t("synthesis-sync-log-pending"),
      message: t("synthesis-sync-log-webdav-running"),
    });
  }
  if (syncLog.lastFailed) {
    lines.push({
      level: "error",
      source: t("synthesis-sync-log-failed"),
      message: `${syncLog.lastFailed.label || syncLog.lastFailed.command}: ${
        syncLog.lastFailed.message || t("synthesis-sync-log-failed")
      }`,
    });
  }
  if (syncLog.lastCompleted) {
    lines.push({
      level: "ok",
      source: t("synthesis-sync-log-completed"),
      message: `${
        syncLog.lastCompleted.label || syncLog.lastCompleted.command
      } ${t("synthesis-sync-log-completed")}`,
    });
  }
  [...sync.rootDiagnostics, ...sync.diagnostics]
    .slice(0, 6)
    .forEach((entry) => {
      lines.push({
        level: diagnosticLevel(entry.severity),
        source: t("synthesis-sync-log-diagnostic"),
        message: `${entry.code}: ${entry.message}`,
      });
    });
  const connectionTest = sync.connectionTest;
  if (connectionTest) {
    lines.push({
      level: connectionTest.ok ? "ok" : "warn",
      source: t("synthesis-sync-log-connection"),
      message: `${
        connectionTest.ok
          ? t("synthesis-sync-log-ready")
          : t("synthesis-sync-log-not-ready")
      } ${connectionTest.testedAt}`.trim(),
    });
    connectionTest.diagnostics.slice(0, 3).forEach((entry) => {
      lines.push({
        level: entry.severity === "error" ? "error" : "warn",
        source: t("synthesis-sync-log-connection"),
        message: `${entry.code}: ${entry.message}`,
      });
    });
  }
  if (sync.lastRunStatus || sync.lastRunAt) {
    lines.push({
      level: sync.lastRunStatus.startsWith("failed") ? "error" : "info",
      source: t("synthesis-sync-log-last-run"),
      message: `${
        sync.lastRunStatus || t("synthesis-sync-log-unknown")
      } ${sync.lastRunAt}`.trim(),
    });
  }
  if (!lines.length) {
    lines.push({
      level: "info",
      source: t("synthesis-home-sync"),
      message: t("synthesis-sync-log-no-activity"),
    });
  }
  return lines;
}

function SyncFeedbackLog(props: {
  selection: SynthesisWorkbenchHomeSelection;
  t: SynthesisWorkbenchHomeText;
}) {
  const lines = buildSyncLogLines(props.selection, props.t);
  return (
    <div class="sync-feedback-terminal">
      {lines.map((line, index) => (
        <div class={`sync-log-line sync-log-level-${line.level}`} key={index}>
          <span class="sync-log-source">{line.source}</span>
          <span class="sync-log-message">{line.message}</span>
        </div>
      ))}
    </div>
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

function SyncPanel(props: RegionProps) {
  const { selection, t, onAction } = props;
  const sync = selection.sync;
  const allowed = sync.allowedActions;
  const pending = selection.pendingOperationKeys;
  return (
    <section class="workspace-section sync-panel">
      <div class="section-heading">
        <h2>{t("synthesis-home-sync")}</h2>
      </div>
      <div class="sync-summary">
        <div class="sync-summary-item">
          <span class="sync-summary-label">
            {t("synthesis-sync-webdav-exchange")}
          </span>
          <strong class="sync-summary-value">
            {sync.queueState || "disabled"}
          </strong>
          <span class="sync-summary-detail">
            {sync.configStatus
              ? t("synthesis-sync-config", { status: sync.configStatus })
              : sync.paused
                ? t("synthesis-sync-paused")
                : t("synthesis-sync-webdav-exchange-detail")}
          </span>
        </div>
        <div class="sync-summary-item">
          <span class="sync-summary-label">{t("synthesis-sync-remote")}</span>
          <strong class="sync-summary-value">
            {sync.remotePath || t("synthesis-sync-not-configured")}
          </strong>
          <span class="sync-summary-detail">
            {sync.baseUrl || t("synthesis-sync-remote-detail")}
          </span>
        </div>
      </div>
      <div class="toolbar">
        {!sync.adapterConfigured ? (
          <CommandButton
            label={t("synthesis-action-open-preferences")}
            command="openPreferences"
            pending={pending.includes("openPreferences")}
            t={t}
            onAction={onAction}
          />
        ) : (
          <>
            <CommandButton
              label={t("synthesis-action-webdav-sync-now")}
              command="syncWebDavNow"
              disabled={!allowed.includes("syncWebDavNow")}
              pending={pending.includes("syncWebDavNow")}
              t={t}
              onAction={onAction}
            />
            <CommandButton
              label={
                sync.paused
                  ? t("synthesis-action-resume-webdav-sync")
                  : t("synthesis-action-pause-webdav-sync")
              }
              command={sync.paused ? "resumeWebDavSync" : "pauseWebDavSync"}
              disabled={
                sync.paused
                  ? !allowed.includes("resumeWebDavSync")
                  : !allowed.includes("pauseWebDavSync")
              }
              pending={pending.includes(
                sync.paused ? "resumeWebDavSync" : "pauseWebDavSync",
              )}
              t={t}
              onAction={onAction}
            />
            <CommandButton
              label={t("synthesis-action-retry-webdav-sync")}
              command="retryWebDavSync"
              disabled={!allowed.includes("retryWebDavSync")}
              pending={pending.includes("retryWebDavSync")}
              t={t}
              onAction={onAction}
            />
          </>
        )}
      </div>
      <SyncFeedbackLog selection={selection} t={t} />
      <SyncConflictPanel
        sync={sync}
        pendingOperationKeys={pending}
        t={t}
        onAction={onAction}
      />
    </section>
  );
}

function TopicCard(props: {
  row: SynthesisWorkbenchHomeTopicRow;
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const { row, t } = props;
  const title = row.title || row.id || t("synthesis-topic-untitled");
  const summary = row.definition || row.summary || row.markdownPreview;
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
        {summary || t("synthesis-topic-no-summary")}
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
        <span>{row.updatedAt || t("synthesis-topic-not-updated")}</span>
      </div>
    </button>
  );
}

export const HomeRegion = memo(
  function HomeRegion(props: RegionProps) {
    const { selection, t, onAction } = props;
    const insights = selection.insights;
    return (
      <div class="home-shell" data-region-content="synthesis-home">
        <section class="workspace-section">
          <div class="section-heading">
            <h2>{t("synthesis-home-library-insights")}</h2>
          </div>
          <div class="insight-grid">
            <InsightCard
              label={t("synthesis-home-registered-papers")}
              value={insights.registeredPapers}
              detail={t("synthesis-home-registered-papers-detail")}
              tone="teal"
            />
            <InsightCard
              label={t("synthesis-tab-topics")}
              value={insights.topicCount}
              detail={t("synthesis-home-generated-artifacts")}
              tone="blue"
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
              tone={insights.reviewOpenCount ? "orange" : ""}
            />
          </div>
        </section>
        <SyncPanel selection={selection} t={t} onAction={onAction} />
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
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    prev.t === next.t &&
    equalBySignature(prev.selection, next.selection),
);
