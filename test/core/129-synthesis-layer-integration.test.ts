import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { applyResult as applySynthesizeTopicResult } from "../../workflows_builtin/synthesis-layer/synthesize-topic/hooks/applyResult.mjs";
import {
  buildSynthesisStoragePaths,
  createCanonicalEnvelope,
  decodeNoteShard,
} from "../../src/modules/synthesis/foundation";
import {
  createSynthesisService,
  type SynthesisMirrorAdapter,
} from "../../src/modules/synthesis/service";

function validBundle(overrides: Record<string, unknown> = {}) {
  return {
    kind: "topic_synthesis",
    mode: "create",
    base_hashes: {
      artifact: "",
      metadata: "",
      index: "",
    },
    topic_definition: {
      id: "topic-alpha",
      title: "Alpha Topic",
      description: "A topic",
    },
    topic_resolver: {
      mode: "tag_query",
      query: { and: ["topic:alpha"] },
    },
    resolved_paper_set: {
      papers: [
        { paper_ref: "1:A", match_reasons: ["tag"] },
        { paper_ref: "1:B", match_reasons: ["tag"] },
      ],
    },
    resolver_diagnostics: {
      final_count: 2,
    },
    artifact_metadata: {
      depends_on: {
        papers: ["1:A", "1:B"],
        artifacts: [],
      },
    },
    markdown: "# Alpha Topic\n\n## Timeline\n\n2024: Alpha begins.",
    timeline: "2024: Alpha begins.",
    ...overrides,
  };
}

function artifactNote(args: {
  payloadType: string;
  value: string;
  format?: "markdown" | "json";
  updatedAt?: string;
}) {
  const encoded = Buffer.from(args.value, "utf8").toString("base64");
  return {
    key: `${args.payloadType}-note`,
    title: args.payloadType,
    updatedAt: args.updatedAt || "2026-05-10T00:00:00.000Z",
    html: `<span data-zs-block="payload" data-zs-payload="${args.payloadType}" data-zs-version="1" data-zs-format="${args.format || "markdown"}" data-zs-encoding="base64" data-zs-value="${encoded}"></span>`,
  };
}

function registryInput(args: {
  itemKey: string;
  tag?: string;
  digest?: string | null;
  references?: string | null;
  citation?: string | null;
}) {
  const notes = [];
  if (args.digest !== null) {
    notes.push(
      artifactNote({
        payloadType: "digest-markdown",
        value: args.digest ?? `# Digest ${args.itemKey}`,
        format: "markdown",
      }),
    );
  }
  if (args.references !== null) {
    notes.push(
      artifactNote({
        payloadType: "references-json",
        value: args.references ?? JSON.stringify({ references: [] }),
        format: "json",
      }),
    );
  }
  if (args.citation !== null) {
    notes.push(
      artifactNote({
        payloadType: "citation-analysis-json",
        value: args.citation ?? JSON.stringify({ citations: [] }),
        format: "json",
      }),
    );
  }
  return {
    libraryId: 1,
    itemKey: args.itemKey,
    title: `Paper ${args.itemKey}`,
    year: "2024",
    itemType: "journalArticle",
    tags: [args.tag || "topic:alpha"],
    collections: [],
    notes,
  };
}

function validSkillOutputBundle(overrides: Record<string, unknown> = {}) {
  const { markdown: _markdown, ...bundle } = validBundle();
  return {
    ...bundle,
    markdown_path: "result/synthesis.md",
    ...overrides,
  };
}

function markdownResultContext(
  markdown = "# Alpha Topic\n\n## Timeline\n\n2024: Alpha begins.",
) {
  return {
    async resolveArtifact(args: {
      fieldName: string;
      rawPath: string;
      fallbackPath: string;
    }) {
      assert.equal(args.fieldName, "markdown_path");
      assert.equal(args.rawPath, "result/synthesis.md");
      assert.equal(args.fallbackPath, "result/synthesis.md");
      return {
        text: markdown,
        entryPath: "result/synthesis.md",
        sourceKind: "local-path",
        sourcePath: "C:/tmp/result/synthesis.md",
        candidates: ["result/synthesis.md"],
      };
    },
  };
}

function createMirrorRecorder() {
  const upserts: Array<{
    title: string;
    html: string;
    kind: string;
    seq: number;
    total: number;
  }> = [];
  const adapter: SynthesisMirrorAdapter = {
    async ensureAnchor() {
      return { anchorKey: "ANCHOR01" };
    },
    async upsertShard(args) {
      upserts.push({
        title: args.title,
        html: args.html,
        kind: args.kind,
        seq: args.seq,
        total: args.total,
      });
      return { noteKey: `NOTE${upserts.length}` };
    },
    async deleteShardsNotIn() {
      return undefined;
    },
  };
  return { adapter, upserts };
}

async function makeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-synthesis-integration-"));
}

async function exists(pathValue: string) {
  try {
    await fs.stat(pathValue);
    return true;
  } catch {
    return false;
  }
}

function sampleCitationGraph() {
  return {
    schema_id: "synthesis.unified_citation_graph" as const,
    schema_version: "1.0.0" as const,
    graph_hash: "sha256:graph-sample",
    nodes: [
      {
        node_id: "zotero:item:A",
        kind: "library_paper" as const,
        target_state: "library" as const,
        item_key: "A",
        library_id: 1,
        aliases: [],
        title: "Alpha",
      },
      {
        node_id: "zotero:item:B",
        kind: "library_paper" as const,
        target_state: "library" as const,
        item_key: "B",
        library_id: 1,
        aliases: [],
        title: "Beta",
      },
      {
        node_id: "zotero:item:C",
        kind: "library_paper" as const,
        target_state: "library" as const,
        item_key: "C",
        library_id: 1,
        aliases: [],
        title: "Gamma",
      },
      {
        node_id: "ref:external:x",
        kind: "external_reference" as const,
        target_state: "external" as const,
        aliases: [],
        title: "External",
      },
      {
        node_id: "ref:raw:low",
        kind: "unresolved_reference" as const,
        target_state: "unresolved" as const,
        aliases: [],
        title: "Low signal",
        low_signal: true,
      },
    ],
    edges: [
      {
        edge_id: "edge-a-b",
        source: "zotero:item:A",
        target: "zotero:item:B",
        kind: "citation" as const,
        mention_count: 1,
        primary_role: "background",
        aux_roles: [],
        role_evidence: [{ role: "background", count: 1 }],
        source_refs: ["r1"],
      },
      {
        edge_id: "edge-b-c",
        source: "zotero:item:B",
        target: "zotero:item:C",
        kind: "citation" as const,
        mention_count: 1,
        primary_role: "method",
        aux_roles: [],
        role_evidence: [{ role: "method", count: 1 }],
        source_refs: ["r2"],
      },
      {
        edge_id: "edge-c-a",
        source: "zotero:item:C",
        target: "zotero:item:A",
        kind: "citation" as const,
        mention_count: 1,
        primary_role: "contrast",
        aux_roles: [],
        role_evidence: [{ role: "contrast", count: 1 }],
        source_refs: ["r3"],
      },
      {
        edge_id: "edge-a-external",
        source: "zotero:item:A",
        target: "ref:external:x",
        kind: "citation" as const,
        mention_count: 1,
        primary_role: "background",
        aux_roles: [],
        role_evidence: [{ role: "background", count: 1 }],
        source_refs: ["r4"],
      },
      {
        edge_id: "edge-a-low",
        source: "zotero:item:A",
        target: "ref:raw:low",
        kind: "citation" as const,
        mention_count: 1,
        primary_role: "background",
        aux_roles: [],
        role_evidence: [{ role: "background", count: 1 }],
        source_refs: ["r5"],
      },
    ],
    diagnostics: {
      promotions: [],
      duplicates: [],
      node_counts: {
        library_paper: 3,
        external_reference: 1,
        unresolved_reference: 1,
      },
      reference_stats: {
        total: 2,
        promoted: 0,
        external: 1,
        unresolved: 1,
        dropped_empty: 0,
        merged_external_nodes: 0,
        merged_unresolved_nodes: 0,
      },
    },
  };
}

async function writeGraphSnapshot(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  await fs.mkdir(paths.stateRoot, { recursive: true });
  await fs.writeFile(
    paths.unifiedCitationGraph,
    `${JSON.stringify(
      createCanonicalEnvelope({
        schemaId: "synthesis.unified_citation_graph_projection",
        data: sampleCitationGraph(),
        now: "2026-05-12T00:00:00.000Z",
      }),
      null,
      2,
    )}\n`,
  );
  return paths;
}

async function readArtifactState(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  return JSON.parse(await fs.readFile(paths.artifactState, "utf8"));
}

async function topicFreshnessState(root: string, topicId = "topic-alpha") {
  const state = await readArtifactState(root);
  return state.data.topics[topicId] as {
    freshness: string;
    coverage: string;
    baseline_input_hash?: string;
    current_input_hash?: string;
    reasons?: Array<{ code: string }>;
  };
}

async function topicReasonCodes(root: string, topicId = "topic-alpha") {
  const state = await topicFreshnessState(root, topicId);
  return (state.reasons || []).map((reason) => reason.code);
}

describe("Synthesis Layer v1 integration service", function () {
  it("persists a topic synthesis bundle as canonical assets and refreshes mirror shards", async function () {
    const root = await makeRoot();
    const mirror = createMirrorRecorder();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: mirror.adapter,
    });

    const result = await service.applyTopicSynthesisResult(validBundle());
    const paths = buildSynthesisStoragePaths(root, "topic-alpha");
    const markdown = await fs.readFile(paths.currentMarkdown, "utf8");
    const metadata = JSON.parse(await fs.readFile(paths.currentMetadata, "utf8"));
    const index = JSON.parse(await fs.readFile(paths.index, "utf8"));

    assert.equal(result.status, "persisted");
    assert.equal(markdown, "# Alpha Topic\n\n## Timeline\n\n2024: Alpha begins.");
    assert.equal(metadata.schema_id, "synthesis.topic_artifact_metadata");
    assert.equal(metadata.data.topic_id, "topic-alpha");
    assert.equal(index.data.topics[0].topic_id, "topic-alpha");
    assert.isAtLeast(mirror.upserts.length, 3);
    assert.equal(decodeNoteShard(mirror.upserts[0].html).envelope.anchor_key, "ANCHOR01");
  });

  it("writes a fresh baseline after topic apply and mirrors artifact-state shards", async function () {
    const root = await makeRoot();
    const mirror = createMirrorRecorder();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: mirror.adapter,
      registryInputs: [registryInput({ itemKey: "A" }), registryInput({ itemKey: "B" })],
    });

    await service.applyTopicSynthesisResult(validBundle());
    const snapshot = await service.getSynthesisSnapshot();
    const state = await topicFreshnessState(root);

    assert.equal(state.freshness, "fresh");
    assert.equal(state.coverage, "complete");
    assert.match(state.baseline_input_hash || "", /^sha256:/);
    assert.equal(state.baseline_input_hash, state.current_input_hash);
    assert.equal(snapshot.artifacts.rows[0]?.freshness, "fresh");
    assert.equal(snapshot.artifacts.rows[0]?.coverage, "complete");
    assert.include(
      mirror.upserts.map((entry) => entry.kind),
      "artifact_state",
    );
  });

  it("initializes a legacy topic freshness baseline on first snapshot scan", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [registryInput({ itemKey: "A" }), registryInput({ itemKey: "B" })],
    });

    await service.applyTopicSynthesisResult(validBundle());
    await fs.rm(buildSynthesisStoragePaths(root).artifactState, { force: true });
    const snapshot = await service.getSynthesisSnapshot();
    const state = await topicFreshnessState(root);
    const log = await fs.readFile(buildSynthesisStoragePaths(root).log, "utf8");

    assert.equal(snapshot.artifacts.rows[0]?.freshness, "fresh");
    assert.equal(state.freshness, "fresh");
    assert.match(state.baseline_input_hash || "", /^sha256:/);
    assert.match(log, /baseline_initialized/);
  });

  it("marks a topic stale when the resolver paper set changes", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [registryInput({ itemKey: "A" }), registryInput({ itemKey: "B" })],
    });

    await service.applyTopicSynthesisResult(validBundle());
    const changed = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:10:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [
        registryInput({ itemKey: "A" }),
        registryInput({ itemKey: "B" }),
        registryInput({ itemKey: "C" }),
      ],
    });

    const snapshot = await changed.getSynthesisSnapshot();
    const reasons = await topicReasonCodes(root);

    assert.equal(snapshot.artifacts.rows[0]?.freshness, "stale");
    assert.include(reasons, "paper_set_changed");
  });

  it("marks stale when paper artifacts change or become available", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [
        registryInput({ itemKey: "A" }),
        registryInput({ itemKey: "B", digest: null }),
      ],
    });

    await service.applyTopicSynthesisResult(validBundle());
    const changed = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:10:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [
        registryInput({ itemKey: "A", digest: "# Digest A changed" }),
        registryInput({ itemKey: "B", digest: "# Digest B now available" }),
      ],
    });

    await changed.getSynthesisSnapshot();
    const reasons = await topicReasonCodes(root);

    assert.include(reasons, "artifact_changed");
    assert.include(reasons, "artifact_available");
  });

  it("marks stale when a baseline paper artifact disappears", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [registryInput({ itemKey: "A" }), registryInput({ itemKey: "B" })],
    });

    await service.applyTopicSynthesisResult(validBundle());
    const missing = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:10:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [
        registryInput({ itemKey: "A" }),
        registryInput({ itemKey: "B", digest: null }),
      ],
    });

    await missing.getSynthesisSnapshot();
    const reasons = await topicReasonCodes(root);

    assert.include(reasons, "artifact_missing");
  });

  it("marks stale when the persisted citation graph hash changes", async function () {
    const root = await makeRoot();
    await writeGraphSnapshot(root);
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [registryInput({ itemKey: "A" }), registryInput({ itemKey: "B" })],
    });

    await service.applyTopicSynthesisResult(validBundle());
    const paths = buildSynthesisStoragePaths(root);
    const graph = JSON.parse(await fs.readFile(paths.unifiedCitationGraph, "utf8"));
    graph.data.graph_hash = "sha256:graph-changed";
    await fs.writeFile(paths.unifiedCitationGraph, `${JSON.stringify(graph, null, 2)}\n`);

    await service.getSynthesisSnapshot();
    const reasons = await topicReasonCodes(root);

    assert.include(reasons, "graph_changed");
  });

  it("marks dirty when current artifact files no longer match the active index", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [registryInput({ itemKey: "A" }), registryInput({ itemKey: "B" })],
    });

    await service.applyTopicSynthesisResult(validBundle());
    await fs.writeFile(
      buildSynthesisStoragePaths(root, "topic-alpha").currentMarkdown,
      "# Tampered",
    );
    const snapshot = await service.getSynthesisSnapshot();
    const reasons = await topicReasonCodes(root);

    assert.equal(snapshot.artifacts.rows[0]?.freshness, "dirty");
    assert.include(reasons, "index_hash_mismatch");
  });

  it("keeps canonical apply successful when mirror refresh fails", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: {
        async ensureAnchor() {
          throw new Error("zotero anchor unavailable");
        },
        async upsertShard() {
          assert.fail("upsertShard should not run when ensureAnchor fails");
        },
      },
    });

    const result = await service.applyTopicSynthesisResult(validBundle());
    const paths = buildSynthesisStoragePaths(root, "topic-alpha");
    const markdown = await fs.readFile(paths.currentMarkdown, "utf8");

    assert.equal(result.ok, true);
    assert.equal(result.status, "persisted");
    assert.equal(markdown, "# Alpha Topic\n\n## Timeline\n\n2024: Alpha begins.");
    if (result.ok) {
      assert.match(result.mirrorError || "", /zotero anchor unavailable/);
      assert.include(result.warnings || [], "mirror_refresh_failed");
    }
  });

  it("saves conflict candidates without overwriting current assets or refreshing mirror", async function () {
    const root = await makeRoot();
    const mirror = createMirrorRecorder();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: mirror.adapter,
    });

    await service.applyTopicSynthesisResult(validBundle());
    const beforeUpserts = mirror.upserts.length;
    const conflict = await service.applyTopicSynthesisResult(
      validBundle({
        mode: "update",
        markdown: "# Alpha Topic\n\nChanged",
        base_hashes: {
          artifact: "",
          metadata: "",
          index: "",
        },
      }),
    );
    const paths = buildSynthesisStoragePaths(root, "topic-alpha");
    const markdown = await fs.readFile(paths.currentMarkdown, "utf8");
    const snapshot = await service.getSynthesisSnapshot();

    assert.equal(conflict.status, "conflict");
    assert.match(conflict.conflictCandidate?.bundle_hash || "", /^sha256:/);
    assert.equal(markdown, "# Alpha Topic\n\n## Timeline\n\n2024: Alpha begins.");
    assert.equal(mirror.upserts.length, beforeUpserts);
    assert.deepEqual(
      snapshot.conflicts.candidates.map((candidate) => candidate.topic_id),
      ["topic-alpha"],
    );
  });

  it("serves UI snapshots and review input from the persisted state", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha Paper",
          year: "2024",
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Beta Paper",
          year: "2025",
        },
      ],
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha Paper",
          year: "2024",
          references: [
            {
              title: "Beta Paper",
              year: "2025",
              authors: ["Beta"],
              roles: ["background"],
            },
          ],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Beta Paper",
          year: "2025",
          authors: ["Beta"],
        },
      ],
    });

    await service.applyTopicSynthesisResult(validBundle());
    await service.queryCitationGraph();
    const snapshot = await service.getSynthesisSnapshot();
    const reviewInput = await service.getReviewInput({ topicId: "topic-alpha" });
    const topicContext = await service.getTopicContext({ topicId: "topic-alpha" }) as {
      freshness?: { freshness?: string };
    };

    assert.deepEqual(
      snapshot.artifacts.rows.map((row) => row.id),
      ["topic-alpha"],
    );
    assert.deepEqual(
      snapshot.registry.rows.map((row) => row.paper_ref),
      ["1:A", "1:B"],
    );
    assert.equal(snapshot.graph.nodes.some((node) => node.id === "zotero:item:A"), true);
    assert.equal(reviewInput.topic.topic_id, "topic-alpha");
    assert.equal(reviewInput.topic.markdown, "# Alpha Topic\n\n## Timeline\n\n2024: Alpha begins.");
    assert.equal(topicContext.freshness?.freshness, "stale");
    assert.deepEqual(
      reviewInput.resolved_paper_set.papers.map((paper) => paper.paper_ref),
      ["1:A", "1:B"],
    );
  });

  it("lists topics as a small semantic inventory for create-mode de-duplication", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await service.applyTopicSynthesisResult(
      validBundle({
        topic_definition: {
          id: "topic-alpha",
          title: "Alpha Topic",
          description: "Semantic scope for Alpha.",
          aliases: ["Alpha", "A topic", "Alpha"],
        },
        topic_resolver: {
          mode: "explicit",
          paper_refs: ["1:A"],
        },
        resolved_paper_set: {
          papers: [{ paper_ref: "1:A", match_reasons: ["explicit"] }],
        },
      }),
    );

    const inventory = await service.listTopics();
    const topic = inventory.topics[0] as Record<string, unknown>;

    assert.deepEqual(inventory.diagnostics, {
      count: 1,
      source: "canonical-topic-definitions",
    });
    assert.deepEqual(topic, {
      topic_id: "topic-alpha",
      title: "Alpha Topic",
      description: "Semantic scope for Alpha.",
      aliases: ["Alpha", "A topic"],
      updated_at: "2026-05-12T00:00:00.000Z",
    });
    for (const forbidden of [
      "topic_resolver",
      "resolved_paper_set",
      "paper_refs",
      "registry",
      "artifact_hashes",
      "markdown_excerpt",
      "graph_hash",
      "freshness",
    ]) {
      assert.notProperty(topic, forbidden);
    }
  });

  it("soft deletes topic artifacts from active state while preserving a deleted cleanup record", async function () {
    const root = await makeRoot();
    const mirror = createMirrorRecorder();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T02:00:00.000Z",
      mirrorAdapter: mirror.adapter,
    });

    await service.applyTopicSynthesisResult(validBundle());
    const beforeDeleteUpserts = mirror.upserts.length;
    const result = await service.deleteTopicArtifact({ topicId: "topic-alpha" });
    const snapshot = await service.getSynthesisSnapshot();
    const inventory = await service.listTopics();
    const deleted = await service.listDeletedTopicArtifacts();
    const paths = buildSynthesisStoragePaths(root, "topic-alpha");

    assert.equal(result.ok, true);
    assert.equal(result.status, "deleted");
    assert.equal(await exists(paths.currentMarkdown), false);
    assert.deepEqual(snapshot.artifacts.rows, []);
    assert.deepEqual(inventory.topics, []);
    assert.deepEqual(
      deleted.deleted.map((entry) => entry.topic_id),
      ["topic-alpha"],
    );
    assert.equal(snapshot.deletedArtifacts.count, 1);
    assert.isAbove(mirror.upserts.length, beforeDeleteUpserts);
  });

  it("purges deleted topic artifact stores idempotently without touching active topics", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T03:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await service.applyTopicSynthesisResult(validBundle());
    await service.deleteTopicArtifact({ topicId: "topic-alpha" });
    const first = await service.purgeDeletedTopicArtifacts();
    const second = await service.purgeDeletedTopicArtifacts();
    const deleted = await service.listDeletedTopicArtifacts();

    assert.equal(first.ok, true);
    assert.equal(first.status, "purged");
    assert.equal(first.purged_count, 1);
    assert.equal(second.purged_count, 0);
    assert.deepEqual(deleted.deleted, []);
  });

  it("rejects deleting a missing topic without corrupting the active index", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T04:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await service.applyTopicSynthesisResult(validBundle());
    const result = await service.deleteTopicArtifact({ topicId: "missing-topic" });
    const snapshot = await service.getSynthesisSnapshot();

    assert.equal(result.ok, false);
    assert.equal(result.status, "not_found");
    assert.deepEqual(
      snapshot.artifacts.rows.map((row) => row.id),
      ["topic-alpha"],
    );
  });

  it("backfills topic inventory title and updated time from the artifact index", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T01:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await service.applyTopicSynthesisResult(
      validBundle({
        topic_definition: {
          id: "topic-beta",
          description: "Beta semantic scope.",
          aliases: ["Beta"],
        },
      }),
    );

    const inventory = await service.listTopics();

    assert.deepInclude(inventory.topics, {
      topic_id: "topic-beta",
      title: "topic-beta",
      description: "Beta semantic scope.",
      aliases: ["Beta"],
      updated_at: "2026-05-12T01:00:00.000Z",
    });
  });

  it("returns a structured missing-snapshot result for citation graph slices without writing assets", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha",
          references: [{ raw: "would rebuild if queryCitationGraph ran" }],
        },
      ],
    });
    const paths = buildSynthesisStoragePaths(root);

    const slice = await service.getCitationGraphSlice({ paperRef: "1:A" });

    assert.equal(slice.ok, false);
    assert.equal(slice.diagnostics.snapshot_found, false);
    assert.include(slice.diagnostics.warnings.join("\n"), "snapshot is missing");
    assert.equal(await exists(paths.unifiedCitationGraph), false);
    assert.equal(await exists(paths.unifiedCitationLayouts), false);
  });

  it("reads bounded citation graph slices from persisted snapshots by paperRef and node id", async function () {
    const root = await makeRoot();
    await writeGraphSnapshot(root);
    const service = createSynthesisService({ root, libraryId: 1 });

    const byPaperRef = await service.getCitationGraphSlice({ paperRef: "1:A" });
    const byNodeId = await service.getCitationGraphSlice({
      startNodeId: "zotero:item:A",
      direction: "outgoing",
    });

    assert.equal(byPaperRef.ok, true);
    assert.equal(byPaperRef.start_node_id, "zotero:item:A");
    assert.deepEqual(
      byPaperRef.nodes.map((node) => node.node_id),
      ["ref:external:x", "zotero:item:A", "zotero:item:B", "zotero:item:C"],
    );
    assert.deepEqual(
      byPaperRef.edges.map((edge) => edge.edge_id),
      ["edge-a-b", "edge-a-external", "edge-c-a"],
    );
    assert.deepEqual(
      byNodeId.edges.map((edge) => edge.edge_id),
      ["edge-a-b", "edge-a-external"],
    );
  });

  it("applies citation graph slice depth, direction, role, low-signal, and cap controls", async function () {
    const root = await makeRoot();
    await writeGraphSnapshot(root);
    const service = createSynthesisService({ root, libraryId: 1 });

    const incoming = await service.getCitationGraphSlice({
      startNodeId: "zotero:item:A",
      direction: "incoming",
    });
    const methodOnly = await service.getCitationGraphSlice({
      startNodeId: "zotero:item:A",
      depth: 2,
      roleFilter: ["method"],
    });
    const withoutLowSignal = await service.getCitationGraphSlice({
      startNodeId: "zotero:item:A",
    });
    const capped = await service.getCitationGraphSlice({
      startNodeId: "zotero:item:A",
      depth: 9,
      maxNodes: 2,
      maxEdges: 1,
    });

    assert.deepEqual(
      incoming.edges.map((edge) => edge.edge_id),
      ["edge-c-a"],
    );
    assert.deepEqual(
      methodOnly.edges.map((edge) => edge.edge_id),
      [],
    );
    assert.notInclude(
      withoutLowSignal.nodes.map((node) => node.node_id),
      "ref:raw:low",
    );
    assert.include(
      (
        await service.getCitationGraphSlice({
          startNodeId: "zotero:item:A",
          direction: "outgoing",
          includeLowSignal: true,
        })
      ).nodes.map((node) => node.node_id),
      "ref:raw:low",
    );
    assert.equal(capped.diagnostics.truncated, true);
    assert.equal(capped.diagnostics.depth, 2);
    assert.include(capped.diagnostics.warnings.join("\n"), "depth clamped");
    assert.isAtMost(capped.nodes.length, 2);
    assert.isAtMost(capped.edges.length, 1);
  });

  it("does not rewrite citation graph or layout assets when reading graph slices", async function () {
    const root = await makeRoot();
    const paths = await writeGraphSnapshot(root);
    await fs.writeFile(paths.unifiedCitationLayouts, "layout sentinel\n");
    const beforeGraph = await fs.readFile(paths.unifiedCitationGraph, "utf8");
    const beforeLayout = await fs.readFile(paths.unifiedCitationLayouts, "utf8");
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "Z",
          title: "Should Not Rebuild",
          references: [{ raw: "new reference" }],
        },
      ],
    });

    const slice = await service.getCitationGraphSlice({ paperRef: "1:A" });

    assert.equal(slice.ok, true);
    assert.equal(await fs.readFile(paths.unifiedCitationGraph, "utf8"), beforeGraph);
    assert.equal(await fs.readFile(paths.unifiedCitationLayouts, "utf8"), beforeLayout);
  });

  it("serves Workbench graph snapshots from persisted graph and layout assets", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha Paper",
          references: [{ raw: "Shared unresolved reference" }],
        },
      ],
    });

    await service.queryCitationGraph();
    const reloaded = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [],
    });
    const snapshot = await reloaded.getSynthesisSnapshot();

    assert.equal(snapshot.graph.nodes.some((node) => node.id === "zotero:item:A"), true);
    assert.equal(snapshot.graph.nodes.some((node) => node.id.startsWith("ref:raw:")), true);
    assert.isNumber(snapshot.graph.nodes.find((node) => node.id === "zotero:item:A")?.x);
    assert.equal(snapshot.graph.layoutStatus, "ready");
  });
});

describe("synthesize-topic applyResult host delegation", function () {
  it("delegates formal persistence to runtime.hostApi.synthesis", async function () {
    const calls: unknown[] = [];
    const response = await applySynthesizeTopicResult({
      runResult: { json: validSkillOutputBundle() },
      resultContext: markdownResultContext(),
      runtime: {
        hostApi: {
          synthesis: {
            async applyTopicSynthesisResult(bundle: unknown) {
              calls.push(bundle);
              return { ok: true, status: "persisted", topicId: "topic-alpha" };
            },
          },
        },
      },
    });

    assert.lengthOf(calls, 1);
    assert.deepInclude(calls[0] as Record<string, unknown>, {
      markdown: "# Alpha Topic\n\n## Timeline\n\n2024: Alpha begins.",
      markdown_path: "result/synthesis.md",
    });
    assert.deepInclude(
      (calls[0] as { artifact_metadata: Record<string, unknown> }).artifact_metadata,
      {
        markdown_path: "result/synthesis.md",
      },
    );
    assert.deepInclude(response, {
      ok: true,
      status: "persisted",
      topicId: "topic-alpha",
    });
  });

  it("rejects host persistence conflicts instead of reporting apply success", async function () {
    let rejected = false;
    try {
      await applySynthesizeTopicResult({
        runResult: { json: validSkillOutputBundle() },
        resultContext: markdownResultContext(),
        runtime: {
          hostApi: {
            synthesis: {
              async applyTopicSynthesisResult() {
                return {
                  ok: false,
                  status: "conflict",
                  topicId: "topic-alpha",
                  mismatches: [{ name: "artifact", base: "", current: "sha256:a" }],
                };
              },
            },
          },
        },
      });
    } catch (error) {
      rejected = true;
      assert.match(String((error as Error).message || error), /conflict/i);
    }
    assert.isTrue(rejected, "expected applyResult to reject conflict result");
  });

  it("fails explicitly when host synthesis service is unavailable", async function () {
    try {
      await applySynthesizeTopicResult({
        runResult: { json: validSkillOutputBundle() },
        resultContext: markdownResultContext(),
        runtime: { hostApi: {} },
      });
      assert.fail("expected applyResult to reject");
    } catch (error) {
      assert.match(String((error as Error).message || error), /hostApi\.synthesis/i);
    }
  });

  it("rejects embedded markdown before host persistence", async function () {
    try {
      await applySynthesizeTopicResult({
        runResult: {
          json: {
            ...validSkillOutputBundle(),
            markdown: "# Embedded markdown should not be accepted",
          },
        },
        resultContext: markdownResultContext(),
        runtime: {
          hostApi: {
            synthesis: {
              async applyTopicSynthesisResult() {
                assert.fail("host persistence should not be called");
              },
            },
          },
        },
      });
      assert.fail("expected applyResult to reject");
    } catch (error) {
      assert.match(
        String((error as Error).message || error),
        /markdown_path instead of embedding markdown/i,
      );
    }
  });

  it("treats canceled synthesize-topic output as a no-op apply", async function () {
    const result = await applySynthesizeTopicResult({
      runResult: {
        json: {
          kind: "topic_synthesis_canceled",
          status: "canceled",
          reason: "user_cancelled_duplicate_topic",
          message: "User canceled after duplicate topic confirmation.",
          duplicate_topic_id: "detr-detection-transformer",
          topic_seed: "DETR",
        },
      },
      resultContext: {
        async resolveArtifact() {
          assert.fail("canceled output must not read markdown artifacts");
        },
      },
      runtime: {
        hostApi: {
          synthesis: {
            async applyTopicSynthesisResult() {
              assert.fail("canceled output must not persist synthesis assets");
            },
          },
        },
      },
    });

    assert.deepInclude(result, {
      ok: true,
      status: "canceled",
      skipped: true,
      reason: "user_cancelled_duplicate_topic",
    });
  });

  it("can read markdown_path through bundleReader when resultContext is unavailable", async function () {
    const calls: unknown[] = [];
    await applySynthesizeTopicResult({
      runResult: { json: validSkillOutputBundle() },
      bundleReader: {
        async readText(entryPath: string) {
          assert.equal(entryPath, "result/synthesis.md");
          return "# From Bundle";
        },
      },
      runtime: {
        hostApi: {
          synthesis: {
            async applyTopicSynthesisResult(bundle: unknown) {
              calls.push(bundle);
              return { ok: true, status: "persisted", topicId: "topic-alpha" };
            },
          },
        },
      },
    });

    assert.lengthOf(calls, 1);
    assert.equal((calls[0] as { markdown: string }).markdown, "# From Bundle");
  });
});
