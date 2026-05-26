import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  LibraryWriteLock,
  SynthesisSchemaRegistry,
  buildSynthesisKnowledgeGraphPaths,
  buildMirrorManifest,
  checkBaseHashes,
  createCanonicalEnvelope,
  decodeNoteShard,
  defaultSynthesisFoundationPrefs,
  encodeNoteShard,
  formatShardTitle,
  hashCanonicalJson,
  hashMarkdown,
  initializeSynthesisKnowledgeGraphStore,
  parseCanonicalEnvelope,
  parseShardTitle,
  readCanonicalJsonAsset,
  readProjectionRegistryState,
  recordProjectionRebuild,
  writeCanonicalDiagnostic,
  writeCanonicalEnvelopeTextTransaction,
  writeCanonicalJsonAsset,
  writeCanonicalTransaction,
} from "../../src/modules/synthesis/foundation";
import {
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-kg-foundation-"));
}

function createKgTestRegistry() {
  const registry = new SynthesisSchemaRegistry();
  registry.registerDataSchema("synthesis.test_tag_vocabulary", {
    type: "object",
    required: ["items"],
    additionalProperties: true,
    properties: {
      items: { type: "array" },
    },
  });
  registry.registerDataSchema("synthesis.test_topic_node", {
    type: "object",
    required: ["title"],
    additionalProperties: true,
    properties: {
      title: { type: "string", minLength: 1 },
    },
  });
  return registry;
}

describe("Synthesis Layer foundation", function () {
  it("validates canonical envelopes and preserves unknown top-level fields", function () {
    const envelope = {
      ...createCanonicalEnvelope({
        schemaId: "synthesis.index",
        data: { artifacts: [] },
        now: "2026-05-10T12:00:00.000Z",
      }),
      future_field: { keep: true },
    };

    const parsed = parseCanonicalEnvelope(envelope, {
      schemaId: "synthesis.index",
      validateData(data) {
        return Array.isArray((data as { artifacts?: unknown }).artifacts);
      },
    });

    assert.deepEqual(parsed.data, { artifacts: [] });
    assert.deepEqual(parsed.envelope.future_field, { keep: true });
    assert.deepEqual(parsed.warnings, [
      "unknown_top_level_fields: future_field",
    ]);
  });

  it("validates canonical envelope data through the schema registry", function () {
    const registry = new SynthesisSchemaRegistry();
    registry.registerDataSchema("synthesis.topic_definition", {
      type: "object",
      required: ["id", "title"],
      additionalProperties: true,
      properties: {
        id: { type: "string", minLength: 1 },
        title: { type: "string", minLength: 1 },
      },
    });

    const envelope = createCanonicalEnvelope({
      schemaId: "synthesis.topic_definition",
      data: { id: "topic:test", title: "Test Topic" },
      now: "2026-05-10T12:00:00.000Z",
    });

    assert.equal(
      registry.parseEnvelope(envelope, "synthesis.topic_definition").data.id,
      "topic:test",
    );
    assert.throws(
      () =>
        registry.parseEnvelope(
          createCanonicalEnvelope({
            schemaId: "synthesis.topic_definition",
            data: { id: "" },
          }),
          "synthesis.topic_definition",
        ),
      /schema validation failed/i,
    );
  });

  it("hashes canonical JSON and normalized Markdown with SHA-256", function () {
    const left = hashCanonicalJson({ b: 2, a: { z: 1, y: null } });
    const right = hashCanonicalJson({ a: { y: null, z: 1 }, b: 2 });

    assert.match(left, /^sha256:[a-f0-9]{64}$/);
    assert.equal(left, right);
    assert.equal(hashMarkdown("a\r\nb\rc\n"), hashMarkdown("a\nb\nc\n"));
  });

  it("formats and parses note shard titles", function () {
    const title = formatShardTitle({
      libraryId: 1,
      kind: "topics",
      seq: 2,
      total: 12,
    });

    assert.equal(title, "ZS Synthesis Mirror [1] topics 002/012");
    assert.deepEqual(parseShardTitle(title), {
      libraryId: 1,
      kind: "topics",
      seq: 2,
      total: 12,
    });
    assert.isNull(parseShardTitle("not a shard"));
  });

  it("round-trips note shard HTML payloads and verifies hashes", function () {
    const payload = JSON.stringify({ topics: [{ id: "topic:test" }] });
    const shard = encodeNoteShard({
      libraryId: 1,
      anchorKey: "ABCD1234",
      kind: "topics",
      seq: 1,
      total: 1,
      payload,
      compression: "none",
      updatedAt: "2026-05-10T12:00:00.000Z",
    });

    assert.include(shard.html, "ZOTERO_SKILLS_SYNTHESIS_SHARD");
    assert.notInclude(shard.html, payload);

    const decoded = decodeNoteShard(shard.html);
    assert.equal(decoded.payload, payload);
    assert.equal(decoded.envelope.payload_hash, hashMarkdown(payload));
    assert.equal(
      decoded.envelope.encoded_hash,
      hashMarkdown(shard.envelope.payload),
    );
  });

  it("round-trips gzip-compressed note shard payloads", function () {
    const payload = JSON.stringify({ resolvers: [{ id: "resolver:test" }] });
    const shard = encodeNoteShard({
      libraryId: 1,
      anchorKey: "ABCD1234",
      kind: "resolvers",
      seq: 1,
      total: 1,
      payload,
      compression: "gzip",
      updatedAt: "2026-05-10T12:00:00.000Z",
    });

    assert.equal(shard.envelope.compression, "gzip");
    assert.equal(decodeNoteShard(shard.html).payload, payload);
  });

  it("sorts mirror manifest shards and excludes manifest_hash from its hash input", function () {
    const manifest = buildMirrorManifest({
      libraryId: 1,
      anchorKey: "ABCD1234",
      mirrorId:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      updatedAt: "2026-05-10T12:00:00.000Z",
      shards: [
        {
          kind: "topics",
          seq: 2,
          total: 2,
          noteKey: "N2",
          title: "ZS Synthesis Mirror [1] topics 002/002",
          payloadHash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          encodedHash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        },
        {
          kind: "manifest",
          seq: 1,
          total: 1,
          noteKey: "N0",
          title: "ZS Synthesis Mirror [1] manifest 001/001",
          payloadHash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          encodedHash:
            "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        },
        {
          kind: "topics",
          seq: 1,
          total: 2,
          noteKey: "N1",
          title: "ZS Synthesis Mirror [1] topics 001/002",
          payloadHash:
            "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          encodedHash:
            "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        },
      ],
    });

    assert.deepEqual(
      manifest.shards.map((entry) => `${entry.kind}:${entry.seq}`),
      ["manifest:1", "topics:1", "topics:2"],
    );

    const withDifferentExistingHash = {
      ...manifest,
      manifest_hash:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    };
    assert.equal(
      buildMirrorManifest(withDifferentExistingHash).manifest_hash,
      manifest.manifest_hash,
    );
  });

  it("serializes local writes per library", async function () {
    const lock = new LibraryWriteLock();
    const events: string[] = [];

    await Promise.all([
      lock.runExclusive(1, async () => {
        events.push("a:start");
        await Promise.resolve();
        events.push("a:end");
      }),
      lock.runExclusive(1, async () => {
        events.push("b:start");
        events.push("b:end");
      }),
    ]);

    assert.deepEqual(events, ["a:start", "a:end", "b:start", "b:end"]);
  });

  it("reports compare-and-swap hash mismatches", function () {
    const ok = checkBaseHashes({
      current: { artifact: "sha256:a", index: "sha256:b" },
      base: { artifact: "sha256:a", index: "sha256:b" },
    });
    assert.isTrue(ok.ok);

    const rejected = checkBaseHashes({
      current: { artifact: "sha256:changed", index: "sha256:b" },
      base: { artifact: "sha256:a", index: "sha256:b" },
    });
    assert.isFalse(rejected.ok);
    assert.deepEqual(rejected.mismatches, [
      {
        name: "artifact",
        base: "sha256:a",
        current: "sha256:changed",
      },
    ]);
  });

  it("initializes the Synthesis KG canonical store layout", async function () {
    const root = await makeRuntimeRoot();
    const paths = await initializeSynthesisKnowledgeGraphStore(root);

    assert.equal(paths.synthesisRoot, path.join(root, "synthesis"));
    for (const dir of [
      paths.topicsRoot,
      paths.conceptsRoot,
      paths.topicGraphRoot,
      paths.citationGraphRoot,
      paths.tagsRoot,
      paths.syncRoot,
      paths.stateRoot,
    ]) {
      assert.isTrue(await runtimePathExists(dir), `expected directory: ${dir}`);
    }
  });

  it("writes, reads, and validates canonical KG JSON assets", async function () {
    const root = await makeRuntimeRoot();
    const registry = createKgTestRegistry();

    await writeCanonicalJsonAsset({
      root,
      registry,
      relativePath: "tags/vocabulary.json",
      schemaId: "synthesis.test_tag_vocabulary",
      data: { items: ["object-detection"] },
      now: "2026-05-24T00:00:00.000Z",
    });

    const parsed = await readCanonicalJsonAsset<{
      items: string[];
    }>({
      root,
      registry,
      relativePath: "tags/vocabulary.json",
      schemaId: "synthesis.test_tag_vocabulary",
    });
    assert.deepEqual(parsed?.data.items, ["object-detection"]);

    try {
      await writeCanonicalJsonAsset({
        root,
        registry,
        relativePath: "tags/vocabulary.json",
        schemaId: "synthesis.test_tag_vocabulary",
        data: { invalid: true },
      });
      assert.fail("expected invalid canonical asset write to fail");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /schema/i,
      );
    }

    const afterRejectedWrite = await readCanonicalJsonAsset<{
      items: string[];
    }>({
      root,
      registry,
      relativePath: "tags/vocabulary.json",
      schemaId: "synthesis.test_tag_vocabulary",
    });
    assert.deepEqual(afterRejectedWrite?.data.items, ["object-detection"]);
  });

  it("commits canonical transactions with one event and stale projection state", async function () {
    const root = await makeRuntimeRoot();
    const registry = createKgTestRegistry();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    const result = await writeCanonicalTransaction({
      root,
      registry,
      scope: "tags",
      transactionId: "tx-test",
      now: "2026-05-24T00:00:00.000Z",
      sourceManifestHash:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      assets: [
        {
          relativePath: "tags/vocabulary.json",
          schemaId: "synthesis.test_tag_vocabulary",
          data: { items: ["detr"] },
        },
        {
          relativePath: "topics/detr.json",
          schemaId: "synthesis.test_topic_node",
          data: { title: "DETR" },
        },
      ],
    });

    assert.equal(result.transactionId, "tx-test");
    assert.isTrue(
      await runtimePathExists(
        path.join(root, "synthesis", "tags", "vocabulary.json"),
      ),
    );
    assert.isTrue(
      await runtimePathExists(
        path.join(root, "synthesis", "topics", "detr.json"),
      ),
    );

    const eventLines = (await readRuntimeTextFile(paths.eventsLog))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    assert.lengthOf(eventLines, 1);
    assert.deepInclude(eventLines[0], {
      event: "canonical-store-changed",
      scope: "tags",
      transaction_id: "tx-test",
    });
    assert.deepEqual(eventLines[0].changed_assets, [
      "tags/vocabulary.json",
      "topics/detr.json",
    ]);

    const receiptLines = (await readRuntimeTextFile(paths.receiptsLog))
      .trim()
      .split("\n")
      .filter(Boolean);
    assert.lengthOf(receiptLines, 1);

    const projectionState = await readProjectionRegistryState(root);
    assert.isTrue(projectionState.projections.tags.stale);
    assert.equal(
      projectionState.projections.tags.last_transaction_id,
      "tx-test",
    );
    assert.equal(
      projectionState.projections.tags.source_manifest_hash,
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  it("keeps target assets unchanged and writes sanitized diagnostics when transactions fail", async function () {
    const root = await makeRuntimeRoot();
    const registry = createKgTestRegistry();

    await writeCanonicalJsonAsset({
      root,
      registry,
      relativePath: "topics/detr.json",
      schemaId: "synthesis.test_topic_node",
      data: { title: "Original DETR" },
    });

    try {
      await writeCanonicalTransaction({
        root,
        registry,
        scope: "topics",
        transactionId: "tx-invalid",
        assets: [
          {
            relativePath: "topics/detr.json",
            schemaId: "synthesis.test_topic_node",
            data: { title: "" },
          },
        ],
      });
      assert.fail("expected invalid transaction to fail");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /schema/i,
      );
    }

    const persisted = await readCanonicalJsonAsset<{ title: string }>({
      root,
      registry,
      relativePath: "topics/detr.json",
      schemaId: "synthesis.test_topic_node",
    });
    assert.equal(persisted?.data.title, "Original DETR");

    await writeCanonicalDiagnostic({
      root,
      diagnostic: {
        transaction_id: "tx-redact",
        scope: "topics",
        code: "token=abc123",
        message: `failed at ${root}\\private\\file.json with password=hunter2`,
        details: {
          authorization: "Bearer abc123",
          path: `${root}\\private\\file.json`,
          nested: ["secret=abc123"],
        },
        created_at: "2026-05-24T00:00:00.000Z",
      },
    });

    const diagnostics = await readRuntimeTextFile(
      buildSynthesisKnowledgeGraphPaths(root).diagnosticsLog,
    );
    assert.notInclude(diagnostics, "abc123");
    assert.notInclude(diagnostics, "hunter2");
    assert.notInclude(diagnostics, root);
    assert.include(diagnostics, "[redacted]");
  });

  it("rejects invalid canonical asset paths before staging or emitting events", async function () {
    const root = await makeRuntimeRoot();
    const registry = createKgTestRegistry();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    try {
      await writeCanonicalTransaction({
        root,
        registry,
        scope: "tags",
        transactionId: "tx-path-invalid",
        assets: [
          {
            relativePath: "tags/CON.json",
            schemaId: "synthesis.test_tag_vocabulary",
            data: { items: [] },
          },
        ],
      });
      assert.fail("expected path policy failure");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /reserved|managed path/i,
      );
    }

    assert.isFalse(await runtimePathExists(paths.transactionsRoot));
    assert.isFalse(
      await runtimePathExists(path.join(paths.tagsRoot, "CON.json")),
    );
    assert.equal(await readRuntimeTextFile(paths.eventsLog), "");
    assert.equal(await readRuntimeTextFile(paths.receiptsLog), "");
    const projectionState = await readProjectionRegistryState(root);
    assert.notProperty(projectionState.projections, "tags");
  });

  it("rejects raw canonical envelope batches with case-colliding asset paths", async function () {
    const root = await makeRuntimeRoot();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const envelopeText = JSON.stringify(
      createCanonicalEnvelope({
        schemaId: "synthesis.test_tag_vocabulary",
        data: { items: [] },
      }),
    );

    try {
      await writeCanonicalEnvelopeTextTransaction({
        root,
        scope: "tags",
        transactionId: "tx-case-collision",
        assets: [
          { relativePath: "tags/Alias.json", envelopeText },
          { relativePath: "tags/alias.json", envelopeText },
        ],
      });
      assert.fail("expected case collision failure");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "managed_path_case_collision",
      );
    }

    assert.isFalse(await runtimePathExists(paths.transactionsRoot));
    assert.equal(await readRuntimeTextFile(paths.eventsLog), "");
    assert.equal(await readRuntimeTextFile(paths.receiptsLog), "");
  });

  it("commits raw canonical envelope batches and rolls back promotion failures", async function () {
    const root = await makeRuntimeRoot();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const timestamp = "2026-05-24T00:00:00.000Z";
    await writeRuntimeTextFile(
      path.join(paths.topicsRoot, "detr.json"),
      `${JSON.stringify(
        createCanonicalEnvelope({
          schemaId: "synthesis.test_topic_node",
          data: { title: "Original" },
          now: timestamp,
        }),
        null,
        2,
      )}\n`,
    );

    const committed = await writeCanonicalEnvelopeTextTransaction({
      root,
      scope: "sync",
      transactionId: "raw-commit",
      now: timestamp,
      projectionTargets: ["topic-graph-index"],
      assets: [
        {
          relativePath: "topics/detr.json",
          envelopeText: `${JSON.stringify(
            createCanonicalEnvelope({
              schemaId: "synthesis.test_topic_node",
              data: { title: "Updated" },
              now: timestamp,
            }),
            null,
            2,
          )}\n`,
        },
        {
          relativePath: "tags/vocabulary.json",
          envelopeText: `${JSON.stringify(
            createCanonicalEnvelope({
              schemaId: "synthesis.test_tag_vocabulary",
              data: { items: ["detr"] },
              now: timestamp,
            }),
            null,
            2,
          )}\n`,
        },
      ],
    });

    assert.deepEqual(committed.receipt.changed_assets, [
      "tags/vocabulary.json",
      "topics/detr.json",
    ]);
    assert.include(
      await readRuntimeTextFile(path.join(paths.topicsRoot, "detr.json")),
      "Updated",
    );

    try {
      await writeCanonicalEnvelopeTextTransaction({
        root,
        scope: "sync",
        transactionId: "raw-fail",
        assets: [
          {
            relativePath: "topics/detr.json",
            envelopeText: `${JSON.stringify(
              createCanonicalEnvelope({
                schemaId: "synthesis.test_topic_node",
                data: { title: "Broken" },
              }),
              null,
              2,
            )}\n`,
          },
          {
            relativePath: "topics/new.json",
            envelopeText: `${JSON.stringify(
              createCanonicalEnvelope({
                schemaId: "synthesis.test_topic_node",
                data: { title: "New" },
              }),
              null,
              2,
            )}\n`,
          },
        ],
        onBeforePromoteAsset(asset) {
          if (asset.relativePath === "topics/new.json") {
            throw new Error("promotion failed token=secret");
          }
        },
      });
      assert.fail("expected raw transaction promotion failure");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /promotion failed/,
      );
    }

    assert.include(
      await readRuntimeTextFile(path.join(paths.topicsRoot, "detr.json")),
      "Updated",
    );
    assert.isFalse(
      await runtimePathExists(path.join(paths.topicsRoot, "new.json")),
    );
    assert.notInclude(
      await readRuntimeTextFile(paths.diagnosticsLog),
      "secret",
    );
  });

  it("records projection rebuild state independent of SQLite cache files", async function () {
    const root = await makeRuntimeRoot();
    const paths = await initializeSynthesisKnowledgeGraphStore(root);
    const sqlitePath = path.join(paths.stateRoot, "concept-kb-index.sqlite");
    await writeRuntimeTextFile(sqlitePath, "cache");

    await recordProjectionRebuild({
      root,
      target: "concepts",
      schemaVersion: "1.0.0",
      sourceManifestHash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      diagnostics: [{ code: "ok" }],
      now: "2026-05-24T00:00:00.000Z",
    });
    await removeRuntimePath(sqlitePath);

    const projectionState = await readProjectionRegistryState(root);
    assert.isFalse(projectionState.projections.concepts.stale);
    assert.equal(
      projectionState.projections.concepts.source_manifest_hash,
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
    assert.equal(
      projectionState.projections.concepts.last_rebuild_at,
      "2026-05-24T00:00:00.000Z",
    );
    assert.isFalse(await runtimePathExists(sqlitePath));
  });

  it("provides conservative foundation preference defaults", function () {
    assert.deepInclude(defaultSynthesisFoundationPrefs(), {
      autoWatchEnabled: true,
      autoRebuildRegistry: true,
      autoRebuildGraph: "idle",
      autoScanStalenessEnabled: true,
      graphLayoutDefaultPreset: "balanced",
      graphLayoutComputeAllPresets: false,
      runHashCheckOnStartup: true,
    });
  });
});
