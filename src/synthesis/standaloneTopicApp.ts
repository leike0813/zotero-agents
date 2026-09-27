import { h, render } from "preact";
import { synthesisGraphVendors } from "../shared/synthesisGraphVendors";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchTopicExportEnvelope } from "../shared/synthesisWorkbenchWireContract";
import { ReaderRegion } from "./components/reader/ReaderRegion";
import { GraphRegion } from "./components/graph/GraphRegion";
import type { CitationGraphVendors } from "./components/graph/sigmaIsland";
import {
  projectReaderSelection,
  projectGraphSelection,
} from "./synthesisExportProjection";
import {
  normalizeStandaloneGraph,
  updateStandaloneGraph,
} from "./standaloneGraphState";

export function mountStandaloneTopic(
  root: HTMLElement,
  envelope: SynthesisWorkbenchTopicExportEnvelope,
) {
  if (!envelope.snapshot) return () => {};
  root.classList.add("standalone-topic-export-root");
  let snapshot = {
    ...envelope.snapshot,
    graph: normalizeStandaloneGraph(envelope.snapshot.graph),
  };
  let graphMount: HTMLElement | undefined;
  const context = {
    hostShape: "standaloneTopicExport" as const,
    i18n: {
      locale: envelope.i18n?.locale || "en-US",
      messages: {
        ...SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
        ...envelope.i18n?.messages,
      },
    },
    topicDetail: envelope.topicDetail,
    standaloneDigests: envelope.digestsByKey,
  };
  const t: Parameters<typeof projectGraphSelection>[2] = (key, args) =>
    formatSynthesisWorkbenchMessage(context.i18n.messages[key], args);
  const paintGraph = () => {
    if (graphMount?.isConnected)
      render(
        h(GraphRegion, {
          selection: projectGraphSelection(snapshot, context, t),
          t,
          onAction,
          vendors: synthesisGraphVendors as unknown as CitationGraphVendors,
        }),
        graphMount,
      );
  };
  const onAction = (action: string, payload: Record<string, unknown> = {}) => {
    if (action === "setGraphView") {
      snapshot = {
        ...snapshot,
        graph: updateStandaloneGraph(
          snapshot.graph,
          envelope.graphLayouts || {},
          payload,
        ),
      };
      paintGraph();
    } else if (action === "setFilters" && payload.graph) {
      snapshot = {
        ...snapshot,
        graph: updateStandaloneGraph(
          snapshot.graph,
          envelope.graphLayouts || {},
          payload.graph,
        ),
      };
      paintGraph();
    }
  };
  const renderGraphIsland = (container: HTMLElement) => {
    if (graphMount && graphMount !== container) render(null, graphMount);
    graphMount = container;
    paintGraph();
    return () => {
      render(null, container);
      if (graphMount === container) graphMount = undefined;
    };
  };
  render(
    h(ReaderRegion, {
      selection: projectReaderSelection(snapshot, context, []),
      t,
      onAction,
      renderGraphIsland,
    }),
    root,
  );
  const dispose = () => {
    if (graphMount) render(null, graphMount);
    render(null, root);
    root.classList.remove("standalone-topic-export-root");
    window.removeEventListener("pagehide", dispose);
  };
  window.addEventListener("pagehide", dispose);
  return dispose;
}

const envelope =
  typeof window === "undefined"
    ? undefined
    : (
        window as Window & {
          __zoteroSkillsSynthesisTopicExport?: SynthesisWorkbenchTopicExportEnvelope;
        }
      ).__zoteroSkillsSynthesisTopicExport;
const root =
  typeof document === "undefined" ? null : document.getElementById("app");
if (root && envelope) mountStandaloneTopic(root, envelope);
