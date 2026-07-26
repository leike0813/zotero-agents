import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_DURABLE_BUNDLE_LIMITS,
  SYNTHESIS_DURABLE_ENTITY_KINDS,
  createSynthesisDurableBundleCodec,
  type SynthesisDurableBundleDraft,
} from "../../packages/synthesis-contracts/src/durableBundle";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../packages/synthesis-engine/src/canonicalJson";
import {
  createSynthesisDurableBundleApplication,
  type SynthesisDurableBundleApplicationRepository,
} from "../../packages/synthesis-application/src/durableBundleApplication";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { createSynthesisSidecarDurableBundleApplication } from "../../apps/synthesis-service/src/durableBundleApplicationNode";
import { computeSynthesisTopicCurrentHashes } from "../../packages/synthesis-application/src/topicCanonical";

const NOW = "2026-07-18T08:00:00.000Z";

const codec = createSynthesisDurableBundleCodec({
  canonicalizeJson: canonicalizeSynthesisEngineJson,
  hashCanonicalJson: hashSynthesisEngineCanonicalJson,
});

function draft(
  entityKind: SynthesisDurableBundleDraft["entityKind"],
  entityId = `id:${entityKind}`,
): SynthesisDurableBundleDraft {
  return {
    entityKind,
    entityId,
    schemaId: `synthesis.durable.${entityKind}`,
    data: { entityKind, value: 1 },
  };
}

async function verifySnapshot(snapshot: ReturnType<typeof codec.buildExport>) {
  return codec.readAndVerify({
    readManifestText: async () => snapshot.manifestText,
    readAssetText: async (assetPath) =>
      snapshot.assets.find((asset) => asset.path === assetPath)?.text ?? null,
  });
}

async function expectRejected(operation: Promise<unknown>) {
  let rejected: unknown;
  try {
    await operation;
  } catch (error) {
    rejected = error;
  }
  assert.instanceOf(rejected, Error);
  return rejected as Error;
}

describe("Synthesis sidecar durable bundle export foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("defines all 23 kinds and builds deterministic v2-only bundles", async function () {
    assert.lengthOf(SYNTHESIS_DURABLE_ENTITY_KINDS, 23);
    const live = SYNTHESIS_DURABLE_ENTITY_KINDS.filter(
      (kind) => kind !== "tombstone",
    ).map((kind) => draft(kind));
    const first = codec.buildExport({
      drafts: live,
      generatedAt: NOW,
    });
    const second = codec.buildExport({
      drafts: [...live].reverse(),
      generatedAt: NOW,
    });

    assert.equal(first.manifest.manifest_schema_version, "2.0.0");
    assert.deepEqual(first, second);
    assert.equal(first.entries.length, 22);
    assert.isFalse(
      first.entries.some((entry) => entry.entity_kind === "tombstone"),
    );
    assert.deepEqual(
      first.assets.map((asset) => asset.path),
      [...first.assets.map((asset) => asset.path)].sort(),
    );
    assert.match(first.manifest.manifest_hash, /^sha256:[a-f0-9]{64}$/);
    assert.deepEqual(
      (await verifySnapshot(first)).value?.entries,
      first.entries,
    );
  });

  it("strictly rejects unknown fields, unsafe and duplicate identities, and mismatches", async function () {
    assert.throws(() =>
      codec.buildExport({
        drafts: [draft("concept"), draft("concept")],
        generatedAt: NOW,
      }),
    );
    const snapshot = codec.buildExport({
      drafts: [draft("concept")],
      generatedAt: NOW,
    });
    const unknownManifest = `${JSON.stringify({ ...snapshot.manifest, unknown: true }, null, 2)}\n`;
    const invalid = await codec.readAndVerify({
      readManifestText: async () => unknownManifest,
      readAssetText: async () => null,
    });
    assert.isUndefined(invalid.value);
    assert.includeMembers(
      invalid.diagnostics.map((row) => row.code),
      ["durable_manifest_fields_invalid"],
    );

    const unsafe = structuredClone(snapshot.manifest);
    unsafe.assets[0].path = "../escape.json";
    unsafe.manifest_hash = codec.hashManifest(unsafe);
    const unsafeResult = await codec.readAndVerify({
      readManifestText: async () => codec.canonicalText(unsafe),
      readAssetText: async () => snapshot.assets[0].text,
    });
    assert.include(
      unsafeResult.diagnostics.map((row) => row.code),
      "durable_path_invalid",
    );

    const wrongBytes = structuredClone(snapshot.manifest);
    wrongBytes.assets[0].bytes += 1;
    wrongBytes.manifest_hash = codec.hashManifest(wrongBytes);
    const mismatch = await codec.readAndVerify({
      readManifestText: async () => codec.canonicalText(wrongBytes),
      readAssetText: async () => snapshot.assets[0].text,
    });
    assert.include(
      mismatch.diagnostics.map((row) => row.code),
      "durable_asset_bytes_mismatch",
    );
  });

  it("reads strict legacy v1 per-entity assets but only writes v2", async function () {
    const envelope = codec.createEnvelope({
      ...draft("concept"),
      updatedAt: NOW,
    });
    const assetText = codec.canonicalText(envelope);
    const asset = {
      path: "concepts/concept.json",
      schema_id: envelope.schema_id,
      schema_version: envelope.schema_version,
      hash: hashSynthesisEngineCanonicalJson(assetText),
      bytes: assetText.length,
      entity_kind: envelope.entity_kind,
      entity_id: envelope.entity_id,
    };
    const base = {
      manifest_schema_version: "1.0.0",
      producer_version: "fixture",
      min_reader_version: "1.0.0",
      required_capabilities: ["durable-state.v1"],
      domain_versions: { concept: "1.0.0" },
      generated_at: NOW,
      asset_count: 1,
      assets: [asset],
    };
    const manifest = {
      ...base,
      manifest_hash: hashSynthesisEngineCanonicalJson(base),
    };
    const result = await codec.readAndVerify({
      readManifestText: async () => codec.canonicalText(manifest),
      readAssetText: async () => assetText,
    });
    assert.equal(result.value?.entries[0].entity_kind, "concept");
    assert.equal(
      codec.buildExport({ drafts: [draft("concept")], generatedAt: NOW })
        .manifest.manifest_schema_version,
      "2.0.0",
    );
  });

  it("fails indivisible bundles above the shared four-MiB limit", function () {
    assert.throws(() =>
      codec.buildExport({
        drafts: [
          {
            ...draft("concept"),
            data: {
              value: "x".repeat(SYNTHESIS_DURABLE_BUNDLE_LIMITS.bundleText + 1),
            },
          },
        ],
        generatedAt: NOW,
      }),
    );
  });

  it("captures the complete available repository corpus and topic bases in one stable state", function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "synthesis-durable-repo-"),
    );
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: "9".repeat(64),
      dataRootId: "c".repeat(64),
      now: () => NOW,
    });
    repository.store.upsertTopicApplicationState({
      topicId: "topic:one",
      pathId: "topic-one",
      title: "Topic one",
      definition: "Definition",
      language: "en",
      operation: "create",
      manifestHash: `sha256:${"1".repeat(64)}`,
      artifactHash: `sha256:${"2".repeat(64)}`,
      metadataHash: `sha256:${"3".repeat(64)}`,
      bundleHash: `sha256:${"4".repeat(64)}`,
      paperCount: 0,
      topicDefinitionJson: "{}",
      topicResolverJson: "{}",
      resolvedPaperSetJson: "{}",
    });

    const first = repository.store.captureDurableBundleState();
    const second = repository.store.captureDurableBundleState();
    assert.deepEqual(first, second);
    assert.deepEqual(first.drafts, []);
    assert.deepInclude(first.topicBases[0], {
      topicId: "topic:one",
      pathId: "topic-one",
      bundleHash: `sha256:${"4".repeat(64)}`,
    });
    repository.close();
  });

  it("maps only canonical Topic current JSON assets and re-inspects their identity", async function () {
    const snapshot = {
      topicId: "topic:canonical",
      pathId: "topic-canonical",
      manifest: { sections: { brief: {} } },
      artifact: { kind: "topic" },
      metadata: { language: "en" },
      sections: { brief: { text: "Brief" } },
    };
    const hashes = computeSynthesisTopicCurrentHashes(snapshot);
    const topicBasis = {
      topicId: snapshot.topicId,
      pathId: snapshot.pathId,
      manifestHash: hashes.manifestHash,
      artifactHash: hashes.artifactHash,
      metadataHash: hashes.metadataHash,
      bundleHash: `sha256:${"4".repeat(64)}`,
    };
    let inspectCount = 0;
    const canonicalStore = {
      inspect() {
        inspectCount += 1;
        return {
          status: "ready" as const,
          topicId: snapshot.topicId,
          pathId: snapshot.pathId,
          manifestHash: hashes.manifestHash,
          artifactHash: hashes.artifactHash,
          metadataHash: hashes.metadataHash,
          sections: [],
          diagnostics: [],
        };
      },
      readCurrent() {
        return {
          status: "ready" as const,
          topicId: snapshot.topicId,
          pathId: snapshot.pathId,
          snapshot,
          diagnostics: [] as [],
        };
      },
      promote() {
        return { status: "promoted" as const };
      },
      snapshot() {
        return {
          state: "ready" as const,
          schemaVersion: "synthesis-topic-canonical-store.v1" as const,
          storeId: "store",
        };
      },
      stopAdmission() {},
      close() {},
    };
    const application = createSynthesisSidecarDurableBundleApplication({
      repository: {
        captureDurableBundleState: () => ({
          aggregateBasis: { revision: 1 },
          topicBases: [topicBasis],
          drafts: [],
        }),
      } as never,
      canonicalStore,
      now: () => NOW,
    });
    const built = await application.buildExport();
    const topicAssets = built.entries.filter(
      (entry) => entry.entity_kind === "topic_current_asset",
    );
    assert.equal(inspectCount, 2);
    assert.deepEqual(
      topicAssets.map(
        (entry) => (entry.data as { relative_path: string }).relative_path,
      ),
      [
        "topics/topic-canonical/current/artifact.json",
        "topics/topic-canonical/current/manifest.json",
        "topics/topic-canonical/current/metadata.json",
        "topics/topic-canonical/current/sections/brief.json",
      ],
    );
    assert.isTrue(
      topicAssets.every(
        (entry) =>
          !(entry.data as { relative_path: string }).relative_path.includes(
            "/assets/",
          ),
      ),
    );
  });

  it("publishes bundles before manifest and rejects superseded capture", async function () {
    const writes: string[] = [];
    let captureCount = 0;
    const repository: SynthesisDurableBundleApplicationRepository = {
      captureDurableBundleState() {
        captureCount += 1;
        return {
          aggregateBasis: captureCount === 1 ? "basis:one" : "basis:two",
          topicBases: [],
          drafts: [draft("concept")],
        };
      },
    };
    const application = createSynthesisDurableBundleApplication({
      repository,
      codec,
      now: () => NOW,
    });
    await expectRejected(
      application.buildExport({
        writeAssetText: async (assetPath) => void writes.push(assetPath),
        writeManifestText: async () => void writes.push("manifest.json"),
      }),
    );
    assert.deepEqual(writes, []);

    captureCount = 0;
    repository.captureDurableBundleState = () => ({
      aggregateBasis: "basis:stable",
      topicBases: [],
      drafts: [draft("concept")],
    });
    const built = await application.buildExport({
      writeAssetText: async (assetPath) => void writes.push(assetPath),
      writeManifestText: async () => void writes.push("manifest.json"),
    });
    assert.equal(writes.at(-1), "manifest.json");
    assert.deepEqual(
      writes.slice(0, -1),
      built.assets.map((asset) => asset.path),
    );
  });

  it("uses one active lease and shutdown drains it", async function () {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const application = createSynthesisDurableBundleApplication({
      repository: {
        async captureDurableBundleState() {
          await gate;
          return { aggregateBasis: "basis", topicBases: [], drafts: [] };
        },
      },
      codec,
      now: () => NOW,
    });
    const active = application.buildExport();
    await Promise.resolve();
    await expectRejected(
      application.readAndVerify({
        readManifestText: async () => "{}",
        readAssetText: async () => null,
      }),
    );
    let drained = false;
    const shutdown = application.shutdown().then(() => (drained = true));
    await Promise.resolve();
    assert.isFalse(drained);
    release();
    await active;
    await shutdown;
    await expectRejected(application.buildExport());
  });

  it("keeps the Rust Durable export owner typed and represented in the parity corpus", function () {
    const projectRoot = path.resolve(process.cwd());
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs",
      ),
      "utf8",
    );
    const repository = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs",
      ),
      "utf8",
    );
    const corpus = JSON.parse(
      fs.readFileSync(
        path.join(
          projectRoot,
          "packages/synthesis-contracts/contract-set/synthesis-checkpoint-bundle-webdav-debug-application-parity-v1/corpus.json",
        ),
        "utf8",
      ),
    );
    assert.include(source, "pub trait DurableBundleSourcePort");
    assert.include(source, "pub fn build_export");
    assert.include(source, "pub fn read_and_verify");
    assert.include(repository, "pub struct DurableBundleCapture");
    assert.include(corpus.coverage.durableBundle, "v1_read_v2_manifest_last");
  });
});
