/* eslint-disable mocha/max-top-level-suites */
import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { applyResult as applyTopicSynthesisResult } from "../../workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs";
import {
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
  createCanonicalEnvelope,
  hashMarkdown,
} from "../../src/modules/synthesis/foundation";
import {
  createSynthesisService,
  type SynthesisMirrorAdapter,
} from "../../src/modules/synthesis/service";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
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

async function writeDbGraphState(root: string) {
  const repository = createSynthesisRepository({
    runtimeRoot: root,
    now: () => "2026-05-12T00:00:00.000Z",
  });
  repository.replaceCitationGraphState({
    nodes: [
      {
        literatureItemId: "1:A",
        nodeStatus: "active",
        hasZoteroBinding: true,
        title: "Alpha",
      },
      {
        literatureItemId: "1:B",
        nodeStatus: "active",
        hasZoteroBinding: true,
        title: "Beta",
      },
      {
        literatureItemId: "1:C",
        nodeStatus: "active",
        hasZoteroBinding: true,
        title: "Gamma",
      },
      {
        literatureItemId: "ref:external:x",
        nodeStatus: "active",
        hasZoteroBinding: false,
        title: "External",
      },
      {
        literatureItemId: "ref:raw:low",
        nodeStatus: "active",
        hasZoteroBinding: false,
        title: "Low signal",
      },
    ],
    edges: [
      {
        edgeId: "edge-a-b",
        sourceLiteratureItemId: "1:A",
        targetLiteratureItemId: "1:B",
        edgeStatus: "accepted",
        rolesJson: JSON.stringify(["background"]),
      },
      {
        edgeId: "edge-b-c",
        sourceLiteratureItemId: "1:B",
        targetLiteratureItemId: "1:C",
        edgeStatus: "accepted",
        rolesJson: JSON.stringify(["method"]),
      },
      {
        edgeId: "edge-c-a",
        sourceLiteratureItemId: "1:C",
        targetLiteratureItemId: "1:A",
        edgeStatus: "accepted",
        rolesJson: JSON.stringify(["contrast"]),
      },
      {
        edgeId: "edge-a-external",
        sourceLiteratureItemId: "1:A",
        targetLiteratureItemId: "ref:external:x",
        edgeStatus: "unbound",
        rolesJson: JSON.stringify(["background"]),
      },
      {
        edgeId: "edge-a-low",
        sourceLiteratureItemId: "1:A",
        targetLiteratureItemId: "ref:raw:low",
        edgeStatus: "unbound",
        rolesJson: JSON.stringify(["background"]),
      },
    ],
    lightweightMetrics: [
      {
        literatureItemId: "1:A",
        outgoingCount: 3,
        incomingCount: 1,
        matchedOutgoingCount: 1,
        unresolvedOutgoingCount: 2,
        ambiguousOutgoingCount: 0,
        localDegree: 4,
        sourceStructureVersion: 1,
      },
      {
        literatureItemId: "1:B",
        outgoingCount: 1,
        incomingCount: 1,
        matchedOutgoingCount: 1,
        unresolvedOutgoingCount: 0,
        ambiguousOutgoingCount: 0,
        localDegree: 2,
        sourceStructureVersion: 1,
      },
      {
        literatureItemId: "1:C",
        outgoingCount: 1,
        incomingCount: 1,
        matchedOutgoingCount: 1,
        unresolvedOutgoingCount: 0,
        ambiguousOutgoingCount: 0,
        localDegree: 2,
        sourceStructureVersion: 1,
      },
    ],
  });
  return buildSynthesisStoragePaths(root);
}

async function readArtifactState(root: string) {
  const paths = buildSynthesisStoragePaths(root);
  return JSON.parse(await fs.readFile(paths.artifactState, "utf8"));
}

async function topicFreshnessState(root: string, topicId = "topic-alpha") {
  const state = await readArtifactState(root);
  return state.data.topics[topicId] as {
    freshness: string;
    known_dependency_status?: string;
    discovery_status?: string;
    candidate_count?: number;
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
  it("persists a topic synthesis bundle as canonical assets without mirror writes", async function () {
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
    const metadata = JSON.parse(
      await fs.readFile(paths.currentMetadata, "utf8"),
    );
    const index = JSON.parse(await fs.readFile(paths.index, "utf8"));

    assert.equal(result.status, "persisted");
    assert.equal(markdown, "# Alpha Topic\n");
    assert.equal(metadata.schema_id, "synthesis.topic_artifact_metadata");
    assert.equal(metadata.data.topic_id, "topic-alpha");
    assert.equal(index.data.topics[0].topic_id, "topic-alpha");
    assert.lengthOf(mirror.upserts, 0);
  });

  it("writes a fresh baseline after topic apply without mirror artifact-state shards", async function () {
    const root = await makeRoot();
    const mirror = createMirrorRecorder();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: mirror.adapter,
      registryInputs: [
        registryInput({ itemKey: "A" }),
        registryInput({ itemKey: "B" }),
      ],
    });

    await service.applyTopicSynthesisResult(validBundle());
    const snapshot = await service.getSynthesisSnapshot();
    const state = await topicFreshnessState(root);

    assert.equal(state.freshness, "fresh");
    assert.equal(state.coverage, "complete");
    assert.match(state.baseline_input_hash || "", /^sha256:/);
    assert.equal(state.baseline_input_hash, state.current_input_hash);
    assert.equal(snapshot.artifacts.rows[0]?.freshness, "unknown");
    assert.equal(snapshot.artifacts.rows[0]?.coverage, "missing");
    assert.lengthOf(mirror.upserts, 0);
  });

  it("keeps topic freshness unchanged when the reference sidecar is explicitly refreshed", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      registryInputs: [
        registryInput({ itemKey: "A" }),
        registryInput({ itemKey: "B" }),
      ],
    });
    await service.refreshReferenceSidecarNow();
    await service.applyTopicSynthesisResult(validBundle());
    const paths = buildSynthesisStoragePaths(root, "topic-alpha");
    const beforeMarkdown = await fs.readFile(
      paths.currentExportMarkdown,
      "utf8",
    );
    const beforeMetadata = await fs.readFile(paths.currentMetadata, "utf8");

    const updated = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        registryInput({ itemKey: "A", digest: "# Updated Digest A" }),
        registryInput({ itemKey: "B" }),
      ],
    });
    const result = await updated.refreshReferenceSidecarNow();
    const refreshed = await topicFreshnessState(root);
    const snapshot = await updated.getSynthesisSnapshot();

    assert.equal(result.status, "ready");
    assert.equal(refreshed.freshness, "fresh");
    assert.notInclude(await topicReasonCodes(root), "artifact_changed");
    assert.equal(snapshot.artifacts.rows[0]?.freshness, "unknown");
    assert.equal(
      await fs.readFile(paths.currentExportMarkdown, "utf8"),
      beforeMarkdown,
    );
    assert.equal(
      await fs.readFile(paths.currentMetadata, "utf8"),
      beforeMetadata,
    );
  });

  it("keeps snapshot reads side-effect free when artifact state is missing", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-11T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
      registryInputs: [
        registryInput({ itemKey: "A" }),
        registryInput({ itemKey: "B" }),
      ],
    });

    await service.applyTopicSynthesisResult(validBundle());
    const paths = buildSynthesisStoragePaths(root);
    await fs.rm(paths.artifactState, {
      force: true,
    });
    const snapshot = await service.getSynthesisSnapshot();

    assert.equal(snapshot.artifacts.rows[0]?.id, "topic-alpha");
    assert.isFalse(await exists(paths.artifactState));
  });

  it("does not surface legacy JSON-only synthesis state in Workbench UI reads", async function () {
    const root = await makeRoot();
    const paths = buildSynthesisStoragePaths(root);
    const kgPaths = buildSynthesisKnowledgeGraphPaths(root);
    await fs.mkdir(paths.stateRoot, { recursive: true });
    await fs.mkdir(kgPaths.stateRoot, { recursive: true });
    await fs.writeFile(
      paths.index,
      JSON.stringify(
        createCanonicalEnvelope({
          schemaId: "synthesis.index",
          data: {
            topics: [
              {
                topic_id: "legacy-topic",
                path_id: "legacy-topic",
                title: "Legacy Topic",
                updated_at: "2026-05-10T00:00:00.000Z",
                markdown_hash: "sha256:legacy-md",
                metadata_hash: "sha256:legacy-meta",
                bundle_hash: "sha256:legacy-bundle",
                paper_count: 3,
              },
            ],
          },
          now: "2026-05-10T00:00:00.000Z",
        }),
        null,
        2,
      ),
      "utf8",
    );
    await fs.writeFile(
      paths.deletedArtifacts,
      JSON.stringify(
        createCanonicalEnvelope({
          schemaId: "synthesis.deleted_topic_artifacts",
          data: {
            deleted: [
              {
                topic_id: "legacy-deleted",
                path_id: "legacy-deleted",
                deleted_path_id: "legacy-deleted-20260510",
                title: "Legacy Deleted",
                deleted_at: "2026-05-10T00:00:00.000Z",
                updated_at: "2026-05-10T00:00:00.000Z",
                markdown_hash: "sha256:deleted-md",
                metadata_hash: "sha256:deleted-meta",
                bundle_hash: "sha256:deleted-bundle",
              },
            ],
          },
          now: "2026-05-10T00:00:00.000Z",
        }),
        null,
        2,
      ),
      "utf8",
    );
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    const snapshot = await service.getSynthesisSnapshot();
    const inventory = await service.listTopics();
    const options = await service.listWorkflowTopicOptions({
      filter: "updatable",
    });

    assert.deepEqual(snapshot.artifacts.rows, []);
    assert.deepEqual(snapshot.registry.cleanupProposals, []);
    assert.equal(snapshot.deletedArtifacts.count, 0);
    assert.deepEqual(inventory.topics, []);
    assert.deepEqual(options.options, []);
  });

  it("surfaces cleanup proposals from DB review rows only", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-16T00:00:00.000Z",
    });
    repository.upsertReviewItem({
      reviewItemId: "review:delete-stale-binding",
      reviewKind: "zotero_item_delete",
      priority: 0,
      status: "open",
      scopeKind: "zotero_binding",
      scopeRef: "1:STALE",
      payloadJson: JSON.stringify({
        literature_item_id: "lit:stale",
        paper_ref: "1:STALE",
        title: "Stale Zotero Binding",
      }),
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      now: () => "2026-05-16T00:00:00.000Z",
    });

    const snapshot = await service.getSynthesisSnapshot();

    assert.deepEqual(
      snapshot.registry.cleanupProposals.map((proposal) => ({
        proposal_id: proposal.proposal_id,
        status: proposal.status,
        kind: proposal.kind,
        source_paper_ref: proposal.source_paper_ref,
      })),
      [
        {
          proposal_id: "review:delete-stale-binding",
          status: "open",
          kind: "zotero_item_delete",
          source_paper_ref: "1:STALE",
        },
      ],
    );
  });

  it("keeps canonical apply independent of mirror adapter failures", async function () {
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
      assert.isUndefined(result.mirrorError);
      assert.notInclude(result.warnings || [], "mirror_refresh_failed");
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
    assert.deepEqual(snapshot.conflicts.candidates, []);
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
    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const snapshot = await service.getSynthesisSnapshot();
    const reviewInput = await service.getReviewInput({
      topicId: "topic-alpha",
    });
    const topicContext = (await service.getTopicContext({
      topicId: "topic-alpha",
    })) as {
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
    assert.equal(
      snapshot.graph.nodes.some((node) => node.id === "zotero:item:A"),
      true,
    );
    assert.equal(reviewInput.topic.topic_id, "topic-alpha");
    assert.equal(reviewInput.topic.markdown, "# Alpha Topic");
    assert.equal(
      reviewInput.structured_topic?.artifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.isArray(reviewInput.structured_topic?.claims);
    assert.isObject(reviewInput.structured_topic?.timeline_events);
    assert.isArray(reviewInput.structured_topic?.paper_evidence);
    assert.include(
      ["fresh", "stale", "dirty"],
      topicContext.freshness?.freshness,
    );
    assert.deepEqual(
      reviewInput.resolved_paper_set.papers.map((paper) => paper.paper_ref),
      ["1:A", "1:B"],
    );
  });

  it("keeps topic context reads from scanning or refreshing freshness state [inv.topics.workflow_uses_source_facade]", async function () {
    const root = await makeRoot();
    const first = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T00:00:00.000Z",
      registryInputs: [
        registryInput({ itemKey: "A" }),
        registryInput({ itemKey: "B" }),
      ],
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await first.applyTopicSynthesisResult(validBundle());
    const artifactStatePath = buildSynthesisStoragePaths(root).artifactState;
    const before = await fs.readFile(artifactStatePath, "utf8");
    let registryInputCalls = 0;
    let citationInputCalls = 0;
    const readOnly = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-13T00:00:00.000Z",
      libraryAdapter: {
        async getRegistryInputs() {
          registryInputCalls += 1;
          throw new Error("topic context read must not scan registry inputs");
        },
        async getCitationGraphInputs() {
          citationInputCalls += 1;
          throw new Error(
            "topic context read must not scan citation graph inputs",
          );
        },
        async getLibraryIndex() {
          return {
            libraryId: 1,
            papers: [],
            tags: [],
            collections: [],
            has_more: false,
            returned: 0,
            total_papers: 0,
            index_hash: "",
            page_hash: "",
            diagnostics: [],
          };
        },
        async readPaperArtifacts() {
          return { artifacts: [], diagnostics: [] };
        },
      },
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    const topicContext = (await readOnly.getTopicContext({
      topicId: "topic-alpha",
    })) as {
      freshness?: { freshness?: string };
    };
    const after = await fs.readFile(artifactStatePath, "utf8");

    assert.equal(registryInputCalls, 0);
    assert.equal(citationInputCalls, 0);
    assert.equal(topicContext.freshness?.freshness, "fresh");
    assert.equal(after, before);
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
      source: "sqlite-topic-graph",
    });
    assert.deepEqual(topic, {
      topic_id: "topic-alpha",
      title: "Alpha Topic",
      description: "",
      aliases: [],
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
    const result = await service.deleteTopicArtifact({
      topicId: "topic-alpha",
    });
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
    assert.equal(snapshot.deletedArtifacts.count, 0);
    assert.equal(mirror.upserts.length, beforeDeleteUpserts);
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
    const result = await service.deleteTopicArtifact({
      topicId: "missing-topic",
    });
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
      description: "",
      aliases: [],
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
    assert.include(
      slice.diagnostics.warnings.join("\n"),
      "start node not found",
    );
    assert.equal(await exists(paths.unifiedCitationGraph), false);
    assert.equal(await exists(paths.unifiedCitationLayouts), false);
  });

  it("reads bounded citation graph slices from persisted snapshots by paperRef and node id", async function () {
    const root = await makeRoot();
    await writeDbGraphState(root);
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
      [
        "zotero:item:A",
        "zotero:item:B",
        "zotero:item:C",
        "ref:external:x",
        "ref:raw:low",
      ],
    );
    assert.deepEqual(
      byPaperRef.edges.map((edge) => edge.edge_id),
      ["edge-a-b", "edge-a-external", "edge-a-low", "edge-c-a"],
    );
    assert.deepEqual(
      byNodeId.edges.map((edge) => edge.edge_id),
      ["edge-a-b", "edge-a-external", "edge-a-low"],
    );
  });

  it("applies citation graph slice depth, direction, role, low-signal, and cap controls", async function () {
    const root = await makeRoot();
    await writeDbGraphState(root);
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
      depth: 1,
      direction: "outgoing",
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
      "zotero:item:C",
    );
    assert.include(
      (
        await service.getCitationGraphSlice({
          startNodeId: "zotero:item:A",
          direction: "outgoing",
          depth: 2,
        })
      ).nodes.map((node) => node.node_id),
      "zotero:item:C",
    );
    assert.equal(capped.diagnostics.truncated, true);
    assert.equal(capped.diagnostics.depth, 2);
    assert.include(capped.diagnostics.warnings.join("\n"), "depth clamped");
    assert.isAtMost(capped.nodes.length, 2);
    assert.isAtMost(capped.edges.length, 1);
  });

  it("does not write citation graph or layout assets when reading DB graph slices", async function () {
    const root = await makeRoot();
    const paths = await writeDbGraphState(root);
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
    assert.equal(await exists(paths.unifiedCitationGraph), false);
    assert.equal(await exists(paths.unifiedCitationLayouts), false);
    assert.equal(await exists(paths.unifiedCitationGraphMetrics), false);
  });

  it("serves Workbench graph snapshots from DB graph and layout state", async function () {
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

    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    await service.runCitationGraphLayoutWorker({
      force: true,
      timeBudgetMs: 1000,
    });
    const reloaded = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [],
    });
    const snapshot = await reloaded.getSynthesisSnapshot();

    assert.equal(
      snapshot.graph.nodes.some((node) => node.id === "zotero:item:A"),
      true,
    );
    assert.equal(snapshot.graph.diagnostics.storage, "sqlite");
    assert.isNumber(
      snapshot.graph.nodes.find((node) => node.id === "zotero:item:A")?.x,
    );
    assert.equal(snapshot.graph.layoutStatus, "ready");
  });

  it("runs advanced reference matching as an explicit proposal/fact operation", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Source Paper",
          notes: [
            artifactNote({
              payloadType: "references-json",
              value: JSON.stringify({
                references: [
                  { title: "Accepted Target Paper" },
                  { title: "Duplicated Candidate Paper" },
                ],
              }),
              format: "json",
            }),
          ],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Accepted Target Paper",
        },
        {
          libraryId: 1,
          itemKey: "C",
          title: "Duplicated Candidate Paper",
        },
        {
          libraryId: 1,
          itemKey: "D",
          title: "Duplicated Candidate Paper",
        },
      ],
    });

    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-12T00:00:00.000Z",
    });
    assert.equal(
      repository.listCacheBasis({ cacheKinds: ["citation_graph"] })[0]?.status,
      "ready",
    );

    const result = await service.runAdvancedReferenceMatchingNow();
    const acceptedBindings = repository.listReferenceBindings({
      statuses: ["accepted"],
    });
    const openProposals = repository.listReferenceMatchProposals({
      statuses: ["open"],
    });
    const graphBasis = repository
      .listCacheBasis({ cacheKinds: ["citation_graph"] })
      .find((basis) => basis.cacheKey === "citation-graph:library");

    assert.equal(result.ok, true);
    assert.equal(
      acceptedBindings.some((binding) => binding.itemKey === "B"),
      true,
    );
    assert.includeMembers(
      openProposals.map((proposal) => proposal.targetItemKey),
      ["C", "D"],
    );
    assert.equal(graphBasis?.status, "stale");
    assert.equal(
      repository.listCitationEdges({ statuses: ["accepted"] }).length,
      0,
    );

    const rejectedProposalId = openProposals[0]?.proposalId;
    assert.isString(rejectedProposalId);
    const rejectBatch = await service.applyReferenceMatchProposalActions({
      decisions: [{ proposalId: rejectedProposalId!, action: "reject" }],
    });
    assert.equal(rejectBatch.applied_count, 1);
    assert.equal(rejectBatch.failed_count, 0);
    await service.runAdvancedReferenceMatchingNow();
    const proposalsAfterRerun = repository.listReferenceMatchProposals();
    assert.lengthOf(proposalsAfterRerun, openProposals.length);
    assert.equal(
      proposalsAfterRerun.find(
        (proposal) => proposal.proposalId === rejectedProposalId,
      )?.status,
      "rejected",
    );

    const reopenBatch = await service.applyReferenceMatchProposalActions({
      decisions: [{ proposalId: rejectedProposalId!, action: "reopen" }],
    });
    assert.equal(reopenBatch.applied_count, 1);
    assert.equal(
      repository.listReferenceMatchProposals({
        proposalIds: [rejectedProposalId!],
      })[0]?.status,
      "open",
    );

    const acceptBatch = await service.applyReferenceMatchProposalActions({
      decisions: [{ proposalId: rejectedProposalId!, action: "accept" }],
    });
    assert.equal(acceptBatch.applied_count, 1);
    const acceptedProposal = repository.listReferenceMatchProposals({
      proposalIds: [rejectedProposalId!],
    })[0];
    assert.equal(acceptedProposal?.status, "accepted");
    assert.isTrue(
      repository
        .listReferenceBindings({ statuses: ["accepted"] })
        .some((binding) => binding.itemKey === acceptedProposal?.targetItemKey),
    );

    await service.applyReferenceMatchProposalAction({
      proposalId: rejectedProposalId!,
      action: "reject",
    });
    assert.equal(
      repository.listReferenceMatchProposals({
        proposalIds: [rejectedProposalId!],
      })[0]?.status,
      "rejected",
    );
    assert.isFalse(
      repository
        .listReferenceBindings({ statuses: ["accepted"] })
        .some((binding) => binding.itemKey === acceptedProposal?.targetItemKey),
    );

    const deleteProposalId = openProposals.find(
      (proposal) => proposal.proposalId !== rejectedProposalId,
    )?.proposalId;
    assert.isString(deleteProposalId);
    await service.applyReferenceMatchProposalAction({
      proposalId: deleteProposalId!,
      action: "accept",
    });
    const deleteProposal = repository.listReferenceMatchProposals({
      proposalIds: [deleteProposalId!],
    })[0];
    assert.equal(deleteProposal?.status, "accepted");
    await service.applyReferenceMatchProposalAction({
      proposalId: deleteProposalId!,
      action: "delete",
    });
    assert.equal(
      repository.listReferenceMatchProposals({
        proposalIds: [deleteProposalId!],
      })[0]?.status,
      "superseded",
    );
    assert.isFalse(
      repository
        .listReferenceBindings({ statuses: ["accepted"] })
        .some((binding) => binding.itemKey === deleteProposal?.targetItemKey),
    );
  });

  it("runs advanced canonical dedupe as an explicit proposal/fact operation", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Source A",
          notes: [
            artifactNote({
              payloadType: "references-json",
              value: JSON.stringify({
                references: [
                  {
                    title: "Attention is all you need",
                    year: "2017",
                    authors: ["Ashish Vaswani", "Noam Shazeer"],
                  },
                  {
                    title:
                      "CondConv: Conditionally Parameterized Convolutions for Efficient Inference",
                    year: "2019",
                    authors: ["Brandon Yang"],
                  },
                ],
              }),
              format: "json",
            }),
          ],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Source B",
          notes: [
            artifactNote({
              payloadType: "references-json",
              value: JSON.stringify({
                references: [
                  {
                    title: "Attention is all you need",
                    year: "2017",
                    authors: ["Vaswani, A.", "Shazeer, N."],
                  },
                  {
                    title:
                      "CondConv: Conditionally Parameterized Convolutions for Effcient Inference",
                    year: "2019",
                    authors: ["Brandon Yang"],
                  },
                ],
              }),
              format: "json",
            }),
          ],
        },
      ],
    });

    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-12T00:00:00.000Z",
    });
    assert.equal(
      repository.listCacheBasis({ cacheKinds: ["citation_graph"] })[0]?.status,
      "ready",
    );

    const result = await service.runAdvancedReferenceMatchingNow();
    const redirects = repository.listCanonicalReferenceRedirects();
    const proposals = repository.listReferenceMatchProposals({
      kinds: ["canonical_merge"],
    });
    const graphBasis = repository
      .listCacheBasis({ cacheKinds: ["citation_graph"] })
      .find((basis) => basis.cacheKey === "citation-graph:library");

    assert.equal(result.ok, true);
    assert.isAtLeast(redirects.length, 1);
    assert.isTrue(
      proposals.some((proposal) => {
        const reasonsJson = proposal.reasonsJson || "";
        const evidenceJson = proposal.evidenceJson || "";
        return (
          reasonsJson.includes("cluster_typo_equivalent_title") ||
          evidenceJson.includes('"edge_type":"typo_equivalent_title"')
        );
      }),
    );
    assert.equal(graphBasis?.status, "stale");
  });

  it("builds graph overview as all library papers plus shared external references", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha Paper",
          references: [
            { title: "Beta Paper", year: "2024", authors: ["Beta"] },
            { title: "Shared External Reference", year: "2020" },
            { title: "Unique Alpha Reference", year: "2021" },
          ],
        },
        {
          libraryId: 1,
          itemKey: "B",
          title: "Beta Paper",
          year: "2024",
          authors: ["Beta"],
        },
        {
          libraryId: 1,
          itemKey: "C",
          title: "Gamma Paper",
          references: [
            { title: "Shared External Reference", year: "2020" },
            { title: "Unique Gamma Reference", year: "2022" },
          ],
        },
        {
          libraryId: 1,
          itemKey: "D",
          title: "Disconnected Library Paper",
        },
      ],
    });

    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const graph = (await service.queryCitationGraph()) as any;
    const snapshot = await service.getSynthesisSnapshot();

    assert.includeMembers(
      graph.nodes.map((node: { node_id: string }) => node.node_id),
      ["zotero:item:A", "zotero:item:B", "zotero:item:C", "zotero:item:D"],
    );
    assert.isTrue(
      graph.nodes.some(
        (node: { title?: string; display_tier?: string }) =>
          node.title === "Shared External Reference" &&
          node.display_tier === "shared_external",
      ),
    );
    assert.isFalse(
      graph.nodes.some(
        (node: { title?: string }) => node.title === "Unique Alpha Reference",
      ),
    );
    assert.sameMembers(
      (graph.hover_only_nodes || []).map(
        (node: { title?: string }) => node.title,
      ),
      ["Unique Alpha Reference", "Unique Gamma Reference"],
    );
    assert.equal(graph.diagnostics.library_node_count, 4);
    assert.equal(graph.diagnostics.shared_external_count, 1);
    assert.equal(graph.diagnostics.hover_only_external_count, 2);
    assert.includeMembers(
      snapshot.graph.visibleNodes.map((node) => node.id),
      ["zotero:item:A", "zotero:item:B", "zotero:item:C", "zotero:item:D"],
    );
    assert.isFalse(
      snapshot.graph.visibleNodes.some(
        (node) => node.label === "Unique Alpha Reference",
      ),
    );
    assert.sameMembers(
      snapshot.graph.hoverOnlyNodes.map((node) => node.label),
      ["Unique Alpha Reference", "Unique Gamma Reference"],
    );
  });

  it("persists and reads citation graph metrics with graph rebuilds", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      citationGraphPapers: [
        {
          libraryId: 1,
          itemKey: "A",
          title: "Alpha Paper",
          year: "2020",
          references: [
            { title: "Beta Paper", year: "2024", authors: ["Beta"] },
          ],
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

    await service.refreshReferenceSidecarNow();
    await service.rebuildCitationGraphCacheNow();
    const metrics = await service.getCitationGraphMetrics({ limit: 2 });
    const byPaper = await service.getCitationGraphMetrics({
      paperRefs: ["1:B"],
    });
    const slice = await service.getCitationGraphSlice({
      paperRef: "1:B",
      direction: "incoming",
    });

    assert.equal(metrics.ok, true);
    assert.isTrue(
      metrics.items.some((item) => item.node_id === "zotero:item:B"),
    );
    assert.equal(byPaper.items[0].paper_ref, "1:B");
    assert.isAtLeast(byPaper.items[0].internal_in_degree, 1);
    assert.equal(
      slice.nodes.find((node: any) => node.node_id === "zotero:item:B")?.metrics
        ?.internal_in_degree,
      1,
    );
  });

  it("marks citation graph metrics stale when graph hash changes", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-12T00:00:00.000Z",
    });
    repository.replaceCitationGraphState({
      nodes: [
        {
          literatureItemId: "1:A",
          nodeStatus: "active",
          hasZoteroBinding: true,
          title: "Alpha",
          year: "2020",
        },
      ],
      lightweightMetrics: [
        {
          literatureItemId: "1:A",
          outgoingCount: 1,
          incomingCount: 0,
          matchedOutgoingCount: 1,
          unresolvedOutgoingCount: 0,
          ambiguousOutgoingCount: 0,
          localDegree: 1,
          sourceStructureVersion: 2,
        },
      ],
      complexMetrics: [
        {
          literatureItemId: "1:A",
          nodeId: "zotero:item:A",
          paperRef: "1:A",
          itemKey: "A",
          title: "Alpha",
          year: "2020",
          internalInDegree: 0,
          internalOutDegree: 1,
          externalReferenceCount: 0,
          unresolvedReferenceCount: 0,
          sourceGraphHash: "sha256:old",
          metricsHash: "sha256:metrics",
          foundationScore: 0,
          frontierScore: 1,
          internalPagerank: 0,
          componentId: "c1",
          componentSize: 1,
          isIsolated: false,
          ageNorm: 0,
          recencyNorm: 0,
          inDegreeNorm: 0,
          outDegreeNorm: 1,
          pagerankNorm: 0,
          sourceStructureVersion: 1,
          status: "ready",
        },
      ],
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
    });

    const metrics = await service.getCitationGraphMetrics();

    assert.equal(metrics.ok, true);
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
      (calls[0] as { artifact_metadata: Record<string, unknown> })
        .artifact_metadata,
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
                  mismatches: [
                    { name: "artifact", base: "", current: "sha256:a" },
                  ],
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
      assert.match(
        String((error as Error).message || error),
        /hostApi\.synthesis/i,
      );
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
        /must not embed markdown/i,
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
        artifacts: [
          "digest-markdown",
          "references-json",
          "citation-analysis-json",
        ],
      },
    },
    analysis_manifest_path: "result/topic-analysis.json",
    ...overrides,
  };
}

function v2SectionContext(
  sections: Record<string, unknown>,
  extraFiles: Record<string, unknown> = {},
) {
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
    sidecars: {
      topic_interest_metadata: {
        path: "result/sidecars/topic-interest-metadata.json",
        hash: "sha256:topic-interest-metadata",
        content_type: "json",
        schema_id: "topic_interest_metadata.v1",
      },
      concept_cards_proposal: {
        path: "result/sidecars/concept-cards-proposal.json",
        hash: "sha256:concept-cards-proposal",
        content_type: "json",
        schema_id: "synthesis.concept_cards_proposal",
      },
      topic_graph_relation_proposals: {
        path: "result/sidecars/topic-graph-relation-proposals.json",
        hash: "sha256:topic-graph-relation-proposals",
        content_type: "json",
        schema_id: "synthesis.topic_graph_relation_proposals",
      },
    },
    sections: sectionEntries,
  };
  const files = new Map<string, string>([
    ["result/topic-analysis.json", JSON.stringify(manifest)],
    [
      "result/sidecars/topic-interest-metadata.json",
      JSON.stringify({
        schema: "topic_interest_metadata.v1",
        topic_id: "object-detection",
        include_terms: ["object detection", "DETR"],
        must_have_terms: ["object detection"],
        methods: ["DETR"],
        exclude_terms: ["semantic segmentation"],
        seed_literature_item_ids: ["lit:detr"],
        diagnostics: [],
      }),
    ],
    [
      "result/sidecars/concept-cards-proposal.json",
      JSON.stringify({
        schema_id: "synthesis.concept_cards_proposal",
        cards: [],
        diagnostics: [],
      }),
    ],
    [
      "result/sidecars/topic-graph-relation-proposals.json",
      JSON.stringify({
        schema_id: "synthesis.topic_graph_relation_proposals",
        proposals: [],
        diagnostics: [],
      }),
    ],
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
    ...Object.entries(sections).map(
      ([section, value]) =>
        [
          `result/sections/${section.replace(/_/g, "-")}.json`,
          JSON.stringify(value),
        ] as const,
    ),
    ...Object.entries(extraFiles).map(
      ([filePath, value]) =>
        [
          filePath,
          typeof value === "string" ? value : JSON.stringify(value),
        ] as const,
    ),
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
    topic: {
      id: "object-detection",
      title: "Object Detection",
      definition:
        "The task of detecting instances of visual objects of certain classes in digital images.",
      discipline: "Computer Science",
      research_field: "Computer Vision",
      scope_boundary: { include: ["DETR"], exclude: [] },
    },
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
      summary: {
        text: "The fixture taxonomy contains one DETR route and uses it as a minimal route synthesis.",
      },
      nodes: [
        {
          id: "tax:detr",
          title: "DETR",
          definition: "End-to-end set prediction route for object detection.",
          core_problem: "Reduce hand-designed detection pipeline components.",
          mechanism: "Transformer object queries and bipartite matching.",
          representative_papers: ["paper:1:DETR"],
          strengths: ["Unified detection formulation"],
          limitations: ["Fixture route has one paper"],
          maturity: "early fixture",
          evidence_map_refs: ["tax:detr"],
        },
      ],
    },
    comparison_matrix: {
      dimensions: ["problem addressed"],
      rows: [{ id: "cmp:detr", evidence_map_refs: ["cmp:detr"] }],
    },
    claims: [
      {
        id: "claim:detr",
        text: "DETR introduced end-to-end detection.",
        analysis:
          "The fixture claim is supported by DETR's set-prediction formulation.",
        evidence_refs: ["paper:1:DETR"],
        evidence_map_refs: ["claim:detr"],
        confidence: 0.8,
        limitations: ["Fixture has one evidence paper."],
      },
    ],
    timeline_events: {
      summary: {
        text: "The fixture timeline treats DETR as the minimal milestone for query-based set prediction.",
      },
      events: [
        {
          id: "event:detr",
          year: 2020,
          label: "DETR",
          description: "DETR introduced set-prediction object detection.",
          phase: "paradigm_shift",
          progression_logic:
            "Later detector transformer work builds on this formulation.",
          evidence_refs: ["paper:1:DETR"],
          evidence_map_refs: ["claim:detr"],
        },
      ],
    },
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
      summary: "This is a summary of external literature analysis.",
      themes: [{ id: "theme:transformer", title: "Transformer background" }],
      representative_references: [],
      citation_contexts: [],
      contribution_to_topic: "",
      limitations: "",
      coverage_verdict: "partial",
      suggested_additions: [],
    },
    debates: [
      {
        id: "debate:detr",
        evidence_type: "methodological_tradeoff",
        evidence_map_refs: ["debate:detr"],
      },
    ],
    coverage: {
      paper_count: 1,
      external_literature_count: 0,
      coverage_verdict: "partial",
      route_coverage_summary: "Fixture covers one DETR route.",
    },
    gaps: [
      {
        id: "gap:coverage",
        gap_type: "library_coverage_gap",
        evidence_map_refs: ["gap:coverage"],
      },
    ],
    review_outline: {
      introduction_logic: [
        { id: "intro:why", evidence_map_refs: ["claim:detr"] },
      ],
      related_work_logic: [],
      body_sections: [],
    },
    statistics: {
      paper_count: 1,
      time_span: { start_year: 2020, end_year: 2020 },
      route_coverage: "Fixture covers one DETR route.",
      coverage_verdict: "partial",
    },
    synthesis_report: {
      title: "Object Detection Fixture Report",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "This fixture topic synthesis describes object detection through a single DETR evidence paper. DETR introduced a set-prediction framing that reduced reliance on hand-designed post-processing and made query-based detection a coherent research route. Because the fixture contains only one paper, the taxonomy, timeline, claims, and external literature analysis are intentionally partial and should be treated as a minimal validation artifact rather than a full domain synthesis.",
    },
    evidence_map: {
      path: "runtime/payloads/cross-paper-evidence-map.json",
      hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      candidate_counts: {},
      candidate_ids: [
        "tax:detr",
        "cmp:detr",
        "claim:detr",
        "debate:detr",
        "gap:coverage",
      ],
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
    const runtimeRoot = path.join(root, "runtime");
    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;

    assert.equal(
      paths.currentManifest,
      path.join(
        runtimeRoot,
        "synthesis",
        "topics",
        "object-detection",
        "current",
        "manifest.json",
      ),
    );
    assert.equal(
      paths.currentArtifact,
      path.join(
        runtimeRoot,
        "synthesis",
        "topics",
        "object-detection",
        "current",
        "artifact.json",
      ),
    );
    assert.equal(
      paths.currentMetadata,
      path.join(
        runtimeRoot,
        "synthesis",
        "topics",
        "object-detection",
        "current",
        "metadata.json",
      ),
    );
    assert.equal(
      paths.currentExportMarkdown,
      path.join(
        runtimeRoot,
        "synthesis",
        "topics",
        "object-detection",
        "current",
        "export.md",
      ),
    );
    assert.equal(
      paths.currentSectionsRoot,
      path.join(
        runtimeRoot,
        "synthesis",
        "topics",
        "object-detection",
        "current",
        "sections",
      ),
    );
    assert.notProperty(paths, "currentMarkdown");
  });

  it("applies structured topic results into current/ assets without mirror writes", async function () {
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
    const reviewInput = await service.getReviewInput({
      topicId: "object-detection",
    });

    assert.equal(result.status, "persisted");
    assert.isTrue(await exists(paths.currentManifest));
    assert.isTrue(await exists(paths.currentArtifact));
    assert.isTrue(await exists(paths.currentMetadata));
    assert.isTrue(await exists(paths.currentExportMarkdown));
    assert.isTrue(
      await exists(path.join(paths.currentSectionsRoot, "claims.json")),
    );
    assert.lengthOf(mirror.upserts, 0);
    assert.include(reviewInput.topic.markdown, "# Object Detection");
    assert.equal(
      reviewInput.structured_topic?.artifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.isArray(reviewInput.structured_topic?.claims);
    assert.isObject(reviewInput.structured_topic?.timeline_events);
    assert.isArray(reviewInput.structured_topic?.paper_evidence);
    assert.isObject(reviewInput.structured_topic?.external_literature_analysis);
  });

  it("upserts topic graph nodes and ingests relation proposal sidecars after structured apply", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
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
      v2SectionContext(v2SectionsWithEvidence(hashMarkdown("# Digest DETR")), {
        "result/sidecars/concept-cards-proposal.json": {
          schema_id: "synthesis.concept_cards_proposal",
          cards: [
            {
              label: "DETR",
              aliases: ["DEtection TRansformer"],
              concept_type: "method_family",
              domain: "computer vision",
              short_definition: "End-to-end object detector.",
              definition: "DETR formulates object detection as set prediction.",
              confidence: 0.9,
            },
          ],
        },
        "result/sidecars/topic-graph-relation-proposals.json": {
          schema_id: "synthesis.topic_graph_relation_proposals",
          source_topic_id: "object-detection",
          proposals: [
            {
              proposal_type: "broader_topic_candidate",
              target_topic_id: "computer-vision",
              target_title: "Computer Vision",
            },
            {
              proposal_type: "related_topic_candidate",
              target_topic_id: "set-prediction",
              target_title: "Set Prediction",
            },
          ],
        },
      }),
    );

    const graph = await service.loadTopicGraph();
    const concepts = await service.loadConceptKb();
    assert.equal(result.status, "persisted");
    assert.deepEqual(
      concepts.concepts.map((entry) => entry.label),
      ["DETR"],
    );
    assert.includeMembers(
      graph.nodes.map((node) => node.topic_id),
      ["object-detection", "computer-vision", "set-prediction"],
    );
    assert.includeMembers(
      graph.edges.map((edge) => edge.relation),
      ["broader_than", "related_to"],
    );
    const materialized = graph.nodes.find(
      (node) => node.topic_id === "object-detection",
    );
    assert.equal(materialized?.node_type, "materialized");
    assert.equal(materialized?.paper_count, 1);
  });

  it("persists topic interest metadata sidecar after structured apply [inv.topic.registry_rebuild_not_changed]", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-16T00:00:00.000Z",
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
      synthesisRepository: repository,
      registryInputs: [
        registryInput({
          itemKey: "DETR",
          digest: "# Digest DETR",
          references: null,
          citation: null,
        }),
      ],
    });
    repository.upsertLiteratureMatchingMetadata({
      literatureItemId: "lit:candidate",
      keyTermsJson: JSON.stringify(["object detection", "DETR"]),
      methodsJson: JSON.stringify(["DETR"]),
      problemsJson: JSON.stringify(["detection"]),
    });

    const result = await service.applyTopicSynthesisResult(
      v2TopicBundle(),
      v2SectionContext(v2SectionsWithEvidence(hashMarkdown("# Digest DETR"))),
    );
    const metadata = repository.getTopicInterestMetadata("object-detection");
    const hints = repository.listTopicDiscoveryHints({
      topicIds: ["object-detection"],
      statuses: ["open"],
    });
    const state = await topicFreshnessState(root, "object-detection");
    const topicContext = (await service.getTopicContext({
      topicId: "object-detection",
    })) as {
      freshness?: {
        freshness?: string;
        known_dependency_status?: string;
        discovery_status?: string;
        candidate_count?: number;
      };
      discovery_hints?: Array<{ literatureItemId: string }>;
    };

    assert.equal(result.status, "persisted");
    assert.isOk(metadata);
    assert.deepEqual(JSON.parse(metadata?.includeTermsJson || "[]"), [
      "object detection",
      "DETR",
    ]);
    assert.deepEqual(JSON.parse(metadata?.seedLiteratureItemIdsJson || "[]"), [
      "lit:detr",
    ]);
    assert.deepEqual(
      hints.map((hint) => hint.literatureItemId),
      ["lit:candidate"],
    );
    assert.equal(state.freshness, "fresh");
    assert.equal(state.known_dependency_status, "fresh");
    assert.equal(state.discovery_status, "candidates");
    assert.equal(state.candidate_count, 1);
    assert.equal(topicContext.freshness?.freshness, "fresh");
    assert.equal(topicContext.freshness?.discovery_status, "candidates");
    assert.deepEqual(
      (topicContext.discovery_hints || []).map((hint) => hint.literatureItemId),
      ["lit:candidate"],
    );

    repository.upsertLiteratureItem({
      literatureItemId: "lit:new-candidate",
      displayTitle: "New DETR Candidate",
      normalizedTitle: "new detr candidate",
      titleNormalizerVersion: "test",
      status: "active",
    });
    repository.upsertLiteratureMatchingMetadata({
      literatureItemId: "lit:new-candidate",
      keyTermsJson: JSON.stringify(["object detection"]),
      methodsJson: JSON.stringify(["DETR"]),
      problemsJson: JSON.stringify(["detection"]),
    });
    const refreshedState = await topicFreshnessState(root, "object-detection");
    const refreshedHints = repository.listTopicDiscoveryHints({
      topicIds: ["object-detection"],
      statuses: ["open"],
    });

    assert.equal(refreshedState.freshness, "fresh");
    assert.equal(refreshedState.known_dependency_status, "fresh");
    assert.equal(refreshedState.discovery_status, "candidates");
    assert.equal(refreshedState.candidate_count, 1);
    assert.deepEqual(
      refreshedHints.map((hint) => hint.literatureItemId),
      ["lit:candidate"],
    );
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
        throw new Error(
          "missing test run artifact: runtime/payloads/resolver.json",
        );
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

  it("keeps legacy current.md/current.json topic directories out of Workbench UI reads", async function () {
    const root = await makeRoot();
    const paths = buildSynthesisStoragePaths(root, "legacy-topic");
    await fs.mkdir(path.dirname((paths as any).legacyCurrentMarkdown), {
      recursive: true,
    });
    await fs.writeFile(
      (paths as any).legacyCurrentMarkdown,
      "# Legacy Markdown\n",
      "utf8",
    );
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
    const row = snapshot.artifacts.rows.find(
      (entry: any) => entry.id === "legacy-topic",
    );

    assert.isUndefined(row);
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
    const module = await importOptional(
      "../../src/modules/synthesis/topicStructuredArtifact",
    );

    assert.isUndefined(
      module.__loadError,
      `expected topicStructuredArtifact module to load before checking patch apply: ${
        module.__loadError instanceof Error
          ? module.__loadError.message
          : String(module.__loadError)
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
    assert.equal(
      result.nextManifest.section_hashes.claims,
      "sha256:new-claims",
    );
    assert.equal(
      result.nextManifest.section_hashes.coverage,
      "sha256:newer-coverage",
    );
  });
});
