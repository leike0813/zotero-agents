import { projectCitationGraphVisibility } from "../shared/citationGraphVisualRules";
import type { SynthesisWorkbenchSnapshot } from "../shared/synthesisWorkbenchWireContract";

type GraphView = SynthesisWorkbenchSnapshot["graph"];

export function normalizeStandaloneGraph(
  graph: GraphView,
  overrides: Partial<GraphView["filters"]> = {},
): GraphView {
  const layoutAlgorithm = overrides.layoutAlgorithm || graph.layoutAlgorithm;
  const filters = { ...graph.filters, ...overrides, layoutAlgorithm };
  const projection = projectCitationGraphVisibility({
    nodes: graph.nodes,
    edges: graph.edges,
    filters,
    topicScopes: graph.topicScopes,
  });
  return {
    ...graph,
    layoutStatus: "ready",
    layoutAlgorithm,
    filters,
    visibleNodes: projection.defaultNodes,
    visibleEdges: projection.defaultEdges,
    hoverOnlyNodes: projection.hoverOnlyNodes,
    hoverOnlyEdges: projection.hoverOnlyEdges,
    diagnostics: { ...graph.diagnostics, cache_status: "ready" },
  };
}

export function updateStandaloneGraph(
  graph: GraphView,
  layouts: Record<string, GraphView>,
  payload: Partial<GraphView["filters"]> & {
    selectedElement?: GraphView["selectedElement"] | null;
  },
): GraphView {
  const layout =
    layouts[payload.layoutAlgorithm || graph.layoutAlgorithm] || graph;
  const { selectedElement, ...filters } = payload;
  return {
    ...normalizeStandaloneGraph(layout, { ...graph.filters, ...filters }),
    selectedElement:
      "selectedElement" in payload
        ? selectedElement || undefined
        : graph.selectedElement,
  };
}
