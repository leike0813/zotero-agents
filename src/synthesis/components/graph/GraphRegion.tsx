/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { equalBySignature } from "../../../shared/regionEquality";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../../../shared/synthesisWorkbenchI18nContract";
import {
  CITATION_GRAPH_INCOMING_EDGE_COLOR,
  CITATION_GRAPH_OUTGOING_EDGE_COLOR,
  GRAPH_ZOOM_SLIDER_MAX,
} from "../../../shared/citationGraphVisualRules";
import {
  collectSelectedNodeCitations,
  graphEdgeRoleLabel,
  graphEnumLabel,
  graphNodeById,
  graphEdgeById,
  graphRoleOptions,
  graphSelectedNodeIncomingCounts,
  hasUsableGraphCoordinates,
  localizedGraphDetailValue,
  type SynthesisGraphElement,
  type SynthesisGraphNode,
  type SynthesisGraphNodeKind,
  type SynthesisGraphSurfaceView,
  type SynthesisGraphText,
} from "./graphModel";
import {
  CitationGraphIsland,
  createCitationGraphIsland,
  resolveCitationGraphVendors,
  type CitationGraphVendors,
} from "./sigmaIsland";

// Citation graph surface of the synthesis workbench: Preact boundary around
// the imperative Sigma island (./sigmaIsland.ts). Ported from the legacy
// renderGraph cluster (src/synthesisWorkbenchApp.ts :13712-15420).
//
// High-performance semantics carried over:
// - The Sigma instance persists across region re-renders and snapshot echoes;
//   the island diffs by model/layout/query/basis signature and never
//   recreates the renderer (legacy preserveGraphSurfaceWhileRebuildingRoot).
// - synthesis:graph-page payloads reach the island through the selection
//   (the controller stages latestGraphPage and the panel model merges it into
//   the graph view); matching query/basis signatures take the incremental
//   merge path (legacy mergeSigmaGraphPage).
// - Interaction-only updates (selection/hover echoes) hit the island's
//   interaction channel: selection drawer re-render + sigma.refresh(), no
//   model mutation.
//
// Action names and payloads are frozen to the legacy implementation:
//   setGraphView { role | topicId | nodeKinds | showLowSignalReferences |
//     layoutAlgorithm | selectedElement }
//   setFilters { graph: { search } }
//   hostCommand { command: "rebuildCitationGraphCacheNow",
//     args: { reason: "graph_tab" | "graph_tab_failed" | "user" } }
//   hostCommand { command: "refreshCitationGraphCacheIncrementalNow",
//     args: { reason: "user" } }
//   hostCommand { command: "manualRecomputeLayout",
//     args: { reason: "user", algorithm } }
//   hostCommand { command: "openZoteroItem", args: { nodeId, libraryId } }
//   continueGraphWindow {}
//   retryGraphWindow {}
//   expandGraphNeighborhood { nodeId, direction: "incoming"|"outgoing"|"both" }
//   backToTopicDetail { topicId }   (page-local macro; the controller
//     decomposes it and it never crosses the wire)

export type SynthesisGraphRegionAction =
  | "setGraphView"
  | "setFilters"
  | "hostCommand"
  | "continueGraphWindow"
  | "retryGraphWindow"
  | "expandGraphNeighborhood"
  | "backToTopicDetail";

export type SynthesisGraphRegionActionSender = (
  action: SynthesisGraphRegionAction,
  payload?: Record<string, unknown>,
) => void;

/** Detail labels resolved from the current message envelope. */
export type SynthesisGraphDetailLabels = {
  fieldTitle: string;
  fieldType: string;
  fieldYear: string;
  fieldAuthors: string;
  fieldSignal: string;
  fieldId: string;
  signalLow: string;
  signalNormal: string;
  edgeFieldRole: string;
  edgeFieldSource: string;
  edgeFieldTarget: string;
  edgeFieldMentions: string;
  // Templates carry a {count} placeholder (legacy `${n} outgoing`).
  citationsOutgoingTemplate: string;
  mentionsTemplate: string;
  citationKindLibrary: string;
  citationKindReference: string;
  citationKindSharedExternal: string;
  citationKindSingleExternal: string;
  citationKindUnresolved: string;
  noOutgoingCitationsTitle: string;
  noOutgoingCitationsLibraryMessage: string;
  noOutgoingCitationsReferenceMessage: string;
  layoutFailureFieldCode: string;
  layoutFailureFieldMutationStatus: string;
  layoutFailureFieldAlgorithm: string;
  layoutFailureFieldGraphHash: string;
  layoutFailureFieldOccurredAt: string;
};

export function defaultGraphDetailLabels(
  t: SynthesisGraphText = (key, args) =>
    formatSynthesisWorkbenchMessage(
      SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
      args,
    ),
): SynthesisGraphDetailLabels {
  return {
    fieldTitle: t("synthesis-column-title"),
    fieldType: t("synthesis-column-type"),
    fieldYear: t("synthesis-column-year"),
    fieldAuthors: t("synthesis-field-authors"),
    fieldSignal: t("synthesis-graph-field-signal"),
    fieldId: "ID",
    signalLow: t("synthesis-enum-priority-low"),
    signalNormal: t("synthesis-graph-signal-normal"),
    edgeFieldRole: t("synthesis-graph-field-role"),
    edgeFieldSource: t("synthesis-column-source"),
    edgeFieldTarget: t("synthesis-column-target"),
    edgeFieldMentions: t("synthesis-graph-field-mentions"),
    citationsOutgoingTemplate: t("synthesis-graph-outgoing-count", {
      count: "{count}",
    }),
    mentionsTemplate: t("synthesis-graph-mentions-count", { count: "{count}" }),
    citationKindLibrary: t("synthesis-enum-graph-node-kind-library-paper"),
    citationKindReference: t(
      "synthesis-enum-graph-node-kind-external-reference",
    ),
    citationKindSharedExternal: t("synthesis-graph-kind-shared"),
    citationKindSingleExternal: t("synthesis-graph-kind-single"),
    citationKindUnresolved: t("synthesis-graph-kind-unresolved"),
    noOutgoingCitationsTitle: t("synthesis-graph-no-outgoing"),
    noOutgoingCitationsLibraryMessage: t("synthesis-graph-no-outgoing-library"),
    noOutgoingCitationsReferenceMessage: t(
      "synthesis-graph-no-outgoing-reference",
    ),
    layoutFailureFieldCode: t("synthesis-graph-failure-code"),
    layoutFailureFieldMutationStatus: t(
      "synthesis-graph-failure-mutation-status",
    ),
    layoutFailureFieldAlgorithm: t("synthesis-graph-failure-algorithm"),
    layoutFailureFieldGraphHash: t("synthesis-graph-failure-hash"),
    layoutFailureFieldOccurredAt: t("synthesis-graph-failure-time"),
  };
}

/**
 * Region equality input: only this surface's user-visible content and open
 * state. Excludes request metadata, generatedAt, surface runtime status (the
 * chrome placeholder owns loading/error), the surface refresh diagnostic
 * (integration renders it above the surface), and the graph-page generation
 * counter (the staged page already landed in view.nodes/edges/window).
 */
export type SynthesisGraphRegionSelection = {
  view: SynthesisGraphSurfaceView;
  standaloneExport: boolean;
  standaloneGraphOnly: boolean;
  standaloneScopeLabel?: string;
  focusNodeId?: string;
  returnTopicId?: string;
  debugLayoutDetails: boolean;
  labels: SynthesisGraphDetailLabels;
};

export type SynthesisGraphRegionProps = {
  selection: SynthesisGraphRegionSelection;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
  // graphology/Sigma injection; falls back to
  // window.__synthesisCitationGraphVendors so the B2c standalone entry can
  // reuse the island without touching props plumbing.
  vendors?: CitationGraphVendors;
  // Whether the graph surface is the visible tab (gates scheduled resizes).
  active?: boolean;
};

function formatCountTemplate(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function EmptyState(props: {
  title: string;
  message?: string;
  tone?: "default" | "info" | "warning";
  action?: preact.ComponentChildren;
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

function DetailList(props: {
  fields: Array<[string, unknown]>;
  t: SynthesisGraphText;
}) {
  return (
    <div class="detail-list">
      {props.fields.map(([label, value], index) => (
        <div class="detail-row" key={index}>
          <span class="muted">{label}</span>
          <strong>
            {localizedGraphDetailValue(props.t, value) ||
              String(value == null || value === "" ? "-" : value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function GraphLegend(props: {
  t: SynthesisGraphText;
  horizontal: boolean;
  showCurrentPaper: boolean;
}) {
  const { t } = props;
  return (
    <div
      class={
        props.horizontal
          ? "citation-graph-legend citation-graph-legend-horizontal"
          : "citation-graph-legend"
      }
      aria-label={t("synthesis-graph-legend")}
    >
      <strong>{t("synthesis-graph-legend-direction")}</strong>
      <div class="citation-graph-legend-row">
        <span
          class="citation-graph-legend-edge"
          style={{
            background: CITATION_GRAPH_INCOMING_EDGE_COLOR,
            color: CITATION_GRAPH_INCOMING_EDGE_COLOR,
          }}
        />
        <span>{t("synthesis-graph-legend-incoming")}</span>
      </div>
      <div class="citation-graph-legend-row">
        <span
          class="citation-graph-legend-edge"
          style={{
            background: CITATION_GRAPH_OUTGOING_EDGE_COLOR,
            color: CITATION_GRAPH_OUTGOING_EDGE_COLOR,
          }}
        />
        <span>{t("synthesis-graph-legend-outgoing")}</span>
      </div>
      <strong>{t("synthesis-graph-legend-importance")}</strong>
      <div class="citation-graph-legend-row">
        <span class="citation-graph-legend-node-size">
          <span class="citation-graph-legend-node is-small" />
          <span class="citation-graph-legend-node is-large" />
        </span>
        <span>{t("synthesis-graph-legend-node-size")}</span>
      </div>
      <div class="citation-graph-legend-row">
        <span class="citation-graph-legend-node-size">
          <span class="citation-graph-legend-node is-large is-halo is-library" />
          <span class="citation-graph-legend-node is-large is-halo is-external" />
        </span>
        <span>{t("synthesis-graph-legend-halo")}</span>
      </div>
      {props.showCurrentPaper ? (
        <div class="citation-graph-legend-row">
          <span class="citation-graph-legend-node-size">
            <span class="citation-graph-legend-node is-large is-current-paper" />
          </span>
          <span>{t("synthesis-graph-legend-current-paper")}</span>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sigma stage (island host + zoom overlay + scope badge)
// ---------------------------------------------------------------------------

const GraphSigmaStage = memo(
  function GraphSigmaStage(props: {
    view: SynthesisGraphSurfaceView;
    drawable: boolean;
    active: boolean;
    searchQuery: string;
    focusNodeId?: string;
    scopeLabel: string;
    zoomAriaLabel: string;
    vendors?: CitationGraphVendors;
    t: SynthesisGraphText;
    onAction: SynthesisGraphRegionActionSender;
  }) {
    const stageHostRef = useRef<HTMLDivElement | null>(null);
    const sliderRef = useRef<HTMLInputElement | null>(null);
    const islandRef = useRef<CitationGraphIsland | null>(null);
    const hooksRef = useRef({ onAction: props.onAction, t: props.t });
    hooksRef.current = { onAction: props.onAction, t: props.t };

    useLayoutEffect(() => {
      const host = stageHostRef.current;
      const vendors = props.vendors || resolveCitationGraphVendors();
      if (!host || !vendors) return;
      if (!islandRef.current) {
        islandRef.current = createCitationGraphIsland(host, vendors, {
          onSelectElement: (element: SynthesisGraphElement | null) =>
            hooksRef.current.onAction("setGraphView", {
              selectedElement: element,
            }),
          t: (key, vars) => hooksRef.current.t(key, vars),
        });
        if (sliderRef.current) {
          islandRef.current.attachZoomSlider(sliderRef.current);
        }
      }
      const island = islandRef.current;
      island.setSurfaceActive(props.active);
      if (props.drawable) {
        island.update({
          visibleNodes: props.view.visibleNodes,
          visibleEdges: props.view.visibleEdges,
          graphHash: props.view.graphHash,
          layoutAlgorithm: props.view.layoutAlgorithm,
          querySignature: props.view.window?.querySignature || "",
          selectedElement: props.view.selectedElement,
          searchQuery: props.searchQuery,
          focusNodeId: props.focusNodeId,
          surfaceActive: props.active,
        });
      }
    });

    useLayoutEffect(
      () => () => {
        islandRef.current?.destroy();
        islandRef.current = null;
      },
      [],
    );

    return (
      <>
        <div
          class={`sigma-stage${props.drawable ? "" : " is-inactive"}`}
          ref={stageHostRef}
        />
        <div class="graph-zoom-overlay">
          <input
            type="range"
            min="0"
            max={String(GRAPH_ZOOM_SLIDER_MAX)}
            step="1"
            defaultValue="50"
            aria-label={props.zoomAriaLabel}
            class="graph-zoom-slider"
            ref={sliderRef}
          />
        </div>
        <div class="graph-scope-badge">{props.scopeLabel}</div>
      </>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    prev.t === next.t &&
    prev.vendors === next.vendors &&
    prev.drawable === next.drawable &&
    prev.active === next.active &&
    prev.searchQuery === next.searchQuery &&
    prev.focusNodeId === next.focusNodeId &&
    prev.scopeLabel === next.scopeLabel &&
    prev.zoomAriaLabel === next.zoomAriaLabel &&
    equalBySignature(prev.view, next.view),
);

// ---------------------------------------------------------------------------
// Control drawer
// ---------------------------------------------------------------------------

const GRAPH_NODE_KIND_TOGGLES: readonly SynthesisGraphNodeKind[] = [
  "library_paper",
  "external_reference",
  "unresolved_reference",
];

const GRAPH_LAYOUT_CHOICES: readonly ("force" | "radial" | "components")[] = [
  "force",
  "radial",
  "components",
];

function ControlGroup(props: {
  label: string;
  children: preact.ComponentChildren;
}) {
  return (
    <div class="graph-control-group">
      <span class="graph-control-group-label">{props.label}</span>
      <div class="filters graph-control-row">{props.children}</div>
    </div>
  );
}

function NodeKindControls(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { view, t, onAction } = props;
  const toggleKind = (kind: SynthesisGraphNodeKind, checked: boolean) => {
    const next = new Set(view.filters.nodeKinds);
    if (checked) next.add(kind);
    else next.delete(kind);
    onAction("setGraphView", { nodeKinds: Array.from(next) });
  };
  return (
    <ControlGroup label={t("synthesis-graph-control-node-types")}>
      {GRAPH_NODE_KIND_TOGGLES.map((kind) => (
        <label class="checkbox-label" key={kind}>
          <input
            type="checkbox"
            checked={view.filters.nodeKinds.includes(kind)}
            onChange={(event) =>
              toggleKind(
                kind,
                (event.currentTarget as HTMLInputElement).checked,
              )
            }
          />
          {graphEnumLabel(t, "graph-node-kind", kind)}
        </label>
      ))}
      <label class="checkbox-label">
        <input
          type="checkbox"
          checked={view.filters.showLowSignalReferences}
          onChange={(event) =>
            onAction("setGraphView", {
              showLowSignalReferences: (event.currentTarget as HTMLInputElement)
                .checked,
            })
          }
        />
        {graphEnumLabel(t, "graph-node-kind", "low_signal_external")}
      </label>
    </ControlGroup>
  );
}

function LayoutControls(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { view, t, onAction } = props;
  return (
    <ControlGroup label={t("synthesis-graph-control-layout")}>
      {GRAPH_LAYOUT_CHOICES.map((algorithm) => (
        <button
          key={algorithm}
          type="button"
          class={view.layoutAlgorithm === algorithm ? "active" : ""}
          onClick={() =>
            onAction("setGraphView", { layoutAlgorithm: algorithm })
          }
        >
          {graphEnumLabel(t, "graph-layout", algorithm)}
        </button>
      ))}
    </ControlGroup>
  );
}

function RoleSelect(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { view, t, onAction } = props;
  const options = ["all", ...graphRoleOptions(view)];
  return (
    <ControlGroup label={t("synthesis-graph-control-citation-role")}>
      <select
        value={view.filters.role}
        onChange={(event) =>
          onAction("setGraphView", {
            role: (event.currentTarget as HTMLSelectElement).value,
          })
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {graphEdgeRoleLabel(t, option)}
          </option>
        ))}
      </select>
    </ControlGroup>
  );
}

function GraphWindowProgress(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { view, t, onAction } = props;
  const windowState = view.window;
  if (!windowState) return null;
  return (
    <div class="graph-window-progress" data-status={windowState.status}>
      <p class="muted graph-window-progress-label">
        {t("synthesis-graph-loading-progress", {
          nodes: windowState.loadedNodes,
          totalNodes: windowState.totalNodes + windowState.totalHoverNodes,
          edges: windowState.loadedEdges,
          totalEdges: windowState.totalEdges + windowState.totalHoverEdges,
        })}
      </p>
      {windowState.status === "paused" ? (
        <button
          type="button"
          onClick={() => onAction("continueGraphWindow", {})}
        >
          {t("synthesis-action-continue-graph-loading")}
        </button>
      ) : null}
      {windowState.status === "failed" ? (
        <>
          <p class="muted">
            {windowState.errorReason || t("synthesis-graph-loading-failed")}
          </p>
          <button
            type="button"
            onClick={() => onAction("retryGraphWindow", {})}
          >
            {t("synthesis-action-retry-graph-loading")}
          </button>
        </>
      ) : null}
    </div>
  );
}

function IncrementalRefreshButton(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { view, t, onAction } = props;
  const cacheStatus = view.diagnostics.cacheStatus;
  const disabled =
    cacheStatus !== "stale" || !view.diagnostics.cacheDeltaAvailable;
  return (
    <button
      type="button"
      disabled={disabled}
      title={
        disabled
          ? cacheStatus !== "stale"
            ? t("synthesis-graph-refresh-only-stale")
            : t("synthesis-graph-cache-no-scope")
          : undefined
      }
      onClick={() =>
        onAction("hostCommand", {
          command: "refreshCitationGraphCacheIncrementalNow",
          args: { reason: "user" },
        })
      }
    >
      {t("synthesis-action-refresh-stale-graph")}
    </button>
  );
}

function LayoutRecomputeButton(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { view, t, onAction } = props;
  const disabled =
    view.diagnostics.cacheStatus !== "ready" ||
    !view.graphHash ||
    view.layoutStatus === "refreshing";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onAction("hostCommand", {
          command: "manualRecomputeLayout",
          args: { reason: "user", algorithm: view.filters.layoutAlgorithm },
        })
      }
    >
      {t("synthesis-action-redraw-layout")}
    </button>
  );
}

function HostedGraphControls(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
  onSearchClear: () => void;
}) {
  const { view, t, onAction } = props;
  return (
    <div class="graph-controls">
      <ControlGroup label={t("synthesis-graph-control-search")}>
        <input
          data-synthesis-control-key="graph.search"
          placeholder={t("synthesis-search-node")}
          value={props.searchDraft}
          onInput={(event) =>
            props.onSearchDraftChange(
              (event.currentTarget as HTMLInputElement).value,
            )
          }
          onKeyDown={(event) => {
            if ((event as KeyboardEvent).key === "Enter") {
              event.preventDefault();
              props.onSearchSubmit(props.searchDraft);
            }
          }}
        />
        <button
          type="button"
          onClick={() => props.onSearchSubmit(props.searchDraft)}
        >
          {t("synthesis-action-search")}
        </button>
        <button type="button" onClick={() => props.onSearchClear()}>
          {t("synthesis-action-clear")}
        </button>
      </ControlGroup>
      <RoleSelect view={view} t={t} onAction={onAction} />
      <ControlGroup label={t("synthesis-graph-control-scope")}>
        <select
          value={view.filters.topicId || "all"}
          onChange={(event) =>
            onAction("setGraphView", {
              topicId:
                (event.currentTarget as HTMLSelectElement).value || "all",
            })
          }
        >
          <option value="all">{t("synthesis-graph-topic-all")}</option>
          {view.topicScopes.map((scope) => (
            <option key={scope.topicId} value={scope.topicId}>
              {scope.title}
            </option>
          ))}
        </select>
      </ControlGroup>
      <ControlGroup label={t("synthesis-graph-control-cache")}>
        <IncrementalRefreshButton view={view} t={t} onAction={onAction} />
        <button
          type="button"
          disabled={view.diagnostics.cacheStatus === "refreshing"}
          onClick={() =>
            onAction("hostCommand", {
              command: "rebuildCitationGraphCacheNow",
              args: { reason: "user" },
            })
          }
        >
          {t("synthesis-action-rebuild-graph-cache")}
        </button>
        <LayoutRecomputeButton view={view} t={t} onAction={onAction} />
      </ControlGroup>
      <NodeKindControls view={view} t={t} onAction={onAction} />
      <LayoutControls view={view} t={t} onAction={onAction} />
    </div>
  );
}

function StandaloneGraphControls(props: {
  view: SynthesisGraphSurfaceView;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { view, t, onAction } = props;
  return (
    <div class="graph-controls standalone-graph-controls">
      <RoleSelect view={view} t={t} onAction={onAction} />
      <NodeKindControls view={view} t={t} onAction={onAction} />
      <LayoutControls view={view} t={t} onAction={onAction} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection drawer
// ---------------------------------------------------------------------------

function SelectedNodeCitations(props: {
  view: SynthesisGraphSurfaceView;
  node: SynthesisGraphNode;
  labels: SynthesisGraphDetailLabels;
  t: SynthesisGraphText;
}) {
  const { view, node, labels, t } = props;
  const citations = collectSelectedNodeCitations(view, node.id);
  const kindLabel = (target: SynthesisGraphNode | undefined): string => {
    if (!target) return labels.citationKindReference;
    if (target.kind === "library_paper") return labels.citationKindLibrary;
    if (target.kind === "external_reference") {
      return target.display_tier === "single_external"
        ? labels.citationKindSingleExternal
        : labels.citationKindSharedExternal;
    }
    return labels.citationKindUnresolved;
  };
  return (
    <section class="graph-citation-section">
      <div class="graph-citation-header">
        <h3>{t("synthesis-graph-citations-title")}</h3>
        <span class="badge">
          {formatCountTemplate(
            labels.citationsOutgoingTemplate,
            citations.length,
          )}
        </span>
      </div>
      {citations.length === 0 ? (
        <EmptyState
          title={labels.noOutgoingCitationsTitle}
          message={
            node.kind === "library_paper"
              ? labels.noOutgoingCitationsLibraryMessage
              : labels.noOutgoingCitationsReferenceMessage
          }
        />
      ) : (
        <div class="graph-citation-list">
          {citations.map(({ edge, target }) => (
            <article
              class="graph-citation-card"
              key={edge.id}
              title={`${target?.label || edge.target} (${edge.id})`}
            >
              <strong class="graph-citation-title">
                {target?.label || edge.target}
              </strong>
              <div class="graph-citation-meta">
                <span class={`badge ${target?.kind || ""}`}>
                  {kindLabel(target)}
                </span>
                {target?.year ? <span class="muted">{target.year}</span> : null}
                {edge.primary_role ? (
                  <span class="muted">
                    {graphEdgeRoleLabel(t, edge.primary_role)}
                  </span>
                ) : null}
                <span class="muted">
                  {formatCountTemplate(
                    labels.mentionsTemplate,
                    Math.max(0, edge.mention_count || 0),
                  )}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SelectedDetail(props: {
  selection: SynthesisGraphRegionSelection;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { selection, t, onAction } = props;
  const { view, labels } = selection;
  const selected = view.selectedElement;
  if (!selected) return null;

  if (selected.kind === "node") {
    const node = graphNodeById(view).get(selected.id);
    const fields: Array<[string, unknown]> = [
      [labels.fieldTitle, node?.label || selected.id],
      [labels.fieldType, node?.kind || selected.kind],
      [labels.fieldYear, node?.year || "-"],
      [
        labels.fieldAuthors,
        node?.authors?.length ? node.authors.join("; ") : "-",
      ],
    ];
    if (!selection.standaloneGraphOnly) {
      const incoming = graphSelectedNodeIncomingCounts(view, selected.id);
      fields.push([
        t("synthesis-graph-incoming-source-papers-current-view"),
        node ? incoming.sourcePaperCount : "-",
      ]);
      fields.push([
        t("synthesis-graph-incoming-citation-records-current-view"),
        node ? incoming.citationRecordCount : "-",
      ]);
    }
    fields.push([
      labels.fieldSignal,
      node?.low_signal ? labels.signalLow : labels.signalNormal,
    ]);
    if (!selection.standaloneExport) {
      fields.push([labels.fieldId, selected.id]);
    }
    return (
      <div
        class={`selected-detail${
          node?.kind === "library_paper" && !selection.standaloneGraphOnly
            ? " has-citation-list"
            : ""
        }`}
      >
        <DetailList fields={fields} t={t} />
        {!selection.standaloneExport && node ? (
          <div class="graph-neighborhood-actions">
            {(
              [
                ["incoming", "synthesis-action-expand-incoming"],
                ["outgoing", "synthesis-action-expand-outgoing"],
                ["both", "synthesis-action-expand-both"],
              ] as const
            ).map(([direction, labelKey]) => (
              <button
                key={direction}
                type="button"
                onClick={() =>
                  onAction("expandGraphNeighborhood", {
                    nodeId: node.id,
                    direction,
                  })
                }
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        ) : null}
        {node?.kind === "library_paper" && !selection.standaloneExport ? (
          <button
            type="button"
            onClick={() =>
              onAction("hostCommand", {
                command: "openZoteroItem",
                args: { nodeId: node.id, libraryId: view.libraryId },
              })
            }
          >
            {t("synthesis-action-open-zotero-item")}
          </button>
        ) : null}
        {node?.kind === "library_paper" && !selection.standaloneGraphOnly ? (
          <SelectedNodeCitations
            view={view}
            node={node}
            labels={labels}
            t={t}
          />
        ) : null}
      </div>
    );
  }

  const edge = graphEdgeById(view).get(selected.id);
  const edgeFields: Array<[string, unknown]> = [
    [
      labels.edgeFieldRole,
      edge?.primary_role ? graphEdgeRoleLabel(t, edge.primary_role) : "-",
    ],
    [labels.edgeFieldSource, edge?.source || "-"],
    [labels.edgeFieldTarget, edge?.target || "-"],
  ];
  if (!selection.standaloneGraphOnly) {
    edgeFields.push([labels.edgeFieldMentions, edge?.mention_count || 0]);
  }
  if (!selection.standaloneExport) {
    edgeFields.push([labels.fieldId, selected.id]);
  }
  return (
    <div class="selected-detail">
      <DetailList fields={edgeFields} t={t} />
    </div>
  );
}

function GraphSelectionDrawer(props: {
  selection: SynthesisGraphRegionSelection;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { selection, t, onAction } = props;
  if (!selection.view.selectedElement) return null;
  return (
    <aside
      class={`panel details graph-selection-drawer${
        selection.standaloneGraphOnly ? " graph-selection-drawer-compact" : ""
      }`}
      tabIndex={0}
      aria-label={t("synthesis-graph-selection")}
    >
      <div class="panel-header">
        <strong>{t("synthesis-graph-selection")}</strong>
      </div>
      <div
        class="graph-selection-content"
        data-synthesis-scroll-key="graph.selection"
      >
        <SelectedDetail selection={selection} t={t} onAction={onAction} />
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Stage overlays: banners + empty states
// ---------------------------------------------------------------------------

function LayoutFailureAction(props: {
  selection: SynthesisGraphRegionSelection;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
}) {
  const { selection, t, onAction } = props;
  const failure = selection.view.diagnostics.layoutFailure;
  if (!failure) return null;
  const showRecompute = !selection.standaloneExport;
  const showDetails = selection.debugLayoutDetails;
  if (!showRecompute && !showDetails) return null;
  return (
    <div class="graph-layout-failure-actions">
      {showRecompute ? (
        <LayoutRecomputeButton
          view={selection.view}
          t={t}
          onAction={onAction}
        />
      ) : null}
      {showDetails ? (
        <details class="graph-layout-failure-details">
          <summary>{t("synthesis-diagnostics")}</summary>
          <DetailList
            t={t}
            fields={[
              [selection.labels.layoutFailureFieldCode, failure.code],
              [
                selection.labels.layoutFailureFieldMutationStatus,
                failure.mutationStatus,
              ],
              [
                selection.labels.layoutFailureFieldAlgorithm,
                failure.layoutAlgorithm,
              ],
              [selection.labels.layoutFailureFieldGraphHash, failure.graphHash],
              [
                selection.labels.layoutFailureFieldOccurredAt,
                failure.occurredAt,
              ],
            ]}
          />
        </details>
      ) : null}
    </div>
  );
}

function GraphStageOverlays(props: {
  selection: SynthesisGraphRegionSelection;
  t: SynthesisGraphText;
  onAction: SynthesisGraphRegionActionSender;
  drawable: boolean;
}) {
  const { selection, t, onAction, drawable } = props;
  const { view } = selection;
  const cacheStatus = view.diagnostics.cacheStatus;
  const layoutFailure = view.diagnostics.layoutFailure;
  const hasCoords = hasUsableGraphCoordinates(view);

  if (!view.graphHash || view.nodes.length === 0) {
    return (
      <div class="graph-empty">
        <EmptyState
          title={t("synthesis-graph-no-data")}
          message={
            view.diagnostics.summaryEntries.length
              ? view.diagnostics.summaryEntries.join("; ")
              : t(
                  view.layoutStatus === "refreshing"
                    ? "synthesis-graph-diagnostic-refreshing"
                    : view.layoutStatus === "stale"
                      ? "synthesis-graph-diagnostic-stale"
                      : view.layoutStatus === "failed"
                        ? "synthesis-graph-diagnostic-failed"
                        : view.layoutStatus === "missing"
                          ? "synthesis-graph-diagnostic-missing"
                          : "synthesis-graph-diagnostic-not-ready",
                )
          }
          tone={view.layoutStatus === "failed" ? "warning" : "info"}
          action={
            selection.standaloneExport ? undefined : (
              <button
                type="button"
                onClick={() =>
                  onAction("hostCommand", {
                    command: "rebuildCitationGraphCacheNow",
                    args: { reason: "graph_tab" },
                  })
                }
              >
                {t("synthesis-action-rebuild-graph-cache")}
              </button>
            )
          }
        />
      </div>
    );
  }

  if (view.selectedTopicTitle && view.visibleNodes.length === 0) {
    return (
      <div class="graph-empty">
        <EmptyState
          title={t("synthesis-graph-empty-topic-title", {
            topic: view.selectedTopicTitle,
          })}
          message={t("synthesis-graph-empty-topic-message")}
          tone="info"
        />
      </div>
    );
  }

  const cacheBanner =
    cacheStatus !== "ready" && !selection.standaloneExport ? (
      <div class="graph-layout-banner" key="cache-banner">
        <strong>
          {cacheStatus === "failed"
            ? t("synthesis-graph-cache-failed")
            : t("synthesis-graph-cache-stale-title")}
        </strong>
        <span class="muted">
          {cacheStatus === "failed"
            ? t("synthesis-graph-cache-failed-body")
            : t("synthesis-graph-cache-stale-body")}
        </span>
        {cacheStatus === "stale" ? (
          <IncrementalRefreshButton view={view} t={t} onAction={onAction} />
        ) : (
          <button
            type="button"
            onClick={() =>
              onAction("hostCommand", {
                command: "rebuildCitationGraphCacheNow",
                args: { reason: "graph_tab_failed" },
              })
            }
          >
            {t("synthesis-action-rebuild-graph-cache")}
          </button>
        )}
      </div>
    ) : null;

  const failureBanner =
    layoutFailure && hasCoords ? (
      <div
        class="graph-layout-banner graph-layout-failure"
        key="failure-banner"
      >
        <strong>{t("synthesis-layout-failed")}</strong>
        <span class="muted">
          {`${layoutFailure.message || ""} ${t("synthesis-graph-layout-failed-body")}`}
        </span>
        <LayoutFailureAction selection={selection} t={t} onAction={onAction} />
      </div>
    ) : null;

  if (!hasCoords) {
    const layoutFailed =
      Boolean(layoutFailure) || view.layoutStatus === "failed";
    const layoutRefreshing = view.layoutStatus === "refreshing";
    const unavailableKey =
      view.layoutStatus === "stale"
        ? "synthesis-graph-diagnostic-stale"
        : "synthesis-graph-diagnostic-missing";
    return (
      <>
        {cacheBanner}
        <div class="graph-empty">
          <EmptyState
            title={
              layoutFailed
                ? t("synthesis-layout-failed")
                : layoutRefreshing
                  ? t("synthesis-graph-drawing")
                  : t(unavailableKey)
            }
            message={
              layoutFailed
                ? layoutFailure?.message ||
                  t("synthesis-graph-layout-failed-body")
                : layoutRefreshing
                  ? t("synthesis-graph-layout-computing")
                  : t(unavailableKey)
            }
            tone={layoutFailed ? "warning" : "info"}
            action={
              layoutFailure ? (
                <LayoutFailureAction
                  selection={selection}
                  t={t}
                  onAction={onAction}
                />
              ) : !layoutRefreshing && !selection.standaloneExport ? (
                <LayoutRecomputeButton view={view} t={t} onAction={onAction} />
              ) : undefined
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {cacheBanner}
      {failureBanner}
      {drawable && !selection.standaloneGraphOnly ? (
        <GraphLegend t={t} horizontal={false} showCurrentPaper={false} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export const GraphRegion = memo(
  function GraphRegion(props: SynthesisGraphRegionProps) {
    const { selection, t, onAction } = props;
    const { view } = selection;
    const active = props.active !== false;

    // Search draft is local UI state (legacy state.graphSearchDraft): typing
    // only moves the draft; Enter / the search button commit through
    // setFilters, and the committed query feeds the island's highlight pass.
    const [searchDraft, setSearchDraft] = useState(view.filters.search);
    const [committedQuery, setCommittedQuery] = useState(view.filters.search);
    const lastFilterSearchRef = useRef(view.filters.search);
    useLayoutEffect(() => {
      const next = view.filters.search;
      if (next !== lastFilterSearchRef.current) {
        lastFilterSearchRef.current = next;
        setSearchDraft(next);
        setCommittedQuery(next);
      }
    }, [view.filters.search]);

    const submitSearch = (query: string) => {
      lastFilterSearchRef.current = query;
      setSearchDraft(query);
      setCommittedQuery(query);
      onAction("setFilters", { graph: { search: query } });
    };
    const clearSearch = () => {
      lastFilterSearchRef.current = "";
      setSearchDraft("");
      setCommittedQuery("");
      onAction("setFilters", { graph: { search: "" } });
    };

    const hasCoords = hasUsableGraphCoordinates(view);
    const drawable = Boolean(
      view.graphHash &&
      view.nodes.length > 0 &&
      !(view.selectedTopicTitle && view.visibleNodes.length === 0) &&
      hasCoords,
    );

    const scopeLabel =
      selection.standaloneGraphOnly && selection.standaloneScopeLabel
        ? selection.standaloneScopeLabel
        : view.selectedTopicTitle
          ? t("synthesis-graph-scope-topic", { topic: view.selectedTopicTitle })
          : t("synthesis-graph-scope-all");

    return (
      <div
        class={`graph-shell${
          selection.standaloneGraphOnly ? " graph-shell-standalone-only" : ""
        }`}
        data-region-content="synthesis-graph"
      >
        {selection.standaloneGraphOnly ? (
          <GraphLegend t={t} horizontal showCurrentPaper />
        ) : null}
        <div class="graph-stage">
          <GraphSigmaStage
            view={view}
            drawable={drawable}
            active={active}
            searchQuery={committedQuery}
            focusNodeId={selection.focusNodeId}
            scopeLabel={scopeLabel}
            zoomAriaLabel={t("synthesis-graph-zoom")}
            vendors={props.vendors}
            t={t}
            onAction={onAction}
          />
          <GraphStageOverlays
            selection={selection}
            t={t}
            onAction={onAction}
            drawable={drawable}
          />
        </div>
        {!selection.standaloneGraphOnly ? (
          <aside
            class="panel details graph-control-drawer"
            tabIndex={0}
            aria-label={t("synthesis-graph-controls")}
          >
            <div class="panel-header">
              <span class="graph-control-icon">
                <span class="zs-icon zs-icon-tune" aria-hidden="true" />
              </span>
              <strong class="graph-control-title">
                {t("synthesis-graph-controls")}
              </strong>
            </div>
            <div class="details" data-synthesis-scroll-key="graph.controls">
              {selection.standaloneExport ? (
                <StandaloneGraphControls
                  view={view}
                  t={t}
                  onAction={onAction}
                />
              ) : (
                <HostedGraphControls
                  view={view}
                  t={t}
                  onAction={onAction}
                  searchDraft={searchDraft}
                  onSearchDraftChange={setSearchDraft}
                  onSearchSubmit={submitSearch}
                  onSearchClear={clearSearch}
                />
              )}
              {!selection.standaloneExport &&
              selection.returnTopicId &&
              view.filters.topicId === selection.returnTopicId ? (
                <button
                  type="button"
                  onClick={() =>
                    onAction("backToTopicDetail", {
                      topicId: selection.returnTopicId,
                    })
                  }
                >
                  {t("synthesis-action-back-to-topic-details")}
                </button>
              ) : null}
              <p class="muted graph-shown-count">
                {t("synthesis-graph-shown-count", {
                  nodes: view.visibleNodes.length,
                  edges: view.visibleEdges.length,
                })}
              </p>
              <GraphWindowProgress view={view} t={t} onAction={onAction} />
              <p class="muted">
                {t("synthesis-graph-node-counts", {
                  library: view.diagnostics.libraryNodeCount,
                  shared: view.diagnostics.sharedExternalCount,
                  singleSourceHidden:
                    view.diagnostics.hoverOnlyExternalCount ||
                    view.hoverOnlyNodes.length ||
                    0,
                })}
              </p>
            </div>
          </aside>
        ) : null}
        <GraphSelectionDrawer selection={selection} t={t} onAction={onAction} />
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    prev.t === next.t &&
    prev.vendors === next.vendors &&
    (prev.active !== false) === (next.active !== false) &&
    equalBySignature(prev.selection, next.selection),
);
