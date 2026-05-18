import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { applyResult as applyTopicSynthesisResult } from "../../workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs";
import {
  buildSynthesisStoragePaths,
  createCanonicalEnvelope,
  decodeNoteShard,
  hashMarkdown,
} from "../../src/modules/synthesis/foundation";
import {
  createSynthesisService,
  type SynthesisMirrorAdapter,
} from "../../src/modules/synthesis/service";
import { decideSynthesisApply } from "../../src/modules/synthesis/workflow";

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
    const markdown = await fs.readFile(paths.currentExportMarkdown, "utf8");
    const metadata = JSON.parse(await fs.readFile(paths.currentMetadata, "utf8"));
    const index = JSON.parse(await fs.readFile(paths.index, "utf8"));

    assert.equal(result.status, "persisted");
    assert.equal(markdown, "# Alpha Topic\n");
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
      buildSynthesisStoragePaths(root, "topic-alpha").currentExportMarkdown,
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
    const markdown = await fs.readFile(paths.currentExportMarkdown, "utf8");

    assert.equal(result.ok, true);
    assert.equal(result.status, "persisted");
    assert.equal(markdown, "# Alpha Topic\n");
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
    const markdown = await fs.readFile(paths.currentExportMarkdown, "utf8");
    const snapshot = await service.getSynthesisSnapshot();

    assert.equal(conflict.status, "conflict");
    assert.match(conflict.conflictCandidate?.bundle_hash || "", /^sha256:/);
    assert.equal(markdown, "# Alpha Topic\n");
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
    assert.equal(reviewInput.topic.markdown, "# Alpha Topic");
    assert.equal(
      reviewInput.structured_topic?.artifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.isArray(reviewInput.structured_topic?.claims);
    assert.isArray(reviewInput.structured_topic?.timeline_events);
    assert.isArray(reviewInput.structured_topic?.paper_evidence);
    assert.include(["fresh", "stale", "dirty"], topicContext.freshness?.freshness);
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
    assert.equal(await exists(paths.currentExportMarkdown), false);
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
    await fs.writeFile(paths.unifiedCitationGraphMetrics, "metrics sentinel\n");
    const beforeGraph = await fs.readFile(paths.unifiedCitationGraph, "utf8");
    const beforeLayout = await fs.readFile(paths.unifiedCitationLayouts, "utf8");
    const beforeMetrics = await fs.readFile(paths.unifiedCitationGraphMetrics, "utf8");
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
    assert.equal(await fs.readFile(paths.unifiedCitationGraphMetrics, "utf8"), beforeMetrics);
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

  it("persists and reads citation graph metrics with graph rebuilds", async function () {
    const root = await makeRoot();
    const paths = buildSynthesisStoragePaths(root);
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha Paper",
          year: "2020",
          references: [{ title: "Beta Paper", year: "2024", authors: ["Beta"] }],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Beta Paper",
          year: "2024",
          authors: ["Beta"],
        },
      ],
    });

    await service.queryCitationGraph();
    const metricsEnvelope = JSON.parse(
      await fs.readFile(paths.unifiedCitationGraphMetrics, "utf8"),
    );
    const metrics = await service.getCitationGraphMetrics({ limit: 2 });
    const byPaper = await service.getCitationGraphMetrics({ paperRefs: ["1:B"] });
    const slice = await service.getCitationGraphSlice({ paperRef: "1:B", direction: "incoming" });

    assert.equal(metricsEnvelope.data.schema_id, "synthesis.unified_citation_graph_metrics");
    assert.equal(metrics.ok, true);
    assert.equal(metrics.items[0].node_id, "zotero:item:B");
    assert.equal(byPaper.items[0].paper_ref, "1:B");
    assert.isAtLeast(byPaper.items[0].internal_in_degree, 1);
    assert.equal(
      slice.nodes.find((node: any) => node.node_id === "zotero:item:B")?.metrics?.internal_in_degree,
      1,
    );
  });

  it("marks citation graph metrics stale when graph hash changes", async function () {
    const root = await makeRoot();
    const paths = buildSynthesisStoragePaths(root);
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        { libraryId: 1, itemKey: "A", title: "Alpha", year: "2020" },
      ],
    });

    await service.queryCitationGraph();
    const graphEnvelope = JSON.parse(await fs.readFile(paths.unifiedCitationGraph, "utf8"));
    graphEnvelope.data.graph_hash = "sha256:changed";
    await fs.writeFile(paths.unifiedCitationGraph, `${JSON.stringify(graphEnvelope, null, 2)}\n`);

    const metrics = await service.getCitationGraphMetrics();

    assert.equal(metrics.ok, false);
    assert.equal(metrics.status, "stale");
    assert.equal(metrics.diagnostics.stale, true);
  });
});

describe("topic synthesis applyResult host delegation", function () {
  it("delegates formal persistence to runtime.hostApi.synthesis", async function () {
    const calls: unknown[] = [];
    const response = await applyTopicSynthesisResult({
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
      await applyTopicSynthesisResult({
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
      await applyTopicSynthesisResult({
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
      await applyTopicSynthesisResult({
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

  it("treats canceled topic synthesis output as a no-op apply", async function () {
    const result = await applyTopicSynthesisResult({
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
    await applyTopicSynthesisResult({
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

function v2TopicBundle(overrides: Record<string, unknown> = {}) {
  return {
    kind: "topic_synthesis",
    operation: "create",
    language: "zh-CN",
    base_hashes: {
      manifest: "",
      artifact: "",
      export: "",
      metadata: "",
      index: "",
    },
    topic_definition: {
      id: "object-detection",
      title: "Object Detection",
    },
    resolver_manifest_path: "runtime/payloads/resolver.json",
    resolver_diagnostics: {
      final_count: 1,
      manifest_hash: "sha256:resolver",
    },
    artifact_metadata: {
      topic_id: "object-detection",
      depends_on: {
        papers: ["1:DETR"],
        artifacts: ["digest-markdown", "references-json", "citation-analysis-json"],
      },
    },
    analysis_manifest_path: "result/topic-analysis.json",
    markdown_path: "result/preview.md",
    ...overrides,
  };
}

function v2SectionContext(sections: Record<string, unknown>) {
  const sectionEntries = Object.fromEntries(
    Object.keys(sections).map((section) => [
      section,
      {
        path: `result/sections/${section.replace(/_/g, "-")}.json`,
        hash: `sha256:${section}`,
        content_type: "json",
      },
    ]),
  );
  const manifest = {
    schema_id: "synthesis.topic_analysis_manifest",
    schema_version: "2.0.0",
    operation: "create",
    language: "zh-CN",
    sections: sectionEntries,
  };
  const files = new Map<string, string>([
    ["result/topic-analysis.json", JSON.stringify(manifest)],
    [
      "runtime/payloads/resolver.json",
      JSON.stringify({
        resolver: {
          mode: "tag_query",
          query: { and: ["topic:object-detection"] },
        },
        resolved_paper_set: {
          papers: [{ paper_ref: "1:DETR", match_reasons: ["tag"] }],
        },
        resolver_diagnostics: {
          final_count: 1,
        },
      }),
    ],
    ...Object.entries(sections).map(([section, value]) => [
      `result/sections/${section.replace(/_/g, "-")}.json`,
      JSON.stringify(value),
    ] as const),
  ]);
  return {
    bundleReader: {
      readText(pathValue: string) {
        const text = files.get(pathValue);
        if (text === undefined) {
          throw new Error(`missing test run artifact: ${pathValue}`);
        }
        return text;
      },
    },
  };
}

function v2SectionsWithEvidence(payloadHash: string) {
  return {
    topic: { id: "object-detection", title: "Object Detection" },
    summary: { brief: "structured summary" },
    positioning: {
      importance: "Object detection is a core perception task.",
      timeliness: "Recent detector families require structured comparison.",
      scope_boundary: { include: ["DETR"], exclude: [] },
      review_position: "Review-ready synthesis fixture.",
    },
    taxonomy: {
      primary_axis: "method_route",
      axis_rationale: "Fixture has one route.",
      nodes: [{ id: "tax:detr", title: "DETR", evidence_map_refs: ["tax:detr"] }],
    },
    comparison_matrix: {
      dimensions: ["problem addressed"],
      rows: [{ id: "cmp:detr", evidence_map_refs: ["cmp:detr"] }],
    },
    claims: [
      {
        id: "claim:detr",
        text: "DETR introduced end-to-end detection.",
        evidence_refs: ["paper:1:DETR"],
        evidence_map_refs: ["claim:detr"],
      },
    ],
    timeline_events: [
      {
        id: "event:detr",
        year: 2020,
        label: "DETR",
        evidence_refs: ["paper:1:DETR"],
      },
    ],
    paper_evidence: [
      {
        id: "paper:1:DETR",
        paper_ref: "1:DETR",
        title: "Paper DETR",
        digest_ref: {
          paper_ref: "1:DETR",
          note_key: "digest-markdown-note",
          payload_type: "digest-markdown",
          payload_hash: payloadHash,
        },
      },
    ],
    external_literature_analysis: {
      summary: "",
      themes: [],
      representative_references: [],
      citation_contexts: [],
      contribution_to_topic: "",
      limitations: "",
    },
    debates: [{ id: "debate:detr", evidence_type: "methodological_tradeoff", evidence_map_refs: ["debate:detr"] }],
    coverage: { paper_count: 1, external_literature_count: 0 },
    gaps: [{ id: "gap:coverage", gap_type: "library_coverage_gap", evidence_map_refs: ["gap:coverage"] }],
    review_outline: {
      introduction_logic: [{ id: "intro:why", evidence_map_refs: ["claim:detr"] }],
      related_work_logic: [],
      body_sections: [],
    },
    evidence_map: {
      path: "runtime/payloads/cross-paper-evidence-map.json",
      hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      candidate_counts: {},
      candidate_ids: ["tax:detr", "cmp:detr", "claim:detr", "debate:detr", "gap:coverage"],
    },
    source_artifacts: [],
    diagnostics: { warnings: [] },
  };
}

async function importOptional(modulePath: string) {
  try {
    return (await import(modulePath)) as Record<string, any>;
  } catch (error) {
    return { __loadError: error } as Record<string, any>;
  }
}

describe("Synthesis Layer v2 structured persistence red tests", function () {
  it("uses explicit current/ canonical paths instead of current.md/current.json", async function () {
    const root = await makeRoot();
    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;

    assert.equal(
      paths.currentManifest,
      path.join(root, "synthesis", "topics", "object-detection", "current", "manifest.json"),
    );
    assert.equal(
      paths.currentArtifact,
      path.join(root, "synthesis", "topics", "object-detection", "current", "artifact.json"),
    );
    assert.equal(
      paths.currentMetadata,
      path.join(root, "synthesis", "topics", "object-detection", "current", "metadata.json"),
    );
    assert.equal(
      paths.currentExportMarkdown,
      path.join(root, "synthesis", "topics", "object-detection", "current", "export.md"),
    );
    assert.equal(
      paths.currentSectionsRoot,
      path.join(root, "synthesis", "topics", "object-detection", "current", "sections"),
    );
    assert.notProperty(paths, "currentMarkdown");
  });

  it("applies structured topic results into current/ assets and refreshes mirror from canonical current state", async function () {
    const root = await makeRoot();
    const mirror = createMirrorRecorder();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
      mirrorAdapter: mirror.adapter,
      registryInputs: [
        registryInput({
          itemKey: "DETR",
          digest: "# Digest DETR",
          references: null,
          citation: null,
        }),
      ],
    });

    const result = await service.applyTopicSynthesisResult(
      v2TopicBundle(),
      v2SectionContext(v2SectionsWithEvidence(hashMarkdown("# Digest DETR"))),
    );
    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;
    const reviewInput = await service.getReviewInput({ topicId: "object-detection" });

    assert.equal(result.status, "persisted");
    assert.isTrue(await exists(paths.currentManifest));
    assert.isTrue(await exists(paths.currentArtifact));
    assert.isTrue(await exists(paths.currentMetadata));
    assert.isTrue(await exists(paths.currentExportMarkdown));
    assert.isTrue(await exists(path.join(paths.currentSectionsRoot, "claims.json")));
    assert.isAtLeast(mirror.upserts.length, 1);
    const mirrorEnvelopes = mirror.upserts.map((entry) => decodeNoteShard(entry.html).envelope);
    assert.include(mirrorEnvelopes.map((entry) => entry.kind), "manifest");
    assert.includeMembers(
      mirrorEnvelopes.map((entry) => entry.asset_id),
      [
        "state:index",
        "state:topic-definitions",
        "state:resolvers",
        "state:resolved-paper-sets",
        "state:artifact-state",
        "topic:object-detection:current-manifest",
        "topic:object-detection:current-metadata",
        "topic:object-detection:current-artifact",
        "topic:object-detection:current-export",
        "topic:object-detection:section:claims",
      ],
    );
    assert.notInclude(mirrorEnvelopes.map((entry) => entry.asset_id), "state:unified-citation-graph");
    assert.include(reviewInput.topic.markdown, "# Object Detection");
    assert.equal(
      reviewInput.structured_topic?.artifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.isArray(reviewInput.structured_topic?.claims);
    assert.isArray(reviewInput.structured_topic?.timeline_events);
    assert.isArray(reviewInput.structured_topic?.paper_evidence);
    assert.isObject(reviewInput.structured_topic?.external_literature_analysis);
  });

  it("accepts structured paper evidence when digest_ref hash matches current Zotero artifact", async function () {
    const root = await makeRoot();
    const digest = "# Digest DETR";
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
      registryInputs: [
        registryInput({
          itemKey: "DETR",
          digest,
          references: null,
          citation: null,
        }),
      ],
    });

    const result = await service.applyTopicSynthesisResult(
      v2TopicBundle(),
      v2SectionContext(v2SectionsWithEvidence(hashMarkdown(digest))),
    );

    assert.equal(result.status, "persisted");
  });

  it("rejects path-based structured topic results when the resolver manifest is missing", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
    });
    const context = v2SectionContext(v2SectionsWithEvidence("sha256:unused"));
    const originalReadText = context.bundleReader.readText;
    context.bundleReader.readText = async (pathValue: string) => {
      if (pathValue === "runtime/payloads/resolver.json") {
        throw new Error("missing test run artifact: runtime/payloads/resolver.json");
      }
      return originalReadText(pathValue);
    };

    try {
      await service.applyTopicSynthesisResult(v2TopicBundle(), context);
      assert.fail("expected missing resolver manifest to be rejected");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /resolver\.json|resolver_manifest_path|missing test run artifact/i,
      );
    }
  });

  it("rejects structured paper evidence when digest_ref hash differs from current Zotero artifact", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
      registryInputs: [
        registryInput({
          itemKey: "DETR",
          digest: "# Current Digest",
          references: null,
          citation: null,
        }),
      ],
    });

    try {
      await service.applyTopicSynthesisResult(
        v2TopicBundle(),
        v2SectionContext(v2SectionsWithEvidence("sha256:stale")),
      );
      assert.fail("expected stale digest_ref payload_hash to be rejected");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /digest refs|payload_hash mismatch/i,
      );
    }
  });

  it("marks legacy current.md/current.json topic directories as needs_recreate without fallback reading", async function () {
    const root = await makeRoot();
    const paths = buildSynthesisStoragePaths(root, "legacy-topic");
    await fs.mkdir(path.dirname((paths as any).legacyCurrentMarkdown), { recursive: true });
    await fs.writeFile((paths as any).legacyCurrentMarkdown, "# Legacy Markdown\n", "utf8");
    await fs.writeFile(
      (paths as any).legacyCurrentMetadata,
      JSON.stringify({ schema_id: "synthesis.topic_artifact_metadata" }),
      "utf8",
    );
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    const snapshot = await service.getSynthesisSnapshot();
    const row = snapshot.artifacts.rows.find((entry: any) => entry.id === "legacy-topic");

    assert.isOk(row);
    assert.include(["legacy_invalid", "needs_recreate"], (row as any).status);
    assert.notEqual((row as any).readerMode, "markdown");
  });

  it("uses bundle base hashes for create/full update and read section hashes for update patch", function () {
    const createDecision = decideSynthesisApply({
      bundle: v2TopicBundle({
        operation: "update_full",
        base_hashes: {
          manifest: "sha256:old-manifest",
          artifact: "sha256:old-artifact",
          export: "sha256:old-export",
          metadata: "sha256:old-metadata",
          index: "sha256:old-index",
        },
      }),
      currentHashes: {
        manifest: "sha256:new-manifest",
        artifact: "sha256:old-artifact",
        export: "sha256:old-export",
        metadata: "sha256:old-metadata",
        index: "sha256:old-index",
      },
    });
    const patchDecision = decideSynthesisApply({
      bundle: v2TopicBundle({
        operation: "update_patch",
        analysis_manifest_path: "result/topic-analysis.patch.json",
        markdown_path: "",
        read_section_hashes: {
          claims: "sha256:old-claims",
        },
        current_artifact_hash: "sha256:old-artifact",
      }),
      currentHashes: {
        artifact: "sha256:drifted-artifact",
        "section:claims": "sha256:old-claims",
      },
    });

    assert.equal(createDecision.action, "conflict");
    assert.deepInclude(createDecision.mismatches, {
      name: "manifest",
      base: "sha256:old-manifest",
      current: "sha256:new-manifest",
    });
    assert.equal(patchDecision.action, "persist");
  });

  it("allows non-overlapping section patches despite unrelated artifact hash drift", async function () {
    const module = await importOptional("../../src/modules/synthesis/topicStructuredArtifact");

    assert.isUndefined(
      module.__loadError,
      `expected topicStructuredArtifact module to load before checking patch apply: ${
        module.__loadError instanceof Error ? module.__loadError.message : String(module.__loadError)
      }`,
    );
    assert.isFunction((module as any).applyTopicSectionPatch);
    const result = (module as any).applyTopicSectionPatch({
      currentManifest: {
        artifact_hash: "sha256:drifted",
        section_hashes: {
          claims: "sha256:old-claims",
          coverage: "sha256:newer-coverage",
        },
      },
      patchManifest: {
        base: {
          current_artifact_hash: "sha256:old-artifact",
          read_section_hashes: {
            claims: "sha256:old-claims",
          },
          replace_section_hashes: {
            claims: "sha256:old-claims",
          },
        },
        patch: {
          mode: "section_replace",
          changed_sections: ["claims"],
          unchanged_section_policy: "inherit_current",
          sections: {
            claims: {
              path: "result/sections/claims.json",
              hash: "sha256:new-claims",
              content_type: "json",
            },
          },
        },
      },
      changedSections: {
        claims: [{ id: "claim:new" }],
      },
    });

    assert.equal(result.status, "applied");
    assert.equal(result.nextManifest.section_hashes.claims, "sha256:new-claims");
    assert.equal(result.nextManifest.section_hashes.coverage, "sha256:newer-coverage");
  });
});
