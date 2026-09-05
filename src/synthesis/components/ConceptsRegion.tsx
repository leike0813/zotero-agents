/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useState } from "preact/hooks";
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";
import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES } from "../../shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchMessageKey } from "../../shared/synthesisWorkbenchWireContract";

// Concepts surface of the synthesis workbench page (legacy
// src/synthesisWorkbenchApp.ts renderConcepts :13059-13141 plus its concept
// table/bulk-bar/review-panel helpers). Renders the concept filter toolbar,
// the cache status line, the bulk selection bar, the concept table, and the
// inline concept review panel.
//
// Action names and payload shapes mirror the legacy implementation exactly:
//   setFilters          { concepts: { search } }              (per keystroke)
//   setFilters          { concepts: { conceptType } }
//   setFilters          { concepts: { status } }
//   setConceptOverlay   { enabled }   (legacy action name; the wire contract's
//                         action union omits it, but the host handler in
//                         src/modules/synthesis/uiModel.ts accepts it — the
//                         integration dispatch channel is string-typed, so the
//                         frozen legacy name is preserved here)
//   setFilters          { concepts: { reviewMergeTargets } }  (merge target select)
//   hostCommand         { command: "deleteConceptEntry", args: { conceptIds } }
//   hostCommand         { command: "applyConceptReviewAction",
//                         args: { reviewId, action, targetConceptId? } }
//
// Local UI state stays inside the component (legacy `state.selectedConceptIds`
// and `state.conceptReviewPanel`): the checkbox selection set and the review
// panel index/collapsed flag. Neither enters the wire.
//
// The selection is the region equality input. It carries only this surface's
// user-visible content: filter values, the visible rows, the open review
// items, merge-target drafts, the cache-stale flag and the pending-operation
// keys that disable buttons. Snapshot fields this surface never renders
// (senses, aliases section, relations, overlay entries, manifest,
// diagnostics) and high-frequency cross-region data stay out by construction.
//
// i18n: every user-visible string resolves through the injected `t` against
// SynthesisWorkbenchMessageKey. Two legacy strings have no SSOT key yet and
// are resolved through the same injected t via the documented gap-key seam
// (CONCEPTS_GAP_MESSAGE_KEYS below); the integration layer must add them to
// src/synthesisWorkbenchI18n.ts:
//   synthesis-confirm-delete-concepts  "Delete %count% concept(s)?"
//   synthesis-concepts-select-row      "Select %label%"

// ---------------------------------------------------------------------------
// Narrowed wire projections (the wire view's host slots are `unknown`
// page-side; these describe only the fields this surface reads).
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchConceptRowWire = {
  concept_id?: unknown;
  label?: unknown;
  short_definition?: unknown;
  definition?: unknown;
  usage_note?: unknown;
  editorial_note?: unknown;
  concept_type?: unknown;
  domain?: unknown;
  aliases?: unknown;
  status?: unknown;
};

export type SynthesisWorkbenchConceptReviewItemWire = {
  review_id?: unknown;
  label?: unknown;
  short_definition?: unknown;
  definition?: unknown;
  reason?: unknown;
  status?: unknown;
  confidence?: unknown;
  concept_type?: unknown;
  domain?: unknown;
  topic_id?: unknown;
  topic_relevance?: unknown;
  candidate_concept_ids?: unknown;
};

// ---------------------------------------------------------------------------
// Render-ready selection DTO (panel-model output; the region equality input).
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchConceptRowView = {
  conceptId: string;
  label: string;
  // conceptDefinitionSummary: short_definition || definition || usage_note ||
  // editorial_note, resolved by the projection below.
  definition: string;
  conceptType: string;
  domain: string;
  aliases: string[];
  status: string;
};

export type SynthesisWorkbenchConceptReviewCandidateView = {
  id: string;
  // conceptDisplayName: the row label for this candidate id (fallback: id).
  label: string;
};

export type SynthesisWorkbenchConceptReviewItemView = {
  reviewId: string;
  label: string;
  // short_definition || definition.
  definition: string;
  reason: string;
  candidates: SynthesisWorkbenchConceptReviewCandidateView[];
  // Raw wire values rendered through compactReviewValue at render time.
  confidence: unknown;
  conceptType: unknown;
  domain: unknown;
  topicId: unknown;
  topicRelevance: unknown;
};

export type SynthesisWorkbenchConceptsSelection = {
  search: string;
  conceptType: string;
  status: string;
  overlayEnabled: boolean;
  // snapshot.concepts.conceptTypes; the "all" option is prepended here.
  conceptTypes: string[];
  projectionStale: boolean;
  // snapshot.concepts.rows.length (count label + empty-state variant).
  rowCount: number;
  // snapshot.concepts.visibleRows, projected.
  rows: SynthesisWorkbenchConceptRowView[];
  // Open, not-optimistically-resolved review items, projected. The
  // optimistic-resolution filter belongs to the panel model, which owns the
  // controller's optimisticReviewDecisions state.
  reviewItems: SynthesisWorkbenchConceptReviewItemView[];
  // snapshot.concepts.filters.reviewMergeTargets (merge select drafts).
  reviewMergeTargets: Record<string, string>;
  // Operation keys (conceptHostCommandOperationKey) currently pending, sorted;
  // hostCommand buttons whose key is listed render busy and disabled.
  pendingOperationKeys: string[];
};

export type SynthesisWorkbenchConceptsAction =
  | "setFilters"
  | "setConceptOverlay"
  | "hostCommand";

export type SynthesisWorkbenchConceptsActionHandler = (
  action: SynthesisWorkbenchConceptsAction,
  payload?: Record<string, unknown>,
) => void;

export type SynthesisWorkbenchConceptsTranslate = (
  key: SynthesisWorkbenchMessageKey,
  vars?: Record<string, unknown>,
) => string;

export type ConceptsRegionProps = {
  selection: SynthesisWorkbenchConceptsSelection;
  t: SynthesisWorkbenchConceptsTranslate;
  onAction: SynthesisWorkbenchConceptsActionHandler;
};

// Region equality guard, shared by the memo boundary below and any future
// imperative guard: only the selection signature and the callback identities
// matter.
export function conceptsRegionPropsEqual(
  prev: ConceptsRegionProps,
  next: ConceptsRegionProps,
): boolean {
  return (
    prev.onAction === next.onAction &&
    prev.t === next.t &&
    equalBySignature(prev.selection, next.selection)
  );
}

// ---------------------------------------------------------------------------
// Pure helpers ported from the legacy page (no module dependencies).
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function firstText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = textValue(row[key]);
    if (value) return value;
  }
  return fallback;
}

function hasStructuredContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) {
    return Object.entries(value).some(([, entry]) =>
      Array.isArray(entry)
        ? entry.length > 0
        : isRecord(entry)
          ? Object.keys(entry).length > 0
          : !!textValue(entry),
    );
  }
  return !!textValue(value);
}

function enumKeyPart(value: unknown): string {
  return textValue(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function humanizeEnumValue(value: unknown): string {
  const text = textValue(value);
  if (!text) return "";
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const CONTROLLED_ENUM_DOMAINS = ["status", "reason", "concept-type"] as const;

type ControlledEnumDomain = (typeof CONTROLLED_ENUM_DOMAINS)[number];

function enumMessageKey(
  domain: ControlledEnumDomain,
  value: unknown,
): SynthesisWorkbenchMessageKey | undefined {
  const part = enumKeyPart(value);
  if (!part) return undefined;
  const key =
    `synthesis-enum-${domain}-${part}` as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? key : undefined;
}

function enumLabel(
  t: SynthesisWorkbenchConceptsTranslate,
  domain: ControlledEnumDomain,
  value: unknown,
  fallback?: string,
): string {
  const key = enumMessageKey(domain, value);
  if (key) return t(key);
  const fallbackText = textValue(fallback);
  if (fallbackText) return fallbackText;
  return humanizeEnumValue(value);
}

// Port of the legacy maybeLocalizedValue: resolve data strings (statuses,
// reasons, relation-ish enums) through the message table when a key exists.
// The legacy tail fell back to uiText() reverse translation of default
// English copy; that channel is dropped here — unmatched values render as-is.
function maybeLocalizedValue(
  t: SynthesisWorkbenchConceptsTranslate,
  value: unknown,
): string {
  const text = textValue(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey =
    `synthesis-status-${normalized}` as SynthesisWorkbenchMessageKey;
  if (statusKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(statusKey);
  }
  const relationKey =
    `synthesis-relation-${normalized}` as SynthesisWorkbenchMessageKey;
  if (relationKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) {
    return t(relationKey);
  }
  for (const domain of CONTROLLED_ENUM_DOMAINS) {
    const enumKey = enumMessageKey(domain, text);
    if (enumKey) return t(enumKey);
  }
  return text;
}

function compactReviewValue(
  t: SynthesisWorkbenchConceptsTranslate,
  value: unknown,
): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (isRecord(entry)) {
          return (
            firstText(entry, ["label", "title", "tag", "id", "code"]) ||
            JSON.stringify(entry)
          );
        }
        return maybeLocalizedValue(t, entry) || textValue(entry);
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
  }
  if (isRecord(value)) {
    return (
      firstText(value, ["message", "summary", "label", "title", "code"]) ||
      JSON.stringify(value)
    );
  }
  return textValue(value, "-");
}

function toneFor(value: unknown): string {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  return "warn";
}

function wrapReviewIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

function keyPart(value: unknown, fallback = "all"): string {
  return textValue(value, fallback).replace(/\s+/g, "_") || fallback;
}

// Pending-operation keys for the host commands this surface emits, matching
// the legacy operationKey() cases so the panel model's localPendingActions /
// snapshot.actions.inFlight keys line up with button busy states.
export function conceptHostCommandOperationKey(
  command: string,
  args: Record<string, unknown> = {},
): string {
  if (!command) return "";
  switch (command) {
    case "applyConceptReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "deleteConceptEntry":
      return `${command}:${keyPart(
        Array.isArray(args.conceptIds)
          ? args.conceptIds.join("_")
          : args.conceptId,
      )}`;
    default:
      return command;
  }
}

// ---------------------------------------------------------------------------
// Defensive narrowing / projection (consumed by the panel model).
// ---------------------------------------------------------------------------

export function projectConceptRowView(
  row: unknown,
): SynthesisWorkbenchConceptRowView {
  const record = isRecord(row) ? row : {};
  const conceptId = textValue(record.concept_id);
  return {
    conceptId,
    label: textValue(record.label) || conceptId,
    definition: firstText(record, [
      "short_definition",
      "definition",
      "usage_note",
      "editorial_note",
    ]),
    conceptType: textValue(record.concept_type),
    domain: textValue(record.domain),
    aliases: Array.isArray(record.aliases)
      ? record.aliases
          .map((entry) =>
            isRecord(entry)
              ? firstText(entry, [
                  "label",
                  "title",
                  "text",
                  "ref",
                  "paper_ref",
                  "evidence_ref",
                  "id",
                ])
              : textValue(entry),
          )
          .filter(Boolean)
      : textValue(record.aliases)
        ? [textValue(record.aliases)]
        : [],
    status: textValue(record.status) || "active",
  };
}

// Legacy conceptDisplayName: the display label of a concept id is the label of
// the matching snapshot.concepts.rows entry, falling back to the id.
export function createConceptDisplayNameResolver(
  rows: unknown[],
): (conceptId: string) => string {
  const labels = new Map<string, string>();
  (rows || []).forEach((row) => {
    if (!isRecord(row)) return;
    const conceptId = textValue(row.concept_id);
    if (conceptId) labels.set(conceptId, textValue(row.label) || conceptId);
  });
  return (conceptId) => labels.get(conceptId) || conceptId;
}

// Legacy open-review gate for this surface: status === "open". The
// optimistic-resolution half of the legacy filter reads controller state and
// stays with the panel model.
export function isOpenConceptReviewItem(item: unknown): boolean {
  return isRecord(item) && textValue(item.status) === "open";
}

export function projectConceptReviewItemView(
  item: unknown,
  resolveConceptLabel: (conceptId: string) => string = (id) => id,
): SynthesisWorkbenchConceptReviewItemView {
  const record = isRecord(item) ? item : {};
  const candidateIds = Array.isArray(record.candidate_concept_ids)
    ? record.candidate_concept_ids
        .map((entry) => textValue(entry))
        .filter(Boolean)
    : [];
  return {
    reviewId: textValue(record.review_id),
    label: textValue(record.label),
    definition: textValue(record.short_definition || record.definition),
    reason: textValue(record.reason),
    candidates: candidateIds.map((id) => ({
      id,
      label: resolveConceptLabel(id),
    })),
    confidence: record.confidence,
    conceptType: record.concept_type,
    domain: record.domain,
    topicId: record.topic_id,
    topicRelevance: record.topic_relevance,
  };
}

// ---------------------------------------------------------------------------
// Presentation.
// ---------------------------------------------------------------------------

// Strings without an SSOT key yet (see the header comment). Casting through
// the message-key type keeps every call site on the injected t channel; the
// integration layer owns adding these to src/synthesisWorkbenchI18n.ts.
const DELETE_CONFIRM_MESSAGE_KEY =
  "synthesis-confirm-delete-concepts" as SynthesisWorkbenchMessageKey;
const SELECT_ROW_MESSAGE_KEY =
  "synthesis-concepts-select-row" as SynthesisWorkbenchMessageKey;

const CONCEPT_STATUS_FILTER_OPTIONS = ["all", "active", "review", "deprecated"];

function HostCommandButton(props: {
  label: string;
  command: string;
  args?: Record<string, unknown>;
  active?: boolean;
  disabled?: boolean;
  pendingKeys: string[];
  t: SynthesisWorkbenchConceptsTranslate;
  onAction: SynthesisWorkbenchConceptsActionHandler;
}) {
  const args = props.args || {};
  const key = conceptHostCommandOperationKey(props.command, args);
  const pending = Boolean(key) && props.pendingKeys.includes(key);
  const operationKey =
    `synthesis-operation-${props.command}` as SynthesisWorkbenchMessageKey;
  const operation =
    operationKey in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES
      ? props.t(operationKey)
      : props.command;
  return (
    <button
      type="button"
      class={`${props.active ? "active" : ""}${pending ? " is-busy" : ""}`.trim()}
      disabled={props.disabled || pending}
      aria-busy={pending ? "true" : undefined}
      title={
        pending
          ? props.t("synthesis-operation-in-progress", { operation })
          : undefined
      }
      onClick={() =>
        props.onAction("hostCommand", { command: props.command, args })
      }
    >
      {pending ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.label}
    </button>
  );
}

function PillList(props: {
  items: string[];
  pillClass: string;
  t: SynthesisWorkbenchConceptsTranslate;
}) {
  if (!props.items.length) {
    return (
      <div class="review-pill-list">
        <span class="muted">-</span>
      </div>
    );
  }
  return (
    <div class="review-pill-list">
      {props.items.map((item) => (
        <span key={item} class={props.pillClass} title={item}>
          {maybeLocalizedValue(props.t, item) || item}
        </span>
      ))}
    </div>
  );
}

export const ConceptsRegion = memo(function ConceptsRegion(
  props: ConceptsRegionProps,
) {
  const { selection, t, onAction } = props;
  // Legacy state.selectedConceptIds / state.conceptReviewPanel.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewCollapsed, setReviewCollapsed] = useState(false);

  const visibleIds = selection.rows.map((row) => row.conceptId).filter(Boolean);
  const visibleIdSet = new Set(visibleIds);
  const selectedVisibleIds = visibleIds.filter((id) => selectedIds.has(id));

  const confirmDelete = (conceptIds: string[]) => {
    const ids = conceptIds.map((id) => textValue(id)).filter(Boolean);
    if (!ids.length) return;
    if (!window.confirm(t(DELETE_CONFIRM_MESSAGE_KEY, { count: ids.length }))) {
      return;
    }
    onAction("hostCommand", {
      command: "deleteConceptEntry",
      args: { conceptIds: ids },
    });
  };

  const toggleSelection = (conceptId: string, checked: boolean) => {
    if (!conceptId) return;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(conceptId);
      else next.delete(conceptId);
      return next;
    });
  };

  const setAllSelection = (checked: boolean) => {
    setSelectedIds(checked ? new Set(visibleIds) : new Set());
  };

  const renderFilters = () => (
    <div class="panel-header panel-toolbar">
      <div class="filters">
        <input
          data-synthesis-control-key="concepts.search"
          placeholder={t("synthesis-search-concepts")}
          value={selection.search}
          onInput={(event) =>
            onAction("setFilters", {
              concepts: {
                search: (event.target as HTMLInputElement).value,
              },
            })
          }
        />
        <select
          value={selection.conceptType || "all"}
          onChange={(event) =>
            onAction("setFilters", {
              concepts: {
                conceptType: (event.target as HTMLSelectElement).value,
              },
            })
          }
        >
          {["all", ...selection.conceptTypes].map((option) => (
            <option key={option} value={option}>
              {option === "all"
                ? t("synthesis-filter-all")
                : enumLabel(t, "concept-type", option)}
            </option>
          ))}
        </select>
        <select
          value={selection.status || "all"}
          onChange={(event) =>
            onAction("setFilters", {
              concepts: { status: (event.target as HTMLSelectElement).value },
            })
          }
        >
          {CONCEPT_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {enumLabel(t, "status", option)}
            </option>
          ))}
        </select>
        <button
          type="button"
          class={selection.overlayEnabled ? "active" : ""}
          onClick={() =>
            onAction("setConceptOverlay", {
              enabled: !selection.overlayEnabled,
            })
          }
        >
          {t(
            selection.overlayEnabled
              ? "synthesis-concepts-overlay-on"
              : "synthesis-concepts-overlay-off",
          )}
        </button>
      </div>
    </div>
  );

  const renderStatusLine = () => (
    <div class="details">
      <span class={`badge ${selection.projectionStale ? "warn" : "ok"}`}>
        {t(
          selection.projectionStale
            ? "synthesis-concepts-cache-stale"
            : "synthesis-concepts-cache-ready",
        )}
      </span>
      <span class="muted">
        {t("synthesis-concepts-count", { count: selection.rowCount })}
      </span>
    </div>
  );

  const renderBulkBar = () => {
    if (!visibleIds.length) return null;
    const selectedCount = selectedVisibleIds.length;
    return (
      <div class="concept-bulk-bar">
        <input
          type="checkbox"
          checked={selectedCount > 0 && selectedCount === visibleIds.length}
          aria-label={t("synthesis-concepts-select-all")}
          onChange={(event) =>
            setAllSelection((event.target as HTMLInputElement).checked)
          }
        />
        <span class="muted">
          {selectedCount
            ? t("synthesis-concepts-selected", { count: selectedCount })
            : t("synthesis-concepts-select-bulk")}
        </span>
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={() => confirmDelete(selectedVisibleIds)}
        >
          {t("synthesis-action-delete-selected")}
        </button>
      </div>
    );
  };

  const renderTable = () => {
    if (!selection.rows.length) {
      const filtered = selection.rowCount > 0;
      return (
        <div
          class={`empty-state ${filtered ? "empty-state-default" : "empty-state-info"}`}
        >
          <strong class="empty-state-title">
            {t(
              filtered
                ? "synthesis-concepts-empty-filtered"
                : "synthesis-concepts-empty",
            )}
          </strong>
          <p class="empty-state-message">
            {t(
              filtered
                ? "synthesis-concepts-empty-filtered-message"
                : "synthesis-concepts-empty-message",
            )}
          </p>
        </div>
      );
    }
    return (
      <div class="table-wrap concept-table-wrap">
        <table class="concept-table">
          <thead>
            <tr>
              <th></th>
              <th>{t("synthesis-column-concept")}</th>
              <th>{t("synthesis-column-definition")}</th>
              <th>{t("synthesis-column-type")}</th>
              <th>{t("synthesis-column-domain")}</th>
              <th>{t("synthesis-column-aliases")}</th>
              <th>{t("synthesis-column-status")}</th>
              <th>{t("synthesis-column-actions")}</th>
            </tr>
          </thead>
          <tbody>
            {selection.rows.map((row) => (
              <tr class="concept-row" key={row.conceptId}>
                <td class="concept-selection-cell">
                  <input
                    type="checkbox"
                    checked={
                      visibleIdSet.has(row.conceptId) &&
                      selectedIds.has(row.conceptId)
                    }
                    aria-label={t(SELECT_ROW_MESSAGE_KEY, {
                      label: row.label || row.conceptId,
                    })}
                    onChange={(event) =>
                      toggleSelection(
                        row.conceptId,
                        (event.target as HTMLInputElement).checked,
                      )
                    }
                  />
                </td>
                <td>
                  <strong class="concept-row-label">{row.label}</strong>
                </td>
                <td class="concept-definition-cell">{row.definition || "-"}</td>
                <td class="concept-cell-center">
                  {enumLabel(t, "concept-type", row.conceptType, "-")}
                </td>
                <td class="concept-cell-center">{row.domain || "-"}</td>
                <td class="concept-alias-cell">
                  <PillList
                    items={row.aliases}
                    pillClass="concept-alias-pill"
                    t={t}
                  />
                </td>
                <td class="concept-cell-center">
                  <span class={`badge ${toneFor(row.status)}`}>
                    {maybeLocalizedValue(t, row.status) || "-"}
                  </span>
                </td>
                <td class="concept-action-cell">
                  <div class="action-group">
                    <button
                      type="button"
                      onClick={() => confirmDelete([row.conceptId])}
                    >
                      {t("synthesis-action-delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReviewPanel = () => {
    const total = selection.reviewItems.length;
    if (!total) return null;
    const index = wrapReviewIndex(reviewIndex, total);
    const item = selection.reviewItems[index];
    const selectedTarget = selection.reviewMergeTargets[item.reviewId] || "";
    const aliasAudit =
      item.reason === "alias_conflict" ||
      item.reason === "alias_equivalence_audit";
    const reviewAction = (action: string, targetConceptId?: string) => ({
      command: "applyConceptReviewAction",
      args: targetConceptId
        ? { reviewId: item.reviewId, action, targetConceptId }
        : { reviewId: item.reviewId, action },
    });
    const reviewButton = (
      label: string,
      action: string,
      targetConceptId?: string,
      disabled = false,
    ) => {
      const spec = reviewAction(action, targetConceptId);
      return (
        <HostCommandButton
          label={label}
          command={spec.command}
          args={spec.args}
          disabled={disabled}
          pendingKeys={selection.pendingOperationKeys}
          t={t}
          onAction={onAction}
        />
      );
    };
    const actions = aliasAudit
      ? [
          reviewButton(t("synthesis-action-keep-alias"), "keep_alias"),
          reviewButton(t("synthesis-action-remove-alias"), "remove_alias"),
        ]
      : [
          reviewButton(t("synthesis-action-approve-as-new"), "approve_create"),
          ...(item.candidates.length
            ? [
                reviewButton(
                  t("synthesis-action-merge"),
                  "merge_into_existing",
                  selectedTarget,
                  !selectedTarget,
                ),
              ]
            : []),
          reviewButton(t("synthesis-action-reject"), "reject"),
        ];
    const detailFields: Array<[string, unknown]> = [
      [t("synthesis-column-confidence"), item.confidence],
      [t("synthesis-column-type"), item.conceptType],
      [t("synthesis-column-domain"), item.domain],
      [t("synthesis-column-topic"), item.topicId],
      [t("synthesis-detail-topic-relevance"), item.topicRelevance],
      [t("synthesis-column-reason"), item.reason],
    ];
    const visibleDetails = detailFields.filter(([, value]) =>
      hasStructuredContent(value),
    );
    return (
      <section
        class={`review-panel review-panel-enter concept-review-panel inline-review-panel${
          reviewCollapsed ? " is-collapsed" : ""
        }`}
      >
        <div class="review-drawer-header inline-review-header">
          <strong>{t("synthesis-concept-review-title")}</strong>
          <span class="muted">{`${index + 1} / ${total}`}</span>
          <div class="review-drawer-controls">
            <button
              type="button"
              disabled={total <= 1}
              onClick={() => setReviewIndex(wrapReviewIndex(index - 1, total))}
            >
              {"↑"}
            </button>
            <button
              type="button"
              disabled={total <= 1}
              onClick={() => setReviewIndex(wrapReviewIndex(index + 1, total))}
            >
              {"↓"}
            </button>
            <button
              type="button"
              onClick={() => setReviewCollapsed(!reviewCollapsed)}
            >
              {t(
                reviewCollapsed
                  ? "synthesis-action-expand"
                  : "synthesis-action-collapse",
              )}
            </button>
          </div>
        </div>
        {reviewCollapsed ? null : (
          <article class="review-card">
            <div class="review-card-header">
              <div class="review-card-title">
                <strong>{t("synthesis-review-proposal-title")}</strong>
              </div>
              <span class="muted">{`${index + 1} / ${total}`}</span>
            </div>
            <div class="reference-review-summary concept-review-summary">
              <div class="reference-review-summary-row">
                <span class="reference-review-summary-label">
                  {t("synthesis-review-source-label")}
                </span>
                <div class="concept-review-summary-value">
                  <strong>
                    {item.label || t("synthesis-concept-proposal")}
                  </strong>
                  {item.definition ? (
                    <span class="muted">{item.definition}</span>
                  ) : null}
                </div>
              </div>
              <div class="reference-review-summary-row">
                <span class="reference-review-summary-label">
                  {t("synthesis-review-target-label")}
                </span>
                <div class="concept-candidate-pills">
                  {item.candidates.length ? (
                    item.candidates.map((candidate) => (
                      <span
                        key={candidate.id}
                        class="concept-candidate-pill"
                        title={candidate.id}
                      >
                        {candidate.label}
                      </span>
                    ))
                  ) : (
                    <span class="muted">-</span>
                  )}
                </div>
              </div>
              {item.candidates.length ? (
                <div class="reference-review-summary-row">
                  <span class="reference-review-summary-label">
                    {t("synthesis-review-merge-label")}
                  </span>
                  <select
                    value={selectedTarget}
                    onChange={(event) =>
                      onAction("setFilters", {
                        concepts: {
                          reviewMergeTargets: {
                            ...selection.reviewMergeTargets,
                            [item.reviewId]: (event.target as HTMLSelectElement)
                              .value,
                          },
                        },
                      })
                    }
                  >
                    <option value="">
                      {t("synthesis-review-select-target")}
                    </option>
                    {item.candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            {visibleDetails.length ? (
              <div class="review-card-details review-card-metadata">
                {visibleDetails.map(([label, value]) => (
                  <div class="detail-row" key={label}>
                    <span class="muted">{label}</span>
                    <strong>{compactReviewValue(t, value)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            <div class="action-group">{actions}</div>
          </article>
        )}
      </section>
    );
  };

  return (
    <div class="panel" data-region-content="synthesis-concepts">
      {renderFilters()}
      {renderStatusLine()}
      {renderBulkBar()}
      {renderTable()}
      {renderReviewPanel()}
    </div>
  );
}, conceptsRegionPropsEqual);
