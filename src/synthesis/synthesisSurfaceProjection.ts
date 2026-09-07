import { projectSynthesisWorkbenchHomeSelection } from "./components/HomeRegion";
import type { SynthesisWorkbenchHomeSelection } from "./components/HomeRegion";
import type { SynthesisWorkbenchTopicsSelection } from "./components/TopicsRegion";
import {
  narrowTopicArtifactRows,
  narrowTopicGraphNodes,
  narrowTopicGraphEdges,
  narrowTopicGraphInspector,
  narrowTopicGraphSuggestedRelations,
  narrowTopicGraphRelationReviewItems,
  buildTopicRelationReviewQueue,
} from "./components/topicsRegionData";
import {
  projectConceptRowView,
  projectConceptReviewItemView,
  createConceptDisplayNameResolver,
  isOpenConceptReviewItem,
  type SynthesisWorkbenchConceptsSelection,
} from "./components/ConceptsRegion";
import {
  projectSynthesisTagsSelection,
  type SynthesisWorkbenchTagsSelection,
} from "./components/TagsRegion";
import { projectSynthesisReviewCenterSelection } from "./components/reviewCenter/reviewCenterProjection";
import type { SynthesisWorkbenchReviewCenterSelection } from "./components/reviewCenter/ReviewCenterRegion";
import { projectRegistrySelection } from "./registryProjection";
import type { SynthesisRegistrySelection } from "./components/registry/registryTypes";
import {
  projectReaderSelection,
  projectGraphSelection,
} from "./synthesisExportProjection";
import type { ReaderRegionSelection } from "./components/reader/narrowing";
import type { SynthesisGraphRegionSelection } from "./components/graph/GraphRegion";
import type { SynthesisWorkbenchPageSnapshot } from "./synthesisWorkbenchTypes";
import type {
  SynthesisWorkbenchProjectionContext,
  SynthesisWorkbenchText,
} from "./synthesisWorkbenchPanelModel";

export type SynthesisBusinessSurface =
  | { surface: "home"; selection: SynthesisWorkbenchHomeSelection }
  | { surface: "topics"; selection: SynthesisWorkbenchTopicsSelection }
  | { surface: "concepts"; selection: SynthesisWorkbenchConceptsSelection }
  | { surface: "tags"; selection: SynthesisWorkbenchTagsSelection }
  | { surface: "review"; selection: SynthesisWorkbenchReviewCenterSelection }
  | { surface: "index"; selection: SynthesisRegistrySelection }
  | { surface: "graph"; selection: SynthesisGraphRegionSelection }
  | { surface: "reader"; selection: ReaderRegionSelection };

export function projectBusinessSurface(
  snapshot: SynthesisWorkbenchPageSnapshot,
  context: SynthesisWorkbenchProjectionContext,
  t: SynthesisWorkbenchText,
): SynthesisBusinessSurface {
  const pending = [
    ...new Set([
      ...(snapshot.actions?.inFlight || []).map((operation) => operation.key),
      ...context.localPendingActions.keys(),
    ]),
  ].sort();
  switch (context.visibleSurface) {
    case "home":
      return {
        surface: "home",
        selection: projectSynthesisWorkbenchHomeSelection({
          snapshot,
          localPendingOperationKeys: pending,
        }),
      };
    case "topics": {
      const { artifacts, topicGraph } = snapshot;
      const nodes = narrowTopicGraphNodes(topicGraph?.nodes);
      return {
        surface: "topics",
        selection: {
          search: artifacts?.filters.search || "",
          sort: artifacts?.filters.sort || "title",
          viewMode: artifacts?.filters.viewMode || "list",
          hasAnyTopics: Boolean(artifacts?.rows.length),
          rows: narrowTopicArtifactRows(artifacts?.visibleRows),
          deletedCount: snapshot.deletedArtifacts?.count || 0,
          pendingOperationKeys: pending.filter((key) =>
            /^(runSynthesizeTopic|submitTopicSynthesisUpdate|rebuildTopicGraphIndex|acceptTopicGraphRelation|rejectTopicGraphRelation|applyTopicGraphReviewAction):/.test(
              key,
            ),
          ),
          graph:
            artifacts?.filters.viewMode === "graph"
              ? {
                  mode: topicGraph?.filters.mode || "hierarchy",
                  search: topicGraph?.filters.search || "",
                  hasAnyTopics: nodes.length > 0,
                  nodes: narrowTopicGraphNodes(topicGraph?.visibleNodes),
                  edges: narrowTopicGraphEdges(topicGraph?.visibleEdges),
                  inspector: narrowTopicGraphInspector(topicGraph?.inspector),
                  reviewQueue: buildTopicRelationReviewQueue({
                    suggestions: narrowTopicGraphSuggestedRelations(
                      topicGraph?.edges,
                    ),
                    relationReviews: narrowTopicGraphRelationReviewItems(
                      topicGraph?.reviewItems,
                    ),
                    nodes,
                    isResolved: () => false,
                  }),
                }
              : null,
        },
      };
    }
    case "concepts": {
      const concepts = snapshot.concepts;
      const labels = createConceptDisplayNameResolver(concepts?.rows || []);
      return {
        surface: "concepts",
        selection: {
          search: concepts?.filters.search || "",
          conceptType: concepts?.filters.conceptType || "all",
          status: concepts?.filters.status || "all",
          overlayEnabled: concepts?.filters.overlayEnabled === true,
          conceptTypes: concepts?.conceptTypes || [],
          projectionStale: concepts?.projection.stale === true,
          rowCount: concepts?.rows.length || 0,
          rows: (concepts?.visibleRows || []).map(projectConceptRowView),
          reviewItems: (concepts?.reviewItems || [])
            .filter(isOpenConceptReviewItem)
            .map((item) => projectConceptReviewItemView(item, labels)),
          reviewMergeTargets: concepts?.filters.reviewMergeTargets || {},
          pendingOperationKeys: pending.filter((key) =>
            /^(rebuildConceptKbIndex|deleteConceptEntry|applyConceptReviewAction):/.test(
              key,
            ),
          ),
        },
      };
    }
    case "tags":
      return {
        surface: "tags",
        selection: projectSynthesisTagsSelection({
          tags: snapshot.tags,
          pendingOperationKeys: pending,
          lastCompletedOperationKey: snapshot.actions?.lastCompleted?.key,
          lastFailedOperationKey: snapshot.actions?.lastFailed?.key,
          lastFailedMessage: snapshot.actions?.lastFailed?.message,
        }),
      };
    case "review":
      return {
        surface: "review",
        selection: projectSynthesisReviewCenterSelection(snapshot, t, pending),
      };
    case "index":
      return {
        surface: "index",
        selection: projectRegistrySelection(
          snapshot,
          pending,
          t,
          context.registryReview,
        ),
      };
    case "graph":
      return {
        surface: "graph",
        selection: projectGraphSelection(snapshot, context, t),
      };
    case "reader":
      return {
        surface: "reader",
        selection: projectReaderSelection(snapshot, context, pending),
      };
  }
}
