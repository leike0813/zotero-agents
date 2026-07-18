import {
  createSynthesisDurableBundleCodec,
  type SynthesisDurableBundleDraft,
} from "../../../packages/synthesis-contracts/src/durableBundle.js";
import {
  createSynthesisDurableBundleApplication,
  type SynthesisDurableBundleCanonicalSource,
  type SynthesisDurableBundleRepositoryTopicBasis,
} from "../../../packages/synthesis-application/src/durableBundleApplication.js";
import {
  canonicalSynthesisTopicJsonText,
  canonicalSynthesisTopicSectionFileName,
  computeSynthesisTopicCurrentHashes,
  type SynthesisTopicCanonicalInspectResult,
  type SynthesisTopicCanonicalStore,
} from "../../../packages/synthesis-application/src/topicCanonical.js";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../../packages/synthesis-engine/src/canonicalJson.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";

function currentBasis(result: SynthesisTopicCanonicalInspectResult) {
  if (result.status !== "ready") {
    throw new Error("durable_topic_current_invalid");
  }
  return hashSynthesisEngineCanonicalJson({
    topicId: result.topicId,
    pathId: result.pathId,
    manifestHash: result.manifestHash,
    artifactHash: result.artifactHash,
    metadataHash: result.metadataHash,
    sections: result.sections,
  });
}

function assertRegistryIdentity(
  topic: SynthesisDurableBundleRepositoryTopicBasis,
  inspected: SynthesisTopicCanonicalInspectResult,
) {
  if (
    inspected.status !== "ready" ||
    inspected.topicId !== topic.topicId ||
    inspected.pathId !== topic.pathId ||
    inspected.manifestHash !== topic.manifestHash ||
    inspected.artifactHash !== topic.artifactHash ||
    inspected.metadataHash !== topic.metadataHash
  ) {
    throw new Error("durable_topic_current_basis_mismatch");
  }
}

function topicAsset(
  topic: SynthesisDurableBundleRepositoryTopicBasis,
  relative: string,
  content: string,
): SynthesisDurableBundleDraft {
  const relativePath = `topics/${topic.pathId}/current/${relative}`;
  return {
    entityKind: "topic_current_asset",
    entityId: `topic-asset:${topic.pathId}:${topic.pathId}/current/${relative}`,
    schemaId: "synthesis.durable.topic_current_asset",
    data: {
      topic_id: topic.pathId,
      relative_path: relativePath,
      content,
    },
  };
}

export function createSynthesisSidecarDurableBundleApplication(options: {
  repository: SynthesisRepositoryFoundationStore;
  canonicalStore: SynthesisTopicCanonicalStore;
  now?: () => string;
  producerVersion?: string;
}) {
  const codec = createSynthesisDurableBundleCodec({
    canonicalizeJson: canonicalizeSynthesisEngineJson,
    hashCanonicalJson: hashSynthesisEngineCanonicalJson,
  });
  const canonicalSource: SynthesisDurableBundleCanonicalSource = {
    readCurrentAssets(topic) {
      const inspected = options.canonicalStore.inspect({
        topicId: topic.topicId,
      });
      assertRegistryIdentity(topic, inspected);
      const result = options.canonicalStore.readCurrent({
        topicId: topic.topicId,
      });
      if (
        result.status !== "ready" ||
        result.pathId !== topic.pathId ||
        !result.snapshot
      ) {
        throw new Error("durable_topic_current_invalid");
      }
      const hashes = computeSynthesisTopicCurrentHashes(result.snapshot);
      if (
        hashes.manifestHash !== topic.manifestHash ||
        hashes.artifactHash !== topic.artifactHash ||
        hashes.metadataHash !== topic.metadataHash
      ) {
        throw new Error("durable_topic_current_basis_mismatch");
      }
      const drafts = [
        topicAsset(
          topic,
          "manifest.json",
          canonicalSynthesisTopicJsonText(result.snapshot.manifest),
        ),
        topicAsset(
          topic,
          "artifact.json",
          canonicalSynthesisTopicJsonText(result.snapshot.artifact),
        ),
        topicAsset(
          topic,
          "metadata.json",
          canonicalSynthesisTopicJsonText(result.snapshot.metadata),
        ),
        ...Object.entries(result.snapshot.sections)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([name, value]) =>
            topicAsset(
              topic,
              `sections/${canonicalSynthesisTopicSectionFileName(name)}`,
              canonicalSynthesisTopicJsonText(value),
            ),
          ),
      ];
      return { basis: currentBasis(inspected), drafts };
    },
    inspectCurrent(topic) {
      const inspected = options.canonicalStore.inspect({
        topicId: topic.topicId,
      });
      assertRegistryIdentity(topic, inspected);
      return currentBasis(inspected);
    },
  };
  return createSynthesisDurableBundleApplication({
    repository: {
      captureDurableBundleState: () =>
        options.repository.captureDurableBundleState(),
    },
    canonicalSource,
    codec,
    now: options.now,
    producerVersion: options.producerVersion,
  });
}
