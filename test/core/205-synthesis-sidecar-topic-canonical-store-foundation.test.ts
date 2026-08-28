import { assert } from "chai";
import fs from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import {
  canonicalSynthesisTopicJsonText,
  canonicalSynthesisTopicSectionFileName,
  computeSynthesisTopicCurrentHashes,
  rebuildSynthesisTopicCanonicalInspectRequest,
  rebuildSynthesisTopicCanonicalInspectResult,
  rebuildSynthesisTopicCanonicalSnapshot,
  canonicalSynthesisTopicPathId,
  type SynthesisTopicCanonicalStore,
  type SynthesisTopicCanonicalSnapshot,
} from "../../packages/synthesis-application/src/topicCanonical";
import {
  SynthesisTopicCanonicalStoreInterruption,
  openSynthesisSidecarTopicCanonicalStore,
} from "../../apps/synthesis-service/src/topicCanonicalStoreNode";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import { startSynthesisSidecarServer } from "../../apps/synthesis-service/src/server";
import type { SynthesisSidecarRuntimeConfig } from "../../apps/synthesis-service/src/runtimeConfig";
import type { SynthesisSidecarComputeWorkerPool } from "../../apps/synthesis-service/src/computeWorkerPool";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";

const PROFILE_ID = "1".repeat(64);
const DATA_ROOT_ID = "2".repeat(64);
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";

function runtimeConfig(
  profileRuntimeRoot: string,
): SynthesisSidecarRuntimeConfig {
  return {
    schema: "synthesis-sidecar-launch-config.v4",
    profileId: PROFILE_ID,
    libraryId: 1,
    profileRuntimeRoot,
    runtimeRootId: "3".repeat(64),
    dataRootId: DATA_ROOT_ID,
    bundleId: "4".repeat(64),
    implementation: "rust-native",
    target: "linux-x64",
    targetTriple: "x86_64-unknown-linux-gnu",
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
    serviceVersion: "0.1.0-test",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-schema.test.v1",
    supervisorInstanceId: "canonical-store-supervisor",
    repositoryDbPath: path.join(profileRuntimeRoot, "state", "synthesis.db"),
    canonicalRoot: path.join(profileRuntimeRoot, "data", "synthesis"),
    reverseHost: {
      host: "127.0.0.1",
      port: 1,
      authorizationToken: "reverse-host-token-0123456789abcdef",
    },
    clientToken: CLIENT_TOKEN,
    lifecycleToken: "lifecycle-token-0123456789abcdef0123456789abcdef",
    port: 0,
  };
}

function idleComputePool(): SynthesisSidecarComputeWorkerPool {
  return {
    async runCitationGraphLayout() {
      throw new Error("unexpected compute");
    },
    async runCitationGraphMetrics() {
      throw new Error("unexpected compute");
    },
    async runCitationGraphBuild() {
      throw new Error("unexpected compute");
    },
    snapshot: () => ({
      state: "idle",
      active: 0,
      queued: 0,
      restartCount: 0,
      failureCount: 0,
    }),
    async shutdown() {},
  };
}

async function within<T>(promise: Promise<T>, timeoutMs = 2_000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("deadline_exceeded")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function snapshot(
  topicId = "object-detection",
): SynthesisTopicCanonicalSnapshot {
  const sections = {
    claims: [{ id: "claim:one", text: "Canonical claim" }],
    source_papers: [{ item_ref: "1:AAAA1111" }],
  };
  const artifact = {
    schema_id: "synthesis.topic_synthesis_artifact",
    schema_version: "4.0.0",
    language: "en",
    ...sections,
  };
  const metadata = {
    schema_id: "synthesis.topic_artifact_metadata",
    schema_version: "1.0.0",
    created_at: "2026-07-17T00:00:00.000Z",
    updated_at: "2026-07-17T00:00:00.000Z",
    data: { topic_id: topicId, language: "en" },
  };
  const hashes = computeSynthesisTopicCurrentHashes({
    manifest: {},
    artifact,
    metadata,
    sections,
  });
  return rebuildSynthesisTopicCanonicalSnapshot({
    topicId,
    pathId: canonicalSynthesisTopicPathId(topicId),
    manifest: {
      schema_id: "synthesis.topic_analysis_manifest",
      schema_version: "3.0.0",
      language: "en",
      sections: {
        claims: { path: "claims.json" },
        source_papers: { path: "source-papers.json" },
      },
      artifact_hash: hashes.artifactHash,
      metadata_hash: hashes.metadataHash,
      section_hashes: hashes.sectionHashes,
    },
    artifact,
    metadata,
    sections,
  });
}

function revisedSnapshot(): SynthesisTopicCanonicalSnapshot {
  const current = snapshot();
  const sections = {
    ...current.sections,
    claims: [{ id: "claim:two", text: "Revised canonical claim" }],
  };
  const artifact = { ...current.artifact, ...sections };
  const metadata = {
    ...current.metadata,
    updated_at: "2026-07-17T00:01:00.000Z",
    data: { topic_id: current.topicId, language: "en", revision: 2 },
  };
  const hashes = computeSynthesisTopicCurrentHashes({
    manifest: current.manifest,
    artifact,
    metadata,
    sections,
  });
  return rebuildSynthesisTopicCanonicalSnapshot({
    ...current,
    manifest: {
      ...current.manifest,
      artifact_hash: hashes.artifactHash,
      metadata_hash: hashes.metadataHash,
      section_hashes: hashes.sectionHashes,
    },
    artifact,
    metadata,
    sections,
  });
}

describe("Synthesis sidecar Topic canonical store foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function root() {
    const value = fs.mkdtempSync(path.join(os.tmpdir(), "zs-canonical-"));
    roots.push(value);
    return value;
  }

  it("strictly rebuilds canonical snapshot and inspect DTOs", function () {
    const current = snapshot();
    assert.equal(current.pathId, "object-detection");
    assert.throws(() =>
      rebuildSynthesisTopicCanonicalSnapshot({ ...current, unknown: true }),
    );
    assert.deepEqual(
      rebuildSynthesisTopicCanonicalInspectRequest({ topicId: "x" }),
      {
        topicId: "x",
      },
    );
    assert.throws(() =>
      rebuildSynthesisTopicCanonicalInspectRequest({
        topicId: "x",
        extra: true,
      }),
    );
    const absent = rebuildSynthesisTopicCanonicalInspectResult({
      status: "absent",
      topicId: "x",
      pathId: "x",
      manifestHash: null,
      artifactHash: null,
      metadataHash: null,
      sections: [],
      diagnostics: [],
    });
    assert.equal(absent.status, "absent");
    assert.throws(() =>
      rebuildSynthesisTopicCanonicalInspectResult({ ...absent, payload: {} }),
    );
  });

  it("keeps canonical hashes, filenames, and bytes deterministic", function () {
    const current = snapshot();
    const hashes = computeSynthesisTopicCurrentHashes(current);
    assert.match(hashes.manifestHash, /^sha256:/);
    assert.equal(hashes.structuredHash, hashes.artifactHash);
    assert.equal(
      canonicalSynthesisTopicSectionFileName("source_papers"),
      "source-papers.json",
    );
    assert.equal(
      canonicalSynthesisTopicJsonText({ z: 1, a: 2 }),
      '{"a":2,"z":1}\n',
    );
  });

  it("creates, updates with CAS, persists across restart, and rejects stale basis without writes", function () {
    const profileRuntimeRoot = root();
    let store = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const first = snapshot();
    assert.equal(
      store.promote({ expectedBasis: null, snapshot: first }).status,
      "promoted",
    );
    const ready = store.inspect({ topicId: first.topicId });
    assert.equal(ready.status, "ready");
    const currentBytes = fs.readFileSync(
      path.join(
        store.paths.root,
        "topics/object-detection/current/artifact.json",
      ),
      "utf8",
    );
    const mismatch = store.promote({
      expectedBasis: {
        manifestHash: "sha256:" + "0".repeat(64),
        artifactHash: "sha256:" + "0".repeat(64),
      },
      snapshot: first,
    });
    assert.equal(mismatch.status, "basis_mismatch");
    assert.equal(
      fs.readFileSync(
        path.join(
          store.paths.root,
          "topics/object-detection/current/artifact.json",
        ),
        "utf8",
      ),
      currentBytes,
    );
    store.close();
    store = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(store.inspect({ topicId: first.topicId }).status, "ready");
    store.close();
  });

  it("returns global backpressure and rolls back a failed promote", function () {
    const profileRuntimeRoot = root();
    let nestedStatus = "";
    const holder: {
      store?: ReturnType<typeof openSynthesisSidecarTopicCanonicalStore>;
    } = {};
    const store = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      fault(point) {
        if (point === "lock_acquired" && !nestedStatus) {
          nestedStatus = holder.store!.promote({
            expectedBasis: null,
            snapshot: snapshot("other"),
          }).status;
        }
      },
    });
    holder.store = store;
    assert.equal(
      store.promote({ expectedBasis: null, snapshot: snapshot() }).status,
      "promoted",
    );
    assert.equal(nestedStatus, "canonical_store_busy");
    store.close();

    const failed = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      fault(point) {
        if (point === "current_promoted") throw new Error("injected");
      },
    });
    const basis = failed.inspect({ topicId: "object-detection" });
    const result = failed.promote({
      expectedBasis: {
        manifestHash: basis.manifestHash!,
        artifactHash: basis.artifactHash!,
      },
      snapshot: snapshot(),
    });
    assert.equal(result.status, "failed_recovered");
    assert.equal(
      failed.inspect({ topicId: "object-detection" }).artifactHash,
      basis.artifactHash,
    );
    failed.close();
  });

  it("rolls back every durable promotion phase before receipt commit", function () {
    for (const faultPoint of [
      "staging_written",
      "journal_written",
      "current_backed_up",
      "current_promoted",
      "receipt_written",
    ] as const) {
      const profileRuntimeRoot = root();
      const first = openSynthesisSidecarTopicCanonicalStore({
        profileRuntimeRoot,
        profileId: PROFILE_ID,
        dataRootId: DATA_ROOT_ID,
      });
      assert.equal(
        first.promote({ expectedBasis: null, snapshot: snapshot() }).status,
        "promoted",
      );
      const basis = first.inspect({ topicId: "object-detection" });
      first.close();
      const failing = openSynthesisSidecarTopicCanonicalStore({
        profileRuntimeRoot,
        profileId: PROFILE_ID,
        dataRootId: DATA_ROOT_ID,
        fault(point) {
          if (point === faultPoint) throw new Error(`fault:${point}`);
        },
      });
      assert.equal(
        failing.promote({
          expectedBasis: {
            manifestHash: basis.manifestHash!,
            artifactHash: basis.artifactHash!,
          },
          snapshot: revisedSnapshot(),
        }).status,
        "failed_recovered",
        faultPoint,
      );
      const after = failing.inspect({ topicId: "object-detection" });
      assert.equal(after.manifestHash, basis.manifestHash, faultPoint);
      assert.equal(after.artifactHash, basis.artifactHash, faultPoint);
      failing.close();
    }
  });

  it("rejects traversal, bounds, hash drift, missing files, symlinks, and identity drift", function () {
    assert.throws(() =>
      rebuildSynthesisTopicCanonicalInspectRequest({ topicId: "../escape" }),
    );
    const tooDeep = snapshot();
    let nested: Record<string, unknown> = {};
    for (let index = 0; index < 40; index += 1) nested = { nested };
    const deepArtifact = { ...tooDeep.artifact, nested };
    const deepHashes = computeSynthesisTopicCurrentHashes({
      ...tooDeep,
      artifact: deepArtifact,
    });
    assert.throws(() =>
      rebuildSynthesisTopicCanonicalSnapshot({
        ...tooDeep,
        artifact: deepArtifact,
        manifest: {
          ...tooDeep.manifest,
          artifact_hash: deepHashes.artifactHash,
        },
      }),
    );
    const duplicateBase = snapshot();
    const duplicateSections = {
      ...duplicateBase.sections,
      a_b: { value: 1 },
      "a-b": { value: 2 },
    };
    const duplicateHashes = computeSynthesisTopicCurrentHashes({
      ...duplicateBase,
      sections: duplicateSections,
    });
    assert.throws(
      () =>
        rebuildSynthesisTopicCanonicalSnapshot({
          ...duplicateBase,
          sections: duplicateSections,
          manifest: {
            ...duplicateBase.manifest,
            sections: {
              ...(duplicateBase.manifest.sections as Record<string, unknown>),
              a_b: { path: "a-b.json" },
              "a-b": { path: "a-b.json" },
            },
            section_hashes: duplicateHashes.sectionHashes,
          },
        }),
      /collide/,
    );

    const profileRuntimeRoot = root();
    const store = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      store.promote({ expectedBasis: null, snapshot: snapshot() }).status,
      "promoted",
    );
    const currentRoot = path.join(
      store.paths.root,
      "topics/object-detection/current",
    );
    fs.writeFileSync(path.join(currentRoot, "artifact.json"), "{}\n");
    assert.include(
      store.inspect({ topicId: "object-detection" }).diagnostics,
      "hash_mismatch",
    );
    fs.unlinkSync(path.join(currentRoot, "metadata.json"));
    assert.include(
      store.inspect({ topicId: "object-detection" }).diagnostics,
      "topic_current_missing_file",
    );
    store.close();

    const markerPath = store.paths.markerPath;
    fs.writeFileSync(markerPath, '{"schema":"wrong"}\n');
    assert.throws(
      () =>
        openSynthesisSidecarTopicCanonicalStore({
          profileRuntimeRoot,
          profileId: PROFILE_ID,
          dataRootId: DATA_ROOT_ID,
        }),
      /canonical_store_identity_invalid/,
    );

    if (process.platform !== "win32") {
      const symlinkRoot = root();
      const symlinkStore = openSynthesisSidecarTopicCanonicalStore({
        profileRuntimeRoot: symlinkRoot,
        profileId: PROFILE_ID,
        dataRootId: DATA_ROOT_ID,
      });
      symlinkStore.promote({ expectedBasis: null, snapshot: snapshot() });
      const artifactPath = path.join(
        symlinkStore.paths.root,
        "topics/object-detection/current/artifact.json",
      );
      fs.unlinkSync(artifactPath);
      fs.symlinkSync("metadata.json", artifactPath);
      assert.include(
        symlinkStore.inspect({ topicId: "object-detection" }).diagnostics,
        "symlink_forbidden",
      );
      symlinkStore.close();
    }
  });

  it("recovers an interrupted journal on restart and rejects unsafe current trees", function () {
    const profileRuntimeRoot = root();
    const interrupted = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      fault(point) {
        if (point === "current_promoted") {
          throw new SynthesisTopicCanonicalStoreInterruption("crash");
        }
      },
    });
    assert.throws(() =>
      interrupted.promote({ expectedBasis: null, snapshot: snapshot() }),
    );
    const recovered = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      recovered.inspect({ topicId: "object-detection" }).status,
      "absent",
    );
    assert.equal(
      recovered.promote({ expectedBasis: null, snapshot: snapshot() }).status,
      "promoted",
    );
    const currentRoot = path.join(
      recovered.paths.root,
      "topics/object-detection/current",
    );
    fs.writeFileSync(path.join(currentRoot, "unknown.json"), "{}\n");
    const invalid = recovered.inspect({ topicId: "object-detection" });
    assert.equal(invalid.status, "invalid");
    assert.include(invalid.diagnostics, "unknown_current_entry");
    recovered.close();
  });

  it("serves authenticated bounded inspect without entering the worker pool", async function () {
    const profileRuntimeRoot = root();
    const canonicalStore = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      canonicalStore.promote({ expectedBasis: null, snapshot: snapshot() })
        .status,
      "promoted",
    );
    let workerCalls = 0;
    const computePool: SynthesisSidecarComputeWorkerPool = {
      async runCitationGraphLayout() {
        workerCalls += 1;
        throw new Error("unexpected worker call");
      },
      async runCitationGraphMetrics() {
        workerCalls += 1;
        throw new Error("unexpected worker call");
      },
      async runCitationGraphBuild() {
        workerCalls += 1;
        throw new Error("unexpected worker call");
      },
      snapshot: () => ({
        state: "busy",
        active: 1,
        queued: 2,
        restartCount: 0,
        failureCount: 0,
      }),
      async shutdown() {},
    };
    const config = runtimeConfig(profileRuntimeRoot);
    const runtime = await startSynthesisSidecarServer(
      config,
      "canonical-store-service",
      { canonicalStore, computePool },
    );
    const call = async (token: string, payload: Record<string, unknown>) =>
      fetch(
        `http://${runtime.host}:${runtime.port}${SYNTHESIS_SIDECAR_CALL_PATH}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            protocol: SYNTHESIS_SIDECAR_PROTOCOL,
            requestId: "canonical:inspect",
            profileId: PROFILE_ID,
            capability: "topics.canonical.inspect",
            payload,
          }),
        },
      );
    try {
      const health = (await (
        await fetch(
          `http://${runtime.host}:${runtime.port}/synthesis/v1/health`,
        )
      ).json()) as { canonicalStore: { state: string; storeId: string } };
      assert.equal(health.canonicalStore.state, "ready");
      assert.match(health.canonicalStore.storeId, /^[a-f0-9]{64}$/);

      assert.equal(
        (await call("wrong-token", { topicId: "object-detection" })).status,
        401,
      );
      const response = await call(CLIENT_TOKEN, {
        topicId: "object-detection",
      });
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        data: { status: string; sections: unknown[]; artifact?: unknown };
      };
      assert.equal(body.data.status, "ready");
      assert.lengthOf(body.data.sections, 2);
      assert.notProperty(body.data, "artifact");
      assert.equal(workerCalls, 0);

      assert.equal(
        (await call(CLIENT_TOKEN, { topicId: "object-detection", extra: true }))
          .status,
        400,
      );
      const oversized = await call(CLIENT_TOKEN, {
        topicId: "object-detection",
        padding: "x".repeat(1024 * 1024),
      });
      assert.equal(oversized.status, 413);
    } finally {
      runtime.beginShutdown("test");
      await runtime.stopped;
    }
  });

  it("keeps health, handshake, and shutdown responsive in repair-required state", async function () {
    const profileRuntimeRoot = root();
    let failPromotion = false;
    const canonicalStore = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      fault(point) {
        if (
          failPromotion &&
          (point === "current_promoted" || point === "rollback_restore")
        ) {
          throw new Error("unrecoverable");
        }
      },
    });
    assert.equal(
      canonicalStore.promote({ expectedBasis: null, snapshot: snapshot() })
        .status,
      "promoted",
    );
    const basis = canonicalStore.inspect({ topicId: "object-detection" });
    failPromotion = true;
    assert.equal(
      canonicalStore.promote({
        expectedBasis: {
          manifestHash: basis.manifestHash!,
          artifactHash: basis.artifactHash!,
        },
        snapshot: snapshot(),
      }).status,
      "repair_required",
    );
    assert.equal(canonicalStore.snapshot().state, "repair_required");
    assert.equal(
      canonicalStore.promote({
        expectedBasis: null,
        snapshot: snapshot("other"),
      }).status,
      "repair_required",
    );

    const computePool: SynthesisSidecarComputeWorkerPool = {
      async runCitationGraphLayout() {
        throw new Error("unexpected compute");
      },
      async runCitationGraphMetrics() {
        throw new Error("unexpected compute");
      },
      async runCitationGraphBuild() {
        throw new Error("unexpected compute");
      },
      snapshot: () => ({
        state: "degraded",
        active: 0,
        queued: 0,
        restartCount: 1,
        failureCount: 3,
      }),
      async shutdown() {},
    };
    const config = runtimeConfig(profileRuntimeRoot);
    const runtime = await startSynthesisSidecarServer(
      config,
      "canonical-repair-service",
      { canonicalStore, computePool },
    );
    try {
      const health = (await (
        await fetch(
          `http://${runtime.host}:${runtime.port}/synthesis/v1/health`,
        )
      ).json()) as { canonicalStore: { state: string } };
      assert.equal(health.canonicalStore.state, "repair_required");
      const handshake = await fetch(
        `http://${runtime.host}:${runtime.port}${SYNTHESIS_SIDECAR_CALL_PATH}`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${CLIENT_TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            protocol: SYNTHESIS_SIDECAR_PROTOCOL,
            requestId: "canonical:repair-handshake",
            profileId: PROFILE_ID,
            capability: "system.handshake",
            payload: {
              schemaVersion: config.schemaVersion,
              bundleId: config.bundleId,
              buildFingerprint: config.buildFingerprint,
              supervisorInstanceId: config.supervisorInstanceId,
            },
          }),
        },
      );
      assert.equal(handshake.status, 200);
      const body = (await handshake.json()) as {
        data: { canonicalStore: { state: string } };
      };
      assert.equal(body.data.canonicalStore.state, "repair_required");
    } finally {
      runtime.beginShutdown("test-repair");
      await runtime.stopped;
    }
  });

  it("continues owner cleanup and resolves stopped after one close fails", async function () {
    const profileRuntimeRoot = root();
    const canonicalOwner = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const repositoryOwner = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    let repositoryClosed = false;
    const canonicalStore: SynthesisTopicCanonicalStore = {
      ...canonicalOwner,
      close() {
        canonicalOwner.close();
        throw new TypeError("sensitive canonical close failure");
      },
    };
    const repository = {
      ...repositoryOwner,
      close() {
        repositoryClosed = true;
        repositoryOwner.close();
      },
    };
    const runtime = await startSynthesisSidecarServer(
      runtimeConfig(profileRuntimeRoot),
      "cleanup-continuation-service",
      { canonicalStore, repository, computePool: idleComputePool() },
    );
    try {
      runtime.beginShutdown("cleanup-continuation");
      await within(runtime.stopped);
      assert.isTrue(repositoryClosed);
    } finally {
      if (!repositoryClosed) repositoryOwner.close();
    }
  });

  it("preserves the listen error when rollback cleanup also fails", async function () {
    const blocker = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", resolve);
    });
    const address = blocker.address();
    assert.isNotNull(address);
    assert.isNotString(address);
    if (!address || typeof address === "string") return;

    const profileRuntimeRoot = root();
    const canonicalOwner = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const repositoryOwner = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    let repositoryClosed = false;
    const canonicalStore: SynthesisTopicCanonicalStore = {
      ...canonicalOwner,
      close() {
        canonicalOwner.close();
        throw new TypeError("sensitive rollback close failure");
      },
    };
    const repository = {
      ...repositoryOwner,
      close() {
        repositoryClosed = true;
        repositoryOwner.close();
      },
    };
    let startupError: unknown;
    try {
      await startSynthesisSidecarServer(
        { ...runtimeConfig(profileRuntimeRoot), port: address.port },
        "listen-rollback-service",
        { canonicalStore, repository, computePool: idleComputePool() },
      );
    } catch (error) {
      startupError = error;
    } finally {
      if (!repositoryClosed) repositoryOwner.close();
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
    assert.equal((startupError as NodeJS.ErrnoException)?.code, "EADDRINUSE");
    assert.isTrue(repositoryClosed);
  });
});
