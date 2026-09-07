/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";

import {
  canonicalEditDraftFromRecord,
  canonicalEditDraftIsDirty,
  canonicalEditPatch,
  canonicalRowBindingLabel,
  fillRegistryTemplate,
  isRegistryOperationPending,
  referenceTargetCandidateGroup,
  registryEnumLabel,
  registryFilterOptionLabel,
  registryLocalizedValue,
  registryOperationKey,
  type SynthesisCanonicalDraftSource,
  type SynthesisCanonicalEditDraft,
  type SynthesisCanonicalRowView,
  type SynthesisRegistryActionSender,
  type SynthesisRegistryIdentifierView,
  type SynthesisRegistrySelection,
  type SynthesisRegistryText,
} from "./registryTypes";
import {
  RegistryActionButton,
  RegistryBadge,
  RegistryEmptyState,
  RegistryFilterInput,
  RegistrySelect,
} from "./controls";
import { useWindowedRows, WindowedTableSpacer } from "../windowedRows";

// Canonical revision workbench (legacy renderCanonicalRevisionWorkbench and
// friends, src/synthesisWorkbenchApp.ts :8794-10290): summary strip, canonical
// filters, merge queue bar, the canonical table with letter index and row
// windowing, and the detail/edit drawer. Merge queue, row selection, edit
// drafts, drawer tab/collapse and compare indices are component-local UI
// state (legacy state.pendingCanonicalMergeRequests, canonicalEditDrafts,
// canonicalDetailTab, ...); they never enter the wire selection.

type PendingCanonicalMerge = {
  key: string;
  sourceEffectiveCanonicalId: string;
  targetEffectiveCanonicalId: string;
  sourceTitle: string;
  targetTitle: string;
};

type CanonicalMergeSubmission = {
  operationKey: string;
  sourceEffectiveCanonicalIds: string[];
};

// Legacy canonicalActionBlockers fell back to the raw English "Unavailable";
// there is no message key for it, so the literal resolves through the
// panel-provided strings bag instead of hardcoding English in the TSX.
function blockersText(
  t: SynthesisRegistryText,
  availability: SynthesisCanonicalRowView["actionAvailability"]["merge"],
  strings: SynthesisRegistrySelection["strings"],
): string {
  return (
    availability.blockers.join(", ") ||
    availability.reason ||
    strings.unavailableLabel
  );
}

// ---------------------------------------------------------------------------
// Merge bar
// ---------------------------------------------------------------------------

function CanonicalMergeBar(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  selectedIds: string[];
  mergeSourceRowIds: ReadonlySet<string>;
  pendingMerges: PendingCanonicalMerge[];
  applying: boolean;
  onMergeSelected: (rowIds: string[]) => void;
  onCancelTargetPicking: () => void;
  onApplyPending: () => void;
  onClearPending: () => void;
}) {
  const { t, selection } = props;
  return (
    <div class="canonical-merge-bar">
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-merge-selected")}
        disabled={
          props.applying ||
          props.selectedIds.length === 0 ||
          props.mergeSourceRowIds.size > 0
        }
        onClick={() => props.onMergeSelected(props.selectedIds)}
      />
      {props.mergeSourceRowIds.size ? (
        <RegistryBadge
          t={t}
          text={fillRegistryTemplate(selection.strings.mergeSourcesTemplate, {
            count: props.mergeSourceRowIds.size,
          })}
          tone="warn"
        />
      ) : null}
      {props.mergeSourceRowIds.size ? (
        <RegistryActionButton
          t={t}
          label={t("synthesis-action-cancel-target-picking")}
          onClick={() => props.onCancelTargetPicking()}
        />
      ) : null}
      {props.pendingMerges.length ? (
        <span
          class="canonical-pending-summary"
          title={props.pendingMerges
            .map(
              (request) => `${request.sourceTitle} -> ${request.targetTitle}`,
            )
            .join("\n")}
        >
          {props.applying
            ? fillRegistryTemplate(
                selection.strings.applyingPendingMergesTemplate,
                { count: props.pendingMerges.length },
              )
            : fillRegistryTemplate(selection.strings.pendingMergesTemplate, {
                count: props.pendingMerges.length,
              })}
        </span>
      ) : null}
      {props.pendingMerges.length ? (
        <RegistryActionButton
          t={t}
          label={t("synthesis-action-apply-pending")}
          disabled={props.applying}
          onClick={() => props.onApplyPending()}
        />
      ) : null}
      {props.pendingMerges.length ? (
        <RegistryActionButton
          t={t}
          label={t("synthesis-action-clear-pending")}
          disabled={props.applying}
          onClick={() => props.onClearPending()}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Canonical table
// ---------------------------------------------------------------------------

function CanonicalRowActions(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
  mergeSourceRowIds: ReadonlySet<string>;
  editOpen: boolean;
  editDirty: boolean;
  onPickMergeTarget: (row: SynthesisCanonicalRowView) => void;
  onStartMergeSource: (rowId: string) => void;
  onToggleEdit: (row: SynthesisCanonicalRowView) => void;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, row } = props;
  const availability = row.actionAvailability;
  const mergeSourceActive = props.mergeSourceRowIds.size > 0;
  const archiveArgs = { canonicalReferenceId: row.effectiveCanonicalId };
  return (
    <div class="canonical-row-actions">
      {mergeSourceActive ? (
        (() => {
          const isSource = props.mergeSourceRowIds.has(row.rowId);
          const disabled = isSource || !availability.merge.allowed;
          return (
            <RegistryActionButton
              t={t}
              label={
                isSource
                  ? t("synthesis-action-source")
                  : t("synthesis-action-target")
              }
              disabled={disabled}
              title={
                isSource
                  ? t("synthesis-canonical-merge-source-selected")
                  : disabled
                    ? blockersText(t, availability.merge, selection.strings)
                    : t("synthesis-canonical-use-merge-target")
              }
              onClick={() => props.onPickMergeTarget(row)}
            />
          );
        })()
      ) : (
        <RegistryActionButton
          t={t}
          label={t("synthesis-action-merge")}
          disabled={!availability.merge.allowed}
          title={
            !availability.merge.allowed
              ? blockersText(t, availability.merge, selection.strings)
              : t("synthesis-canonical-select-merge-source")
          }
          onClick={() => props.onStartMergeSource(row.rowId)}
        />
      )}
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-edit")}
        disabled={!availability.edit.allowed}
        className={`${props.editDirty ? "is-dirty" : ""} ${
          props.editOpen ? "active" : ""
        }`.trim()}
        title={
          !availability.edit.allowed
            ? blockersText(t, availability.edit, selection.strings)
            : props.editDirty
              ? t("synthesis-canonical-unsaved-metadata")
              : t("synthesis-canonical-edit-metadata")
        }
        onClick={() => props.onToggleEdit(row)}
      />
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-archive")}
        disabled={!availability.archive.allowed}
        title={
          !availability.archive.allowed
            ? blockersText(t, availability.archive, selection.strings)
            : t("synthesis-canonical-archive-empty")
        }
        onClick={() =>
          props.onAction("hostCommand", {
            command: "archiveCanonicalReference",
            args: archiveArgs,
          })
        }
      />
    </div>
  );
}

function CanonicalSelectAllCheckbox(props: {
  t: SynthesisRegistryText;
  selectedCount: number;
  rowCount: number;
  onToggleAll: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const { selectedCount, rowCount } = props;
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = selectedCount > 0 && selectedCount < rowCount;
    }
  }, [selectedCount, rowCount]);
  return (
    <th class="registry-center-cell">
      <input
        ref={ref}
        type="checkbox"
        checked={selectedCount > 0 && selectedCount === rowCount}
        aria-label={props.t("synthesis-canonical-select-all")}
        onChange={(event) => props.onToggleAll(event.currentTarget.checked)}
      />
    </th>
  );
}

function CanonicalRevisionTable(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  rows: SynthesisCanonicalRowView[];
  selectedRowId: string;
  selectedRowIds: ReadonlySet<string>;
  mergeSourceRowIds: ReadonlySet<string>;
  editOpenRowId?: string;
  editDrafts: ReadonlyMap<string, SynthesisCanonicalEditDraft>;
  onSelectRow: (rowId: string) => void;
  onToggleRowChecked: (rowId: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onPickMergeTarget: (row: SynthesisCanonicalRowView) => void;
  onStartMergeSource: (rowId: string) => void;
  onToggleEdit: (row: SynthesisCanonicalRowView) => void;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, rows } = props;
  const resetKey = [
    selection.filters.canonicalSearch,
    selection.filters.canonicalBinding,
    selection.filters.canonicalGraph,
    selection.filters.canonicalDuplicates,
    rows.length,
    rows[0]?.rowId || "",
  ].join("|");
  const windowed = useWindowedRows(rows, {
    getKey: (row) => row.rowId,
    resetKey,
    estimatedRowHeight: 64,
    overscanPx: 560,
  });

  if (!rows.length) {
    return (
      <RegistryEmptyState
        title={t("synthesis-canonical-no-references")}
        message={t("synthesis-canonical-no-references-message")}
        tone="info"
      />
    );
  }

  const availableGroups = new Set(
    rows.map((row) => referenceTargetCandidateGroup(row.title)),
  );
  const scrollToGroup = (group: string) => {
    const index = rows.findIndex(
      (row) => referenceTargetCandidateGroup(row.title) === group,
    );
    if (index >= 0) {
      windowed.scrollToIndex(index);
    }
  };

  const seenGroups = new Set<string>();
  return (
    <div class="canonical-table-shell">
      <div class="reference-target-index canonical-letter-index">
        {["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((group) => (
          <RegistryActionButton
            key={group}
            t={t}
            label={group}
            disabled={!availableGroups.has(group)}
            onClick={() => scrollToGroup(group)}
          />
        ))}
      </div>
      <div
        class="table-wrap registry-table-wrap canonical-table-wrap"
        data-synthesis-scroll-key="registry.canonical.table"
        ref={windowed.scrollRef}
        onScroll={(event) => windowed.onScroll(event)}
        onFocusIn={(event) => windowed.onFocusIn(event)}
      >
        <table class="registry-table canonical-table">
          <colgroup>
            {[
              "canonical-select",
              "canonical-title",
              "canonical-year",
              "canonical-binding",
              "canonical-graph",
              "canonical-count",
              "canonical-redirects",
              "canonical-reviews",
              "canonical-actions",
            ].map((column) => (
              <col key={column} class={`registry-col-${column}`} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <CanonicalSelectAllCheckbox
                t={t}
                selectedCount={props.selectedRowIds.size}
                rowCount={rows.length}
                onToggleAll={props.onToggleAll}
              />
              {[
                t("synthesis-column-title"),
                t("synthesis-column-year"),
                t("synthesis-column-binding"),
                t("synthesis-column-graph"),
                t("synthesis-column-raw-refs"),
                t("synthesis-column-pointed-by"),
                t("synthesis-column-reviews"),
                t("synthesis-column-actions"),
              ].map((label) => (
                <th key={label}>
                  <span class="registry-column-header-label">{label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <WindowedTableSpacer
              height={windowed.topSpacerHeight}
              colSpan={9}
            />
            {windowed.visibleRows.map(
              ({ item: row, index: rowIndex, key }, visibleIndex) => {
                const rowId = row.rowId;
                const selected = rowId === props.selectedRowId;
                const isMergeSource = props.mergeSourceRowIds.has(rowId);
                const group = referenceTargetCandidateGroup(row.title);
                const groupStart = !seenGroups.has(group);
                seenGroups.add(group);
                return [
                  <tr
                    key={rowId || `canonical-${rowIndex}`}
                    class={[
                      "registry-parent-row",
                      "canonical-row",
                      selected ? "selected" : "",
                      isMergeSource ? "merge-source" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    tabIndex={0}
                    aria-selected={selected ? "true" : "false"}
                    data-reference-target-group={group}
                    data-reference-target-group-start={
                      groupStart ? group : undefined
                    }
                    data-windowed-row-key={key}
                    ref={(node) => windowed.measureRow(key, node)}
                    onClick={() => {
                      if (rowId && rowId !== props.selectedRowId) {
                        props.onSelectRow(rowId);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      if (rowId && rowId !== props.selectedRowId) {
                        props.onSelectRow(rowId);
                      }
                    }}
                  >
                    <td class="registry-center-cell canonical-select-cell">
                      <input
                        type="checkbox"
                        checked={props.selectedRowIds.has(rowId)}
                        disabled={props.mergeSourceRowIds.size > 0}
                        aria-label={t("synthesis-canonical-select-row", {
                          label: row.title || rowId,
                        })}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          props.onToggleRowChecked(
                            rowId,
                            event.currentTarget.checked,
                          )
                        }
                      />
                    </td>
                    <td>
                      <div
                        class="registry-reference-title-cell"
                        title={row.title}
                      >
                        <span class="registry-reference-parent-title">
                          {row.title}
                        </span>
                        <span class="registry-reference-muted">
                          {row.projectedLiteratureItemId}
                        </span>
                      </div>
                    </td>
                    <td class="registry-center-cell">{row.year || "-"}</td>
                    <td class="registry-center-cell">
                      <RegistryBadge
                        t={t}
                        text={canonicalRowBindingLabel(
                          row,
                          t("synthesis-canonical-summary-external"),
                        )}
                        tone={row.binding.itemKey ? "ok" : "orange"}
                      />
                    </td>
                    <td class="registry-center-cell">
                      <RegistryBadge
                        t={t}
                        text={
                          row.graphNodeId
                            ? t("synthesis-canonical-visible")
                            : t("synthesis-canonical-not-in-graph")
                        }
                        tone={row.graphNodeId ? "ok" : "danger"}
                      />
                    </td>
                    <td class="registry-center-cell">
                      {String(row.rawReferenceCount ?? "0")}
                    </td>
                    <td class="registry-center-cell">
                      {String(row.incomingRedirectCount ?? "0")}
                    </td>
                    <td class="registry-center-cell">
                      {String(row.proposalCount ?? "0")}
                    </td>
                    <td class="registry-center-cell">
                      <CanonicalRowActions
                        selection={selection}
                        t={t}
                        row={row}
                        mergeSourceRowIds={props.mergeSourceRowIds}
                        editOpen={props.editOpenRowId === rowId}
                        editDirty={canonicalEditDraftIsDirty(
                          row,
                          props.editDrafts.get(rowId),
                        )}
                        onPickMergeTarget={props.onPickMergeTarget}
                        onStartMergeSource={props.onStartMergeSource}
                        onToggleEdit={props.onToggleEdit}
                        onAction={props.onAction}
                      />
                    </td>
                  </tr>,
                  windowed.middleSpacerAfter === visibleIndex ? (
                    <WindowedTableSpacer
                      key={`${key}-middle-spacer`}
                      height={windowed.middleSpacerHeight}
                      colSpan={9}
                    />
                  ) : null,
                ];
              },
            )}
            <WindowedTableSpacer
              height={windowed.bottomSpacerHeight}
              colSpan={9}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer: readable lists
// ---------------------------------------------------------------------------

function CanonicalIdentifierChips(props: {
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
}) {
  const { t, row } = props;
  if (!row.identifiers.length) {
    return <span class="muted">{t("synthesis-canonical-no-identifiers")}</span>;
  }
  return (
    <div class="canonical-chip-list">
      {row.identifiers.map((identifier, index) => (
        <span key={index} class="canonical-info-chip">
          <strong>{identifier.kind.toUpperCase()}</strong>
          <span>{identifier.value}</span>
        </span>
      ))}
    </div>
  );
}

function CanonicalBindingBlock(props: {
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
}) {
  const { t, row } = props;
  if (!row.binding.itemKey) {
    return (
      <span class="muted">{t("synthesis-canonical-external-unbound")}</span>
    );
  }
  return (
    <div class="canonical-readable-block">
      <strong>{row.binding.title || row.title}</strong>
      <span class="muted">
        {[
          row.binding.paperRef,
          row.binding.status
            ? `${t("synthesis-filter-status")} ${registryLocalizedValue(
                t,
                row.binding.status,
              )}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </div>
  );
}

function CanonicalRedirectList(props: {
  t: SynthesisRegistryText;
  rows: SynthesisCanonicalRowView["incomingRedirects"];
  empty: string;
}) {
  const { t, rows } = props;
  if (!rows.length) {
    return <span class="muted">{props.empty}</span>;
  }
  return (
    <div class="canonical-readable-list">
      {rows.slice(0, 12).map((redirect, index) => {
        const endpoint = redirect.from;
        const title = endpoint.title || t("synthesis-canonical-untitled");
        const meta = [
          endpoint.year,
          redirect.reason
            ? `${t("synthesis-field-reason")} ${registryEnumLabel(
                t,
                "reason",
                redirect.reason,
              )}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div key={index} class="canonical-readable-block" title={title}>
            <strong title={endpoint.title}>{title}</strong>
            <span class="muted" title={meta}>
              {meta}
            </span>
          </div>
        );
      })}
      {rows.length > 12 ? (
        <span class="muted">
          {t("synthesis-canonical-more-items", { count: rows.length - 12 })}
        </span>
      ) : null}
    </div>
  );
}

function CanonicalDuplicatePeers(props: {
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
}) {
  const { t, row } = props;
  if (!row.duplicatePeers.length) {
    return (
      <span class="muted">{t("synthesis-canonical-no-duplicate-group")}</span>
    );
  }
  return (
    <div class="canonical-readable-list">
      {row.duplicatePeers.slice(0, 10).map((peer, index) => {
        const title = peer.title || t("synthesis-canonical-untitled");
        const meta = [peer.year, peer.bindingText].filter(Boolean).join(" · ");
        return (
          <div key={index} class="canonical-readable-block" title={title}>
            <strong title={peer.title}>{title}</strong>
            <span class="muted" title={meta}>
              {meta}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CanonicalProposalList(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
}) {
  const { selection, t, row } = props;
  if (!row.relatedProposals.length) {
    return (
      <span class="muted">{t("synthesis-canonical-no-related-proposals")}</span>
    );
  }
  return (
    <div class="canonical-readable-list">
      {row.relatedProposals.slice(0, 12).map((proposal, index) => {
        const proposalTitle = `${registryEnumLabel(
          t,
          "kind",
          proposal.kind,
          selection.strings.proposalKindFallback,
        )} · ${
          registryLocalizedValue(t, proposal.status) ||
          proposal.status ||
          t("synthesis-status-unknown")
        }`;
        const proposalMeta = `${
          proposal.sourceTitle || t("synthesis-column-source")
        } -> ${proposal.targetTitle || t("synthesis-column-target")}`;
        return (
          <div
            key={index}
            class="canonical-readable-block"
            title={`${proposalTitle}\n${proposalMeta}`}
          >
            <strong title={proposalTitle}>{proposalTitle}</strong>
            <span class="muted" title={proposalMeta}>
              {proposalMeta}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CanonicalRawReferenceList(props: {
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
}) {
  const { t, row } = props;
  const refs = row.rawReferenceSamples;
  if (!refs.length) {
    return (
      <span class="muted">{t("synthesis-canonical-no-raw-references")}</span>
    );
  }
  return (
    <div class="canonical-readable-list">
      {refs.slice(0, 10).map((ref, index) => {
        const title = ref.title || t("synthesis-reference-untitled");
        const meta = [
          ref.year,
          ref.sourceRef,
          ref.referenceIndex ? `#${ref.referenceIndex}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div
            key={index}
            class="canonical-readable-block"
            title={ref.rawReference || ref.title || title}
          >
            <strong title={ref.title}>{title}</strong>
            <span class="muted" title={meta}>
              {meta}
            </span>
            {ref.rawReference && ref.rawReference !== ref.title ? (
              <span class="muted" title={ref.rawReference}>
                {ref.rawReference}
              </span>
            ) : null}
          </div>
        );
      })}
      {(row.rawReferenceCount || 0) > refs.length ? (
        <span class="muted">
          {t("synthesis-canonical-more-raw-references", {
            count: (row.rawReferenceCount || 0) - refs.length,
          })}
        </span>
      ) : null}
    </div>
  );
}

function CanonicalDetailSection(props: {
  title: string;
  children: preact.ComponentChildren;
}) {
  return (
    <section class="canonical-detail-section">
      <h3>{props.title}</h3>
      {props.children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Edit drawer
// ---------------------------------------------------------------------------

function CanonicalEditTextField(props: {
  label: string;
  value: string;
  readOnly?: boolean;
  onInput?: (value: string) => void;
}) {
  return (
    <label class="canonical-edit-field">
      <span class="muted">{props.label}</span>
      <input
        value={props.value}
        disabled={!!props.readOnly}
        onInput={(event) => props.onInput?.(event.currentTarget.value)}
      />
    </label>
  );
}

function CanonicalEditAuthorsField(props: {
  t: SynthesisRegistryText;
  value: string;
  readOnly?: boolean;
  onInput?: (value: string) => void;
}) {
  const { t } = props;
  return (
    <label class="canonical-edit-field">
      <span class="muted">{t("synthesis-field-authors")}</span>
      <textarea
        rows={4}
        value={props.value}
        disabled={!!props.readOnly}
        placeholder={t("synthesis-placeholder-one-author-per-line")}
        onInput={(event) => props.onInput?.(event.currentTarget.value)}
      />
    </label>
  );
}

function CanonicalEditIdentifierRows(props: {
  t: SynthesisRegistryText;
  draft: SynthesisCanonicalEditDraft;
  readOnly?: boolean;
  onChange?: (identifiers: SynthesisRegistryIdentifierView[]) => void;
}) {
  const { t, draft, readOnly } = props;
  const rows = draft.identifiers.length
    ? draft.identifiers
    : [{ kind: "", value: "" }];
  return (
    <div class="canonical-edit-identifiers">
      {rows.map((identifier, index) => (
        <div key={index} class="canonical-edit-identifier-row">
          <input
            value={identifier.kind}
            placeholder={t("synthesis-column-kind")}
            disabled={!!readOnly}
            onInput={(event) => {
              const next = rows.map((entry, rowIndex) =>
                rowIndex === index
                  ? { kind: event.currentTarget.value, value: entry.value }
                  : { ...entry },
              );
              props.onChange?.(next);
            }}
          />
          <input
            value={identifier.value}
            placeholder={t("synthesis-field-value")}
            disabled={!!readOnly}
            onInput={(event) => {
              const next = rows.map((entry, rowIndex) =>
                rowIndex === index
                  ? { kind: entry.kind, value: event.currentTarget.value }
                  : { ...entry },
              );
              props.onChange?.(next);
            }}
          />
          {!readOnly ? (
            <RegistryActionButton
              t={t}
              label={t("synthesis-action-remove")}
              disabled={draft.identifiers.length === 0}
              onClick={() =>
                props.onChange?.(
                  draft.identifiers.filter((_, rowIndex) => rowIndex !== index),
                )
              }
            />
          ) : null}
        </div>
      ))}
      {!readOnly ? (
        <RegistryActionButton
          t={t}
          label={t("synthesis-action-add-identifier")}
          onClick={() =>
            props.onChange?.([...draft.identifiers, { kind: "", value: "" }])
          }
        />
      ) : null}
    </div>
  );
}

function CanonicalEditFields(props: {
  t: SynthesisRegistryText;
  draft: SynthesisCanonicalEditDraft;
  readOnly?: boolean;
  onChange?: (draft: SynthesisCanonicalEditDraft) => void;
}) {
  const { t, draft, readOnly } = props;
  return (
    <div class="canonical-edit-fields">
      <CanonicalEditTextField
        label={t("synthesis-column-title")}
        value={draft.title}
        readOnly={readOnly}
        onInput={(title) => props.onChange?.({ ...draft, title })}
      />
      <CanonicalEditTextField
        label={t("synthesis-column-year")}
        value={draft.year}
        readOnly={readOnly}
        onInput={(year) => props.onChange?.({ ...draft, year })}
      />
      <CanonicalEditAuthorsField
        t={t}
        value={draft.authorsText}
        readOnly={readOnly}
        onInput={(authorsText) => props.onChange?.({ ...draft, authorsText })}
      />
      <div class="canonical-edit-label">
        <span class="muted">{t("synthesis-field-identifiers")}</span>
      </div>
      <CanonicalEditIdentifierRows
        t={t}
        draft={draft}
        readOnly={readOnly}
        onChange={(identifiers) => props.onChange?.({ ...draft, identifiers })}
      />
    </div>
  );
}

function CanonicalEditDrawer(props: {
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
  collapsed: boolean;
  draft: SynthesisCanonicalEditDraft;
  compareIndex: number;
  onToggleCollapsed: () => void;
  onChangeDraft: (draft: SynthesisCanonicalEditDraft) => void;
  onSave: () => void;
  onRevert: () => void;
  onCompareIndex: (index: number) => void;
  onCopyToDraft: (source: SynthesisCanonicalDraftSource) => void;
}) {
  const { t, row, draft } = props;
  const compareSources = row.incomingRedirects.map((redirect) => redirect.from);
  const currentIndex = Math.min(
    Math.max(0, props.compareIndex),
    Math.max(0, compareSources.length - 1),
  );
  const compareSource = compareSources[currentIndex];
  const dirty = canonicalEditDraftIsDirty(row, draft);
  return (
    <section
      class={`index-review-drawer canonical-detail-drawer canonical-edit-drawer ${
        props.collapsed ? "is-collapsed" : "is-open"
      }`}
    >
      <div class="review-card-header">
        <div class="canonical-detail-title">
          <strong>{t("synthesis-canonical-edit-title")}</strong>
          <span class="muted">
            {row.title || t("synthesis-canonical-untitled")}
          </span>
        </div>
        <div class="canonical-detail-tabs segmented-control">
          <span class="canonical-edit-mode-label">
            {t("synthesis-canonical-metadata-editor")}
          </span>
        </div>
        <div class="canonical-detail-header-actions">
          {dirty ? (
            <RegistryBadge
              t={t}
              text={t("synthesis-status-unsaved")}
              tone="warn"
            />
          ) : null}
          <RegistryActionButton
            t={t}
            label={
              props.collapsed
                ? t("synthesis-action-expand")
                : t("synthesis-action-collapse")
            }
            onClick={() => props.onToggleCollapsed()}
          />
        </div>
      </div>
      {props.collapsed ? null : (
        <div class="canonical-edit-body">
          <CanonicalDetailSection title={t("synthesis-canonical-current")}>
            <div class="canonical-edit-panel">
              <CanonicalEditFields
                t={t}
                draft={draft}
                onChange={(next) => props.onChangeDraft(next)}
              />
              <div class="canonical-edit-actions">
                <RegistryActionButton
                  t={t}
                  label={t("synthesis-action-save")}
                  disabled={!dirty}
                  onClick={() => props.onSave()}
                />
                <RegistryActionButton
                  t={t}
                  label={t("synthesis-action-revert")}
                  onClick={() => props.onRevert()}
                />
              </div>
            </div>
          </CanonicalDetailSection>
          <CanonicalDetailSection title={t("synthesis-canonical-pointing")}>
            <div class="canonical-edit-panel canonical-edit-compare-panel">
              <div class="canonical-edit-compare-nav">
                <span class="muted">
                  {compareSources.length
                    ? `${currentIndex + 1} / ${compareSources.length}`
                    : t("synthesis-canonical-no-incoming-redirect-source")}
                </span>
                <RegistryActionButton
                  t={t}
                  label="↑"
                  disabled={currentIndex <= 0}
                  onClick={() => props.onCompareIndex(currentIndex - 1)}
                />
                <RegistryActionButton
                  t={t}
                  label="↓"
                  disabled={currentIndex >= compareSources.length - 1}
                  onClick={() => props.onCompareIndex(currentIndex + 1)}
                />
                <RegistryActionButton
                  t={t}
                  label={t("synthesis-action-copy-to-draft")}
                  disabled={!compareSource}
                  onClick={() =>
                    compareSource && props.onCopyToDraft(compareSource)
                  }
                />
              </div>
              {compareSource ? (
                <CanonicalEditFields
                  t={t}
                  draft={canonicalEditDraftFromRecord(compareSource)}
                  readOnly
                />
              ) : (
                <RegistryEmptyState
                  title={t("synthesis-canonical-no-source")}
                  message={t("synthesis-canonical-no-source-message")}
                  tone="info"
                />
              )}
            </div>
          </CanonicalDetailSection>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Detail drawer (read-only)
// ---------------------------------------------------------------------------

function CanonicalDetailDrawer(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  row: SynthesisCanonicalRowView;
  collapsed: boolean;
  tab: "overview" | "redirects" | "reviews";
  onToggleCollapsed: () => void;
  onSelectTab: (tab: "overview" | "redirects" | "reviews") => void;
}) {
  const { selection, t, row, collapsed, tab } = props;
  return (
    <section
      class={`index-review-drawer canonical-detail-drawer ${
        collapsed ? "is-collapsed" : "is-open"
      }`}
    >
      <div class="review-card-header">
        <div class="canonical-detail-title">
          <strong>{row.title || t("synthesis-canonical-details")}</strong>
          <span class="muted">
            {[row.year, row.authors.join(",")].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div class="canonical-detail-tabs segmented-control">
          {(
            [
              ["overview", t("synthesis-topic-tab-overview")],
              ["redirects", t("synthesis-canonical-tab-redirects")],
              ["reviews", t("synthesis-canonical-tab-reviews")],
            ] as const
          ).map(([tabId, label]) => (
            <RegistryActionButton
              key={tabId}
              t={t}
              label={label}
              active={tab === tabId}
              className={tab === tabId ? "active" : ""}
              onClick={() => props.onSelectTab(tabId)}
            />
          ))}
        </div>
        <div class="canonical-detail-header-actions">
          <RegistryBadge
            t={t}
            text={
              row.binding.itemKey
                ? t("synthesis-canonical-summary-bound")
                : t("synthesis-canonical-summary-external")
            }
            tone={row.binding.itemKey ? "ok" : "muted"}
          />
          <RegistryActionButton
            t={t}
            label={
              collapsed
                ? t("synthesis-action-expand")
                : t("synthesis-action-collapse")
            }
            onClick={() => props.onToggleCollapsed()}
          />
        </div>
      </div>
      {collapsed ? null : (
        <div class={`canonical-detail-body canonical-detail-body-${tab}`}>
          {tab === "redirects" ? (
            <CanonicalDetailSection
              title={t("synthesis-canonical-pointing-here", {
                count: String(row.incomingRedirectCount ?? 0),
              })}
            >
              <CanonicalRedirectList
                t={t}
                rows={row.incomingRedirects}
                empty={t("synthesis-canonical-no-redirects-here")}
              />
            </CanonicalDetailSection>
          ) : null}
          {tab === "redirects" ? (
            <CanonicalDetailSection
              title={t("synthesis-canonical-raw-references")}
            >
              <CanonicalRawReferenceList t={t} row={row} />
            </CanonicalDetailSection>
          ) : null}
          {tab === "reviews" ? (
            <CanonicalDetailSection
              title={t("synthesis-canonical-related-proposals", {
                count: String(row.proposalCount ?? 0),
              })}
            >
              <CanonicalProposalList selection={selection} t={t} row={row} />
            </CanonicalDetailSection>
          ) : null}
          {tab === "reviews" ? (
            <CanonicalDetailSection
              title={t("synthesis-canonical-possible-duplicates")}
            >
              <CanonicalDuplicatePeers t={t} row={row} />
            </CanonicalDetailSection>
          ) : null}
          {tab === "overview" ? (
            <CanonicalDetailSection title={t("synthesis-column-binding")}>
              <CanonicalBindingBlock t={t} row={row} />
            </CanonicalDetailSection>
          ) : null}
          {tab === "overview" ? (
            <CanonicalDetailSection title={t("synthesis-field-identifiers")}>
              <CanonicalIdentifierChips t={t} row={row} />
            </CanonicalDetailSection>
          ) : null}
          {tab === "overview" ? (
            <CanonicalDetailSection title={t("synthesis-canonical-signals")}>
              <div class="canonical-signal-grid">
                {(
                  [
                    [
                      t("synthesis-column-raw-refs"),
                      row.rawReferenceCount === undefined
                        ? "-"
                        : String(row.rawReferenceCount),
                    ],
                    [
                      t("synthesis-canonical-redirect-targets"),
                      String(row.incomingRedirectCount ?? 0),
                    ],
                    [
                      t("synthesis-column-graph"),
                      row.graphNodeId
                        ? t("synthesis-canonical-visible")
                        : t("synthesis-canonical-not-in-graph"),
                    ],
                    [
                      t("synthesis-column-reviews"),
                      t("synthesis-canonical-review-counts", {
                        open: String(row.openProposalCount ?? 0),
                        total: String(row.proposalCount ?? 0),
                      }),
                    ],
                  ] as Array<[string, string]>
                ).map(([label, value]) => (
                  <div key={label} class="canonical-signal-item">
                    <span class="muted">{label}</span>
                    <strong>{value || "-"}</strong>
                  </div>
                ))}
              </div>
            </CanonicalDetailSection>
          ) : null}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Workbench
// ---------------------------------------------------------------------------

export function CanonicalRevisionWorkbench(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, onAction } = props;

  const [mergeSourceRowIds, setMergeSourceRowIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [pendingMerges, setPendingMerges] = useState<PendingCanonicalMerge[]>(
    [],
  );
  const [mergeSubmission, setMergeSubmission] = useState<
    CanonicalMergeSubmission | undefined
  >(undefined);
  const [selectedRowIds, setSelectedRowIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [editOpenRowId, setEditOpenRowId] = useState<string | undefined>(
    undefined,
  );
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [detailTab, setDetailTab] = useState<
    "overview" | "redirects" | "reviews"
  >("overview");
  const [editDrafts, setEditDrafts] = useState<
    ReadonlyMap<string, SynthesisCanonicalEditDraft>
  >(new Map());
  const [compareIndices, setCompareIndices] = useState<
    ReadonlyMap<string, number>
  >(new Map());

  const allRows = selection.canonicalRows;
  const visibleBase = selection.visibleCanonicalRows.length
    ? selection.visibleCanonicalRows
    : selection.canonicalRows;
  const pendingSourceIds = useMemo(
    () =>
      new Set(pendingMerges.map((merge) => merge.sourceEffectiveCanonicalId)),
    [pendingMerges],
  );
  const rows = useMemo(
    () =>
      visibleBase.filter(
        (row) => !pendingSourceIds.has(row.effectiveCanonicalId),
      ),
    [visibleBase, pendingSourceIds],
  );

  // Legacy clearResolvedLocalPending: a completed merge submission consumes
  // the covered pending requests and clears the picking state; a failed one
  // only releases the submission so the user can retry.
  useLayoutEffect(() => {
    if (!mergeSubmission) return;
    if (
      selection.lastCompletedOperationKey &&
      selection.lastCompletedOperationKey === mergeSubmission.operationKey
    ) {
      const completed = new Set(mergeSubmission.sourceEffectiveCanonicalIds);
      setPendingMerges((current) =>
        current.filter(
          (merge) => !completed.has(merge.sourceEffectiveCanonicalId),
        ),
      );
      setSelectedRowIds(new Set());
      setMergeSourceRowIds(new Set());
      setMergeSubmission(undefined);
    } else if (
      selection.lastFailedOperationKey &&
      selection.lastFailedOperationKey === mergeSubmission.operationKey
    ) {
      setMergeSubmission(undefined);
    }
  }, [
    mergeSubmission,
    selection.lastCompletedOperationKey,
    selection.lastFailedOperationKey,
  ]);

  const applying =
    !!mergeSubmission ||
    isRegistryOperationPending(
      selection,
      "applyCanonicalRevisionMergeRequests",
    );

  const visibleRowIdSet = useMemo(
    () => new Set(rows.map((row) => row.rowId).filter(Boolean)),
    [rows],
  );
  const selectedVisibleIds = useMemo(
    () =>
      Array.from(selectedRowIds).filter((rowId) => visibleRowIdSet.has(rowId)),
    [selectedRowIds, visibleRowIdSet],
  );
  // Prune selections that fell out of the visible row set (legacy
  // selectedVisibleCanonicalRowIds mutation).
  useLayoutEffect(() => {
    if (selectedVisibleIds.length !== selectedRowIds.size) {
      setSelectedRowIds(new Set(selectedVisibleIds));
    }
  }, [selectedVisibleIds, selectedRowIds]);

  const selectedRow =
    allRows.find(
      (row) => row.rowId === selection.filters.selectedCanonicalRowId,
    ) || rows[0];

  const boundCount = allRows.filter((row) => row.binding.itemKey).length;
  const duplicateCount = allRows.filter(
    (row) => row.possibleDuplicateGroup,
  ).length;
  const blockedCount = allRows.filter(
    (row) =>
      !row.actionAvailability.merge.allowed &&
      !row.actionAvailability.edit.allowed &&
      !row.actionAvailability.archive.allowed,
  ).length;

  const setMergeSources = (rowIds: string[]) => {
    setMergeSourceRowIds(new Set(rowIds.filter(Boolean)));
  };

  const queueMergeTarget = (target: SynthesisCanonicalRowView) => {
    const targetId = target.effectiveCanonicalId;
    if (!targetId) return;
    const additions: PendingCanonicalMerge[] = [];
    mergeSourceRowIds.forEach((sourceRowId) => {
      const source = allRows.find((row) => row.rowId === sourceRowId);
      if (!source) return;
      const sourceId = source.effectiveCanonicalId;
      if (!sourceId || sourceId === targetId) return;
      additions.push({
        key: `${sourceId}->${targetId}`,
        sourceEffectiveCanonicalId: sourceId,
        targetEffectiveCanonicalId: targetId,
        sourceTitle: source.title || sourceId,
        targetTitle: target.title || targetId,
      });
    });
    if (additions.length) {
      setPendingMerges((current) => {
        const next = [...current];
        for (const addition of additions) {
          const index = next.findIndex((merge) => merge.key === addition.key);
          if (index >= 0) {
            next[index] = addition;
          } else {
            next.push(addition);
          }
        }
        return next;
      });
    }
    setMergeSourceRowIds(new Set());
    setSelectedRowIds(new Set());
  };

  const applyPendingMerges = () => {
    const requests = pendingMerges.map((merge) => ({
      sourceEffectiveCanonicalId: merge.sourceEffectiveCanonicalId,
      targetEffectiveCanonicalId: merge.targetEffectiveCanonicalId,
    }));
    if (!requests.length) return;
    setMergeSubmission({
      operationKey: registryOperationKey("applyCanonicalRevisionMergeRequests"),
      sourceEffectiveCanonicalIds: requests.map(
        (request) => request.sourceEffectiveCanonicalId,
      ),
    });
    setMergeSourceRowIds(new Set());
    setSelectedRowIds(new Set());
    onAction("hostCommand", {
      command: "applyCanonicalRevisionMergeRequests",
      args: { requests },
    });
  };

  const clearPendingMerges = () => {
    if (mergeSubmission) return;
    setPendingMerges([]);
    setMergeSourceRowIds(new Set());
  };

  const toggleEdit = (row: SynthesisCanonicalRowView) => {
    if (!row.rowId) return;
    onAction("setFilters", {
      registry: { selectedCanonicalRowId: row.rowId },
    });
    const opening = editOpenRowId !== row.rowId;
    setEditOpenRowId(opening ? row.rowId : undefined);
    if (opening) {
      setDetailCollapsed(false);
    }
  };

  const draftForRow = (row: SynthesisCanonicalRowView) =>
    editDrafts.get(row.rowId) || canonicalEditDraftFromRecord(row);

  const setDraft = (rowId: string, draft: SynthesisCanonicalEditDraft) => {
    setEditDrafts((current) => new Map(current).set(rowId, draft));
  };

  const clearDraft = (rowId: string) => {
    setEditDrafts((current) => {
      const next = new Map(current);
      next.delete(rowId);
      return next;
    });
  };

  const selectedRowIdForTable =
    selection.filters.selectedCanonicalRowId || rows[0]?.rowId || "";

  return (
    <div class="canonical-revision-workbench">
      <div class="canonical-revision-header">
        <div class="canonical-revision-title">
          <strong>{t("synthesis-canonical-revise-title")}</strong>
          <span class="muted">{t("synthesis-canonical-revise-subtitle")}</span>
        </div>
        <div class="canonical-summary-strip">
          {(
            [
              [
                `${rows.length}/${allRows.length}`,
                t("synthesis-canonical-summary-shown"),
              ],
              [`${allRows.length}`, t("synthesis-canonical-summary-effective")],
              [`${boundCount}`, t("synthesis-canonical-summary-bound")],
              [
                `${Math.max(0, allRows.length - boundCount)}`,
                t("synthesis-canonical-summary-external"),
              ],
              [
                `${duplicateCount}`,
                t("synthesis-canonical-summary-possible-dupes"),
              ],
              [`${blockedCount}`, t("synthesis-canonical-summary-blocked")],
              [
                registryLocalizedValue(t, selection.cacheStatus || "missing"),
                t("synthesis-canonical-summary-sidecar"),
              ],
            ] as Array<[string, string]>
          ).map(([value, label]) => (
            <div key={label} class="canonical-summary-item">
              <strong>{value}</strong>
              <span class="muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div class="filters canonical-filters">
        <RegistryFilterInput
          value={selection.filters.canonicalSearch}
          placeholder={t("synthesis-canonical-search")}
          onValue={(canonicalSearch) =>
            onAction("setFilters", { registry: { canonicalSearch } })
          }
        />
        <RegistrySelect
          options={[
            [
              "all",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "status",
                "all",
              ),
            ],
            [
              "bound",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-binding",
                "binding-status",
                "accepted",
              ),
            ],
            [
              "external",
              `${t("synthesis-filter-binding")}: ${t(
                "synthesis-canonical-summary-external",
              )}`,
            ],
          ]}
          value={selection.filters.canonicalBinding || "all"}
          onChange={(value) =>
            onAction("setFilters", {
              registry: {
                canonicalBinding:
                  value as SynthesisRegistrySelection["filters"]["canonicalBinding"],
              },
            })
          }
        />
        <RegistrySelect
          options={[
            [
              "all",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-graph",
                "status",
                "all",
              ),
            ],
            [
              "visible",
              `${t("synthesis-filter-graph")}: ${t(
                "synthesis-canonical-visible",
              )}`,
            ],
            [
              "not_in_graph",
              `${t("synthesis-filter-graph")}: ${t(
                "synthesis-canonical-not-in-graph",
              )}`,
            ],
          ]}
          value={selection.filters.canonicalGraph || "all"}
          onChange={(value) =>
            onAction("setFilters", {
              registry: {
                canonicalGraph:
                  value as SynthesisRegistrySelection["filters"]["canonicalGraph"],
              },
            })
          }
        />
        <RegistrySelect
          options={[
            [
              "all",
              registryFilterOptionLabel(
                t,
                "synthesis-filter-duplicates",
                "status",
                "all",
              ),
            ],
            [
              "possible_duplicate",
              `${t("synthesis-filter-duplicates")}: ${t(
                "synthesis-canonical-summary-possible-dupes",
              )}`,
            ],
          ]}
          value={selection.filters.canonicalDuplicates || "all"}
          onChange={(value) =>
            onAction("setFilters", {
              registry: {
                canonicalDuplicates:
                  value as SynthesisRegistrySelection["filters"]["canonicalDuplicates"],
              },
            })
          }
        />
        <CanonicalMergeBar
          selection={selection}
          t={t}
          selectedIds={selectedVisibleIds}
          mergeSourceRowIds={mergeSourceRowIds}
          pendingMerges={pendingMerges}
          applying={applying}
          onMergeSelected={(rowIds) => setMergeSources(rowIds)}
          onCancelTargetPicking={() => {
            if (mergeSourceRowIds.size) setMergeSourceRowIds(new Set());
          }}
          onApplyPending={applyPendingMerges}
          onClearPending={clearPendingMerges}
        />
      </div>
      <div class="canonical-revision-layout">
        <CanonicalRevisionTable
          selection={selection}
          t={t}
          rows={rows}
          selectedRowId={selectedRowIdForTable}
          selectedRowIds={selectedRowIds}
          mergeSourceRowIds={mergeSourceRowIds}
          editOpenRowId={editOpenRowId}
          editDrafts={editDrafts}
          onSelectRow={(rowId) =>
            onAction("setFilters", {
              registry: { selectedCanonicalRowId: rowId },
            })
          }
          onToggleRowChecked={(rowId, checked) => {
            if (!rowId) return;
            setSelectedRowIds((current) => {
              const next = new Set(current);
              if (checked) {
                next.add(rowId);
              } else {
                next.delete(rowId);
              }
              return next;
            });
          }}
          onToggleAll={(checked) =>
            setSelectedRowIds((current) => {
              const next = new Set(current);
              rows.forEach((row) => {
                if (!row.rowId) return;
                if (checked) {
                  next.add(row.rowId);
                } else {
                  next.delete(row.rowId);
                }
              });
              return next;
            })
          }
          onPickMergeTarget={queueMergeTarget}
          onStartMergeSource={(rowId) => setMergeSources([rowId])}
          onToggleEdit={toggleEdit}
          onAction={onAction}
        />
        {selectedRow ? (
          editOpenRowId === selectedRow.rowId ? (
            <CanonicalEditDrawer
              t={t}
              row={selectedRow}
              collapsed={detailCollapsed}
              draft={draftForRow(selectedRow)}
              compareIndex={compareIndices.get(selectedRow.rowId) || 0}
              onToggleCollapsed={() => setDetailCollapsed((value) => !value)}
              onChangeDraft={(draft) => setDraft(selectedRow.rowId, draft)}
              onSave={() => {
                onAction("hostCommand", {
                  command: "updateCanonicalReferenceMetadata",
                  args: {
                    canonicalReferenceId: selectedRow.effectiveCanonicalId,
                    patch: canonicalEditPatch(draftForRow(selectedRow)),
                  },
                });
                clearDraft(selectedRow.rowId);
                setEditOpenRowId(undefined);
              }}
              onRevert={() => clearDraft(selectedRow.rowId)}
              onCompareIndex={(index) =>
                setCompareIndices((current) =>
                  new Map(current).set(selectedRow.rowId, index),
                )
              }
              onCopyToDraft={(source) =>
                setDraft(
                  selectedRow.rowId,
                  canonicalEditDraftFromRecord(source),
                )
              }
            />
          ) : (
            <CanonicalDetailDrawer
              selection={selection}
              t={t}
              row={selectedRow}
              collapsed={detailCollapsed}
              tab={detailTab}
              onToggleCollapsed={() => setDetailCollapsed((value) => !value)}
              onSelectTab={(tabId) => setDetailTab(tabId)}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
