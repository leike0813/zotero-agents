import { h, render } from "preact";
import { synthesisGraphVendors } from "../shared/synthesisGraphVendors";
import {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  formatSynthesisWorkbenchMessage,
} from "../shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchGraphExportEnvelope } from "../shared/synthesisWorkbenchWireContract";
import { GraphRegion } from "./components/graph/GraphRegion";
import type { CitationGraphVendors } from "./components/graph/sigmaIsland";
import { projectGraphSelection } from "./synthesisExportProjection";
import {
  normalizeStandaloneGraph,
  updateStandaloneGraph,
} from "./standaloneGraphState";

export function mountStandaloneGraph(
  root: HTMLElement,
  envelope: SynthesisWorkbenchGraphExportEnvelope,
  vendors: CitationGraphVendors = synthesisGraphVendors as unknown as CitationGraphVendors,
) {
  if (!envelope.snapshot) return () => {};
  root.classList.add(
    "standalone-graph-export-root",
    "standalone-graph-export-main",
  );
  let snapshot = {
    ...envelope.snapshot,
    graph: normalizeStandaloneGraph(envelope.snapshot.graph),
  };
  const t: Parameters<typeof projectGraphSelection>[2] = (key, args) =>
    formatSynthesisWorkbenchMessage(
      envelope.i18n?.messages?.[key] ||
        SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key],
      args,
    );
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
      paint();
    } else if (action === "setFilters" && payload.graph) {
      snapshot = {
        ...snapshot,
        graph: updateStandaloneGraph(
          snapshot.graph,
          envelope.graphLayouts || {},
          payload.graph,
        ),
      };
      paint();
    }
  };
  const paint = () =>
    render(
      h(GraphRegion, {
        selection: {
          ...projectGraphSelection(
            snapshot,
            { hostShape: "standaloneGraphOnly" },
            t,
          ),
          focusNodeId: envelope.focusNodeId,
          standaloneScopeLabel: envelope.scopeLabel,
        },
        t,
        onAction,
        vendors,
      }),
      root,
    );
  paint();
  const dispose = () => {
    render(null, root);
    root.classList.remove(
      "standalone-graph-export-root",
      "standalone-graph-export-main",
    );
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
          __zoteroSkillsSynthesisGraphExport?: SynthesisWorkbenchGraphExportEnvelope;
        }
      ).__zoteroSkillsSynthesisGraphExport;
const root =
  typeof document === "undefined" ? null : document.getElementById("app");
if (root && envelope) mountStandaloneGraph(root, envelope);
