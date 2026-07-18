import {
  createSynthesisDurableBundleCodec,
  type SynthesisDurableBundleDraft,
} from "../../../packages/synthesis-contracts/src/durableBundle.js";
import {
  createSynthesisDurableBundleApplication,
  type SynthesisDurableBundleCanonicalImport,
  type SynthesisDurableBundleCanonicalSource,
  type SynthesisDurableBundleRepositoryTopicBasis,
} from "../../../packages/synthesis-application/src/durableBundleApplication.js";
import {
  canonicalSynthesisTopicJsonText,
  canonicalSynthesisTopicSectionFileName,
  canonicalSynthesisTopicPathId,
  computeSynthesisTopicCurrentHashes,
  rebuildSynthesisTopicCanonicalSnapshot,
  type SynthesisTopicCanonicalInspectResult,
  type SynthesisTopicCanonicalStore,
} from "../../../packages/synthesis-application/src/topicCanonical.js";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../../packages/synthesis-engine/src/canonicalJson.js";
import type { SynthesisRepositoryFoundationStore } from "../../../packages/synthesis-repository/src/index.js";

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
        ...Object.entries(result.snapshot.markdown ?? {})
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([relative, content]) => topicAsset(topic, relative, content)),
      ];
      return { basis: hashes.currentHash, drafts };
    },
    inspectCurrent(topic) {
      const inspected = options.canonicalStore.inspect({
        topicId: topic.topicId,
      });
      assertRegistryIdentity(topic, inspected);
      const current = options.canonicalStore.readCurrent({
        topicId: topic.topicId,
      });
      if (current.status !== "ready" || !current.snapshot) {
        throw new Error("durable_topic_current_invalid");
      }
      return computeSynthesisTopicCurrentHashes(current.snapshot).currentHash;
    },
  };
  if (
    options.canonicalStore.recoverImportBatch &&
    typeof options.repository.captureDurableImportState === "function" &&
    typeof options.repository.clearDurableImportCommit === "function"
  ) {
    const recovered = options.repository.captureDurableImportState();
    const recovery = options.canonicalStore.recoverImportBatch(
      recovered.commitReceipt
        ? {
            receiptId: recovered.commitReceipt.receiptId,
            manifestHash: recovered.commitReceipt.manifestHash,
          }
        : null,
    );
    if (recovery?.status === "repair_required") {
      throw new Error("durable_import_recovery_failed");
    }
    if (recovered.commitReceipt) {
      const targetsReady = recovered.commitReceipt.topicTargets.every(
        (topic) => {
          const inspected = options.canonicalStore.inspect({
            topicId: topic.topicId,
          });
          return (
            inspected.status === "ready" &&
            inspected.pathId === topic.pathId &&
            inspected.manifestHash === topic.manifestHash &&
            inspected.artifactHash === topic.artifactHash &&
            inspected.metadataHash === topic.metadataHash
          );
        },
      );
      if (!targetsReady) throw new Error("durable_import_recovery_incomplete");
      options.repository.clearDurableImportCommit(
        recovered.commitReceipt.receiptId,
      );
    }
  }

  const canonicalImport: SynthesisDurableBundleCanonicalImport = {
    prepare(entries, currentTopics) {
      const groups = new Map<
        string,
        Array<{ relativePath: string; content: string }>
      >();
      for (const entry of entries) {
        if (entry.entity_kind !== "topic_current_asset") continue;
        const data = entry.data as Record<string, unknown>;
        const relativePath = String(data.relative_path ?? "");
        const content = String(data.content ?? "");
        const parts = relativePath.split("/");
        if (
          parts.length < 4 ||
          parts[0] !== "topics" ||
          parts[2] !== "current"
        ) {
          throw new Error("durable_import_topic_asset_invalid");
        }
        const pathId = parts[1];
        groups.set(pathId, [
          ...(groups.get(pathId) ?? []),
          { relativePath: parts.slice(3).join("/"), content },
        ]);
      }
      const currentBases = new Map(
        currentTopics.map((topic) => [topic.pathId, topic]),
      );
      const items = [];
      const targets = [];
      for (const [pathId, assets] of [...groups].sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        const byPath = new Map(
          assets.map((asset) => [asset.relativePath, asset.content]),
        );
        const manifest = JSON.parse(byPath.get("manifest.json") ?? "null");
        const artifact = JSON.parse(byPath.get("artifact.json") ?? "null");
        const metadata = JSON.parse(byPath.get("metadata.json") ?? "null");
        const declared = (manifest as Record<string, unknown>)?.sections;
        if (
          !declared ||
          typeof declared !== "object" ||
          Array.isArray(declared)
        ) {
          throw new Error("durable_import_topic_snapshot_invalid");
        }
        const sections: Record<string, unknown> = {};
        for (const name of Object.keys(declared).sort()) {
          const fileName = `sections/${canonicalSynthesisTopicSectionFileName(name)}`;
          sections[name] = JSON.parse(byPath.get(fileName) ?? "null");
          byPath.delete(fileName);
        }
        byPath.delete("manifest.json");
        byPath.delete("artifact.json");
        byPath.delete("metadata.json");
        const markdown: Record<string, string> = {};
        for (const [relativePath, content] of byPath) {
          if (!relativePath.endsWith(".md")) {
            throw new Error("durable_import_topic_asset_invalid");
          }
          markdown[relativePath] = content;
        }
        const metadataData =
          metadata &&
          typeof metadata === "object" &&
          !Array.isArray(metadata) &&
          "data" in metadata &&
          metadata.data &&
          typeof metadata.data === "object" &&
          !Array.isArray(metadata.data)
            ? metadata.data
            : null;
        const topicId =
          metadataData && "topic_id" in metadataData
            ? String(metadataData.topic_id)
            : "";
        if (canonicalSynthesisTopicPathId(topicId) !== pathId) {
          throw new Error("durable_import_topic_identity_invalid");
        }
        const snapshot = rebuildSynthesisTopicCanonicalSnapshot({
          topicId,
          pathId,
          manifest,
          artifact,
          metadata,
          sections,
          markdown,
        });
        const hashes = computeSynthesisTopicCurrentHashes(snapshot);
        const current = currentBases.get(pathId);
        items.push({
          expectedBasis: current
            ? {
                manifestHash: current.manifestHash,
                artifactHash: current.artifactHash,
                currentHash: current.bundleHash,
              }
            : null,
          snapshot,
        });
        targets.push({
          topicId,
          pathId,
          manifestHash: hashes.manifestHash,
          artifactHash: hashes.artifactHash,
          metadataHash: hashes.metadataHash,
          bundleHash: hashes.currentHash,
        });
      }
      return { items, targets };
    },
    stage(args: {
      receiptId: string;
      manifestHash: string;
      items: Parameters<
        NonNullable<typeof options.canonicalStore.stageImportBatch>
      >[0]["items"];
    }) {
      if (!options.canonicalStore.stageImportBatch)
        throw new Error("canonical_import_unsupported");
      options.canonicalStore.stageImportBatch(args);
    },
    commit(receiptId: string) {
      const result = options.canonicalStore.commitImportBatch?.(receiptId);
      return result?.status === "promoted" ||
        result?.status === "failed_recovered"
        ? result.status
        : "repair_required";
    },
    discard(receiptId: string) {
      options.canonicalStore.discardImportBatch?.(receiptId);
    },
  };
  return createSynthesisDurableBundleApplication({
    repository: {
      captureDurableBundleState: () =>
        options.repository.captureDurableBundleState(),
      captureDurableImportState: () =>
        options.repository.captureDurableImportState(),
      applyDurableImportState: (args) =>
        options.repository.applyDurableImportState(args),
      clearDurableImportCommit: (receiptId) =>
        options.repository.clearDurableImportCommit(receiptId),
    },
    canonicalSource,
    canonicalImport,
    codec,
    now: options.now,
    producerVersion: options.producerVersion,
  });
}
