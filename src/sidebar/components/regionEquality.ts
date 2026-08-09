// Region equality single source for the Assistant Workspace chrome migration.
//
// The legacy imperative renderer guards each managed region with a signature
// attribute; the Preact components memo on the same field selections. Both
// sides share these functions so the equality boundary cannot drift while the
// migration is in flight. A selection contains only the region's user-visible
// content and open/collapsed state (transcript revision, streaming chunks,
// and counts of other regions must never enter a selection).

export function safeText(value: unknown): string {
  return String(value == null ? "" : value).trim();
}

export function stableRegionSignature(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return safeText(value);
  }
}

export function equalBySignature(previous: unknown, next: unknown): boolean {
  return stableRegionSignature(previous) === stableRegionSignature(next);
}

type PanelLike =
  | {
      labels?: unknown;
      messageCounts?: unknown;
      drawers?: unknown;
      actions?: unknown;
    }
  | null
  | undefined;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function labelRoot(panel: PanelLike): Record<string, unknown> {
  const labels = asRecord(panel?.labels);
  if (!labels) return {};
  const nested = asRecord(labels.assistantPanel);
  return nested || labels;
}

export function panelTranscriptLabels(
  panel: PanelLike,
): Record<string, unknown> {
  return asRecord(labelRoot(panel).transcript) || {};
}

// labelOf port: dotted lookup under the panel label root with a fallback.
export function labelOf(
  panel: PanelLike,
  path: string,
  fallback: string,
): string {
  const parts = safeText(path).split(".").filter(Boolean);
  let cursor: unknown = labelRoot(panel);
  for (const part of parts) {
    const record = asRecord(cursor);
    if (!record) return fallback;
    cursor = record[part];
  }
  return safeText(cursor) || fallback;
}

export type MessageCountsSelection = {
  scopeKey?: unknown;
  executionKey?: unknown;
  active?: unknown;
  current?: Record<string, unknown> | null;
  cumulative?: Record<string, unknown> | null;
  completeness?: unknown;
  revision?: unknown;
  labels?: Record<string, unknown> | null;
} | null;

export function messageCountsEqualityInput(
  panel: PanelLike,
): MessageCountsSelection {
  const counts = asRecord(panel?.messageCounts);
  if (!counts) return null;
  return {
    scopeKey: counts.scopeKey,
    executionKey: counts.executionKey,
    active: counts.active,
    current: asRecord(counts.current),
    cumulative: asRecord(counts.cumulative),
    completeness: counts.completeness,
    revision: counts.revision,
    labels: panelTranscriptLabels(panel),
  };
}

// Reply region equality, ported from replyStructuralSignature and
// replyRegionSignature in the imperative renderer. The two tiers mirror the
// old two-attribute guard: structure changes rebuild the composer shell,
// live changes only patch fields on the preserved textarea. The reply action
// payload rides along in the live tier (beyond the imperative port) so a
// payload-only change — e.g. a second consecutive waiting_user round —
// re-renders and rebinds the submit closure instead of emitting the stale
// payload captured by the previous render.

type ReplyPanelLike = {
  kind?: unknown;
  context?: unknown;
  lifecycle?: unknown;
  reply?: unknown;
  usage?: unknown;
} | null;

export function replyStructuralSignature(panel: ReplyPanelLike): unknown {
  const reply = asRecord(panel?.reply) || {};
  return {
    action: safeText(reply.action || "reply"),
    tone: safeText(reply.tone || "primary"),
    clearOnSend: reply.clearOnSend !== false,
    showUsageGauge: reply.showUsageGauge === true,
    controls: Array.isArray(reply.controls) ? reply.controls : [],
  };
}

export function replyRegionEqualityInput(panel: ReplyPanelLike): unknown {
  const reply = asRecord(panel?.reply) || {};
  return {
    structure: replyStructuralSignature(panel),
    live: {
      enabled: reply.enabled === true,
      inputEnabled: reply.inputEnabled !== false,
      placeholder: safeText(reply.placeholder),
      hint: safeText(reply.hint),
      submitLabel: safeText(reply.submitLabel),
      sending: reply.sending === true,
      payload: reply.payload ?? null,
      value: Object.prototype.hasOwnProperty.call(reply, "value")
        ? String(reply.value == null ? "" : reply.value)
        : null,
      usage: reply.showUsageGauge === true ? (panel?.usage ?? null) : null,
    },
  };
}

// Permission drawer equality, ported from permissionDrawerSignature. The
// open flag is part of the boundary (unlike the context/details drawers,
// whose open state is toggled outside the region).
export function permissionDrawerEqualityInput(panel: PanelLike): unknown {
  const drawers = asRecord(panel?.drawers) || {};
  const request = asRecord(drawers.permissionRequest);
  const open = drawers.permissionRequestOpen === true && !!request;
  return {
    open,
    request: open ? request : null,
    labels: {
      close: labelOf(panel, "actions.close", "Close"),
      title: labelOf(panel, "permission.title", "Permission request"),
    },
  };
}

// Details drawer equality, ported from detailsDrawerSignature. Drawer
// open/closed state is intentionally excluded: it is toggled on the
// container by the child and never rebuilds drawer content.
export function detailsDrawerEqualityInput(panel: PanelLike): unknown {
  const drawers = asRecord(panel?.drawers) || {};
  const actions = asRecord(panel?.actions) || {};
  return {
    title: safeText(drawers.detailsTitle),
    details: Array.isArray(drawers.details) ? drawers.details : [],
    loading: drawers.detailsLoading === true,
    actions: Array.isArray(actions.details) ? actions.details : [],
    labels: {
      close: labelOf(panel, "actions.close", "Close"),
      empty: labelOf(panel, "details.empty", "No details."),
      noEntries: labelOf(panel, "details.noEntries", "No entries."),
      title: labelOf(panel, "details.title", "Details"),
    },
  };
}

// Context drawer equality for the workspace task drawer layout, ported from
// workspaceTaskDrawerSignature. The selection carries the render data; the
// deep JSON comparison is a superset of the old stable-structure string, so
// unchanged sections/groups/tasks compare equal while live fields
// (updatedAt, is-active) flow through as ordinary content updates.
export function contextDrawerEqualityInput(panel: PanelLike): unknown {
  const drawers = asRecord(panel?.drawers) || {};
  const sections = Array.isArray(drawers.sections)
    ? drawers.sections
    : Array.isArray(drawers.skillrunnerSections)
      ? drawers.skillrunnerSections
      : [];
  return {
    layout: safeText(drawers.layout),
    contextTitle: safeText(drawers.contextTitle),
    selectedTaskKey: safeText(drawers.selectedTaskKey),
    contextCount: Array.isArray(drawers.contexts) ? drawers.contexts.length : 0,
    sections,
    notice: safeText(drawers.notice),
    labels: asRecord(drawers.labels) || {},
  };
}
