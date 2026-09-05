/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { Fragment } from "preact";
import type { ComponentChildren, RefObject } from "preact";
import { memo } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { equalBySignature } from "../../shared/regionEquality";
import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES } from "../../shared/synthesisWorkbenchI18nContract";
import type {
  SynthesisWorkbenchMessageKey,
  SynthesisWorkbenchTagsFilters,
} from "../../shared/synthesisWorkbenchWireContract";

// Tags surface of the synthesis workbench page (tags tab): the summary bar
// with the vocabulary/staged subview switch, the vocabulary table with inline
// edit + bulk selection, the staged inbox with commit-on-change edits and
// promote/discard bulk actions, and the tag vocabulary import panel.
//
// Action names and payload shapes mirror the legacy implementation
// (src/synthesisWorkbenchApp.ts renderTags :11852-13058):
//   setFilters  { tags: { view | search | facet | status | density |
//                 stagedSearch | stagedFacet | expandedRows |
//                 selectedVocabularyTags | selectedStagedTags |
//                 editingVocabularyTag | editingStagedTag | importDraft } }
//   hostCommand { command: "validateTagVocabulary" }                 (no args)
//   hostCommand { command: "exportTagVocabulary" }                   (no args)
//   hostCommand { command: "runTagBootstrapper" }                    (no args)
//   hostCommand { command: "deleteTagVocabularyEntry",
//                 args: { originalTag, tag } }
//   hostCommand { command: "updateTagVocabularyEntry",
//                 args: { originalTag, tag, facet, note } }
//   hostCommand { command: "updateStagedTagSuggestion",
//                 args: { originalTag, tag, facet, note, source_flow,
//                         parent_bindings } }
//   hostCommand { command: "promoteStagedTagSuggestions",
//                 args: { tags: [...] } | { tag, tags: [tag] } }
//   hostCommand { command: "discardStagedTagSuggestions",
//                 args: { tags: [...] } | { tag, tags: [tag] } }
//   hostCommand { command: "clearStagedTagSuggestions", args: {} }
//   hostCommand { command: "previewTagVocabularyImport",
//                 args: { payload } }
//   hostCommand { command: "applyTagVocabularyImport",
//                 args: { payload, action: "merge-non-conflicting" |
//                         "use-imported" } }
//
// Page-local UI state stays inside this component (legacy state.tagImportOpen
// / state.dismissedTagImportPreviewSignature); expansion, selection, editing
// drafts and the import draft are wire filter state (protocol frozen) and are
// dispatched through setFilters exactly like the legacy page.
//
// Display strings resolve through the injected `t` translator; enum-ish data
// values (statuses, edit states, legacy literal labels) keep the legacy
// localization chain (status/relation/enum keys, then the default-message
// reverse lookup, then the raw value).

// ---------------------------------------------------------------------------
// Props contract
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchTagsTranslate = (
  key: SynthesisWorkbenchMessageKey,
  vars?: Record<string, unknown>,
) => string;

export type SynthesisWorkbenchTagsActionHandler = (
  action: "setFilters" | "hostCommand",
  payload?: Record<string, unknown>,
) => void;

export type SynthesisWorkbenchTagEditingState = {
  originalTag?: string;
  draftTag?: string;
  draftFacet?: string;
  draftNote?: string;
  status?: string;
  error?: string;
};

export type SynthesisWorkbenchTagWarningWire = {
  code?: string;
  message?: string;
  severity?: string;
};

/** Narrowed projection of the host-owned tagRow slot. */
export type SynthesisWorkbenchTagRowWire = {
  tag?: string;
  facet?: string;
  note?: string;
  builtin?: boolean;
  deprecated?: boolean;
  usage_count?: number;
  source?: string;
  aliases?: string[];
  abbrev?: string[];
  replacement?: string;
  last_synced_at?: string;
  validation_warnings?: SynthesisWorkbenchTagWarningWire[];
};

/** Narrowed projection of the host-owned stagedTagRow slot. */
export type SynthesisWorkbenchStagedTagRowWire = {
  tag?: string;
  facet?: string;
  note?: string;
  parent_count?: number;
  source_flow?: string;
  created_at?: string;
  updated_at?: string;
  parent_bindings?: string[];
};

export type SynthesisWorkbenchTagImportConflictWire = {
  tag?: string;
  imported?: { tag?: string };
  local?: { tag?: string };
};

/** Narrowed projection of the host-owned tagImportPreview slot. */
export type SynthesisWorkbenchTagImportPreviewWire = {
  additions?: unknown[];
  builtins?: unknown[];
  conflicts?: SynthesisWorkbenchTagImportConflictWire[];
  unchanged?: unknown[];
  warnings?: unknown[];
};

/**
 * Region equality input: only this region's user-visible content and
 * open/collapsed state. Operation keys are pre-filtered to tags-region
 * commands by projectSynthesisTagsSelection so unrelated chrome activity
 * (other tabs' operations) never rebuilds this region. snapshot.generatedAt,
 * background job summaries, projection timestamps and manifest payloads are
 * deliberately excluded: they are either not visible here or owned by other
 * regions.
 */
export type SynthesisWorkbenchTagsSelection = {
  view: "vocabulary" | "staged";
  density: "compact" | "comfortable";
  rowCount: number;
  stagedCount: number;
  warningCount: number;
  cacheStale: boolean;
  facets: string[];
  stagedFacets: string[];
  search: string;
  facet: string;
  status: string;
  stagedSearch: string;
  stagedFacet: string;
  selectedVocabularyTags: string[];
  selectedStagedTags: string[];
  expandedRows: Record<string, boolean>;
  editingVocabularyTag?: SynthesisWorkbenchTagEditingState;
  editingStagedTag?: SynthesisWorkbenchTagEditingState;
  vocabularyRows: SynthesisWorkbenchTagRowWire[];
  stagedRows: SynthesisWorkbenchStagedTagRowWire[];
  importDraft: string;
  importPreview: SynthesisWorkbenchTagImportPreviewWire | null;
  importOptimisticallyResolved: boolean;
  pendingOperationKeys: string[];
  lastCompletedOperationKey: string;
  lastFailedOperationKey: string;
  lastFailedMessage: string;
};

export type TagsRegionProps = {
  selection: SynthesisWorkbenchTagsSelection;
  t: SynthesisWorkbenchTagsTranslate;
  onAction: SynthesisWorkbenchTagsActionHandler;
};

export function tagsRegionPropsEqual(
  prev: TagsRegionProps,
  next: TagsRegionProps,
): boolean {
  return (
    prev.t === next.t &&
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection)
  );
}

// ---------------------------------------------------------------------------
// Narrowed wire view + projection helpers (used by the panel model)
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchTagsWireView = {
  filters?: Partial<SynthesisWorkbenchTagsFilters> & Record<string, unknown>;
  facets?: unknown;
  rows?: unknown;
  visibleRows?: unknown;
  stagedRows?: unknown;
  visibleStagedRows?: unknown;
  stagedCount?: unknown;
  stagedFacets?: unknown;
  validationWarnings?: unknown;
  projection?: unknown;
  importPreview?: unknown;
  importDraft?: unknown;
};

/** Host commands this surface dispatches; drives operation-key filtering. */
export const SYNTHESIS_TAGS_REGION_COMMANDS: readonly string[] = [
  "runTagBootstrapper",
  "validateTagVocabulary",
  "exportTagVocabulary",
  "previewTagVocabularyImport",
  "applyTagVocabularyImport",
  "updateStagedTagSuggestion",
  "updateTagVocabularyEntry",
  "deleteTagVocabularyEntry",
  "promoteStagedTagSuggestions",
  "discardStagedTagSuggestions",
  "clearStagedTagSuggestions",
];

const TAGS_REGION_COMMAND_SET: ReadonlySet<string> = new Set(
  SYNTHESIS_TAGS_REGION_COMMANDS,
);

export function isSynthesisTagsRegionCommand(command: string): boolean {
  return TAGS_REGION_COMMAND_SET.has(command);
}

function commandOfOperationKey(key: string): string {
  const separator = key.indexOf(":");
  return separator < 0 ? key : key.slice(0, separator);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown, fallback = ""): string {
  return String(value ?? fallback).trim();
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => textValue(entry)).filter(Boolean)
    : [];
}

function narrowString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function narrowBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function narrowNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function narrowStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : undefined;
}

function narrowTagWarnings(
  value: unknown,
): SynthesisWorkbenchTagWarningWire[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isRecord).map((warning) => ({
    code: narrowString(warning.code),
    message: narrowString(warning.message),
    severity: narrowString(warning.severity),
  }));
}

export function narrowSynthesisTagRow(
  value: unknown,
): SynthesisWorkbenchTagRowWire {
  const row = isRecord(value) ? value : {};
  return {
    tag: narrowString(row.tag),
    facet: narrowString(row.facet),
    note: narrowString(row.note),
    builtin: narrowBoolean(row.builtin),
    deprecated: narrowBoolean(row.deprecated),
    usage_count: narrowNumber(row.usage_count),
    source: narrowString(row.source),
    aliases: narrowStringArray(row.aliases),
    abbrev: narrowStringArray(row.abbrev),
    replacement: narrowString(row.replacement),
    last_synced_at: narrowString(row.last_synced_at),
    validation_warnings: narrowTagWarnings(row.validation_warnings),
  };
}

export function narrowSynthesisStagedTagRow(
  value: unknown,
): SynthesisWorkbenchStagedTagRowWire {
  const row = isRecord(value) ? value : {};
  return {
    tag: narrowString(row.tag),
    facet: narrowString(row.facet),
    note: narrowString(row.note),
    parent_count: narrowNumber(row.parent_count),
    source_flow: narrowString(row.source_flow),
    created_at: narrowString(row.created_at),
    updated_at: narrowString(row.updated_at),
    parent_bindings: narrowStringArray(row.parent_bindings),
  };
}

export function narrowSynthesisTagImportPreview(
  value: unknown,
): SynthesisWorkbenchTagImportPreviewWire | null {
  if (!isRecord(value)) return null;
  const conflicts = Array.isArray(value.conflicts)
    ? value.conflicts.filter(isRecord).map((conflict) => ({
        tag: narrowString(conflict.tag),
        imported: isRecord(conflict.imported)
          ? { tag: narrowString(conflict.imported.tag) }
          : undefined,
        local: isRecord(conflict.local)
          ? { tag: narrowString(conflict.local.tag) }
          : undefined,
      }))
    : undefined;
  return {
    additions: Array.isArray(value.additions) ? value.additions : undefined,
    builtins: Array.isArray(value.builtins) ? value.builtins : undefined,
    conflicts,
    unchanged: Array.isArray(value.unchanged) ? value.unchanged : undefined,
    warnings: Array.isArray(value.warnings) ? value.warnings : undefined,
  };
}

export function narrowSynthesisTagEditingState(
  value: unknown,
): SynthesisWorkbenchTagEditingState | undefined {
  if (!isRecord(value)) return undefined;
  return {
    originalTag: narrowString(value.originalTag),
    draftTag: narrowString(value.draftTag),
    draftFacet: narrowString(value.draftFacet),
    draftNote: narrowString(value.draftNote),
    status: narrowString(value.status),
    error: narrowString(value.error),
  };
}

function narrowExpandedRows(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  const narrowed: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === true) {
      narrowed[key] = true;
    }
  }
  return narrowed;
}

/**
 * Defensive projection from the wire tags view to the region selection. The
 * panel model feeds snapshot.tags plus controller-owned operation state;
 * operation keys are filtered to this region's commands so unrelated
 * completions never change the selection signature.
 */
export function projectSynthesisTagsSelection(args: {
  tags?: SynthesisWorkbenchTagsWireView;
  pendingOperationKeys?: Iterable<string>;
  lastCompletedOperationKey?: string;
  lastFailedOperationKey?: string;
  lastFailedMessage?: string;
  importOptimisticallyResolved?: boolean;
}): SynthesisWorkbenchTagsSelection {
  const tags = isRecord(args.tags) ? args.tags : {};
  const filters = isRecord(tags.filters) ? tags.filters : {};
  const rows = Array.isArray(tags.rows) ? tags.rows : [];
  const warnings = Array.isArray(tags.validationWarnings)
    ? tags.validationWarnings
    : [];
  const pendingOperationKeys = Array.from(args.pendingOperationKeys || [])
    .filter(
      (key): key is string =>
        typeof key === "string" &&
        isSynthesisTagsRegionCommand(commandOfOperationKey(key)),
    )
    .sort();
  const lastCompletedOperationKey =
    typeof args.lastCompletedOperationKey === "string" &&
    isSynthesisTagsRegionCommand(
      commandOfOperationKey(args.lastCompletedOperationKey),
    )
      ? args.lastCompletedOperationKey
      : "";
  const lastFailedOperationKey =
    typeof args.lastFailedOperationKey === "string" &&
    isSynthesisTagsRegionCommand(
      commandOfOperationKey(args.lastFailedOperationKey),
    )
      ? args.lastFailedOperationKey
      : "";
  return {
    view:
      textValue(filters.view, "vocabulary") === "staged"
        ? "staged"
        : "vocabulary",
    density:
      textValue(filters.density, "compact") === "comfortable"
        ? "comfortable"
        : "compact",
    rowCount: rows.length,
    stagedCount: numberValue(tags.stagedCount),
    warningCount: warnings.length,
    cacheStale: Boolean(isRecord(tags.projection) && tags.projection.stale),
    facets: stringArray(tags.facets),
    stagedFacets: stringArray(tags.stagedFacets),
    search: textValue(filters.search),
    facet: textValue(filters.facet, "all"),
    status: textValue(filters.status, "all"),
    stagedSearch: textValue(filters.stagedSearch),
    stagedFacet: textValue(filters.stagedFacet, "all"),
    selectedVocabularyTags: stringArray(filters.selectedVocabularyTags),
    selectedStagedTags: stringArray(filters.selectedStagedTags),
    expandedRows: narrowExpandedRows(filters.expandedRows),
    editingVocabularyTag: narrowSynthesisTagEditingState(
      filters.editingVocabularyTag,
    ),
    editingStagedTag: narrowSynthesisTagEditingState(filters.editingStagedTag),
    vocabularyRows: (Array.isArray(tags.visibleRows)
      ? tags.visibleRows
      : []
    ).map(narrowSynthesisTagRow),
    stagedRows: (Array.isArray(tags.visibleStagedRows)
      ? tags.visibleStagedRows
      : []
    ).map(narrowSynthesisStagedTagRow),
    importDraft: textValue(tags.importDraft),
    importPreview: narrowSynthesisTagImportPreview(tags.importPreview),
    importOptimisticallyResolved: args.importOptimisticallyResolved === true,
    pendingOperationKeys,
    lastCompletedOperationKey,
    lastFailedOperationKey,
    lastFailedMessage: lastFailedOperationKey
      ? textValue(args.lastFailedMessage)
      : "",
  };
}

// ---------------------------------------------------------------------------
// Legacy operation keys (subset of src/synthesisWorkbenchApp.ts operationKey)
// ---------------------------------------------------------------------------

function keyPart(value: unknown, fallback = "all"): string {
  return textValue(value, fallback).replace(/\s+/g, "_") || fallback;
}

export function synthesisWorkbenchTagsOperationKey(
  command: string,
  args: Record<string, unknown> = {},
): string {
  if (!command) return "";
  switch (command) {
    case "applyTagVocabularyImport":
      return `${command}:${keyPart(args.action)}`;
    case "updateStagedTagSuggestion":
    case "updateTagVocabularyEntry":
    case "deleteTagVocabularyEntry":
      return `${command}:${keyPart(args.originalTag || args.tag)}`;
    case "promoteStagedTagSuggestions":
    case "discardStagedTagSuggestions":
      return `${command}:${keyPart(
        args.tag || (Array.isArray(args.tags) ? args.tags.join("_") : ""),
      )}`;
    default:
      return command;
  }
}

// ---------------------------------------------------------------------------
// Legacy localization chain (enumLabel / maybeLocalizedValue / uiText ports)
// ---------------------------------------------------------------------------

const CONTROLLED_ENUM_DOMAINS = [
  "status",
  "kind",
  "reason",
  "relation",
  "action",
  "confidence",
  "coverage",
  "coverage-caveat",
  "freshness",
  "binding-status",
  "priority",
  "graph-node-kind",
  "graph-edge-role",
  "graph-layout",
  "tag-status",
  "tag-density",
  "concept-type",
  "review-tab",
  "sync-status",
  "scope",
] as const;

const DEFAULT_TEXT_TO_KEY = new Map<string, SynthesisWorkbenchMessageKey>(
  (
    Object.entries(SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES) as Array<
      [SynthesisWorkbenchMessageKey, string]
    >
  ).map(([key, value]) => [value, key]),
);

function hasDefaultMessage(key: string): key is SynthesisWorkbenchMessageKey {
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES;
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

function enumMessageKey(
  domain: (typeof CONTROLLED_ENUM_DOMAINS)[number],
  value: unknown,
): SynthesisWorkbenchMessageKey | undefined {
  const part = enumKeyPart(value);
  if (!part) return undefined;
  const key = `synthesis-enum-${domain}-${part}`;
  return hasDefaultMessage(key) ? key : undefined;
}

function enumLabel(
  t: SynthesisWorkbenchTagsTranslate,
  domain: (typeof CONTROLLED_ENUM_DOMAINS)[number],
  value: unknown,
  fallback?: string,
): string {
  const key = enumMessageKey(domain, value);
  if (key) return t(key);
  const fallbackText = textValue(fallback);
  if (fallbackText) return legacyUiText(t, fallbackText);
  return humanizeEnumValue(value);
}

function legacyUiText(
  t: SynthesisWorkbenchTagsTranslate,
  value: string,
  args: Record<string, unknown> = {},
): string {
  const key = DEFAULT_TEXT_TO_KEY.get(value);
  return key ? t(key, args) : value;
}

function maybeLocalized(
  t: SynthesisWorkbenchTagsTranslate,
  value: unknown,
): string {
  const text = textValue(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey = `synthesis-status-${normalized}`;
  if (hasDefaultMessage(statusKey)) {
    return t(statusKey);
  }
  const relationKey = `synthesis-relation-${normalized}`;
  if (hasDefaultMessage(relationKey)) {
    return t(relationKey);
  }
  for (const domain of CONTROLLED_ENUM_DOMAINS) {
    const key = enumMessageKey(domain, text);
    if (key) {
      return t(key);
    }
  }
  return legacyUiText(t, text);
}

function operationLabel(
  t: SynthesisWorkbenchTagsTranslate,
  command: string,
): string {
  const key = `synthesis-operation-${command}`;
  return hasDefaultMessage(key) ? t(key) : command;
}

// ---------------------------------------------------------------------------
// Shared presentation pieces
// ---------------------------------------------------------------------------

const VOCABULARY_HEADER_KEYS: SynthesisWorkbenchMessageKey[] = [
  "synthesis-column-tag",
  "synthesis-column-facet",
  "synthesis-column-note",
  "synthesis-column-status",
  "synthesis-column-usage",
  "synthesis-column-source",
  "synthesis-column-aliases",
  "synthesis-column-abbrev",
  "synthesis-column-warnings",
  "synthesis-column-actions",
];

const STAGED_HEADER_KEYS: SynthesisWorkbenchMessageKey[] = [
  "synthesis-column-tag",
  "synthesis-column-facet",
  "synthesis-column-note",
  "synthesis-column-parents",
  "synthesis-column-source",
  "synthesis-column-updated",
  "synthesis-column-actions",
];

function tagWarningsFor(
  row: SynthesisWorkbenchTagRowWire,
): SynthesisWorkbenchTagWarningWire[] {
  return Array.isArray(row.validation_warnings) ? row.validation_warnings : [];
}

function TagBadge(props: {
  t: SynthesisWorkbenchTagsTranslate;
  text: unknown;
  tone?: string;
}) {
  const className = `badge${props.tone ? ` ${props.tone}` : ""}`;
  return (
    <span class={className}>{maybeLocalized(props.t, props.text) || "-"}</span>
  );
}

function CompactText(props: { value: unknown; className?: string }) {
  const text = textValue(props.value, "-");
  return (
    <span class={props.className || "tags-cell-text"} title={text}>
      {text || "-"}
    </span>
  );
}

function TagPillList(props: { values: unknown; empty?: string }) {
  const items = Array.isArray(props.values)
    ? props.values.map((entry) => textValue(entry)).filter(Boolean)
    : textValue(props.values)
      ? [textValue(props.values)]
      : [];
  return (
    <div class="tag-pill-list">
      {items.length ? (
        items.map((item) => (
          <span class="tag-pill" title={item} key={item}>
            {item}
          </span>
        ))
      ) : (
        <span class="tags-cell-text">{props.empty || "-"}</span>
      )}
    </div>
  );
}

function DetailList(props: {
  t: SynthesisWorkbenchTagsTranslate;
  fields: Array<[SynthesisWorkbenchMessageKey, unknown]>;
}) {
  return (
    <div class="detail-list">
      {props.fields.map(([labelKey, value]) => (
        <div class="detail-row" key={labelKey}>
          <span class="muted">{props.t(labelKey)}</span>
          <strong>
            {maybeLocalized(props.t, value) || textValue(value, "-")}
          </strong>
        </div>
      ))}
    </div>
  );
}

function EmptyState(props: {
  title: string;
  message?: string;
  tone?: "default" | "info" | "warning";
  action?: ComponentChildren;
}) {
  return (
    <div class={`empty-state empty-state-${props.tone || "default"}`}>
      <strong class="empty-state-title">{props.title}</strong>
      {props.message ? (
        <p class="empty-state-message">{props.message}</p>
      ) : null}
      {props.action ? (
        <div class="empty-state-actions">{props.action}</div>
      ) : null}
    </div>
  );
}

function TagsTableShell(props: {
  className: string;
  headers: string[];
  isEmpty: boolean;
  emptyState: ComponentChildren;
  children?: ComponentChildren;
}) {
  if (props.isEmpty) {
    return <Fragment>{props.emptyState}</Fragment>;
  }
  return (
    <div class={`tags-table-wrap ${props.className}`}>
      <table class="tags-table">
        <thead>
          <tr>
            {props.headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{props.children}</tbody>
      </table>
    </div>
  );
}

function FilterSelect(props: {
  options: string[];
  value: string;
  labelFor: (value: string) => string;
  onChangeValue: (value: string) => void;
  disabled?: boolean;
  selectRef?: RefObject<HTMLSelectElement>;
}) {
  return (
    <select
      ref={props.selectRef}
      value={props.value}
      disabled={props.disabled}
      onChange={(event) =>
        props.onChangeValue((event.target as HTMLSelectElement).value)
      }
    >
      {props.options.map((option) => (
        <option key={option} value={option}>
          {props.labelFor(option)}
        </option>
      ))}
    </select>
  );
}

function HostCommandButton(props: {
  t: SynthesisWorkbenchTagsTranslate;
  label: string;
  command: string;
  args?: Record<string, unknown>;
  active?: boolean;
  disabled?: boolean;
  pendingKeys: ReadonlySet<string>;
  onAction: SynthesisWorkbenchTagsActionHandler;
}) {
  const key = synthesisWorkbenchTagsOperationKey(
    props.command,
    props.args || {},
  );
  const pending = Boolean(key) && props.pendingKeys.has(key);
  const className =
    `${props.active ? "active" : ""}${pending ? " is-busy" : ""}`.trim();
  return (
    <button
      type="button"
      class={className || undefined}
      disabled={props.disabled || pending}
      aria-busy={pending ? "true" : undefined}
      title={
        pending
          ? props.t("synthesis-operation-in-progress", {
              operation: operationLabel(props.t, props.command),
            })
          : undefined
      }
      onClick={() => {
        const payload: Record<string, unknown> = { command: props.command };
        if (props.args !== undefined) {
          payload.args = props.args;
        }
        props.onAction("hostCommand", payload);
      }}
    >
      {pending ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.label}
    </button>
  );
}

/**
 * Commit-on-change text input. preact/compat remaps onChange to per-keystroke
 * input timing for text inputs, so blur/change commit semantics need a native
 * listener (legacy used `change` listeners on these inputs).
 */
function CommitTextInput(props: {
  value: string;
  controlKey?: string;
  disabled?: boolean;
  onCommit: () => void;
  inputRef: RefObject<HTMLInputElement>;
}) {
  const commitRef = useRef(props.onCommit);
  commitRef.current = props.onCommit;
  useLayoutEffect(() => {
    const node = props.inputRef.current;
    if (!node) return;
    const listener = () => commitRef.current();
    node.addEventListener("change", listener);
    return () => node.removeEventListener("change", listener);
  });
  return (
    <input
      ref={props.inputRef}
      value={props.value}
      disabled={props.disabled}
      data-synthesis-control-key={props.controlKey}
    />
  );
}

function RowExpandButton(props: {
  t: SynthesisWorkbenchTagsTranslate;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      class="tags-expand-button"
      aria-expanded={props.expanded ? "true" : "false"}
      onClick={(event) => {
        event.preventDefault();
        props.onToggle();
      }}
    >
      {props.expanded
        ? props.t("synthesis-action-hide")
        : props.t("synthesis-action-details")}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Summary bar + subview tabs
// ---------------------------------------------------------------------------

function SummaryMetric(props: {
  t: SynthesisWorkbenchTagsTranslate;
  label: string;
  value: unknown;
  tone?: string;
}) {
  return (
    <div class="tags-summary-metric">
      <span class="muted">{props.label}</span>
      <TagBadge t={props.t} text={props.value} tone={props.tone} />
    </div>
  );
}

function TagsSubviewTabs(props: {
  t: SynthesisWorkbenchTagsTranslate;
  selection: SynthesisWorkbenchTagsSelection;
  onAction: SynthesisWorkbenchTagsActionHandler;
}) {
  const { t, selection, onAction } = props;
  const view = selection.view;
  return (
    <div
      class={`segmented tags-subview-tabs tags-view-switch ${
        view === "staged" ? "is-staged" : "is-vocabulary"
      }`}
      role="tablist"
    >
      <span class="segmented-thumb" />
      <button
        type="button"
        role="tab"
        class={view === "vocabulary" ? "active" : undefined}
        aria-selected={view === "vocabulary" ? "true" : "false"}
        onClick={(event) => {
          event.preventDefault();
          onAction("setFilters", { tags: { view: "vocabulary" } });
        }}
      >
        {t("synthesis-tags-tab-vocabulary", { count: selection.rowCount })}
      </button>
      <button
        type="button"
        role="tab"
        class={view === "staged" ? "active" : undefined}
        aria-selected={view === "staged" ? "true" : "false"}
        onClick={(event) => {
          event.preventDefault();
          onAction("setFilters", { tags: { view: "staged" } });
        }}
      >
        {t("synthesis-tags-tab-staged", { count: selection.stagedCount })}
      </button>
    </div>
  );
}

function TagsSummaryBar(props: {
  t: SynthesisWorkbenchTagsTranslate;
  selection: SynthesisWorkbenchTagsSelection;
  pendingKeys: ReadonlySet<string>;
  onAction: SynthesisWorkbenchTagsActionHandler;
  onOpenImport: () => void;
}) {
  const { t, selection, pendingKeys, onAction } = props;
  return (
    <div class="tags-summary-bar">
      <div class="tags-summary-primary">
        <div class="tags-summary-metrics">
          <SummaryMetric
            t={t}
            label={t("synthesis-tags-summary-canonical")}
            value={selection.rowCount}
            tone="ok"
          />
          <SummaryMetric
            t={t}
            label={t("synthesis-tags-summary-staged")}
            value={selection.stagedCount}
            tone="warn"
          />
          <SummaryMetric
            t={t}
            label={t("synthesis-tags-summary-warnings")}
            value={selection.warningCount}
            tone={selection.warningCount ? "warn" : "ok"}
          />
          <SummaryMetric
            t={t}
            label={t("synthesis-tags-summary-cache")}
            value={selection.cacheStale ? "stale" : "ready"}
            tone={selection.cacheStale ? "warn" : "ok"}
          />
        </div>
        <TagsSubviewTabs t={t} selection={selection} onAction={onAction} />
      </div>
      <div class="tags-summary-actions">
        <HostCommandButton
          t={t}
          label={t("synthesis-action-validate")}
          command="validateTagVocabulary"
          pendingKeys={pendingKeys}
          onAction={onAction}
        />
        <HostCommandButton
          t={t}
          label={t("synthesis-action-export")}
          command="exportTagVocabulary"
          pendingKeys={pendingKeys}
          onAction={onAction}
        />
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            props.onOpenImport();
          }}
        >
          {t("synthesis-action-import")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vocabulary subview
// ---------------------------------------------------------------------------

type TagDraft = { tag: string; facet: string; note: string };

function expandedRowKey(kind: string, tag: unknown): string {
  return `${kind}:${textValue(tag)}`;
}

function tagFacetOptions(facets: string[], fallback?: unknown): string[] {
  return Array.from(
    new Set(
      ["topic", "method", "field", ...facets, fallback]
        .map((value) => textValue(value))
        .filter(Boolean),
    ),
  );
}

function VocabularyTableRow(props: {
  t: SynthesisWorkbenchTagsTranslate;
  row: SynthesisWorkbenchTagRowWire;
  selected: boolean;
  expanded: boolean;
  editing: boolean;
  draft: TagDraft;
  facetOptions: string[];
  onToggleSelected: (checked: boolean) => void;
  onToggleExpanded: () => void;
  onBeginEdit: () => void;
  onCommitDraft: (draft: TagDraft) => void;
  onApplyDraft: (draft: TagDraft) => void;
  onDelete: () => void;
}) {
  const { t, row } = props;
  const tag = textValue(row.tag);
  const builtin = Boolean(row.builtin);
  const warnings = tagWarningsFor(row);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const facetSelectRef = useRef<HTMLSelectElement>(null);
  const readDraft = (): TagDraft => ({
    tag: tagInputRef.current ? tagInputRef.current.value : props.draft.tag,
    facet: facetSelectRef.current
      ? facetSelectRef.current.value
      : props.draft.facet,
    note: noteInputRef.current ? noteInputRef.current.value : props.draft.note,
  });
  return (
    <Fragment>
      <tr>
        <td>
          <input
            type="checkbox"
            checked={props.selected}
            aria-label={`Select ${tag}`}
            onChange={(event) =>
              props.onToggleSelected((event.target as HTMLInputElement).checked)
            }
          />
        </td>
        <td>
          {props.editing ? (
            <CommitTextInput
              inputRef={tagInputRef}
              value={props.draft.tag}
              disabled={builtin}
              controlKey={`tags.vocabulary.${tag}.tag`}
              onCommit={() => props.onCommitDraft(readDraft())}
            />
          ) : (
            <CompactText value={tag} />
          )}
        </td>
        <td>
          {props.editing ? (
            <FilterSelect
              selectRef={facetSelectRef}
              options={props.facetOptions}
              value={props.draft.facet}
              disabled={builtin}
              labelFor={(value) =>
                value === "all"
                  ? t("synthesis-filter-all")
                  : enumLabel(t, "concept-type", value)
              }
              onChangeValue={() => props.onCommitDraft(readDraft())}
            />
          ) : (
            <CompactText value={row.facet || "-"} />
          )}
        </td>
        <td>
          {props.editing ? (
            <CommitTextInput
              inputRef={noteInputRef}
              value={props.draft.note}
              controlKey={`tags.vocabulary.${tag}.note`}
              onCommit={() => props.onCommitDraft(readDraft())}
            />
          ) : (
            <CompactText value={row.note || "-"} />
          )}
        </td>
        <td>
          {builtin ? (
            <TagBadge t={t} text={t("synthesis-tags-builtin")} tone="info" />
          ) : warnings.length ? (
            <TagBadge t={t} text="warning" tone="warn" />
          ) : (
            <TagBadge
              t={t}
              text={row.deprecated ? "deprecated" : "active"}
              tone={row.deprecated ? "danger" : "ok"}
            />
          )}
        </td>
        <td>{String(row.usage_count || 0)}</td>
        <td>
          <CompactText value={row.source || "-"} />
        </td>
        <td>
          <TagPillList values={row.aliases} />
        </td>
        <td>
          <TagPillList values={row.abbrev} />
        </td>
        <td>
          {warnings.length ? (
            <TagBadge t={t} text={warnings.length} tone="warn" />
          ) : (
            "-"
          )}
        </td>
        <td>
          <div class="row-actions">
            {props.editing ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  props.onApplyDraft(readDraft());
                }}
              >
                {t("synthesis-action-apply")}
              </button>
            ) : (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  props.onBeginEdit();
                }}
              >
                {t("synthesis-action-edit")}
              </button>
            )}
            {!builtin ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  props.onDelete();
                }}
              >
                {t("synthesis-action-delete")}
              </button>
            ) : null}
            <RowExpandButton
              t={t}
              expanded={props.expanded}
              onToggle={props.onToggleExpanded}
            />
          </div>
        </td>
      </tr>
      {props.expanded ? (
        <tr class="tags-expanded-row">
          <td colSpan={VOCABULARY_HEADER_KEYS.length + 1}>
            <div class="tags-expanded-content">
              <DetailList
                t={t}
                fields={[
                  ["synthesis-detail-note", row.note || "-"],
                  [
                    "synthesis-detail-aliases",
                    row.aliases && row.aliases.length
                      ? row.aliases.join(", ")
                      : "-",
                  ],
                  [
                    "synthesis-detail-abbrev",
                    row.abbrev && row.abbrev.length
                      ? row.abbrev.join(", ")
                      : "-",
                  ],
                  ["synthesis-detail-replacement", row.replacement || "-"],
                  ["synthesis-detail-last-synced", row.last_synced_at || "-"],
                ]}
              />
              {warnings.length ? (
                <div class="tags-warning-list">
                  {warnings.map((warning, index) => (
                    <TagBadge
                      key={`${warning.code || "warning"}:${index}`}
                      t={t}
                      text={`${warning.code}: ${warning.message || ""}`}
                      tone={warning.severity === "error" ? "danger" : "warn"}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

type SubviewProps = {
  t: SynthesisWorkbenchTagsTranslate;
  selection: SynthesisWorkbenchTagsSelection;
  pendingKeys: ReadonlySet<string>;
  onAction: SynthesisWorkbenchTagsActionHandler;
};

function useTagSelectionHandlers(props: SubviewProps) {
  const { selection, onAction } = props;
  return {
    toggle: (
      key: "selectedStagedTags" | "selectedVocabularyTags",
      tag: string,
      checked: boolean,
    ) => {
      const selected = new Set(selection[key]);
      if (checked) {
        selected.add(tag);
      } else {
        selected.delete(tag);
      }
      onAction("setFilters", { tags: { [key]: Array.from(selected).sort() } });
    },
    setAll: (
      key: "selectedStagedTags" | "selectedVocabularyTags",
      tags: string[],
      checked: boolean,
    ) => {
      onAction("setFilters", {
        tags: { [key]: checked ? [...tags].sort() : [] },
      });
    },
    toggleExpanded: (key: string) => {
      const expandedRows: Record<string, boolean> = {
        ...selection.expandedRows,
      };
      if (expandedRows[key]) {
        delete expandedRows[key];
      } else {
        expandedRows[key] = true;
      }
      onAction("setFilters", { tags: { expandedRows } });
    },
  };
}

function VocabularySubview(
  props: SubviewProps & {
    importOpen: boolean;
    dismissedSignature?: string;
    onImportDraftInput: () => void;
    onCloseImport: (signature: string) => void;
  },
) {
  const { t, selection, pendingKeys, onAction } = props;
  const handlers = useTagSelectionHandlers(props);
  const visibleTags = selection.vocabularyRows.map((row) => textValue(row.tag));
  const selectedVisible = selection.selectedVocabularyTags.filter((tag) =>
    visibleTags.includes(tag),
  );
  const setVocabularyDraft = (
    row: SynthesisWorkbenchTagRowWire,
    draft: TagDraft,
    status?: string,
  ) => {
    onAction("setFilters", {
      tags: {
        editingVocabularyTag: {
          originalTag: textValue(row.tag),
          draftTag: textValue(draft.tag),
          draftFacet: textValue(draft.facet, textValue(row.facet, "topic")),
          draftNote: draft.note,
          status: status || "idle",
        },
      },
    });
  };
  const applyVocabularyDraft = (
    row: SynthesisWorkbenchTagRowWire,
    draft: TagDraft,
  ) => {
    const originalTag = textValue(row.tag);
    onAction("setFilters", {
      tags: {
        editingVocabularyTag: {
          originalTag,
          draftTag: draft.tag,
          draftFacet: draft.facet,
          draftNote: draft.note,
          status: "pending",
        },
      },
    });
    onAction("hostCommand", {
      command: "updateTagVocabularyEntry",
      args: {
        originalTag,
        tag: draft.tag,
        facet: draft.facet,
        note: draft.note,
      },
    });
  };
  const editing = selection.editingVocabularyTag;
  return (
    <div class="tags-subview">
      <div class="panel-header panel-toolbar">
        <div class="filters">
          <input
            data-synthesis-control-key="tags.search"
            placeholder={t("synthesis-search-tags")}
            value={selection.search}
            onChange={(event) =>
              onAction("setFilters", {
                tags: {
                  search: (event.target as HTMLInputElement).value,
                },
              })
            }
          />
          <FilterSelect
            options={["all", ...selection.facets]}
            value={selection.facet}
            labelFor={(value) => maybeLocalized(t, value)}
            onChangeValue={(value) =>
              onAction("setFilters", { tags: { facet: value } })
            }
          />
          <FilterSelect
            options={["all", "active", "deprecated", "warning"]}
            value={selection.status}
            labelFor={(value) => maybeLocalized(t, value)}
            onChangeValue={(value) =>
              onAction("setFilters", { tags: { status: value } })
            }
          />
          <FilterSelect
            options={["compact", "comfortable"]}
            value={selection.density}
            labelFor={(value) => maybeLocalized(t, value)}
            onChangeValue={(value) =>
              onAction("setFilters", { tags: { density: value } })
            }
          />
        </div>
      </div>
      {selection.vocabularyRows.length ? (
        <div class="tags-bulk-bar tags-bulk-bar-passive">
          <input
            type="checkbox"
            checked={
              visibleTags.length > 0 &&
              selectedVisible.length === visibleTags.length
            }
            aria-label={t("synthesis-tags-select-all-vocabulary")}
            onChange={(event) =>
              handlers.setAll(
                "selectedVocabularyTags",
                visibleTags,
                (event.target as HTMLInputElement).checked,
              )
            }
          />
          <span class="muted">
            {selectedVisible.length
              ? t("synthesis-tags-vocabulary-selected", {
                  count: selectedVisible.length,
                })
              : t("synthesis-tags-selection-visual-only")}
          </span>
        </div>
      ) : null}
      <div class="details">
        <TagBadge
          t={t}
          text={
            selection.cacheStale
              ? t("synthesis-tags-cache-stale")
              : t("synthesis-tags-cache-ready")
          }
          tone={selection.cacheStale ? "warn" : "ok"}
        />
        <span class="muted">
          {t("synthesis-tags-count-warning", {
            count: selection.rowCount,
            warnings: selection.warningCount,
          })}
        </span>
      </div>
      <TagsTableShell
        className="tags-vocabulary-table"
        headers={["", ...VOCABULARY_HEADER_KEYS.map((key) => t(key))]}
        isEmpty={!selection.vocabularyRows.length}
        emptyState={
          selection.rowCount ? (
            <EmptyState
              title={t("synthesis-tags-empty-filtered")}
              message={t("synthesis-tags-empty-filtered-message")}
              tone="default"
            />
          ) : (
            <EmptyState
              title={t("synthesis-tags-empty")}
              message={t("synthesis-tags-empty-message")}
              tone="info"
              action={
                <HostCommandButton
                  t={t}
                  label={t("synthesis-action-bootstrap-tags")}
                  command="runTagBootstrapper"
                  pendingKeys={pendingKeys}
                  onAction={onAction}
                />
              }
            />
          )
        }
      >
        {selection.vocabularyRows.map((row) => {
          const tag = textValue(row.tag);
          const rowKey = expandedRowKey("vocabulary", tag);
          const isEditing = editing?.originalTag === tag;
          const draft: TagDraft = isEditing
            ? {
                tag: textValue(editing?.draftTag, tag),
                facet: textValue(
                  editing?.draftFacet,
                  textValue(row.facet, "topic"),
                ),
                note: textValue(editing?.draftNote, textValue(row.note)),
              }
            : {
                tag,
                facet: textValue(row.facet, "topic"),
                note: textValue(row.note),
              };
          return (
            <VocabularyTableRow
              key={tag}
              t={t}
              row={row}
              selected={selectedVisible.includes(tag)}
              expanded={selection.expandedRows[rowKey] === true}
              editing={isEditing}
              draft={draft}
              facetOptions={tagFacetOptions(selection.facets, row.facet)}
              onToggleSelected={(checked) =>
                handlers.toggle("selectedVocabularyTags", tag, checked)
              }
              onToggleExpanded={() => handlers.toggleExpanded(rowKey)}
              onBeginEdit={() =>
                setVocabularyDraft(row, {
                  tag,
                  facet: textValue(row.facet, "topic"),
                  note: textValue(row.note),
                })
              }
              onCommitDraft={(next) => setVocabularyDraft(row, next)}
              onApplyDraft={(next) => applyVocabularyDraft(row, next)}
              onDelete={() => {
                if (!window.confirm(`Delete vocabulary tag "${tag}"?`)) {
                  return;
                }
                onAction("hostCommand", {
                  command: "deleteTagVocabularyEntry",
                  args: { originalTag: tag, tag },
                });
              }}
            />
          );
        })}
      </TagsTableShell>
      <TagImportPanel
        t={t}
        selection={selection}
        pendingKeys={pendingKeys}
        onAction={onAction}
        importOpen={props.importOpen}
        dismissedSignature={props.dismissedSignature}
        onImportDraftInput={props.onImportDraftInput}
        onClose={props.onCloseImport}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staged inbox subview
// ---------------------------------------------------------------------------

function stagedTagSuffix(row: SynthesisWorkbenchStagedTagRowWire): string {
  const tag = textValue(row.tag);
  const facet = textValue(row.facet);
  const prefix = `${facet}:`;
  return facet && tag.startsWith(prefix) ? tag.slice(prefix.length) : tag;
}

type StagedEditStateView = {
  stateText: string;
  toneClass: string;
  title?: string;
};

function stagedEditStateView(
  selection: SynthesisWorkbenchTagsSelection,
  pendingKeys: ReadonlySet<string>,
  tag: string,
): StagedEditStateView {
  const edit = selection.editingStagedTag;
  const key = synthesisWorkbenchTagsOperationKey("updateStagedTagSuggestion", {
    originalTag: tag,
  });
  const pending = pendingKeys.has(key);
  const failed = selection.lastFailedOperationKey === key;
  const completed = selection.lastCompletedOperationKey === key;
  const stateText = failed
    ? "failed"
    : pending || edit?.status === "pending"
      ? "saving"
      : completed || edit?.status === "saved"
        ? "saved"
        : "";
  return {
    stateText,
    toneClass: failed ? "failed" : pending ? "pending" : "saved",
    title:
      failed && selection.lastFailedMessage
        ? selection.lastFailedMessage
        : undefined,
  };
}

function StagedEditStateBadge(props: {
  t: SynthesisWorkbenchTagsTranslate;
  view: StagedEditStateView;
}) {
  if (!props.view.stateText) {
    return <span class="staged-edit-state" />;
  }
  return (
    <span
      class={`staged-edit-state ${props.view.toneClass}`}
      title={props.view.title}
    >
      {maybeLocalized(props.t, props.view.stateText) || props.view.stateText}
    </span>
  );
}

function StagedTableRow(props: {
  t: SynthesisWorkbenchTagsTranslate;
  row: SynthesisWorkbenchStagedTagRowWire;
  selected: boolean;
  expanded: boolean;
  draft: TagDraft;
  facetOptions: string[];
  editState: StagedEditStateView;
  pendingKeys: ReadonlySet<string>;
  onAction: SynthesisWorkbenchTagsActionHandler;
  onToggleSelected: (checked: boolean) => void;
  onToggleExpanded: () => void;
  onCommitDraft: (draft: TagDraft) => void;
}) {
  const { t, row } = props;
  const tag = textValue(row.tag);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const facetSelectRef = useRef<HTMLSelectElement>(null);
  const readDraft = (): TagDraft => ({
    tag: tagInputRef.current ? tagInputRef.current.value : props.draft.tag,
    facet: facetSelectRef.current
      ? facetSelectRef.current.value
      : props.draft.facet,
    note: noteInputRef.current ? noteInputRef.current.value : props.draft.note,
  });
  return (
    <Fragment>
      <tr>
        <td>
          <input
            type="checkbox"
            checked={props.selected}
            aria-label={`Select staged ${tag}`}
            onChange={(event) =>
              props.onToggleSelected((event.target as HTMLInputElement).checked)
            }
          />
        </td>
        <td>
          <div class="tags-inline-edit-cell">
            <CommitTextInput
              inputRef={tagInputRef}
              value={props.draft.tag}
              controlKey={`tags.staged.${tag}.tag`}
              onCommit={() => props.onCommitDraft(readDraft())}
            />
            <StagedEditStateBadge t={t} view={props.editState} />
          </div>
        </td>
        <td>
          <FilterSelect
            selectRef={facetSelectRef}
            options={props.facetOptions}
            value={props.draft.facet}
            labelFor={(value) =>
              value === "all"
                ? t("synthesis-filter-all")
                : enumLabel(t, "concept-type", value)
            }
            onChangeValue={() => props.onCommitDraft(readDraft())}
          />
        </td>
        <td>
          <CommitTextInput
            inputRef={noteInputRef}
            value={props.draft.note}
            controlKey={`tags.staged.${tag}.note`}
            onCommit={() => props.onCommitDraft(readDraft())}
          />
        </td>
        <td>{String(row.parent_count || 0)}</td>
        <td>
          <CompactText value={row.source_flow || "-"} />
        </td>
        <td>
          <CompactText value={row.updated_at || "-"} />
        </td>
        <td>
          <div class="row-actions">
            <HostCommandButton
              t={t}
              label={t("synthesis-action-promote")}
              command="promoteStagedTagSuggestions"
              args={{ tag, tags: [tag] }}
              pendingKeys={props.pendingKeys}
              onAction={props.onAction}
            />
            <HostCommandButton
              t={t}
              label={t("synthesis-action-discard")}
              command="discardStagedTagSuggestions"
              args={{ tag, tags: [tag] }}
              pendingKeys={props.pendingKeys}
              onAction={props.onAction}
            />
            <RowExpandButton
              t={t}
              expanded={props.expanded}
              onToggle={props.onToggleExpanded}
            />
          </div>
        </td>
      </tr>
      {props.expanded ? (
        <tr class="tags-expanded-row">
          <td colSpan={STAGED_HEADER_KEYS.length + 1}>
            <div class="tags-expanded-content">
              <DetailList
                t={t}
                fields={[
                  ["synthesis-detail-full-tag", row.tag],
                  ["synthesis-detail-note", row.note || "-"],
                  [
                    "synthesis-detail-parent-bindings",
                    row.parent_bindings && row.parent_bindings.length
                      ? row.parent_bindings.join(", ")
                      : "-",
                  ],
                  ["synthesis-detail-source-flow", row.source_flow || "-"],
                  ["synthesis-detail-created", row.created_at || "-"],
                  ["synthesis-detail-updated", row.updated_at || "-"],
                ]}
              />
              <StagedEditStateBadge t={t} view={props.editState} />
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function StagedInboxSubview(props: SubviewProps) {
  const { t, selection, pendingKeys, onAction } = props;
  const handlers = useTagSelectionHandlers(props);
  const visibleTags = selection.stagedRows.map((row) => textValue(row.tag));
  const selectedVisible = selection.selectedStagedTags.filter((tag) =>
    visibleTags.includes(tag),
  );
  const persistStagedDraft = (
    row: SynthesisWorkbenchStagedTagRowWire,
    draft: TagDraft,
  ) => {
    const tag = textValue(row.tag);
    const facet = textValue(draft.facet, textValue(row.facet, "topic"));
    const suffix = textValue(draft.tag);
    const nextTag = suffix.includes(":") ? suffix : `${facet}:${suffix}`;
    onAction("setFilters", {
      tags: {
        editingStagedTag: {
          originalTag: tag,
          draftTag: suffix,
          draftFacet: facet,
          draftNote: draft.note,
          status: "pending",
        },
      },
    });
    onAction("hostCommand", {
      command: "updateStagedTagSuggestion",
      args: {
        originalTag: tag,
        tag: nextTag,
        facet,
        note: draft.note,
        source_flow: textValue(row.source_flow),
        parent_bindings: Array.isArray(row.parent_bindings)
          ? row.parent_bindings
          : [],
      },
    });
  };
  return (
    <div class="tags-subview">
      <div class="panel-header panel-toolbar">
        <div class="filters">
          <input
            data-synthesis-control-key="tags.stagedSearch"
            placeholder={t("synthesis-search-staged-tags")}
            value={selection.stagedSearch}
            onChange={(event) =>
              onAction("setFilters", {
                tags: {
                  stagedSearch: (event.target as HTMLInputElement).value,
                },
              })
            }
          />
          <FilterSelect
            options={["all", ...selection.stagedFacets]}
            value={selection.stagedFacet}
            labelFor={(value) => maybeLocalized(t, value)}
            onChangeValue={(value) =>
              onAction("setFilters", { tags: { stagedFacet: value } })
            }
          />
          <button
            type="button"
            disabled={!selection.stagedCount}
            onClick={(event) => {
              event.preventDefault();
              if (!window.confirm("Clear all staged tag suggestions?")) {
                return;
              }
              onAction("hostCommand", {
                command: "clearStagedTagSuggestions",
                args: {},
              });
            }}
          >
            {t("synthesis-action-clear-staged")}
          </button>
        </div>
      </div>
      <div class="tags-bulk-bar">
        {visibleTags.length ? (
          <input
            type="checkbox"
            checked={selectedVisible.length === visibleTags.length}
            aria-label={t("synthesis-tags-select-all-staged")}
            onChange={(event) =>
              handlers.setAll(
                "selectedStagedTags",
                visibleTags,
                (event.target as HTMLInputElement).checked,
              )
            }
          />
        ) : null}
        <span class="muted">
          {selectedVisible.length
            ? t("synthesis-tags-staged-selected", {
                count: selectedVisible.length,
              })
            : t("synthesis-tags-select-staged-bulk")}
        </span>
        <HostCommandButton
          t={t}
          label={t("synthesis-action-promote-selected")}
          command="promoteStagedTagSuggestions"
          args={{ tags: selectedVisible }}
          disabled={selectedVisible.length === 0}
          pendingKeys={pendingKeys}
          onAction={onAction}
        />
        <HostCommandButton
          t={t}
          label={t("synthesis-action-discard-selected")}
          command="discardStagedTagSuggestions"
          args={{ tags: selectedVisible }}
          disabled={selectedVisible.length === 0}
          pendingKeys={pendingKeys}
          onAction={onAction}
        />
        <button
          type="button"
          disabled={selectedVisible.length === 0}
          onClick={(event) => {
            event.preventDefault();
            handlers.setAll("selectedStagedTags", [], false);
          }}
        >
          {t("synthesis-action-clear-selection")}
        </button>
      </div>
      <TagsTableShell
        className="tags-staged-table"
        headers={["", ...STAGED_HEADER_KEYS.map((key) => t(key))]}
        isEmpty={!selection.stagedRows.length}
        emptyState={
          <EmptyState
            title={
              selection.stagedCount
                ? t("synthesis-tags-staged-empty-filtered")
                : t("synthesis-tags-staged-empty")
            }
            message={
              selection.stagedCount
                ? t("synthesis-tags-staged-empty-filtered-message")
                : t("synthesis-tags-staged-empty-message")
            }
            tone={selection.stagedCount ? "default" : "info"}
          />
        }
      >
        {selection.stagedRows.map((row) => {
          const tag = textValue(row.tag);
          const rowKey = expandedRowKey("staged", tag);
          const edit = selection.editingStagedTag;
          const draft: TagDraft =
            edit?.originalTag === tag
              ? {
                  tag: textValue(edit.draftTag, stagedTagSuffix(row)),
                  facet: textValue(
                    edit.draftFacet,
                    textValue(row.facet, "topic"),
                  ),
                  note: textValue(edit.draftNote, textValue(row.note)),
                }
              : {
                  tag: stagedTagSuffix(row),
                  facet: textValue(row.facet, "topic"),
                  note: textValue(row.note),
                };
          return (
            <StagedTableRow
              key={tag}
              t={t}
              row={row}
              selected={selectedVisible.includes(tag)}
              expanded={selection.expandedRows[rowKey] === true}
              draft={draft}
              facetOptions={tagFacetOptions(selection.facets, row.facet)}
              editState={stagedEditStateView(selection, pendingKeys, tag)}
              pendingKeys={pendingKeys}
              onAction={onAction}
              onToggleSelected={(checked) =>
                handlers.toggle("selectedStagedTags", tag, checked)
              }
              onToggleExpanded={() => handlers.toggleExpanded(rowKey)}
              onCommitDraft={(next) => persistStagedDraft(row, next)}
            />
          );
        })}
      </TagsTableShell>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import panel
// ---------------------------------------------------------------------------

function objectEntries(value: unknown): Array<[string, unknown]> {
  return isRecord(value)
    ? Object.entries(value).filter(([, entry]) => {
        if (Array.isArray(entry)) return entry.length > 0;
        if (isRecord(entry)) return Object.keys(entry).length > 0;
        return !!textValue(entry);
      })
    : [];
}

function hasStructuredContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return objectEntries(value).length > 0;
  return !!textValue(value);
}

function firstText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = textValue(row[key]);
    if (value) {
      return value;
    }
  }
  return fallback;
}

function compactReviewValue(
  t: SynthesisWorkbenchTagsTranslate,
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
        return maybeLocalized(t, entry) || textValue(entry);
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

function importPreviewSignature(
  selection: SynthesisWorkbenchTagsSelection,
): string {
  const preview = selection.importPreview;
  if (!preview) return "";
  return [
    selection.importDraft.length || 0,
    preview.additions?.length || 0,
    preview.builtins?.length || 0,
    preview.conflicts?.length || 0,
    preview.unchanged?.length || 0,
    preview.warnings?.length || 0,
  ].join(":");
}

function TagImportPanel(props: {
  t: SynthesisWorkbenchTagsTranslate;
  selection: SynthesisWorkbenchTagsSelection;
  pendingKeys: ReadonlySet<string>;
  onAction: SynthesisWorkbenchTagsActionHandler;
  importOpen: boolean;
  dismissedSignature?: string;
  onImportDraftInput: () => void;
  onClose: (signature: string) => void;
}) {
  const { t, selection, pendingKeys, onAction } = props;
  if (selection.importOptimisticallyResolved) {
    return null;
  }
  const preview = selection.importPreview;
  const signature = importPreviewSignature(selection);
  const shouldShow =
    props.importOpen || (preview && props.dismissedSignature !== signature);
  if (!shouldShow) {
    return null;
  }
  const draft = selection.importDraft || "";
  const conflict = preview?.conflicts?.[0];
  const conflictTag = conflict
    ? textValue(
        conflict.tag || conflict.imported?.tag || conflict.local?.tag,
        t("synthesis-tags-import-unknown-tag"),
      )
    : "";
  const detailFields: Array<[string, unknown]> = preview
    ? [
        ["builtins", preview.builtins],
        ["additions", preview.additions],
        ["conflicts", preview.conflicts],
        ["unchanged", preview.unchanged],
        ["warnings", preview.warnings],
      ]
    : [];
  const visibleDetails = detailFields.filter(([, value]) =>
    hasStructuredContent(value),
  );
  return (
    <section class="review-panel review-panel-enter tag-import-popover">
      <article class="review-card">
        <div class="review-card-header">
          <div class="review-card-title">
            <TagBadge
              t={t}
              text={t("synthesis-tags-import-kind")}
              tone="warn"
            />
            <strong>
              {preview
                ? t("synthesis-tags-import-preview-title")
                : t("synthesis-tags-import-title")}
            </strong>
          </div>
          <span class="muted">
            {preview
              ? t("synthesis-tags-import-preview-meta", {
                  additions: preview.additions?.length || 0,
                  conflicts: preview.conflicts?.length || 0,
                })
              : t("synthesis-tags-import-meta")}
          </span>
        </div>
        <p class="review-card-body">
          {preview
            ? t("synthesis-tags-import-preview-body")
            : t("synthesis-tags-import-body")}
        </p>
        {visibleDetails.length ? (
          <div class="review-card-details review-card-metadata">
            {visibleDetails.map(([label, value]) => (
              <div class="detail-row" key={label}>
                <span class="muted">{legacyUiText(t, label)}</span>
                <strong>{compactReviewValue(t, value)}</strong>
              </div>
            ))}
          </div>
        ) : null}
        <textarea
          rows={5}
          placeholder={t("synthesis-placeholder-tag-vocabulary-json")}
          value={draft}
          onChange={(event) => {
            props.onImportDraftInput();
            onAction("setFilters", {
              tags: {
                importDraft: (event.target as HTMLTextAreaElement).value,
              },
            });
          }}
        />
        {preview ? (
          <p class="review-card-body">
            {conflict
              ? t("synthesis-tags-import-first-conflict", { tag: conflictTag })
              : t("synthesis-tags-import-no-conflicts")}
          </p>
        ) : null}
        <div class="action-group">
          {preview ? (
            <Fragment>
              <HostCommandButton
                t={t}
                label={t("synthesis-action-merge-non-conflicting")}
                command="applyTagVocabularyImport"
                args={{ payload: draft, action: "merge-non-conflicting" }}
                disabled={!draft.trim()}
                pendingKeys={pendingKeys}
                onAction={onAction}
              />
              <HostCommandButton
                t={t}
                label={t("synthesis-action-use-imported")}
                command="applyTagVocabularyImport"
                args={{ payload: draft, action: "use-imported" }}
                disabled={!draft.trim()}
                pendingKeys={pendingKeys}
                onAction={onAction}
              />
            </Fragment>
          ) : null}
          <HostCommandButton
            t={t}
            label={t("synthesis-action-preview-import")}
            command="previewTagVocabularyImport"
            args={{ payload: draft }}
            disabled={!draft.trim()}
            pendingKeys={pendingKeys}
            onAction={onAction}
          />
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              props.onClose(signature);
            }}
          >
            {t("synthesis-action-close")}
          </button>
        </div>
      </article>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Region root
// ---------------------------------------------------------------------------

export const TagsRegion = memo(function TagsRegion(props: TagsRegionProps) {
  const { selection, t, onAction } = props;
  const [importOpen, setImportOpen] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState<
    string | undefined
  >(undefined);
  const pendingKeys = new Set(selection.pendingOperationKeys);
  return (
    <section
      class={`tags-workbench density-${selection.density}`}
      aria-label={t("synthesis-tags-management")}
      data-region-content="synthesis-tags"
    >
      <TagsSummaryBar
        t={t}
        selection={selection}
        pendingKeys={pendingKeys}
        onAction={onAction}
        onOpenImport={() => {
          setImportOpen(true);
          setDismissedSignature(undefined);
        }}
      />
      {selection.view === "staged" ? (
        <StagedInboxSubview
          t={t}
          selection={selection}
          pendingKeys={pendingKeys}
          onAction={onAction}
        />
      ) : (
        <VocabularySubview
          t={t}
          selection={selection}
          pendingKeys={pendingKeys}
          onAction={onAction}
          importOpen={importOpen}
          dismissedSignature={dismissedSignature}
          onImportDraftInput={() => setDismissedSignature(undefined)}
          onCloseImport={(signature: string) => {
            setImportOpen(false);
            setDismissedSignature(signature || undefined);
          }}
        />
      )}
    </section>
  );
}, tagsRegionPropsEqual);
