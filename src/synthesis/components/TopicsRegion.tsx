/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";
import type { SynthesisWorkbenchMessageKey } from "../../shared/synthesisWorkbenchWireContract";
import {
  EMPTY_TOPIC_GRAPH_SELECTION,
  TopicGraphPanel,
  type SynthesisWorkbenchTopicGraphSelection,
} from "./TopicGraphPanel";
import {
  topicSourceMaterialsLabel,
  topicSourceMaterialsTone,
  topicToneFor,
  type SynthesisWorkbenchTopicsText,
  type TopicArtifactRowView,
} from "./topicsRegionData";
import {
  HostCommandButton,
  TopicsActionGroup,
  TopicsBadge,
  TopicsEmptyState,
  type SynthesisWorkbenchTopicsActionSender,
} from "./topicsControls";
import {
  useWindowedGridRows,
  useWindowedRows,
  WindowedGridSpacer,
  WindowedTableSpacer,
} from "./windowedRows";

// Topics surface (artifacts tab) of the synthesis workbench page: search/sort
// toolbar, graph/list/grid view switch, Create Topic / Purge Deleted host
// commands, the topic relationship graph (TopicGraphPanel), and the deleted
// artifacts note. Action names and payloads mirror the legacy implementation
// (src/synthesisWorkbenchApp.ts renderTopics :3248-3400):
//   setFilters        { artifacts: { search } | { sort } | { viewMode } }
//   setTopicGraphView { mode } | { search } | { selectedTopicId, mode }
//   hostCommand       runSynthesizeTopic / purgeDeletedTopicArtifacts /
//                     openTopicArtifact / submitTopicSynthesisUpdate /
//                     deleteTopicArtifact / acceptTopicGraphRelation /
//                     rejectTopicGraphRelation / applyTopicGraphReviewAction
//
// The selection is the region equality input and contains only this region's
// user-visible content; it excludes snapshot.generatedAt, action status
// (owned by the chrome region), and every non-artifacts/topicGraph section.

export type SynthesisWorkbenchTopicsSelection = {
  search: string;
  sort: "title" | "paper_count" | "updated_at";
  viewMode: "graph" | "list" | "grid";
  hasAnyTopics: boolean;
  rows: TopicArtifactRowView[];
  deletedCount: number;
  pendingOperationKeys: string[];
  // Projected only while the graph view is active; null in list/grid mode so
  // topic-graph changes do not invalidate the region memo.
  graph: SynthesisWorkbenchTopicGraphSelection | null;
};

type TopicsRegionProps = {
  selection: SynthesisWorkbenchTopicsSelection;
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
};

const SORT_LABEL_KEYS: Record<
  SynthesisWorkbenchTopicsSelection["sort"],
  SynthesisWorkbenchMessageKey
> = {
  title: "synthesis-column-title",
  paper_count: "synthesis-column-papers",
  updated_at: "synthesis-column-updated",
};

const SORT_OPTIONS: ReadonlyArray<SynthesisWorkbenchTopicsSelection["sort"]> = [
  "title",
  "paper_count",
  "updated_at",
];

const VIEW_MODES: ReadonlyArray<{
  mode: SynthesisWorkbenchTopicsSelection["viewMode"];
  labelKey: SynthesisWorkbenchMessageKey;
}> = [
  { mode: "graph", labelKey: "synthesis-view-graph" },
  { mode: "list", labelKey: "synthesis-view-list" },
  { mode: "grid", labelKey: "synthesis-view-grid" },
];

type RegionBodyProps = {
  rows: TopicArtifactRowView[];
  hasAnyTopics: boolean;
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
};

function topicsEmptyStateProps(
  hasAnyTopics: boolean,
  t: SynthesisWorkbenchTopicsText,
) {
  return {
    title: hasAnyTopics
      ? t("synthesis-empty-no-topic-matches")
      : t("synthesis-empty-no-topics"),
    message: hasAnyTopics
      ? t("synthesis-empty-no-topic-matches-message")
      : t("synthesis-empty-no-topics-message"),
  };
}

function CreateTopicButton(props: {
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
}) {
  return (
    <HostCommandButton
      label={props.t("synthesis-action-create-topic")}
      command="runSynthesizeTopic"
      pendingOperationKeys={props.pendingOperationKeys}
      t={props.t}
      onAction={props.onAction}
    />
  );
}

function TopicDiscoveryBadge(props: {
  count: number;
  t: SynthesisWorkbenchTopicsText;
}) {
  const count = props.count;
  if (count > 0) {
    return (
      <span
        class={`badge ${count < 5 ? "orange" : "danger"} topic-discovery-badge`}
      >
        {props.t(
          count === 1
            ? "synthesis-discovery-candidate"
            : "synthesis-discovery-candidates",
          { count },
        )}
      </span>
    );
  }
  return (
    <span class="badge ok topic-discovery-badge">
      {props.t("synthesis-discovery-none")}
    </span>
  );
}

function TopicCard(props: {
  row: TopicArtifactRowView;
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
}) {
  const { row, t, onAction } = props;
  const summary = (row.definition || row.summary || row.markdownPreview).trim();
  return (
    <button
      type="button"
      class="topic-card"
      onClick={() =>
        onAction("hostCommand", {
          command: "openTopicArtifact",
          args: { topicId: row.id },
        })
      }
    >
      <div class="topic-card-head">
        <strong>{row.title || row.id || t("synthesis-topic-untitled")}</strong>
        <TopicsBadge
          value={row.freshness}
          tone={topicToneFor(row.freshness)}
          t={t}
        />
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
        <span>{topicSourceMaterialsLabel(row, t)}</span>
        <TopicDiscoveryBadge count={row.candidateCount} t={t} />
        <span>{row.updatedAt || t("synthesis-topic-not-updated")}</span>
      </div>
    </button>
  );
}

function TopicsGrid(props: RegionBodyProps) {
  const { rows, hasAnyTopics, t } = props;
  const windowed = useWindowedGridRows(rows, {
    getKey: (row) => row.id,
    resetKey: rows.map((row) => row.id).join("|"),
    estimatedRowHeight: 220,
    overscanPx: 520,
  });
  if (rows.length === 0) {
    return (
      <div class="topic-grid panel-grid">
        <TopicsEmptyState
          tone="info"
          {...topicsEmptyStateProps(hasAnyTopics, t)}
          action={
            <CreateTopicButton
              pendingOperationKeys={props.pendingOperationKeys}
              t={t}
              onAction={props.onAction}
            />
          }
        />
      </div>
    );
  }
  return (
    <div
      class="topic-grid panel-grid"
      ref={windowed.containerRef}
      onScroll={(event) => windowed.onScroll(event)}
      onFocusIn={(event) => windowed.onFocusIn(event)}
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <WindowedGridSpacer height={windowed.topSpacerHeight} />
      {windowed.visibleRows.map(({ item: visualRow, key }, index) => [
        <div
          key={key}
          class="topic-grid-window-row"
          data-windowed-row-key={key}
          ref={(node) => windowed.measureRow(key, node)}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${windowed.columnCount}, minmax(0, 1fr))`,
            gap: "12px",
          }}
        >
          {visualRow.map((row, rowIndex) => (
            <TopicCard
              key={row.id || rowIndex}
              row={row}
              t={t}
              onAction={props.onAction}
            />
          ))}
        </div>,
        windowed.middleSpacerAfter === index ? (
          <WindowedGridSpacer
            key={`${key}-middle-spacer`}
            height={windowed.middleSpacerHeight}
          />
        ) : null,
      ])}
      <WindowedGridSpacer height={windowed.bottomSpacerHeight} />
    </div>
  );
}

const LIST_HEADERS: ReadonlyArray<{
  labelKey: SynthesisWorkbenchMessageKey;
  className: string;
}> = [
  { labelKey: "synthesis-column-title", className: "topics-list-title-cell" },
  {
    labelKey: "synthesis-column-definition",
    className: "topics-list-definition-column",
  },
  { labelKey: "synthesis-column-papers", className: "topics-list-center-cell" },
  {
    labelKey: "synthesis-column-source-materials",
    className: "topics-list-center-cell",
  },
  {
    labelKey: "synthesis-column-freshness",
    className: "topics-list-center-cell",
  },
  {
    labelKey: "synthesis-column-discovery",
    className: "topics-list-center-cell",
  },
  {
    labelKey: "synthesis-column-updated",
    className: "topics-list-center-cell",
  },
  { labelKey: "synthesis-column-action", className: "" },
];

function TopicsTable(props: RegionBodyProps) {
  const { rows, hasAnyTopics, t, onAction } = props;
  const windowed = useWindowedRows(rows, {
    getKey: (row) => row.id,
    resetKey: rows.map((row) => row.id).join("|"),
    estimatedRowHeight: 72,
    overscanPx: 480,
  });
  if (rows.length === 0) {
    return (
      <TopicsEmptyState
        tone={hasAnyTopics ? "default" : "info"}
        {...topicsEmptyStateProps(hasAnyTopics, t)}
        action={
          <CreateTopicButton
            pendingOperationKeys={props.pendingOperationKeys}
            t={t}
            onAction={onAction}
          />
        }
      />
    );
  }
  return (
    <div
      class="table-wrap"
      ref={windowed.scrollRef}
      onScroll={(event) => windowed.onScroll(event)}
      onFocusIn={(event) => windowed.onFocusIn(event)}
    >
      <table>
        <thead>
          <tr>
            {LIST_HEADERS.map((header) => (
              <th key={header.labelKey} class={header.className || undefined}>
                {t(header.labelKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <WindowedTableSpacer
            height={windowed.topSpacerHeight}
            colSpan={LIST_HEADERS.length}
          />
          {windowed.visibleRows.map(
            ({ item: row, index, key }, visibleIndex) => [
              <tr
                key={key || row.id || index}
                data-windowed-row-key={key}
                ref={(node) => windowed.measureRow(key, node)}
              >
                <td class="topics-list-title-cell">
                  <span class="topics-list-title-text">
                    {row.title || row.id || "-"}
                  </span>
                </td>
                <td class="topics-list-definition-column">
                  <span class="topics-list-definition-cell">
                    {row.definition || "-"}
                  </span>
                </td>
                <td class="topics-list-center-cell">{row.paperCount}</td>
                <td class="topics-list-center-cell">
                  <span class={`badge ${topicSourceMaterialsTone(row)}`}>
                    {topicSourceMaterialsLabel(row, t)}
                  </span>
                </td>
                <td class="topics-list-center-cell">
                  <TopicsBadge
                    value={row.freshness}
                    tone={topicToneFor(row.freshness)}
                    t={t}
                  />
                </td>
                <td class="topics-list-center-cell">
                  <TopicDiscoveryBadge count={row.candidateCount} t={t} />
                </td>
                <td class="topics-list-center-cell">{row.updatedAt || "-"}</td>
                <td>
                  <TopicsActionGroup>
                    <HostCommandButton
                      label={t("synthesis-action-open")}
                      command="openTopicArtifact"
                      args={{ topicId: row.id }}
                      pendingOperationKeys={props.pendingOperationKeys}
                      t={t}
                      onAction={onAction}
                    />
                    <HostCommandButton
                      label={t("synthesis-action-update")}
                      command="submitTopicSynthesisUpdate"
                      args={{ topicId: row.id }}
                      disabled={!row.updateAvailable}
                      pendingOperationKeys={props.pendingOperationKeys}
                      t={t}
                      onAction={onAction}
                    />
                    <HostCommandButton
                      label={t("synthesis-action-delete")}
                      command="deleteTopicArtifact"
                      args={{ topicId: row.id }}
                      pendingOperationKeys={props.pendingOperationKeys}
                      t={t}
                      onAction={onAction}
                    />
                  </TopicsActionGroup>
                </td>
              </tr>,
              windowed.middleSpacerAfter === visibleIndex ? (
                <WindowedTableSpacer
                  key={`${key}-middle-spacer`}
                  height={windowed.middleSpacerHeight}
                  colSpan={LIST_HEADERS.length}
                />
              ) : null,
            ],
          )}
          <WindowedTableSpacer
            height={windowed.bottomSpacerHeight}
            colSpan={LIST_HEADERS.length}
          />
        </tbody>
      </table>
    </div>
  );
}

export const TopicsRegion = memo(
  function TopicsRegion(props: TopicsRegionProps) {
    const { selection, t, onAction } = props;
    const bodyProps: RegionBodyProps = {
      rows: selection.rows,
      hasAnyTopics: selection.hasAnyTopics,
      pendingOperationKeys: selection.pendingOperationKeys,
      t,
      onAction,
    };
    return (
      <div class="panel" data-region-content="synthesis-topics">
        <div class="panel-header panel-toolbar">
          <div class="filters">
            <input
              data-synthesis-control-key="registry.search"
              placeholder={t("synthesis-search")}
              value={selection.search}
              onInput={(event) =>
                onAction("setFilters", {
                  artifacts: {
                    search: (event.target as HTMLInputElement).value,
                  },
                })
              }
            />
            <select
              value={selection.sort}
              onChange={(event) =>
                onAction("setFilters", {
                  artifacts: {
                    sort: (event.target as HTMLSelectElement).value,
                  },
                })
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(SORT_LABEL_KEYS[option])}
                </option>
              ))}
            </select>
            {VIEW_MODES.map((view) => (
              <button
                key={view.mode}
                type="button"
                class={selection.viewMode === view.mode ? "active" : ""}
                onClick={() =>
                  onAction("setFilters", {
                    artifacts: { viewMode: view.mode },
                  })
                }
              >
                {t(view.labelKey)}
              </button>
            ))}
            <CreateTopicButton
              pendingOperationKeys={selection.pendingOperationKeys}
              t={t}
              onAction={onAction}
            />
            <HostCommandButton
              label={t("synthesis-action-purge-deleted")}
              command="purgeDeletedTopicArtifacts"
              pendingOperationKeys={selection.pendingOperationKeys}
              t={t}
              onAction={onAction}
            />
          </div>
        </div>
        {selection.viewMode === "graph" ? (
          <TopicGraphPanel
            graph={selection.graph || EMPTY_TOPIC_GRAPH_SELECTION}
            pendingOperationKeys={selection.pendingOperationKeys}
            t={t}
            onAction={onAction}
          />
        ) : selection.viewMode === "grid" ? (
          <TopicsGrid {...bodyProps} />
        ) : (
          <TopicsTable {...bodyProps} />
        )}
        {selection.deletedCount > 0 ? (
          <p class="muted">
            {t("synthesis-deleted-artifacts-waiting", {
              count: selection.deletedCount,
            })}
          </p>
        ) : null}
      </div>
    );
  },
  (prev, next) =>
    prev.t === next.t &&
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection),
);
