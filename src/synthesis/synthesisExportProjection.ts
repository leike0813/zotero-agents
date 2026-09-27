import { narrowGraphSurfaceView } from "./components/graph/graphModel";
import {
  defaultGraphDetailLabels,
  type SynthesisGraphRegionSelection,
} from "./components/graph/GraphRegion";
import {
  narrowTopicDetail,
  narrowArtifactReader,
  narrowReaderConcepts,
  narrowDigestResult,
  narrowStandaloneDigests,
  type ReaderRegionSelection,
} from "./components/reader/narrowing";
import type { SynthesisWorkbenchPageSnapshot } from "./synthesisWorkbenchTypes";
import type {
  SynthesisWorkbenchProjectionContext,
  SynthesisWorkbenchText,
} from "./synthesisWorkbenchPanelModel";

declare const __debug_mode__: boolean;

export function projectGraphSelection(
  snapshot: SynthesisWorkbenchPageSnapshot,
  context: Pick<SynthesisWorkbenchProjectionContext, "hostShape">,
  t: SynthesisWorkbenchText,
): SynthesisGraphRegionSelection {
  return {
    view: narrowGraphSurfaceView(snapshot.graph, snapshot.libraryId),
    standaloneExport: context.hostShape !== "hosted",
    standaloneGraphOnly: context.hostShape === "standaloneGraphOnly",
    returnTopicId: snapshot.reader?.topicId,
    debugLayoutDetails: typeof __debug_mode__ !== "undefined" && __debug_mode__,
    labels: defaultGraphDetailLabels(t),
  };
}

export function projectReaderSelection(
  snapshot: SynthesisWorkbenchPageSnapshot,
  context: Pick<
    SynthesisWorkbenchProjectionContext,
    | "hostShape"
    | "i18n"
    | "topicDetail"
    | "artifactReader"
    | "digestResult"
    | "standaloneDigests"
  >,
  pending: string[],
): ReaderRegionSelection {
  const detail = narrowTopicDetail(context.topicDetail, snapshot.libraryId);
  const artifact = narrowArtifactReader(context.artifactReader);
  return {
    kind: detail ? "topicDetail" : artifact ? "artifact" : "empty",
    standalone: context.hostShape !== "hosted",
    locale: context.i18n.locale,
    topicId:
      detail?.topicId || artifact?.topicId || snapshot.reader?.topicId || "",
    previousTab: snapshot.reader?.previousTab || "artifacts",
    detail,
    artifact,
    digestResult: narrowDigestResult(context.digestResult),
    standaloneDigests: narrowStandaloneDigests(context.standaloneDigests),
    concepts: narrowReaderConcepts(snapshot.concepts),
    updateIntentAvailable: (snapshot.artifacts?.rows || []).some((row) => {
      const artifactRow = row as {
        id?: string;
        updateIntent?: { available?: boolean; blockedReason?: string };
      };
      return (
        artifactRow.id === detail?.topicId &&
        Boolean(artifactRow.updateIntent) &&
        !artifactRow.updateIntent?.blockedReason
      );
    }),
    pendingCommands: [...new Set(pending.map((key) => key.split(":")[0]))],
  };
}
