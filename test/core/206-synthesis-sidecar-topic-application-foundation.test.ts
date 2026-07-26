import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  rebuildSynthesisTopicApplicationApplyRequest,
  rebuildSynthesisTopicApplicationDetailRequest,
  rebuildSynthesisTopicApplicationListRequest,
} from "../../packages/synthesis-contracts/src/topicApplication";
import {
  createSynthesisTopicApplication,
  canonicalSynthesisTopicPathId,
  type SynthesisTopicCanonicalStore,
} from "../../packages/synthesis-application/src/index";
import type { SynthesisTopicStructuredArtifactEngine } from "../../packages/synthesis-engine/src/topicStructuredArtifact";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisSidecarTopicCanonicalStore } from "../../apps/synthesis-service/src/topicCanonicalStoreNode";

const PROFILE_ID = "a".repeat(64);
const DATA_ROOT_ID = "b".repeat(64);

function root() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "zs-topic-application-"));
}

const engine: SynthesisTopicStructuredArtifactEngine = {
  async validateManifest(request) {
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      ok: true,
      errors: [],
    };
  },
  async assembleArtifact(request) {
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      artifact: {
        schema_id: "synthesis.topic_synthesis_artifact",
        schema_version: "3.0.0",
        language: String(request.manifest.language || "en"),
        ...request.sections,
      },
    };
  },
  async validateArtifact(request) {
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      ok: true,
      errors: [],
    };
  },
  async applySectionPatch(request) {
    const patch = request.patchManifest.patch as Record<string, unknown>;
    const names = Array.isArray(patch?.changed_sections)
      ? patch.changed_sections.map(String)
      : Object.keys(request.changedSections);
    const sections = { ...request.currentSections };
    for (const name of names) {
      if (request.changedSections[name] !== undefined) {
        sections[name] = request.changedSections[name]!;
      }
    }
    return {
      contractVersion: request.contractVersion,
      algorithmVersion: request.algorithmVersion,
      status: "applied",
      sections,
      nextSectionHashes: {},
    };
  },
};

function createRequest(topicId = "topic-alpha") {
  const manifest = {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "3.0.0",
    topic_id: topicId,
    language: "en",
    sections: {
      claims: { path: "asset/0002" },
      source_papers: { path: "asset/0003" },
    },
  };
  return {
    bundle: {
      kind: "topic_synthesis",
      operation: "create",
      mode: "create",
      language: "en",
      topic_definition: {
        id: topicId,
        title: "Alpha Topic",
        definition: "A bounded Topic",
      },
      resolver_manifest_path: "asset/0004",
      analysis_manifest_path: "asset/0001",
      artifact_metadata: {},
      markdown: "",
    },
    assets: [
      {
        id: "asset/0001",
        mediaType: "application/json",
        text: JSON.stringify(manifest),
      },
      {
        id: "asset/0002",
        mediaType: "application/json",
        text: JSON.stringify([{ id: "claim:one", text: "One" }]),
      },
      {
        id: "asset/0003",
        mediaType: "application/json",
        text: JSON.stringify([{ paper_ref: "1:AAAA" }]),
      },
      {
        id: "asset/0004",
        mediaType: "application/json",
        text: JSON.stringify({
          resolver: { query: "alpha" },
          resolved_paper_set: { papers: [{ paper_ref: "1:AAAA" }] },
        }),
      },
    ],
  };
}

function owners(runtimeRoot: string) {
  const repository = openSynthesisSidecarIsolatedRepository({
    profileRuntimeRoot: runtimeRoot,
    profileId: PROFILE_ID,
    dataRootId: DATA_ROOT_ID,
    now: () => "2026-07-17T12:00:00.000Z",
  });
  const canonicalStore = openSynthesisSidecarTopicCanonicalStore({
    profileRuntimeRoot: runtimeRoot,
    profileId: PROFILE_ID,
    dataRootId: DATA_ROOT_ID,
  });
  return { repository, canonicalStore };
}

describe("Synthesis sidecar Topic application foundation", function () {
  it("strictly rebuilds requests and rejects unknown, duplicate, and traversal inputs", function () {
    assert.deepEqual(rebuildSynthesisTopicApplicationListRequest({}), {
      cursor: "",
      limit: 50,
    });
    assert.deepEqual(
      rebuildSynthesisTopicApplicationDetailRequest({ topicId: "topic-alpha" }),
      { topicId: "topic-alpha" },
    );
    assert.throws(() =>
      rebuildSynthesisTopicApplicationListRequest({ unknown: true }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicApplicationApplyRequest({
        bundle: { unknown: true },
        assets: [],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicApplicationApplyRequest({
        bundle: {},
        assets: [
          { id: "asset/one", mediaType: "application/json", text: "{}" },
          { id: "asset/one", mediaType: "application/json", text: "{}" },
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTopicApplicationApplyRequest({
        bundle: {},
        assets: [
          { id: "../escape", mediaType: "application/json", text: "{}" },
        ],
      }),
    );
  });

  it("rejects missing declared assets before creating an operation", async function () {
    const runtimeRoot = root();
    const owner = owners(runtimeRoot);
    const application = createSynthesisTopicApplication({
      canonicalStore: owner.canonicalStore,
      repository: owner.repository.store,
      engine,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const request = createRequest();
    request.assets = request.assets.filter(
      (asset) => asset.id !== "asset/0004",
    );
    const result = await application.apply(request);
    assert.equal(result.status, "invalid_request");
    assert.isEmpty(
      owner.repository.store.listOperations({ includeCompleted: true }),
    );
    assert.equal(
      owner.canonicalStore.inspect({ topicId: "topic-alpha" }).status,
      "absent",
    );
    owner.canonicalStore.close();
    owner.repository.close();
  });

  it("creates, lists, reads, conflicts, and persists across owner restart", async function () {
    const runtimeRoot = root();
    const first = owners(runtimeRoot);
    const application = createSynthesisTopicApplication({
      canonicalStore: first.canonicalStore,
      repository: first.repository.store,
      engine,
      now: () => "2026-07-17T12:00:00.000Z",
      createOperationId: () => "topic-apply-create",
    });
    const created = await application.apply(createRequest());
    assert.equal(created.status, "persisted", JSON.stringify(created));
    assert.match(String(created.hashes.manifest), /^sha256:/);
    assert.include(first.repository.store.getOperation("topic-apply-create"), {
      status: "completed",
      phase: "completed",
    });
    assert.equal(application.list({}).topics[0]?.topicId, "topic-alpha");
    assert.equal(
      application.detail({ topicId: "topic-alpha" }).status,
      "ready",
    );
    const internal = first.canonicalStore.readCurrent({
      topicId: "topic-alpha",
    });
    assert.equal(internal.status, "ready");
    assert.notProperty(
      first.canonicalStore.inspect({ topicId: "topic-alpha" }),
      "snapshot",
    );
    const duplicate = await application.apply(createRequest());
    assert.equal(duplicate.status, "topic_exists");
    first.canonicalStore.close();
    first.repository.close();

    const second = owners(runtimeRoot);
    const restarted = createSynthesisTopicApplication({
      canonicalStore: second.canonicalStore,
      repository: second.repository.store,
      engine,
      now: () => "2026-07-17T12:01:00.000Z",
    });
    assert.equal(restarted.list({}).total, 1);
    assert.equal(restarted.detail({ topicId: "topic-alpha" }).status, "ready");
    second.canonicalStore.close();
    second.repository.close();
  });

  it("returns a stable conflict before update promotion", async function () {
    const runtimeRoot = root();
    const owner = owners(runtimeRoot);
    const application = createSynthesisTopicApplication({
      canonicalStore: owner.canonicalStore,
      repository: owner.repository.store,
      engine,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    await application.apply(createRequest());
    const update = createRequest();
    update.bundle.operation = "update_full";
    update.bundle.mode = "update";
    Object.assign(update.bundle, {
      base_hashes: {
        artifact: "sha256:" + "1".repeat(64),
        manifest: "sha256:" + "2".repeat(64),
        metadata: "sha256:" + "3".repeat(64),
      },
    });
    const result = await application.apply(update);
    assert.equal(result.status, "conflict");
    assert.isNotEmpty(result.mismatches);
    assert.equal(application.list({}).total, 1);
    owner.canonicalStore.close();
    owner.repository.close();
  });

  it("applies a structured section patch over a complete current snapshot", async function () {
    const runtimeRoot = root();
    const owner = owners(runtimeRoot);
    const application = createSynthesisTopicApplication({
      canonicalStore: owner.canonicalStore,
      repository: owner.repository.store,
      engine,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    assert.equal(
      (await application.apply(createRequest())).status,
      "persisted",
    );
    const patchRequest = {
      bundle: {
        kind: "topic_synthesis",
        operation: "update_patch",
        mode: "update",
        language: "en",
        topic_id: "topic-alpha",
        topic_definition: {},
        analysis_manifest_path: "asset/0001",
        artifact_metadata: {},
        read_section_hashes: {},
        base_hashes: {},
        markdown: "",
      },
      assets: [
        {
          id: "asset/0001",
          mediaType: "application/json",
          text: JSON.stringify({
            schema_id: "synthesis.topic_section_patch_manifest",
            schema_version: "2.0.0",
            patch: {
              changed_sections: ["claims"],
              sections: { claims: { path: "asset/0002" } },
            },
          }),
        },
        {
          id: "asset/0002",
          mediaType: "application/json",
          text: JSON.stringify([{ id: "claim:two", text: "Two" }]),
        },
      ],
    };
    const patched = await application.apply(patchRequest);
    assert.equal(patched.status, "persisted");
    const detail = application.detail({ topicId: "topic-alpha" });
    assert.equal(detail.status, "ready");
    if (detail.status === "ready") {
      assert.deepEqual(detail.snapshot.sections.claims, [
        { id: "claim:two", text: "Two" },
      ]);
    }
    owner.canonicalStore.close();
    owner.repository.close();
  });

  it("fails closed when the canonical owner requires repair", async function () {
    const runtimeRoot = root();
    const owner = owners(runtimeRoot);
    const topicId = "topic-alpha";
    const pathId = canonicalSynthesisTopicPathId(topicId);
    const repairStore: SynthesisTopicCanonicalStore = {
      inspect: () => ({
        status: "absent",
        topicId,
        pathId,
        manifestHash: null,
        artifactHash: null,
        metadataHash: null,
        sections: [],
        diagnostics: [],
      }),
      readCurrent: () => ({
        status: "absent",
        topicId,
        pathId,
        snapshot: null,
        diagnostics: [],
      }),
      promote: () => ({ status: "repair_required" }),
      snapshot: () => ({
        state: "repair_required",
        schemaVersion: "synthesis-topic-canonical-store.v1",
        storeId: "c".repeat(64),
      }),
      stopAdmission() {},
      close() {},
    };
    const application = createSynthesisTopicApplication({
      canonicalStore: repairStore,
      repository: owner.repository.store,
      engine,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const result = await application.apply(createRequest());
    assert.equal(result.status, "repair_required");
    assert.equal(application.list({}).total, 0);
    owner.canonicalStore.close();
    owner.repository.close();
  });

  it("keeps canonical current when post-commit projection fails", async function () {
    const runtimeRoot = root();
    const owner = owners(runtimeRoot);
    const failingRepository = {
      ...owner.repository.store,
      upsertTopicApplicationState() {
        throw new Error("projection failed");
      },
    };
    const application = createSynthesisTopicApplication({
      canonicalStore: owner.canonicalStore,
      repository: failingRepository,
      engine,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    const result = await application.apply(createRequest());
    assert.equal(result.status, "persisted");
    assert.include(result.warnings, "topic_projection_failed");
    assert.equal(
      owner.canonicalStore.inspect({ topicId: "topic-alpha" }).status,
      "ready",
    );
    owner.canonicalStore.close();
    owner.repository.close();
  });

  it("stops admission and drains every admitted apply before shutdown", async function () {
    const runtimeRoot = root();
    const owner = owners(runtimeRoot);
    let startedCount = 0;
    let resolveBothStarted!: () => void;
    const bothStarted = new Promise<void>((resolve) => {
      resolveBothStarted = resolve;
    });
    const releases = new Map<string, () => void>();
    const drainingEngine: SynthesisTopicStructuredArtifactEngine = {
      ...engine,
      async validateManifest(request) {
        const topicId = String(request.manifest.topic_id);
        startedCount += 1;
        if (startedCount === 2) resolveBothStarted();
        await new Promise<void>((resolve) => releases.set(topicId, resolve));
        return engine.validateManifest(request);
      },
    };
    const application = createSynthesisTopicApplication({
      canonicalStore: owner.canonicalStore,
      repository: owner.repository.store,
      engine: drainingEngine,
      now: () => "2026-07-17T12:00:00.000Z",
    });
    let shutdownComplete = false;
    try {
      const first = application.apply(createRequest("topic-first"));
      const second = application.apply(createRequest("topic-second"));
      await bothStarted;

      const shutdown = application.shutdown().then(() => {
        shutdownComplete = true;
      });
      assert.equal(
        (await application.apply(createRequest("topic-rejected"))).status,
        "repair_required",
      );
      await Promise.resolve();
      assert.isFalse(shutdownComplete);

      releases.get("topic-first")?.();
      assert.equal((await first).status, "persisted");
      await Promise.resolve();
      assert.isFalse(shutdownComplete);

      releases.get("topic-second")?.();
      assert.equal((await second).status, "persisted");
      await shutdown;
      assert.isTrue(shutdownComplete);
    } finally {
      for (const release of releases.values()) release();
      owner.canonicalStore.close();
      owner.repository.close();
    }
  });

  it("exposes a typed Rust Topic library owner without a mutation capability", function () {
    const applicationRoot = path.resolve(
      "native/synthesis-sidecar/crates/synthesis-application/src",
    );
    const facade = fs.readFileSync(
      path.join(applicationRoot, "lib.rs"),
      "utf8",
    );
    const topic = fs.readFileSync(
      path.join(applicationRoot, "topic.rs"),
      "utf8",
    );
    const candidate = fs.readFileSync(
      "native/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs",
      "utf8",
    );

    assert.include(facade, "pub mod topic");
    assert.include(topic, "pub struct TopicApplication");
    assert.include(topic, "pub fn stop_admission");
    assert.include(topic, "pub fn shutdown");
    assert.notInclude(facade, "ApplicationKind");
    assert.notInclude(facade, "ApplicationCommand");
    assert.notInclude(candidate, '"topics.canonical.apply"');
  });
});
