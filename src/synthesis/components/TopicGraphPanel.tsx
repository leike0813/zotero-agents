/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useState } from "preact/hooks";

import type { SynthesisWorkbenchMessageKey } from "../../shared/synthesisWorkbenchWireContract";
import {
  compactReviewValue,
  computeTopicGraphLayout,
  hasStructuredContent,
  localizedEnumText,
  topicToneFor,
  wrapReviewIndex,
  type SynthesisWorkbenchTopicsText,
  type TopicGraphEdgeView,
  type TopicGraphInspectorView,
  type TopicGraphMode,
  type TopicGraphNodeView,
  type TopicRelationReviewEntry,
} from "./topicsRegionData";
import {
  HostCommandButton,
  TopicMetric,
  TopicsActionGroup,
  TopicsBadge,
  TopicsEmptyState,
  type SynthesisWorkbenchTopicsActionSender,
} from "./topicsControls";

// Topic relationship graph of the Topics surface: mode toolbar, SVG canvas
// with positioned node cards (declarative; no Sigma island — the legacy
// canvas is plain SVG + absolutely positioned buttons), the topic inspector
// aside, and the inline topic-relation review panel with its local
// index/collapse state.

export type SynthesisWorkbenchTopicGraphSelection = {
  mode: TopicGraphMode;
  search: string;
  hasAnyTopics: boolean;
  nodes: TopicGraphNodeView[];
  edges: TopicGraphEdgeView[];
  inspector: TopicGraphInspectorView | null;
  reviewQueue: TopicRelationReviewEntry[];
};

export const EMPTY_TOPIC_GRAPH_SELECTION: SynthesisWorkbenchTopicGraphSelection =
  {
    mode: "hierarchy",
    search: "",
    hasAnyTopics: false,
    nodes: [],
    edges: [],
    inspector: null,
    reviewQueue: [],
  };

const GRAPH_MODES: ReadonlyArray<TopicGraphMode> = [
  "hierarchy",
  "neighborhood",
  "unplaced",
];

const GRAPH_MODE_LABEL_KEYS: Record<
  TopicGraphMode,
  SynthesisWorkbenchMessageKey
> = {
  hierarchy: "synthesis-mode-hierarchy",
  neighborhood: "synthesis-mode-neighborhood",
  unplaced: "synthesis-mode-unplaced",
};

const GRAPH_LEGEND: ReadonlyArray<
  readonly [string, SynthesisWorkbenchMessageKey]
> = [
  ["broader_than", "synthesis-topic-graph-legend-hierarchy"],
  ["related_to", "synthesis-topic-graph-legend-related"],
  ["overlaps_with", "synthesis-topic-graph-legend-overlap"],
  ["contrasts_with", "synthesis-topic-graph-legend-contrast"],
];

type GraphProps = {
  graph: SynthesisWorkbenchTopicGraphSelection;
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
};

export function TopicGraphPanel(props: GraphProps) {
  const { graph, t, onAction } = props;
  return (
    <div class="topic-graph-layout">
      <section class="topic-graph-board">
        <div class="filters topic-graph-controls">
          {GRAPH_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              class={graph.mode === mode ? "active" : ""}
              onClick={() => onAction("setTopicGraphView", { mode })}
            >
              {t(GRAPH_MODE_LABEL_KEYS[mode])}
            </button>
          ))}
          <input
            placeholder={t("synthesis-search-topics")}
            value={graph.search}
            onInput={(event) =>
              onAction("setTopicGraphView", {
                search: (event.target as HTMLInputElement).value,
              })
            }
          />
        </div>
        <div class="topic-graph-summary">
          <span class="badge ok">
            {t("synthesis-topic-count", { count: graph.nodes.length })}
          </span>
          <span class="badge warn">
            {t("synthesis-relation-count", { count: graph.edges.length })}
          </span>
          <span class="badge">{t(GRAPH_MODE_LABEL_KEYS[graph.mode])}</span>
        </div>
        {graph.nodes.length === 0 ? (
          <div class="topic-graph-canvas is-empty">
            <TopicsEmptyState
              tone="info"
              title={
                graph.hasAnyTopics
                  ? t("synthesis-empty-no-graph-topics")
                  : t("synthesis-empty-no-graph-data")
              }
              message={
                graph.hasAnyTopics
                  ? t("synthesis-empty-no-graph-topics-message")
                  : t("synthesis-empty-no-graph-data-message")
              }
            />
          </div>
        ) : (
          <TopicGraphCanvas graph={graph} t={t} onAction={onAction} />
        )}
      </section>
      <TopicInspector
        graph={graph}
        pendingOperationKeys={props.pendingOperationKeys}
        t={t}
        onAction={onAction}
      />
    </div>
  );
}

function TopicGraphCanvas(props: {
  graph: SynthesisWorkbenchTopicGraphSelection;
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
}) {
  const { graph, t, onAction } = props;
  const layout = computeTopicGraphLayout({
    mode: graph.mode,
    nodes: graph.nodes,
    edges: graph.edges,
    inspector: graph.inspector,
  });
  const positions = new Map(layout.map((entry) => [entry.node.topicId, entry]));
  const selectedTopicId = graph.inspector?.topic?.topicId;
  return (
    <div class={`topic-graph-canvas mode-${graph.mode}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <marker
            id="topic-graph-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="5"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 Z" />
          </marker>
        </defs>
        {graph.edges.map((edge, index) => {
          const source = positions.get(edge.sourceTopicId);
          const target = positions.get(edge.targetTopicId);
          if (!source || !target) return null;
          const midY = (source.y + target.y) / 2;
          return (
            <path
              key={index}
              d={`M${source.x},${source.y} C${source.x},${midY} ${target.x},${midY} ${target.x},${target.y}`}
              class={`topic-graph-link relation-${edge.relation} status-${edge.status}`}
              {...(edge.relation === "broader_than"
                ? { "marker-end": "url(#topic-graph-arrow)" }
                : {})}
            >
              <title>{`${edge.relation}: ${edge.sourceTopicId} -> ${edge.targetTopicId} (${edge.status})`}</title>
            </path>
          );
        })}
      </svg>
      {layout.map((entry, index) => {
        const node = entry.node;
        const selected = !!selectedTopicId && node.topicId === selectedTopicId;
        return (
          <button
            key={node.topicId || index}
            type="button"
            class={`topic-graph-node${selected ? " active" : ""} role-${entry.role}`}
            style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
            onClick={() =>
              onAction("setTopicGraphView", {
                selectedTopicId: node.topicId,
                mode: graph.mode === "unplaced" ? "unplaced" : "neighborhood",
              })
            }
          >
            <span class="topic-node-title">{node.title}</span>
            <span class="topic-node-meta">
              {t("synthesis-topic-paper-count", { count: node.paperCount })}
            </span>
            <span class="tag-row">
              <TopicsBadge value={node.nodeType} t={t} />
              {node.isTop ? <TopicsBadge value="top" tone="ok" t={t} /> : null}
              {node.relationStatuses.map((status) => (
                <TopicsBadge
                  key={status}
                  value={status}
                  tone={topicToneFor(status)}
                  t={t}
                />
              ))}
            </span>
          </button>
        );
      })}
      <div class="topic-graph-legend">
        {GRAPH_LEGEND.map(([relation, labelKey]) => (
          <span
            key={relation}
            class={`topic-graph-legend-item relation-${relation}`}
          >
            <span class="topic-graph-legend-line" />
            <span>{t(labelKey)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TopicInspector(props: GraphProps) {
  const { graph, t, onAction } = props;
  const inspector = graph.inspector;
  const topic = inspector?.topic || null;
  return (
    <aside class="topic-inspector">
      <h3>{t("synthesis-topic-inspector")}</h3>
      {!topic || !inspector ? (
        <div class="empty">{t("synthesis-topic-no-selection")}</div>
      ) : (
        <>
          <h4>{topic.title}</h4>
          {topic.definition ? (
            <p class="muted topic-definition">{topic.definition}</p>
          ) : null}
          {topic.nodeType === "materialized" ? (
            <TopicsActionGroup>
              <HostCommandButton
                label={t("synthesis-action-open-details")}
                command="openTopicArtifact"
                args={{ topicId: topic.topicId }}
                pendingOperationKeys={props.pendingOperationKeys}
                t={t}
                onAction={onAction}
              />
            </TopicsActionGroup>
          ) : null}
          <div class="metric-grid">
            <TopicMetric
              label={t("synthesis-column-papers")}
              value={topic.paperCount}
            />
            <TopicMetric
              label={t("synthesis-status-suggested")}
              value={inspector.suggestedCount}
            />
            <TopicMetric
              label={t("synthesis-topic-last-synthesis")}
              value={topic.lastSynthesisAt || "-"}
            />
          </div>
          <TopicRelationSection
            title={t("synthesis-topic-parents")}
            rows={inspector.parents}
            onAction={onAction}
          />
          <TopicRelationSection
            title={t("synthesis-topic-children")}
            rows={inspector.children}
            onAction={onAction}
          />
          <div class="relation-section">
            <h4>{t("synthesis-topic-graph-legend-related")}</h4>
            {inspector.related.length === 0 ? (
              <p class="muted">{"-"}</p>
            ) : (
              inspector.related.map((entry, index) => (
                <div class="relation-row" key={index}>
                  <TopicsBadge
                    value={entry.relation}
                    tone={topicToneFor(entry.status)}
                    t={t}
                  />
                  <span>{entry.node.title}</span>
                  <TopicsBadge
                    value={entry.status}
                    tone={topicToneFor(entry.status)}
                    t={t}
                  />
                </div>
              ))
            )}
          </div>
          {graph.reviewQueue.length > 0 ? (
            <TopicRelationReviewPanel
              queue={graph.reviewQueue}
              pendingOperationKeys={props.pendingOperationKeys}
              t={t}
              onAction={onAction}
            />
          ) : null}
        </>
      )}
    </aside>
  );
}

function TopicRelationSection(props: {
  title: string;
  rows: TopicGraphNodeView[];
  onAction: SynthesisWorkbenchTopicsActionSender;
}) {
  return (
    <div class="relation-section">
      <h4>{props.title}</h4>
      {props.rows.length === 0 ? (
        <p class="muted">{"-"}</p>
      ) : (
        props.rows.map((row, index) => (
          <button
            key={row.topicId || index}
            type="button"
            class="link-button"
            onClick={() =>
              props.onAction("setTopicGraphView", {
                selectedTopicId: row.topicId,
                mode: "neighborhood",
              })
            }
          >
            {row.title}
          </button>
        ))
      )}
    </div>
  );
}

// Field labels for the review metadata rows. status/confidence/evidence have
// message keys; provenance has none in the i18n SSOT yet, so the wire field
// token is rendered as-is (legacy rendered the same lowercase label).
const PROVENANCE_FIELD_LABEL = "provenance";

function TopicRelationReviewPanel(props: {
  queue: TopicRelationReviewEntry[];
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
}) {
  const { queue, t, onAction } = props;
  const [rawIndex, setRawIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const total = queue.length;
  const index = wrapReviewIndex(rawIndex, total);
  const selected = queue[index];
  const metadataRows: Array<[string, unknown]> = (
    [
      [t("synthesis-column-status"), selected.status],
      [t("synthesis-column-confidence"), selected.confidence],
      [t("synthesis-column-evidence"), selected.evidence],
      [PROVENANCE_FIELD_LABEL, selected.provenance],
    ] as Array<[string, unknown]>
  ).filter(([, value]) => hasStructuredContent(value));
  const body =
    selected.kind === "review"
      ? selected.body || t("synthesis-topic-relation-review-body")
      : "";
  return (
    <section
      class={`review-panel review-panel-enter topic-review-panel inline-review-panel${collapsed ? " is-collapsed" : ""}`}
    >
      <div class="review-drawer-header inline-review-header">
        <strong>{t("synthesis-topic-relation-review")}</strong>
        <span class="muted">{`${index + 1} / ${total}`}</span>
        <div class="review-drawer-controls">
          <button
            type="button"
            disabled={total <= 1}
            onClick={() => setRawIndex(wrapReviewIndex(index - 1, total))}
          >
            {"↑"}
          </button>
          <button
            type="button"
            disabled={total <= 1}
            onClick={() => setRawIndex(wrapReviewIndex(index + 1, total))}
          >
            {"↓"}
          </button>
          <button type="button" onClick={() => setCollapsed(!collapsed)}>
            {collapsed
              ? t("synthesis-action-expand")
              : t("synthesis-action-collapse")}
          </button>
        </div>
      </div>
      {collapsed ? null : (
        <article class="review-card topic-relation-review-card">
          <div class="topic-relation-review-block">
            <div class="topic-relation-review-node">
              <strong>
                {selected.sourceTitle || t("synthesis-topic-source-topic")}
              </strong>
            </div>
            <div class="topic-relation-review-arrow" aria-hidden="true">
              <span class="topic-relation-review-arrow-icon" />
            </div>
            <div class="topic-relation-review-relation">
              <strong>{localizedEnumText(selected.relation, t) || "-"}</strong>
            </div>
            <div class="topic-relation-review-arrow" aria-hidden="true">
              <span class="topic-relation-review-arrow-icon" />
            </div>
            <div class="topic-relation-review-node">
              <strong>
                {selected.targetTitle || t("synthesis-topic-target-topic")}
              </strong>
            </div>
          </div>
          {body ? <p class="review-card-body">{body}</p> : null}
          {metadataRows.length > 0 ? (
            <div class="review-card-details review-card-metadata">
              {metadataRows.map(([label, value]) => (
                <div class="detail-row" key={label}>
                  <span class="muted">{label}</span>
                  <strong>{compactReviewValue(value, t)}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <TopicsActionGroup>
            {selected.kind === "suggestion" ? (
              <>
                <HostCommandButton
                  label={t("synthesis-action-accept")}
                  command="acceptTopicGraphRelation"
                  args={{ edgeId: selected.edgeId }}
                  pendingOperationKeys={props.pendingOperationKeys}
                  t={t}
                  onAction={onAction}
                />
                <HostCommandButton
                  label={t("synthesis-action-reject")}
                  command="rejectTopicGraphRelation"
                  args={{ edgeId: selected.edgeId }}
                  pendingOperationKeys={props.pendingOperationKeys}
                  t={t}
                  onAction={onAction}
                />
              </>
            ) : (
              <>
                <HostCommandButton
                  label={t("synthesis-action-approve")}
                  command="applyTopicGraphReviewAction"
                  args={{
                    reviewId: selected.reviewId,
                    action: "approve_suggested",
                  }}
                  pendingOperationKeys={props.pendingOperationKeys}
                  t={t}
                  onAction={onAction}
                />
                <HostCommandButton
                  label={t("synthesis-action-reject")}
                  command="applyTopicGraphReviewAction"
                  args={{ reviewId: selected.reviewId, action: "reject" }}
                  pendingOperationKeys={props.pendingOperationKeys}
                  t={t}
                  onAction={onAction}
                />
              </>
            )}
          </TopicsActionGroup>
        </article>
      )}
    </section>
  );
}
