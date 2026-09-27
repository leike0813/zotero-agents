/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useMemo } from "preact/hooks";

import { literatureScoreToStars } from "../../../shared/literatureScore";
import {
  fillRegistryTemplate,
  isRegistryOperationPending,
  registryHasArtifact,
  registryReferenceDisplayId,
  registryReferenceDisplayIndex,
  registryReferencePrimaryTitle,
  registryReferencedEntries,
  registryStatusTone,
  registryToneFor,
  type SynthesisRegistryActionSender,
  type SynthesisRegistryReferenceView,
  type SynthesisRegistryRowView,
  type SynthesisRegistrySelection,
  type SynthesisRegistryText,
} from "./registryTypes";
import {
  RegistryActionButton,
  RegistryBadge,
  RegistryEmptyState,
} from "./controls";
import { useWindowedRows, WindowedTableSpacer } from "../windowedRows";

// Index tables of the registry surface: the library/all scope parent table
// with expandable reference rows, and the referenced-only flat table. Both
// use the shared measured window because row counts are unbounded.
// Ported from src/synthesisWorkbenchApp.ts :7684-8236.

const REGISTRY_ARTIFACT_BADGES = [
  ["digest", "icon_artifact_digest.svg"],
  ["references", "icon_artifact_references.svg"],
  ["citation_analysis", "icon_artifact_citation_analysis.svg"],
  ["literature_score", "icon_artifact_literature_score.svg"],
] as const;

function artifactTitleFor(
  selection: SynthesisRegistrySelection,
  artifact: (typeof REGISTRY_ARTIFACT_BADGES)[number][0],
): string {
  const strings = selection.strings;
  switch (artifact) {
    case "digest":
      return strings.artifactDigestTitle;
    case "references":
      return strings.artifactReferencesTitle;
    case "citation_analysis":
      return strings.artifactCitationAnalysisTitle;
    default:
      return strings.artifactLiteratureScoreTitle;
  }
}

function RegistryArtifacts(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  row: SynthesisRegistryRowView;
}) {
  const { selection, t, row } = props;
  return (
    <div class="registry-artifact-badges">
      {REGISTRY_ARTIFACT_BADGES.map(([artifact, icon]) => {
        const available = registryHasArtifact(row, artifact);
        const title = `${artifactTitleFor(selection, artifact)}: ${
          available
            ? selection.strings.availableLabel
            : t("synthesis-status-missing")
        }`;
        return (
          <span
            key={artifact}
            class={`registry-artifact-icon-shell ${
              available ? "available" : "missing"
            }`}
            title={title}
            aria-label={title}
          >
            <img
              class="registry-artifact-icon"
              src={`../icons/${icon}`}
              alt=""
              aria-hidden="true"
            />
          </span>
        );
      })}
    </div>
  );
}

function RegistryRating(props: {
  t: SynthesisRegistryText;
  row: SynthesisRegistryRowView;
}) {
  const { t, row } = props;
  const score = row.ratingScore;
  const missing =
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100;
  const rating = missing ? null : literatureScoreToStars(score as number);
  const label = missing
    ? t("synthesis-rating-unavailable")
    : t("synthesis-rating-value", {
        score,
        stars: rating?.rating || 0,
      });
  const fills = missing ? [1, 1, 1, 1, 1] : rating!.fills;
  return (
    <span
      class={`registry-rating ${missing ? "is-missing" : ""}`}
      title={label}
      aria-label={label}
    >
      {fills.map((fill, index) => (
        <span key={index} class="registry-rating-star" aria-hidden="true">
          <span class="registry-rating-star-empty">{missing ? "★" : "☆"}</span>
          {!missing && fill > 0 ? (
            <span
              class="registry-rating-star-fill"
              style={{ width: `${fill * 100}%` }}
            >
              ★
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

function RegistryHeader(props: {
  label: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <th class={props.className || ""}>
      <span class="registry-column-header-label">{props.label}</span>
      {props.subtitle ? (
        <span class="registry-column-header-subtitle">{props.subtitle}</span>
      ) : null}
    </th>
  );
}

function RegistryColgroup(props: { columns: string[] }) {
  return (
    <colgroup>
      {props.columns.map((column) => (
        <col key={column} class={`registry-col-${column}`} />
      ))}
    </colgroup>
  );
}

function RegistryReferenceSummary(props: { row: SynthesisRegistryRowView }) {
  const safeTotal = Math.max(0, Math.floor(props.row.referenceCount));
  const safeUnbound = Math.max(0, Math.floor(props.row.unboundReferenceCount));
  return (
    <span class="registry-reference-count">{`${safeTotal}/${safeUnbound}`}</span>
  );
}

function RegistryRowActions(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  row: SynthesisRegistryRowView;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, row, onAction } = props;
  if (!row.libraryId || !row.itemKey) {
    return <span>-</span>;
  }
  const analyzeArgs = {
    libraryId: row.libraryId,
    itemKey: row.itemKey,
    workflowId: "literature-analysis",
  };
  const regulateArgs = {
    libraryId: row.libraryId,
    itemKey: row.itemKey,
    workflowId: "tag-regulator",
  };
  return (
    <div class="registry-row-actions">
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-analyze")}
        disabled={row.artifactCoverage === "complete"}
        pending={isRegistryOperationPending(
          selection,
          "runRegistryItemWorkflow",
          analyzeArgs,
        )}
        pendingCommand="runRegistryItemWorkflow"
        onClick={() =>
          onAction("hostCommand", {
            command: "runRegistryItemWorkflow",
            args: analyzeArgs,
          })
        }
      />
      <RegistryActionButton
        t={t}
        label={t("synthesis-action-regulate-tags")}
        disabled={row.needsTagRegulation !== true}
        pending={isRegistryOperationPending(
          selection,
          "runRegistryItemWorkflow",
          regulateArgs,
        )}
        pendingCommand="runRegistryItemWorkflow"
        onClick={() =>
          onAction("hostCommand", {
            command: "runRegistryItemWorkflow",
            args: regulateArgs,
          })
        }
      />
    </div>
  );
}

function RegistryTitleCell(props: {
  selection: SynthesisRegistrySelection;
  row: SynthesisRegistryRowView;
  expanded: boolean;
  onToggle: (row: SynthesisRegistryRowView) => void;
}) {
  const { selection, row, expanded } = props;
  const referenceCount = Math.max(
    row.references.length,
    Math.floor(row.referenceCount || 0),
  );
  if (referenceCount <= 0 || row.indexScope === "referenced") {
    return <span>{row.title}</span>;
  }
  const loading = expanded && !row.references.length;
  return (
    <div class="registry-reference-title-cell">
      <button
        type="button"
        class="registry-reference-disclosure"
        aria-expanded={expanded ? "true" : "false"}
        aria-label={
          expanded
            ? selection.strings.collapseReferencesLabel
            : selection.strings.expandReferencesLabel
        }
        onClick={(event) => {
          event.stopPropagation();
          props.onToggle(row);
        }}
      >
        {expanded ? "-" : "+"}
      </button>
      <span class="registry-reference-parent-title">{row.title}</span>
      <span class="registry-reference-muted">
        {loading
          ? selection.strings.loadingReferencesLabel
          : fillRegistryTemplate(selection.strings.referenceCountTemplate, {
              count: referenceCount,
            })}
      </span>
    </div>
  );
}

function ReferenceTitleCell(props: {
  t: SynthesisRegistryText;
  reference: SynthesisRegistryReferenceView;
}) {
  const { t, reference } = props;
  const index = registryReferenceDisplayIndex(reference);
  return (
    <div class="registry-reference-title-cell is-child">
      <span class="registry-reference-child-marker" />
      <span class="registry-reference-primary">
        {registryReferencePrimaryTitle(
          reference,
          t("synthesis-reference-untitled"),
        )}
      </span>
      {index ? <span class="registry-reference-muted">{index}</span> : null}
    </div>
  );
}

function ReferenceStatusCell(props: {
  t: SynthesisRegistryText;
  reference: SynthesisRegistryReferenceView;
}) {
  const status = props.reference.bindingStatus || "unbound";
  return (
    <span class="tag-row">
      <RegistryBadge
        t={props.t}
        text={status}
        tone={registryStatusTone(status)}
      />
    </span>
  );
}

function RegistryReferenceRow(props: {
  t: SynthesisRegistryText;
  reference: SynthesisRegistryReferenceView;
  windowKey?: string;
  rowRef?: (node: HTMLTableRowElement | null) => void;
}) {
  const { t, reference } = props;
  return (
    <tr
      class="registry-reference-row"
      data-windowed-row-key={props.windowKey}
      ref={props.rowRef}
    >
      <td>
        <ReferenceTitleCell t={t} reference={reference} />
      </td>
      <td class="registry-center-cell">{reference.year || "-"}</td>
      <td>-</td>
      <td class="registry-artifacts-cell">-</td>
      <td class="registry-center-cell">
        <ReferenceStatusCell t={t} reference={reference} />
      </td>
      <td class="registry-references-cell" />
      <td>{registryReferenceDisplayId(reference)}</td>
      <td class="registry-actions-cell">-</td>
    </tr>
  );
}

function RegistryParentRow(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  row: SynthesisRegistryRowView;
  expanded: boolean;
  onToggle: (row: SynthesisRegistryRowView) => void;
  onAction: SynthesisRegistryActionSender;
  windowKey?: string;
  rowRef?: (node: HTMLTableRowElement | null) => void;
}) {
  const { selection, t, row, expanded } = props;
  return (
    <tr
      class="registry-parent-row"
      data-windowed-row-key={props.windowKey}
      ref={props.rowRef}
    >
      <td>
        <RegistryTitleCell
          selection={selection}
          row={row}
          expanded={expanded}
          onToggle={props.onToggle}
        />
      </td>
      <td class="registry-center-cell">{row.year || "-"}</td>
      <td class="registry-center-cell">
        <RegistryBadge
          t={t}
          text={row.artifactCoverage}
          tone={registryToneFor(row.artifactCoverage)}
        />
      </td>
      <td class="registry-artifacts-cell">
        <RegistryArtifacts selection={selection} t={t} row={row} />
      </td>
      <td class="registry-rating-cell">
        <RegistryRating t={t} row={row} />
      </td>
      <td class="registry-center-cell">
        <RegistryBadge t={t} text={row.indexScope || "library"} tone="ok" />
      </td>
      <td class="registry-references-cell">
        <RegistryReferenceSummary row={row} />
      </td>
      <td>{row.displayId}</td>
      <td class="registry-actions-cell">
        <RegistryRowActions
          selection={selection}
          t={t}
          row={row}
          onAction={props.onAction}
        />
      </td>
    </tr>
  );
}

function registryRefreshAction(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
}) {
  return (
    <RegistryActionButton
      t={props.t}
      label={props.t("synthesis-action-refresh")}
      pending={isRegistryOperationPending(
        props.selection,
        "refreshReferenceSidecarNow",
      )}
      pendingCommand="refreshReferenceSidecarNow"
      onClick={() =>
        props.onAction("hostCommand", {
          command: "refreshReferenceSidecarNow",
        })
      }
    />
  );
}

/** Legacy renderRegistryTable: parent rows plus expanded reference rows. */
export function RegistryIndexTable(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  expandedRowKeys: ReadonlySet<string>;
  onToggleRow: (row: SynthesisRegistryRowView) => void;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, expandedRowKeys, onToggleRow, onAction } = props;
  const rows = selection.visibleRows;
  const resetKey = [
    selection.filters.scope,
    selection.filters.search,
    selection.filters.artifactCoverage,
    rows.length,
    rows[0]?.key || "",
  ].join("|");
  const windowed = useWindowedRows(rows, {
    getKey: (row) => row.key,
    resetKey,
    estimatedRowHeight: 72,
    overscanPx: 520,
  });
  if (!rows.length) {
    return (
      <RegistryEmptyState
        title={
          selection.rows.length
            ? selection.strings.indexEmptyFilteredTitle
            : selection.strings.indexEmptyTitle
        }
        message={
          selection.rows.length
            ? selection.strings.indexEmptyFilteredMessage
            : selection.strings.indexEmptyMessage
        }
        tone={selection.rows.length ? "default" : "info"}
        action={registryRefreshAction({ selection, t, onAction })}
      />
    );
  }
  return (
    <div
      class="table-wrap registry-table-wrap"
      data-synthesis-scroll-key="registry.table"
      ref={windowed.scrollRef}
      onScroll={(event) => windowed.onScroll(event)}
      onFocusIn={(event) => windowed.onFocusIn(event)}
    >
      <table class="registry-table">
        <RegistryColgroup
          columns={[
            "title",
            "year",
            "coverage",
            "artifacts",
            "rating",
            "status",
            "references",
            "id",
            "actions",
          ]}
        />
        <thead>
          <tr>
            <RegistryHeader label={t("synthesis-column-title")} />
            <RegistryHeader label={t("synthesis-column-year")} />
            <RegistryHeader label={t("synthesis-filter-coverage")} />
            <RegistryHeader
              label={t("synthesis-column-artifacts")}
              className="registry-artifacts-header"
            />
            <RegistryHeader
              label={t("synthesis-column-rating")}
              className="registry-rating-header"
            />
            <RegistryHeader label={t("synthesis-column-status")} />
            <RegistryHeader
              label={t("synthesis-topic-tab-references")}
              subtitle={selection.strings.referencesSubtitle}
              className="registry-references-header"
            />
            <RegistryHeader label={selection.strings.idColumnLabel} />
            <RegistryHeader
              label={t("synthesis-column-actions")}
              className="registry-actions-header"
            />
          </tr>
        </thead>
        <tbody>
          <WindowedTableSpacer height={windowed.topSpacerHeight} colSpan={9} />
          {windowed.visibleRows.map(({ item: row, index: rowIndex, key }) => {
            const expanded =
              !!row.key &&
              expandedRowKeys.has(row.key) &&
              row.indexScope !== "referenced";
            return [
              <RegistryParentRow
                key={row.key || `row-${rowIndex}`}
                selection={selection}
                t={t}
                row={row}
                expanded={expanded}
                onToggle={onToggleRow}
                onAction={onAction}
                windowKey={key}
                rowRef={(node) => windowed.measureRow(key, node)}
              />,
              ...(expanded
                ? row.references.map((reference, index) => (
                    <RegistryReferenceRow
                      key={`${row.key}#ref-${
                        reference.referenceInstanceId || index
                      }`}
                      t={t}
                      reference={reference}
                    />
                  ))
                : []),
              ...(windowed.middleSpacerAfter === rowIndex
                ? [
                    <WindowedTableSpacer
                      key={`${key}-middle-spacer`}
                      height={windowed.middleSpacerHeight}
                      colSpan={9}
                    />,
                  ]
                : []),
            ];
          })}
          <WindowedTableSpacer
            height={windowed.bottomSpacerHeight}
            colSpan={9}
          />
        </tbody>
      </table>
    </div>
  );
}

function ReferencedSourceCell(props: { source: SynthesisRegistryRowView }) {
  return (
    <div class="registry-reference-title-cell">
      <span class="registry-reference-primary">{props.source.title}</span>
      <span class="registry-reference-muted">{props.source.displayId}</span>
    </div>
  );
}

/** Legacy renderReferencedOnlyTable (scope === "referenced"). */
export function RegistryReferencedOnlyTable(props: {
  selection: SynthesisRegistrySelection;
  t: SynthesisRegistryText;
  onAction: SynthesisRegistryActionSender;
}) {
  const { selection, t, onAction } = props;
  const entries = useMemo(
    () => registryReferencedEntries(selection),
    [selection],
  );
  const resetKey = [
    selection.filters.search,
    selection.filters.bindingStatus,
    entries.length,
  ].join("|");
  const windowed = useWindowedRows(entries, {
    getKey: ({ reference }) => reference.referenceInstanceId,
    resetKey,
    estimatedRowHeight: 56,
    overscanPx: 520,
  });
  if (!entries.length) {
    return (
      <RegistryEmptyState
        title={
          selection.rows.length
            ? selection.strings.referencedEmptyFilteredTitle
            : selection.strings.referencedEmptyTitle
        }
        message={
          selection.rows.length
            ? selection.strings.referencedEmptyFilteredMessage
            : selection.strings.referencedEmptyMessage
        }
        tone={selection.rows.length ? "default" : "info"}
        action={registryRefreshAction({ selection, t, onAction })}
      />
    );
  }
  return (
    <div
      class="table-wrap registry-table-wrap"
      data-synthesis-scroll-key="registry.table"
      ref={windowed.scrollRef}
      onScroll={(event) => windowed.onScroll(event)}
      onFocusIn={(event) => windowed.onFocusIn(event)}
    >
      <table class="registry-table">
        <RegistryColgroup
          columns={[
            "reference",
            "source",
            "year",
            "binding",
            "target",
            "id",
            "actions",
          ]}
        />
        <thead>
          <tr>
            <RegistryHeader label={t("synthesis-column-reference")} />
            <RegistryHeader label={t("synthesis-column-source")} />
            <RegistryHeader label={t("synthesis-column-year")} />
            <RegistryHeader label={t("synthesis-filter-binding")} />
            <RegistryHeader label={t("synthesis-column-target")} />
            <RegistryHeader label={selection.strings.idColumnLabel} />
            <RegistryHeader
              label={t("synthesis-column-actions")}
              className="registry-actions-header"
            />
          </tr>
        </thead>
        <tbody>
          <WindowedTableSpacer height={windowed.topSpacerHeight} colSpan={7} />
          {windowed.visibleRows.map(
            ({ item: { source, reference }, index, key }, visibleIndex) => [
              <tr
                key={key || reference.referenceInstanceId || `ref-${index}`}
                class="registry-reference-row"
                data-windowed-row-key={key}
                ref={(node) => windowed.measureRow(key, node)}
              >
                <td class="registry-reference-main-cell">
                  <ReferenceTitleCell t={t} reference={reference} />
                </td>
                <td class="registry-reference-source-cell">
                  <ReferencedSourceCell source={source} />
                </td>
                <td class="registry-center-cell">{reference.year || "-"}</td>
                <td class="registry-center-cell">
                  <ReferenceStatusCell t={t} reference={reference} />
                </td>
                <td class="registry-reference-target-cell">
                  {reference.targetTitle || reference.targetPaperRef || "-"}
                </td>
                <td>{registryReferenceDisplayId(reference)}</td>
                <td class="registry-actions-cell">-</td>
              </tr>,
              windowed.middleSpacerAfter === visibleIndex ? (
                <WindowedTableSpacer
                  key={`${key}-middle-spacer`}
                  height={windowed.middleSpacerHeight}
                  colSpan={7}
                />
              ) : null,
            ],
          )}
          <WindowedTableSpacer
            height={windowed.bottomSpacerHeight}
            colSpan={7}
          />
        </tbody>
      </table>
    </div>
  );
}
