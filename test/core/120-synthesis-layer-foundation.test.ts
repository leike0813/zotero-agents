import { assert } from "chai";
import {
  LibraryWriteLock,
  SynthesisSchemaRegistry,
  buildMirrorManifest,
  checkBaseHashes,
  createCanonicalEnvelope,
  decodeNoteShard,
  defaultSynthesisFoundationPrefs,
  encodeNoteShard,
  formatShardTitle,
  hashCanonicalJson,
  hashMarkdown,
  parseCanonicalEnvelope,
  parseShardTitle,
} from "../../src/modules/synthesis/foundation";

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
    assert.deepEqual(parsed.warnings, ["unknown_top_level_fields: future_field"]);
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
    assert.equal(decoded.envelope.encoded_hash, hashMarkdown(shard.envelope.payload));
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
      mirrorId: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      updatedAt: "2026-05-10T12:00:00.000Z",
      shards: [
        {
          kind: "topics",
          seq: 2,
          total: 2,
          noteKey: "N2",
          title: "ZS Synthesis Mirror [1] topics 002/002",
          payloadHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          encodedHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        },
        {
          kind: "manifest",
          seq: 1,
          total: 1,
          noteKey: "N0",
          title: "ZS Synthesis Mirror [1] manifest 001/001",
          payloadHash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          encodedHash: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        },
        {
          kind: "topics",
          seq: 1,
          total: 2,
          noteKey: "N1",
          title: "ZS Synthesis Mirror [1] topics 001/002",
          payloadHash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          encodedHash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
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
