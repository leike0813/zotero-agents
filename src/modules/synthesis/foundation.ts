import { getRuntimePersistencePaths } from "../runtimePersistence";
import { joinPath } from "../../utils/path";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
  sha256SynthesisEngineText,
} from "../../../packages/synthesis-engine/src/canonicalJson";
import { canonicalSynthesisTopicPathId } from "../../../packages/synthesis-application/src/topicCanonical";

export type SynthesisKnowledgeGraphPaths = {
  synthesisRoot: string;
  topicsRoot: string;
  conceptsRoot: string;
  topicGraphRoot: string;
  citationGraphRoot: string;
  tagsRoot: string;
  syncRoot: string;
  sidecarRoot: string;
  transactionsRoot: string;
  receiptsLog: string;
  eventsLog: string;
  diagnosticsLog: string;
  projectionRegistry: string;
};

function normalizeMarkdown(input: unknown) {
  return String(input ?? "").replace(/\r\n?/g, "\n");
}

export function sha256(input: unknown) {
  return sha256SynthesisEngineText(input);
}

export function canonicalizeJson(value: unknown) {
  return canonicalizeSynthesisEngineJson(value);
}

export function hashCanonicalJson(value: unknown) {
  return hashSynthesisEngineCanonicalJson(value);
}

export function topicPathId(topicId: string) {
  return canonicalSynthesisTopicPathId(topicId);
}

export function hashMarkdown(value: unknown) {
  return sha256(normalizeMarkdown(value));
}

function normalizePathForBoundary(value: string) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function pathSegmentsForBoundary(value: string) {
  return normalizePathForBoundary(value)
    .split("/")
    .filter((segment) => segment.length > 0);
}

function parentPathForBoundary(value: string, levels = 1) {
  let current = normalizePathForBoundary(value);
  for (let index = 0; index < levels; index += 1) {
    const slash = current.lastIndexOf("/");
    if (slash <= 0) {
      return current;
    }
    current = current.slice(0, slash);
  }
  return current;
}

export function resolveSynthesisPersistenceRoot(root: string) {
  const normalized = normalizePathForBoundary(root);
  const segments = pathSegmentsForBoundary(normalized);
  const leaf = (segments.at(-1) || "").toLocaleLowerCase("en-US");
  const parent = (segments.at(-2) || "").toLocaleLowerCase("en-US");
  if (leaf === "synthesis" && (parent === "data" || parent === "runtime")) {
    return parentPathForBoundary(normalized, 2);
  }
  if (leaf === "data" || leaf === "runtime" || leaf === "state") {
    return parentPathForBoundary(normalized);
  }
  return normalized;
}

export function resolveSynthesisRuntimeFileRoot(root: string) {
  return getRuntimePersistencePaths(resolveSynthesisPersistenceRoot(root))
    .synthesisDataRoot;
}

export function buildSynthesisKnowledgeGraphPaths(
  root: string,
): SynthesisKnowledgeGraphPaths {
  const synthesisRoot = resolveSynthesisRuntimeFileRoot(root);
  const sidecarRoot = joinPath(synthesisRoot, "sidecar");
  return {
    synthesisRoot,
    topicsRoot: joinPath(synthesisRoot, "topics"),
    conceptsRoot: joinPath(synthesisRoot, "concepts"),
    topicGraphRoot: joinPath(synthesisRoot, "topic-graph"),
    citationGraphRoot: joinPath(synthesisRoot, "citation-graph"),
    tagsRoot: joinPath(synthesisRoot, "tags"),
    syncRoot: joinPath(synthesisRoot, "sync"),
    sidecarRoot,
    transactionsRoot: joinPath(sidecarRoot, "transactions"),
    receiptsLog: joinPath(sidecarRoot, "canonical-store-receipts.jsonl"),
    eventsLog: joinPath(sidecarRoot, "canonical-store-events.jsonl"),
    diagnosticsLog: joinPath(sidecarRoot, "canonical-store-diagnostics.jsonl"),
    projectionRegistry: joinPath(sidecarRoot, "projection-registry.json"),
  };
}

export function buildSynthesisStoragePaths(root: string, topicId?: string) {
  const synthesisRoot = resolveSynthesisRuntimeFileRoot(root);
  const sidecarRoot = joinPath(synthesisRoot, "sidecar");
  const topicRoot = topicId
    ? joinPath(synthesisRoot, "topics", topicId)
    : joinPath(synthesisRoot, "topics");
  return {
    synthesisRoot,
    topicsRoot: joinPath(synthesisRoot, "topics"),
    topicRoot,
    legacyCurrentMarkdown: topicId ? joinPath(topicRoot, "current.md") : "",
    legacyCurrentMetadata: topicId ? joinPath(topicRoot, "current.json") : "",
    currentRoot: topicId ? joinPath(topicRoot, "current") : "",
    currentAssetsRoot: topicId ? joinPath(topicRoot, "current", "assets") : "",
    currentManifest: topicId
      ? joinPath(topicRoot, "current", "manifest.json")
      : "",
    currentArtifact: topicId
      ? joinPath(topicRoot, "current", "artifact.json")
      : "",
    currentMetadata: topicId
      ? joinPath(topicRoot, "current", "metadata.json")
      : "",
    currentSectionsRoot: topicId
      ? joinPath(topicRoot, "current", "sections")
      : "",
    currentTopicDetailHtml: topicId
      ? joinPath(topicRoot, "current", "assets", "topic-detail.html")
      : "",
    currentTopicDetailHtmlMetadata: topicId
      ? joinPath(
          topicRoot,
          "current",
          "assets",
          "topic-detail.html.metadata.json",
        )
      : "",
    sidecarRoot,
    index: joinPath(sidecarRoot, "index.json"),
    artifactState: joinPath(sidecarRoot, "artifact-state.json"),
    deletedRoot: joinPath(synthesisRoot, "deleted"),
    deletedArtifacts: joinPath(sidecarRoot, "deleted-topic-artifacts.json"),
    topicDefinitions: joinPath(sidecarRoot, "topic-definitions.json"),
    resolvers: joinPath(sidecarRoot, "resolvers.json"),
    resolvedPaperSets: joinPath(sidecarRoot, "resolved-paper-sets.json"),
    unifiedCitationGraph: joinPath(sidecarRoot, "unified-citation-graph.json"),
    unifiedCitationLayouts: joinPath(
      sidecarRoot,
      "unified-citation-layouts.json",
    ),
    unifiedCitationGraphMetrics: joinPath(
      sidecarRoot,
      "unified-citation-graph-metrics.json",
    ),
    log: joinPath(sidecarRoot, "log.jsonl"),
  };
}
