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
import { createSynthesisTopicGraphService } from "../../src/modules/synthesis/topicGraph";
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
      definition: "A topic",
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

function legacyCurrentExportPath(root: string, topicId: string) {
  return path.join(
    buildSynthesisStoragePaths(root, topicId).currentRoot,
    "export.md",
  );
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
    const metadata = JSON.parse(
      await fs.readFile(paths.currentMetadata, "utf8"),
    );
    const index = JSON.parse(await fs.readFile(paths.index, "utf8"));

    assert.equal(result.status, "persisted");
    assert.equal(
      await exists(legacyCurrentExportPath(root, "topic-alpha")),
      false,
    );
    assert.equal(metadata.schema_id, "synthesis.topic_artifact_metadata");
    assert.equal(metadata.data.topic_id, "topic-alpha");
    assert.notProperty(metadata.data, "markdown_hash");
    assert.notProperty(metadata.data, "export_hash");
    assert.equal(index.data.topics[0].topic_id, "topic-alpha");
    assert.notProperty(index.data.topics[0], "markdown_hash");
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
    assert.equal(state.coverage, "missing");
    assert.match(state.baseline_input_hash || "", /^sha256:/);
    assert.equal(state.baseline_input_hash, state.current_input_hash);
    assert.equal(snapshot.artifacts.rows[0]?.freshness, "fresh");
    assert.equal(snapshot.artifacts.rows[0]?.coverage, "missing");
    assert.equal(snapshot.artifacts.rows[0]?.completion, 0);
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
    const beforeArtifact = await fs.readFile(paths.currentArtifact, "utf8");
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
    assert.equal(snapshot.artifacts.rows[0]?.freshness, "fresh");
    assert.equal(
      await fs.readFile(paths.currentArtifact, "utf8"),
      beforeArtifact,
    );
    assert.equal(
      await fs.readFile(paths.currentMetadata, "utf8"),
      beforeMetadata,
    );
  });

  it("redirects safe stale canonicals to same-source artifact successors", async function () {
    const root = await makeRoot();
    const first = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        registryInput({
          itemKey: "A",
          references: JSON.stringify({
            references: [
              {
                title: "Shared Artifact Reference",
                year: "2020",
                authors: ["A. Author"],
              },
            ],
          }),
        }),
      ],
    });
    await first.refreshReferenceSidecarNow();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const oldCanonical = repository.listCanonicalReferences({
      statuses: ["active"],
    })[0];
    assert.isOk(oldCanonical?.canonicalReferenceId);

    const second = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        registryInput({
          itemKey: "A",
          references: JSON.stringify({
            references: [
              {
                title: "Shared Artifact Reference",
                year: "2020",
                authors: ["Alice Author"],
              },
            ],
          }),
        }),
      ],
    });
    await second.refreshReferenceSidecarNow();

    const redirects = repository.listCanonicalReferenceRedirects({
      fromCanonicalReferenceIds: [oldCanonical!.canonicalReferenceId],
    });
    assert.lengthOf(redirects, 1);
    assert.notEqual(
      redirects[0]?.toCanonicalReferenceId,
      oldCanonical!.canonicalReferenceId,
    );
    assert.equal(
      repository.listCanonicalReferences({
        canonicalReferenceIds: [oldCanonical!.canonicalReferenceId],
      })[0]?.status,
      "stale",
    );
    const snapshot = await second.getSynthesisWorkbenchSurfaceInput("index");
    assert.notInclude(
      (snapshot.registry?.canonicalRows || []).map(
        (row) => row.effective_canonical_id,
      ),
      oldCanonical!.canonicalReferenceId,
    );
  });

  it("marks safe stale canonicals stale when no same-source successor exists", async function () {
    const root = await makeRoot();
    const first = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        registryInput({
          itemKey: "A",
          references: JSON.stringify({
            references: [{ title: "Temporary Reference", year: "2021" }],
          }),
        }),
      ],
    });
    await first.refreshReferenceSidecarNow();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const oldCanonical = repository.listCanonicalReferences({
      statuses: ["active"],
    })[0];

    const second = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        registryInput({
          itemKey: "A",
          references: JSON.stringify({ references: [] }),
        }),
      ],
    });
    await second.refreshReferenceSidecarNow();

    assert.equal(
      repository.listCanonicalReferences({
        canonicalReferenceIds: [oldCanonical!.canonicalReferenceId],
      })[0]?.status,
      "stale",
    );
    assert.lengthOf(
      repository.listCanonicalReferenceRedirects({
        fromCanonicalReferenceIds: [oldCanonical!.canonicalReferenceId],
      }),
      0,
    );
  });

  it("creates canonical revision proposals for protected stale canonicals", async function () {
    const root = await makeRoot();
    const first = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        registryInput({
          itemKey: "A",
          references: JSON.stringify({
            references: [
              {
                title: "Protected Artifact Reference",
                year: "2022",
                authors: ["P. Author"],
              },
            ],
          }),
        }),
      ],
    });
    await first.refreshReferenceSidecarNow();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const oldCanonical = repository.listCanonicalReferences({
      statuses: ["active"],
    })[0];
    repository.upsertReferenceBinding({
      bindingId: "binding:protected",
      canonicalReferenceId: oldCanonical!.canonicalReferenceId,
      libraryId: 1,
      itemKey: "BOUND",
      status: "accepted",
      confidence: "manual",
      createdAt: "2026-05-11T00:00:00.000Z",
      updatedAt: "2026-05-11T00:00:00.000Z",
    });

    const second = createSynthesisService({
      root,
      libraryId: 1,
      registryInputs: [
        registryInput({
          itemKey: "A",
          references: JSON.stringify({
            references: [
              {
                title: "Protected Artifact Reference",
                year: "2022",
                authors: ["Pat Author"],
              },
            ],
          }),
        }),
      ],
    });
    await second.refreshReferenceSidecarNow();

    assert.equal(
      repository.listCanonicalReferences({
        canonicalReferenceIds: [oldCanonical!.canonicalReferenceId],
      })[0]?.status,
      "active",
    );
    const proposal = repository.listReviewItems({
      reviewKind: "canonical_revision",
      statuses: ["open"],
    })[0];
    assert.isOk(proposal?.reviewItemId);
    assert.include(proposal!.payloadJson || "", "redirect_to_successor");

    const result = await second.applyCanonicalRevisionReviewAction({
      reviewItemId: proposal!.reviewItemId,
      action: "accept",
    });
    assert.equal(result.ok, true);
    assert.equal(
      repository.listReviewItems({
        reviewKind: "canonical_revision",
      })[0]?.status,
      "approved",
    );
    assert.equal(
      repository.listCanonicalReferences({
        canonicalReferenceIds: [oldCanonical!.canonicalReferenceId],
      })[0]?.status,
      "stale",
    );
    assert.lengthOf(
      repository.listCanonicalReferenceRedirects({
        fromCanonicalReferenceIds: [oldCanonical!.canonicalReferenceId],
      }),
      1,
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
    assert.notInclude(
      inventory.topics.map((topic) => topic.topic_id),
      "topic-alpha",
    );
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

    assert.equal(result.ok, true);
    assert.equal(result.status, "persisted");
    assert.equal(
      await exists(legacyCurrentExportPath(root, "topic-alpha")),
      false,
    );
    if (result.ok) {
      assert.isUndefined(result.mirrorError);
      assert.notInclude(result.warnings || [], "mirror_refresh_failed");
    }
  });

  it("ignores stale legacy base hashes without creating conflict candidates", async function () {
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
    const update = await service.applyTopicSynthesisResult(
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
    const snapshot = await service.getSynthesisSnapshot();

    assert.equal(update.status, "persisted");
    assert.equal(
      await exists(legacyCurrentExportPath(root, "topic-alpha")),
      false,
    );
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
    assert.include(
      reviewInput.topic.markdown,
      "The topic source set contains 2 papers",
    );
    assert.notInclude(reviewInput.topic.markdown, "```json");
    assert.equal(
      reviewInput.structured_topic?.artifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.isArray(reviewInput.structured_topic?.claims);
    assert.isObject(reviewInput.structured_topic?.timeline_events);
    assert.isArray(reviewInput.structured_topic?.source_papers);
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

  it("reads topic context from current artifact files when the topic graph cache is missing", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T00:00:00.000Z",
      registryInputs: [registryInput({ itemKey: "A" })],
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await service.applyTopicSynthesisResult(validBundle());
    createSynthesisRepository({ root }).replaceTopicGraphState({
      nodes: [],
      edges: [],
      reviewItems: [],
    });

    const topicContext = (await service.getTopicContext({
      topicId: "topic-alpha",
      includeMarkdown: true,
    })) as {
      status?: string;
      topic_id?: string;
      markdown?: string;
      current_metadata?: { topic_id?: string };
      diagnostics?: { message?: string };
    };

    assert.notEqual(topicContext.status, "not_found");
    assert.equal(topicContext.topic_id, "topic-alpha");
    assert.equal(topicContext.current_metadata?.topic_id, "topic-alpha");
    assert.include(topicContext.markdown || "", "The topic source set");
    assert.notInclude(
      topicContext.diagnostics?.message || "",
      "synthesis database",
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
          definition: "Semantic scope for Alpha.",
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
    await createSynthesisTopicGraphService({ root }).importTopicGraphCheckpoint({
      nodes: [
        {
          topic_id: "topic-alpha",
          title: "Alpha Topic",
          aliases: [],
          node_type: "materialized",
          definition_status: "has_synthesis",
          current_artifact_path: "topics/topic-alpha/current/artifact.json",
          paper_count: 1,
          last_synthesis_at: "2026-05-12T00:00:00.000Z",
          created_at: "2026-05-12T00:00:00.000Z",
          updated_at: "2026-05-12T00:00:00.000Z",
        },
      ],
      edges: [],
      reviewItems: [],
    });

    const inventory = await service.listTopics();
    const topic = inventory.topics[0] as Record<string, unknown>;
    const graph = await service.loadTopicGraph();
    const graphTopic = graph.nodes.find(
      (node) => node.topic_id === "topic-alpha",
    );

    assert.deepEqual(inventory.diagnostics, {
      count: 1,
      source: "sqlite-topic-graph",
    });
    assert.equal(graphTopic?.definition, "Semantic scope for Alpha.");
    assert.deepEqual(topic, {
      topic_id: "topic-alpha",
      title: "Alpha Topic",
      definition: "Semantic scope for Alpha.",
      aliases: ["Alpha", "A topic"],
      updated_at: "2026-05-12T00:00:00.000Z",
      prospective_topic_relation_proposals: [],
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

  it("finds active topics by paper_ref from current and baseline dependencies", async function () {
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
          definition: "Alpha semantic scope.",
        },
        topic_resolver: {
          mode: "explicit",
          paper_refs: ["1:CURRENT", "1:BASELINE"],
        },
        resolved_paper_set: {
          papers: [
            { paper_ref: "1:CURRENT", match_reasons: ["explicit"] },
            { paper_ref: "1:BASELINE", match_reasons: ["explicit"] },
          ],
        },
        artifact_metadata: {
          depends_on: {
            papers: ["1:CURRENT", "1:BASELINE"],
            artifacts: [],
          },
        },
      }),
    );
    await service.applyTopicSynthesisResult(
      validBundle({
        topic_definition: {
          id: "topic-beta",
          title: "Beta Topic",
          definition: "Beta semantic scope.",
        },
        topic_resolver: {
          mode: "explicit",
          paper_refs: ["1:DELETED"],
        },
        resolved_paper_set: {
          papers: [{ paper_ref: "1:DELETED", match_reasons: ["explicit"] }],
        },
        artifact_metadata: {
          depends_on: {
            papers: ["1:DELETED"],
            artifacts: [],
          },
        },
      }),
    );

    const artifactState = await readArtifactState(root);
    const stateRows = artifactState.data.topics;
    const alphaStateKey = Object.keys(stateRows).find(
      (key) => stateRows[key]?.topic_id === "topic-alpha",
    );
    assert.isString(alphaStateKey);
    stateRows[alphaStateKey!].baseline_dependencies.saved_paper_refs = [
      "1:BASELINE",
    ];
    stateRows[alphaStateKey!].current_dependencies.current_paper_refs = [
      "1:CURRENT",
    ];
    await fs.writeFile(
      buildSynthesisStoragePaths(root).artifactState,
      JSON.stringify(artifactState, null, 2),
      "utf8",
    );
    await service.deleteTopicArtifact({ topicId: "topic-beta" });

    const result = await service.findTopicsByPaperRef({
      paper_refs: ["1:CURRENT", "1:BASELINE", "1:MISSING", "1:CURRENT"],
    });
    const deleted = await service.findTopicsByPaperRef({
      paper_ref: "1:DELETED",
    });
    const invalid = await service.findTopicsByPaperRef({});

    assert.equal(result.ok, true);
    assert.equal(result.status, "ok");
    assert.deepEqual(result.paper_refs, ["1:BASELINE", "1:CURRENT", "1:MISSING"]);
    assert.deepEqual(result.diagnostics.unmatched_paper_refs, ["1:MISSING"]);
    assert.equal(result.diagnostics.source, "artifact_state");
    assert.lengthOf(result.topics, 1);
    assert.deepInclude(result.topics[0], {
      topic_id: "topic-alpha",
      title: "Alpha Topic",
      matched_paper_refs: ["1:BASELINE", "1:CURRENT"],
      match_sources: ["current_dependencies", "baseline_dependencies"],
    });
    assert.isString(result.topics[0].freshness);
    assert.isString(result.topics[0].coverage);
    assert.deepEqual(deleted.topics, []);
    assert.deepEqual(deleted.diagnostics.unmatched_paper_refs, ["1:DELETED"]);
    assert.equal(invalid.ok, false);
    assert.equal(invalid.status, "invalid_request");
    assert.include(invalid.diagnostics.errors?.join("\n"), "paper_ref");
  });

  it("does not treat recreated active topics as deleted for paper_ref lookup or context", async function () {
    const root = await makeRoot();
    let timestamp = "2026-05-12T00:10:00.000Z";
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => timestamp,
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await service.applyTopicSynthesisResult(
      validBundle({
        topic_definition: {
          id: "topic-alpha",
          title: "Alpha Topic",
          definition: "Alpha semantic scope.",
        },
        topic_resolver: {
          mode: "explicit",
          paper_refs: ["1:OLD"],
        },
        resolved_paper_set: {
          papers: [{ paper_ref: "1:OLD", match_reasons: ["explicit"] }],
        },
        artifact_metadata: {
          depends_on: {
            papers: ["1:OLD"],
            artifacts: [],
          },
        },
      }),
    );

    timestamp = "2026-05-12T00:11:00.000Z";
    await service.deleteTopicArtifact({ topicId: "topic-alpha" });

    timestamp = "2026-05-12T00:12:00.000Z";
    await service.applyTopicSynthesisResult(
      validBundle({
        topic_definition: {
          id: "topic-alpha",
          title: "Alpha Topic Recreated",
          definition: "Alpha semantic scope, recreated.",
        },
        topic_resolver: {
          mode: "explicit",
          paper_refs: ["1:RECREATED"],
        },
        resolved_paper_set: {
          papers: [{ paper_ref: "1:RECREATED", match_reasons: ["explicit"] }],
        },
        artifact_metadata: {
          depends_on: {
            papers: ["1:RECREATED"],
            artifacts: [],
          },
        },
      }),
    );

    const deleted = await service.listDeletedTopicArtifacts();
    const lookup = await service.findTopicsByPaperRef({
      paper_ref: "1:RECREATED",
    });
    const context = (await service.getTopicContext({
      topicId: "topic-alpha",
    })) as Record<string, unknown>;

    assert.include(
      deleted.deleted.map((entry) => entry.topic_id),
      "topic-alpha",
    );
    assert.equal(lookup.ok, true);
    assert.deepEqual(
      lookup.topics.map((topic) => topic.topic_id),
      ["topic-alpha"],
    );
    assert.deepEqual(lookup.topics[0].matched_paper_refs, ["1:RECREATED"]);
    assert.equal(context.topic_id, "topic-alpha");
    assert.notEqual(context.status, "deleted");
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
    const graph = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-12T02:00:00.000Z",
    });
    await graph.upsertTopicNode({
      topic_id: "topic-beta",
      title: "Beta Topic",
      aliases: [],
      node_type: "placeholder",
      definition_status: "placeholder",
    });
    const proposalResult = await graph.ingestRelationProposals({
      sourceTopicId: "topic-alpha",
      payload: {
        schema_id: "synthesis.topic_graph_relation_proposals",
        proposals: [
          {
            relation_type: "related_topic_candidate",
            target_topic_id: "topic-beta",
            confidence: 0.9,
          },
          {
            relation_type: "contrast_topic_candidate",
            target_topic_id: "topic-beta",
            confidence: 0.4,
          },
        ],
      },
    });
    await graph.decideTopicGraphRelation({
      edgeId: proposalResult.accepted_edges[0]!.edge_id,
      status: "confirmed",
    });
    const beforeDeleteUpserts = mirror.upserts.length;
    const result = await service.deleteTopicArtifact({
      topicId: "topic-alpha",
    });
    const snapshot = await service.getSynthesisSnapshot();
    const inventory = await service.listTopics();
    const deleted = await service.listDeletedTopicArtifacts();
    const graphAfterDelete = await graph.loadTopicGraph();

    assert.equal(result.ok, true);
    assert.equal(result.status, "deleted");
    assert.equal(
      await exists(legacyCurrentExportPath(root, "topic-alpha")),
      false,
    );
    assert.deepEqual(snapshot.artifacts.rows, []);
    assert.notInclude(
      inventory.topics.map((topic) => topic.topic_id),
      "topic-alpha",
    );
    assert.deepEqual(
      deleted.deleted.map((entry) => entry.topic_id),
      ["topic-alpha"],
    );
    assert.equal(snapshot.deletedArtifacts.count, 0);
    assert.equal(mirror.upserts.length, beforeDeleteUpserts);
    assert.deepEqual(
      graphAfterDelete.edges
        .filter(
          (edge) =>
            edge.source_topic_id === "topic-alpha" ||
            edge.target_topic_id === "topic-alpha",
        )
        .map((edge) => edge.status),
      ["deleted"],
    );
    assert.deepEqual(
      graphAfterDelete.review_items
        .filter(
          (item) =>
            item.source_topic_id === "topic-alpha" ||
            item.target_topic_id === "topic-alpha",
        )
        .map((item) => item.status),
      ["deleted"],
    );
  });

  it("soft deletes data-root topic artifacts even when the active index row is missing", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-12T02:30:00.000Z",
      mirrorAdapter: createMirrorRecorder().adapter,
    });

    await service.applyTopicSynthesisResult(validBundle());
    await fs.writeFile(
      buildSynthesisStoragePaths(root).index,
      JSON.stringify(
        createCanonicalEnvelope({
          schemaId: "synthesis.index",
          data: { topics: [] },
          now: "2026-05-12T02:31:00.000Z",
        }),
        null,
        2,
      ) + "\n",
      "utf8",
    );

    const detail = await service.readTopicDetail({ topicId: "topic-alpha" });
    const result = await service.deleteTopicArtifact({
      topicId: "topic-alpha",
    });
    const deleted = await service.listDeletedTopicArtifacts();

    assert.equal(detail.topicId, "topic-alpha");
    assert.equal(result.ok, true);
    assert.equal(result.status, "deleted");
    assert.equal(
      await exists(legacyCurrentExportPath(root, "topic-alpha")),
      false,
    );
    assert.deepEqual(
      deleted.deleted.map((entry) => entry.topic_id),
      ["topic-alpha"],
    );
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
    const graph = createSynthesisTopicGraphService({
      root,
      now: () => "2026-05-12T03:00:00.000Z",
    });
    await graph.upsertTopicNode({
      topic_id: "topic-beta",
      title: "Beta Topic",
      aliases: [],
      node_type: "placeholder",
      definition_status: "placeholder",
    });
    await graph.ingestRelationProposals({
      sourceTopicId: "topic-alpha",
      payload: {
        schema_id: "synthesis.topic_graph_relation_proposals",
        proposals: [
          {
            relation_type: "related_topic_candidate",
            target_topic_id: "topic-beta",
            confidence: 0.9,
          },
          {
            relation_type: "contrast_topic_candidate",
            target_topic_id: "topic-beta",
            confidence: 0.4,
          },
        ],
      },
    });
    await service.deleteTopicArtifact({ topicId: "topic-alpha" });
    const first = await service.purgeDeletedTopicArtifacts();
    const second = await service.purgeDeletedTopicArtifacts();
    const deleted = await service.listDeletedTopicArtifacts();
    const graphAfterPurge = await graph.loadTopicGraph();

    assert.equal(first.ok, true);
    assert.equal(first.status, "purged");
    assert.equal(first.purged_count, 1);
    assert.equal(second.purged_count, 0);
    assert.deepEqual(deleted.deleted, []);
    assert.notInclude(
      graphAfterPurge.nodes.map((node) => node.topic_id),
      "topic-alpha",
    );
    assert.deepEqual(
      graphAfterPurge.edges.filter(
        (edge) =>
          edge.source_topic_id === "topic-alpha" ||
          edge.target_topic_id === "topic-alpha",
      ),
      [],
    );
    assert.deepEqual(
      graphAfterPurge.review_items.filter(
        (item) =>
          item.source_topic_id === "topic-alpha" ||
          item.target_topic_id === "topic-alpha",
      ),
      [],
    );
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
          definition: "Beta semantic scope.",
          aliases: ["Beta"],
        },
      }),
    );

    const inventory = await service.listTopics();

    assert.deepInclude(inventory.topics, {
      topic_id: "topic-beta",
      title: "topic-beta",
      definition: "Beta semantic scope.",
      aliases: ["Beta"],
      updated_at: "2026-05-12T01:00:00.000Z",
      prospective_topic_relation_proposals: [],
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

  it("requires explicit scope or selectors for citation graph layout reads", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    const result = await service.getCitationGraphLayout({});

    assert.equal(result.ok, false);
    assert.equal(result.status, "invalid_request");
    assert.equal(result.scope, "none");
    assert.include(result.diagnostics.warnings.join("\n"), "scope");
  });

  it("returns persisted citation graph layout for full, slice, and explicit node queries", async function () {
    const root = await makeRoot();
    await writeDbGraphState(root);
    const service = createSynthesisService({ root, libraryId: 1 });

    await service.recomputeCitationGraphLayout({
      algorithm: "force",
      force: true,
      timeBudgetMs: 1000,
    });
    const full = await service.getCitationGraphLayout({ scope: "full" });
    const slice = await service.getCitationGraphLayout({
      paperRef: "1:A",
      maxNodes: 10,
      maxEdges: 10,
    });
    const explicit = await service.getCitationGraphLayout({
      paperRefs: ["1:A", "1:B"],
    });

    assert.equal(full.ok, true);
    assert.equal(full.status, "ready");
    assert.equal(full.scope, "full");
    assert.equal(full.layout_status, "ready");
    assert.isNumber(full.nodes.find((node) => node.node_id === "zotero:item:A")?.x);
    assert.include(
      slice.nodes.map((node) => node.node_id),
      "zotero:item:B",
    );
    assert.deepEqual(
      explicit.nodes.map((node) => node.node_id),
      ["zotero:item:A", "zotero:item:B"],
    );
    assert.deepEqual(
      explicit.edges.map((edge) => edge.edge_id),
      ["edge-a-b"],
    );
  });

  it("reports missing and oversized citation graph layout reads without recomputing", async function () {
    const root = await makeRoot();
    await writeDbGraphState(root);
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
    });
    const beforeLayouts = repository.listCitationGraphLayoutStates();

    const missing = await service.getCitationGraphLayout({ scope: "full" });
    assert.equal(missing.ok, false);
    assert.equal(missing.status, "missing");
    assert.deepEqual(repository.listCitationGraphLayoutStates(), beforeLayouts);

    await service.recomputeCitationGraphLayout({
      algorithm: "force",
      force: true,
      timeBudgetMs: 1000,
    });
    const tooLarge = await service.getCitationGraphLayout({
      scope: "full",
      maxNodes: 1,
    });
    const truncated = await service.getCitationGraphLayout({
      scope: "full",
      maxNodes: 1,
      allowTruncated: true,
    });

    assert.equal(tooLarge.ok, false);
    assert.equal(tooLarge.status, "too_large");
    assert.equal(truncated.ok, true);
    assert.equal(truncated.diagnostics.truncated, true);
    assert.isAtMost(truncated.nodes.length, 1);
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
    await service.recomputeCitationGraphLayout({
      algorithm: "force",
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

    const repository = createSynthesisRepository({ runtimeRoot: root });
    repository.upsertCitationGraphLayoutState({
      layoutKey: repository.citationLayoutKey({
        viewKey: "workbench_overview",
        preset: "force",
      }),
      viewKey: "workbench_overview",
      preset: "force",
      graphHash: snapshot.graph.graph_hash,
      status: "ready",
      layoutJson: JSON.stringify({
        graph_hash: snapshot.graph.graph_hash,
        layout_engine: "d3-force",
        layout_version: 1,
        preset: "balanced",
        params: {
          link_distance: 80,
          charge: -140,
          collision_radius: 8,
          iterations: 400,
        },
        nodes: {},
        layout_hash: "sha256:legacy-layout",
      }),
      diagnosticsJson: "[]",
    });

    const staleSnapshot = await reloaded.getSynthesisSnapshot();

    assert.equal(staleSnapshot.graph.layoutStatus, "stale");
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
    assert.equal(graphBasis?.status, "ready");
    assert.equal(
      repository.listCitationEdges({ statuses: ["accepted"] }).length,
      1,
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
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "ready",
    );
    const acceptedProposal = repository.listReferenceMatchProposals({
      proposalIds: [rejectedProposalId!],
    })[0];
    assert.equal(acceptedProposal?.status, "accepted");
    assert.isTrue(
      repository
        .listReferenceBindings({ statuses: ["accepted"] })
        .some((binding) => binding.itemKey === acceptedProposal?.targetItemKey),
    );
    assert.isTrue(
      repository.listCitationEdges({
        sourceLiteratureItemIds: ["1:A"],
        targetLiteratureItemIds: [`1:${acceptedProposal?.targetItemKey || ""}`],
        statuses: ["accepted"],
      }).length > 0,
    );

    await service.applyReferenceMatchProposalAction({
      proposalId: rejectedProposalId!,
      action: "reject",
    });
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "ready",
    );
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
    assert.lengthOf(
      repository.listCitationEdges({
        sourceLiteratureItemIds: ["1:A"],
        targetLiteratureItemIds: [`1:${acceptedProposal?.targetItemKey || ""}`],
        statuses: ["accepted"],
      }),
      0,
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
      repository.getCacheBasis("citation-graph:library")?.status,
      "ready",
    );
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

  it("accepts canonical merge proposals in reverse direction", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
    });
    repository.upsertReferenceMatchProposal({
      proposalId: "proposal:reverse-canonical-merge",
      kind: "canonical_merge",
      status: "open",
      sourceCanonicalReferenceId: "cref:source",
      sourceRawReferenceIdsJson: JSON.stringify(["raw:source"]),
      targetCanonicalReferenceId: "cref:target",
      confidence: "high",
      score: 1,
      reasonsJson: JSON.stringify(["exact_title_year"]),
      evidenceJson: JSON.stringify({ source: "source", target: "target" }),
      diagnosticsJson: "[]",
      basisHash: "sha256:reverse-basis",
      sourceHash: "sha256:reverse-source",
    });

    const reverse = await service.applyReferenceMatchProposalAction({
      proposalId: "proposal:reverse-canonical-merge",
      action: "reverse_accept",
    });

    assert.equal(reverse.ok, true);
    assert.equal(
      repository.listReferenceMatchProposals({
        proposalIds: ["proposal:reverse-canonical-merge"],
      })[0]?.status,
      "accepted",
    );
    const redirects = repository.listCanonicalReferenceRedirects();
    assert.isTrue(
      redirects.some(
        (redirect) =>
          redirect.fromCanonicalReferenceId === "cref:target" &&
          redirect.toCanonicalReferenceId === "cref:source" &&
          redirect.reason === "advanced_reference_matching_reverse_accept",
      ),
    );
    assert.isFalse(
      redirects.some(
        (redirect) =>
          redirect.fromCanonicalReferenceId === "cref:source" &&
          redirect.toCanonicalReferenceId === "cref:target",
      ),
    );

    await service.applyReferenceMatchProposalAction({
      proposalId: "proposal:reverse-canonical-merge",
      action: "reject",
    });
    assert.lengthOf(repository.listCanonicalReferenceRedirects(), 0);
  });

  it("applies manual target decisions for binding and canonical merge proposals", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      registryInputs: [
        { libraryId: 1, itemKey: "MANUAL", title: "Manual Target" },
      ],
    });
    repository.upsertCanonicalReference({
      canonicalReferenceId: "cref:binding-source",
      title: "Binding Source",
      status: "active",
    });
    repository.upsertCanonicalReference({
      canonicalReferenceId: "cref:merge-source",
      title: "Merge Source",
      status: "active",
    });
    repository.upsertCanonicalReference({
      canonicalReferenceId: "cref:merge-original-target",
      title: "Original Target",
      status: "active",
    });
    repository.upsertCanonicalReference({
      canonicalReferenceId: "cref:merge-selected-target",
      title: "Selected Target",
      status: "active",
    });
    repository.upsertReferenceMatchProposal({
      proposalId: "proposal:manual-binding",
      kind: "zotero_binding",
      status: "open",
      sourceCanonicalReferenceId: "cref:binding-source",
      sourceRawReferenceIdsJson: JSON.stringify(["raw:binding"]),
      targetLibraryId: 1,
      targetItemKey: "WRONG",
      confidence: "medium",
      score: 0.5,
      reasonsJson: JSON.stringify(["candidate"]),
      evidenceJson: "{}",
      diagnosticsJson: "[]",
      basisHash: "sha256:manual-binding-basis",
      sourceHash: "sha256:manual-binding-source",
    });
    repository.upsertReferenceMatchProposal({
      proposalId: "proposal:manual-merge",
      kind: "canonical_merge",
      status: "open",
      sourceCanonicalReferenceId: "cref:merge-source",
      sourceRawReferenceIdsJson: JSON.stringify(["raw:merge-source"]),
      targetCanonicalReferenceId: "cref:merge-original-target",
      confidence: "medium",
      score: 0.5,
      reasonsJson: JSON.stringify(["candidate"]),
      evidenceJson: "{}",
      diagnosticsJson: "[]",
      basisHash: "sha256:manual-merge-basis",
      sourceHash: "sha256:manual-merge-source",
    });

    const result = await service.applyReferenceMatchProposalActions({
      decisions: [
        {
          proposalId: "proposal:manual-binding",
          action: "manual_target",
          target: { kind: "zotero_item", libraryId: 1, itemKey: "MANUAL" },
        },
        {
          proposalId: "proposal:manual-merge",
          action: "manual_target",
          target: {
            kind: "canonical_reference",
            canonicalReferenceId: "cref:merge-selected-target",
          },
        },
      ],
    });

    assert.equal(result.applied_count, 2, JSON.stringify(result));
    assert.equal(result.failed_count, 0, JSON.stringify(result));
    assert.equal(
      repository.listReferenceMatchProposals({
        proposalIds: ["proposal:manual-binding"],
      })[0]?.status,
      "retargeted",
    );
    assert.equal(
      repository.listReferenceMatchProposals({
        proposalIds: ["proposal:manual-merge"],
      })[0]?.status,
      "retargeted",
    );
    assert.isTrue(
      repository
        .listReferenceBindings({ statuses: ["accepted"] })
        .some(
          (binding) =>
            binding.canonicalReferenceId === "cref:binding-source" &&
            binding.itemKey === "MANUAL" &&
            binding.reviewer === "advanced-reference-matching-manual",
        ),
    );
    const redirects = repository.listCanonicalReferenceRedirects();
    assert.isTrue(
      redirects.some(
        (redirect) =>
          redirect.fromCanonicalReferenceId === "cref:merge-source" &&
          redirect.toCanonicalReferenceId === "cref:merge-selected-target",
      ),
    );
    assert.isTrue(
      redirects.some(
        (redirect) =>
          redirect.fromCanonicalReferenceId ===
            "cref:merge-original-target" &&
          redirect.toCanonicalReferenceId === "cref:merge-selected-target",
      ),
    );
    const acceptedAuditProposals = repository.listReferenceMatchProposals({
      statuses: ["accepted"],
    });
    assert.isAtLeast(
      acceptedAuditProposals.filter(
        (proposal) => proposal.kind === "canonical_merge",
      ).length,
      2,
    );
    assert.isTrue(
      acceptedAuditProposals.some(
        (proposal) =>
          proposal.kind === "zotero_binding" &&
          proposal.targetItemKey === "MANUAL",
      ),
    );
    assert.isTrue(
      acceptedAuditProposals.some((proposal) => {
        if (
          proposal.kind !== "canonical_merge" ||
          proposal.sourceCanonicalReferenceId !== "cref:merge-source" ||
          proposal.targetCanonicalReferenceId !== "cref:merge-selected-target"
        ) {
          return false;
        }
        const evidence = JSON.parse(proposal.evidenceJson || "{}");
        return (
          evidence.source?.title === "Merge Source" &&
          evidence.target?.title === "Selected Target"
        );
      }),
    );
    assert.isTrue(
      acceptedAuditProposals.some((proposal) => {
        if (
          proposal.kind !== "zotero_binding" ||
          proposal.targetItemKey !== "MANUAL"
        ) {
          return false;
        }
        const evidence = JSON.parse(proposal.evidenceJson || "{}");
        return evidence.target?.title === "Manual Target";
      }),
    );

    const invalid = await service.applyReferenceMatchProposalActions({
      decisions: [
        {
          proposalId: "proposal:manual-merge",
          action: "manual_target",
          target: {
            kind: "canonical_reference",
            canonicalReferenceId: "cref:merge-source",
          },
        },
      ],
    });
    assert.equal(invalid.applied_count, 0, JSON.stringify(invalid));
    assert.equal(invalid.failed_count, 1, JSON.stringify(invalid));
  });

  it("deduplicates manual target canonical candidates and annotates active bindings", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      registryInputs: [],
      now: () => "2026-06-10T00:00:00.000Z",
    });
    [
      ["cref:physical-a", "Physical A"],
      ["cref:physical-b", "Physical B"],
      ["cref:effective", "Effective Target"],
      ["cref:accepted-only", "Accepted Only"],
      ["cref:bound-auto", "Bound Duplicate"],
      ["cref:bound-accepted", "Bound Duplicate"],
    ].forEach(([canonicalReferenceId, title]) =>
      repository.upsertCanonicalReference({
        canonicalReferenceId,
        title,
        normalizedTitle: title.toLowerCase(),
        year: "2026",
        authorsJson: "[]",
        identifiersJson: "{}",
        metadataHash: `hash:${canonicalReferenceId}`,
        status: "active",
      }),
    );
    repository.upsertCanonicalReferenceRedirect({
      fromCanonicalReferenceId: "cref:physical-a",
      toCanonicalReferenceId: "cref:effective",
      reason: "test",
    });
    repository.upsertCanonicalReferenceRedirect({
      fromCanonicalReferenceId: "cref:physical-b",
      toCanonicalReferenceId: "cref:effective",
      reason: "test",
    });
    [
      ["raw:a", "cref:physical-a"],
      ["raw:b", "cref:physical-b"],
      ["raw:c", "cref:effective"],
      ["raw:accepted-only", "cref:accepted-only"],
      ["raw:bound-auto", "cref:bound-auto"],
      ["raw:bound-accepted", "cref:bound-accepted"],
    ].forEach(([rawReferenceId, canonicalReferenceId], index) =>
      repository.upsertRawReference({
        rawReferenceId,
        sourceRef: "1:SRC",
        referencesArtifactHash: "hash:refs",
        referenceIndex: index,
        rawHash: `hash:${rawReferenceId}`,
        parsedTitle: "Effective Target",
        normalizedTitle: "effective target",
        year: "2026",
        authorsJson: "[]",
        rawReference: "Effective Target. 2026.",
        canonicalReferenceId,
        status: "active",
        diagnosticsJson: "[]",
      }),
    );
    repository.upsertReferenceBinding({
      bindingId: "binding:bound-auto",
      canonicalReferenceId: "cref:bound-auto",
      libraryId: 1,
      itemKey: "BOUND2",
      status: "auto",
      confidence: "deterministic",
      reviewer: "test",
      basisHash: "hash:binding-auto",
      diagnosticsJson: "[]",
    });
    repository.upsertReferenceBinding({
      bindingId: "binding:bound-accepted",
      canonicalReferenceId: "cref:bound-accepted",
      libraryId: 1,
      itemKey: "BOUND2",
      status: "accepted",
      confidence: "manual",
      reviewer: "test",
      basisHash: "hash:binding-accepted",
      diagnosticsJson: "[]",
    });
    repository.upsertReferenceBinding({
      bindingId: "binding:physical-b",
      canonicalReferenceId: "cref:physical-b",
      libraryId: 1,
      itemKey: "BOUND",
      status: "accepted",
      confidence: "manual",
      reviewer: "test",
      basisHash: "hash:binding",
      diagnosticsJson: "[]",
    });
    repository.upsertReferenceMatchProposal({
      proposalId: "proposal:accepted-without-redirect",
      kind: "canonical_merge",
      status: "accepted",
      sourceCanonicalReferenceId: "cref:accepted-only",
      sourceRawReferenceIdsJson: JSON.stringify(["raw:accepted-only"]),
      targetCanonicalReferenceId: "cref:effective",
      confidence: "manual",
      score: 1,
      reasonsJson: JSON.stringify(["accepted_without_redirect_fixture"]),
      evidenceJson: "{}",
      diagnosticsJson: "[]",
      basisHash: "sha256:accepted-without-redirect-basis",
      sourceHash: "sha256:accepted-without-redirect-source",
    });
    repository.upsertReferenceMatchProposal({
      proposalId: "proposal:effective-source-filter",
      kind: "canonical_merge",
      status: "open",
      sourceCanonicalReferenceId: "cref:accepted-only",
      sourceRawReferenceIdsJson: JSON.stringify(["raw:accepted-only"]),
      targetCanonicalReferenceId: "cref:physical-b",
      confidence: "medium",
      score: 0.5,
      reasonsJson: JSON.stringify(["candidate"]),
      evidenceJson: "{}",
      diagnosticsJson: "[]",
      basisHash: "sha256:effective-source-filter-basis",
      sourceHash: "sha256:effective-source-filter-source",
    });

    const input = await service.getSynthesisWorkbenchSurfaceInput("index");
    const canonicalCandidates =
      input.registry?.matchTargetCandidates?.filter(
        (candidate) => candidate.kind === "canonical_reference",
      ) || [];

    assert.lengthOf(canonicalCandidates, 3);
    const effectiveCandidate = canonicalCandidates.find(
      (candidate) => candidate.canonicalReferenceId === "cref:effective",
    );
    const acceptedOnlyCandidate = canonicalCandidates.find(
      (candidate) => candidate.canonicalReferenceId === "cref:accepted-only",
    );
    assert.deepInclude(effectiveCandidate, {
      kind: "canonical_reference",
      canonicalReferenceId: "cref:effective",
      title: "Effective Target",
      year: "2026",
      bindingStatus: "accepted",
      bindingTarget: {
        libraryId: 1,
        itemKey: "BOUND",
        paperRef: "1:BOUND",
      },
    });
    assert.deepEqual(effectiveCandidate?.rawReferenceIds, [
      "raw:a",
      "raw:b",
      "raw:c",
    ]);
    assert.deepInclude(acceptedOnlyCandidate, {
      kind: "canonical_reference",
      canonicalReferenceId: "cref:accepted-only",
      title: "Accepted Only",
      year: "2026",
    });
    assert.deepEqual(acceptedOnlyCandidate?.rawReferenceIds, [
      "raw:accepted-only",
    ]);
    const boundDuplicateCandidate = canonicalCandidates.find(
      (candidate) => candidate.bindingTarget?.paperRef === "1:BOUND2",
    );
    assert.deepInclude(boundDuplicateCandidate, {
      kind: "canonical_reference",
      canonicalReferenceId: "cref:bound-accepted",
      title: "Bound Duplicate",
      year: "2026",
      bindingStatus: "accepted",
      bindingTarget: {
        libraryId: 1,
        itemKey: "BOUND2",
        paperRef: "1:BOUND2",
      },
    });
    assert.deepEqual(boundDuplicateCandidate?.rawReferenceIds, [
      "raw:bound-accepted",
      "raw:bound-auto",
    ]);
    const proposal = (input.registry?.matchProposals || []).find(
      (row) => row.proposal_id === "proposal:effective-source-filter",
    );
    assert.equal(proposal?.kind, "canonical_merge");
    assert.equal(proposal?.source_canonical_reference_id, "cref:accepted-only");
    assert.equal(
      proposal?.source_effective_canonical_reference_id,
      "cref:accepted-only",
    );
    assert.equal(
      proposal?.source_projected_literature_item_id,
      "cref:accepted-only",
    );
    assert.equal(proposal?.target_canonical_reference_id, "cref:physical-b");
    assert.equal(
      proposal?.target_effective_canonical_reference_id,
      "cref:effective",
    );
    assert.equal(proposal?.target_projected_literature_item_id, "1:BOUND");
    assert.deepEqual(proposal?.source_raw_reference_ids, [
      "raw:accepted-only",
    ]);
  });

  it("filters manual target canonical candidates to citation graph projected nodes", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      registryInputs: [],
      now: () => "2026-06-10T00:00:00.000Z",
    });
    [
      ["cref:bound-a", "End-to-end object detection with transformers"],
      ["cref:bound-b", "End-to-end object detection with transformers"],
      ["cref:ungraphed", "End-to-end object detection with transformers"],
    ].forEach(([canonicalReferenceId, title]) =>
      repository.upsertCanonicalReference({
        canonicalReferenceId,
        title,
        normalizedTitle: title.toLowerCase(),
        year: "2020",
        authorsJson: "[]",
        identifiersJson: "{}",
        metadataHash: `hash:${canonicalReferenceId}`,
        status: "active",
      }),
    );
    [
      ["raw:bound-a", "cref:bound-a"],
      ["raw:bound-b", "cref:bound-b"],
      ["raw:ungraphed", "cref:ungraphed"],
    ].forEach(([rawReferenceId, canonicalReferenceId], index) =>
      repository.upsertRawReference({
        rawReferenceId,
        sourceRef: "1:SRC",
        referencesArtifactHash: "hash:refs",
        referenceIndex: index,
        rawHash: `hash:${rawReferenceId}`,
        parsedTitle: "End-to-end object detection with transformers",
        normalizedTitle: "end to end object detection with transformers",
        year: "2020",
        authorsJson: "[]",
        rawReference: "End-to-end object detection with transformers. 2020.",
        canonicalReferenceId,
        status: "active",
        diagnosticsJson: "[]",
      }),
    );
    repository.upsertReferenceBinding({
      bindingId: "binding:bound-a",
      canonicalReferenceId: "cref:bound-a",
      libraryId: 1,
      itemKey: "BOUND",
      status: "auto",
      confidence: "deterministic",
      reviewer: "test",
      basisHash: "hash:binding-a",
      diagnosticsJson: "[]",
    });
    repository.upsertReferenceBinding({
      bindingId: "binding:bound-b",
      canonicalReferenceId: "cref:bound-b",
      libraryId: 1,
      itemKey: "BOUND",
      status: "accepted",
      confidence: "manual",
      reviewer: "test",
      basisHash: "hash:binding-b",
      diagnosticsJson: "[]",
    });
    repository.upsertCitationNode({
      literatureItemId: "1:BOUND",
      nodeStatus: "active",
      hasZoteroBinding: true,
      title: "End-to-end object detection with transformers",
      year: "2020",
      summaryJson: "{}",
    });

    const input = await service.getSynthesisWorkbenchSurfaceInput("index");
    const canonicalCandidates =
      input.registry?.matchTargetCandidates?.filter(
        (candidate) => candidate.kind === "canonical_reference",
      ) || [];

    assert.lengthOf(canonicalCandidates, 1);
    assert.deepInclude(canonicalCandidates[0], {
      kind: "canonical_reference",
      canonicalReferenceId: "cref:bound-a",
      title: "End-to-end object detection with transformers",
      year: "2020",
      bindingStatus: "accepted",
      bindingTarget: {
        libraryId: 1,
        itemKey: "BOUND",
        paperRef: "1:BOUND",
      },
    });
    assert.deepEqual(canonicalCandidates[0]?.rawReferenceIds, [
      "raw:bound-a",
      "raw:bound-b",
    ]);
  });

  it("builds Revise Canonicals rows and enforces merge binding boundaries", async function () {
    const root = await makeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
      registryInputs: [],
      now: () => "2026-06-10T00:00:00.000Z",
    });
    for (const [canonicalReferenceId, title] of [
      ["cref:bound-a", "Duplicate Bound A"],
      ["cref:bound-b", "Duplicate Bound B"],
      ["cref:bound-c", "Duplicate Bound C"],
      ["cref:other-bound", "Other Bound"],
      ["cref:external", "External Work"],
      ["cref:stale-source", "Stale Redirect Source"],
    ]) {
      repository.upsertCanonicalReference({
        canonicalReferenceId,
        title,
        normalizedTitle: title.toLowerCase(),
        year: "2026",
        authorsJson:
          canonicalReferenceId === "cref:stale-source"
            ? JSON.stringify(["Source Author"])
            : "[]",
        identifiersJson:
          canonicalReferenceId === "cref:stale-source"
            ? JSON.stringify({ doi: "10.1000/source" })
            : "{}",
        metadataHash: `hash:${canonicalReferenceId}`,
        status: canonicalReferenceId === "cref:stale-source" ? "stale" : "active",
      });
    }
    repository.upsertCanonicalReferenceRedirect({
      fromCanonicalReferenceId: "cref:stale-source",
      toCanonicalReferenceId: "cref:external",
      reason: "test_stale_source",
      diagnosticsJson: "[]",
    });
    for (const [rawReferenceId, canonicalReferenceId] of [
      ["raw:a", "cref:bound-a"],
      ["raw:b", "cref:bound-b"],
      ["raw:c", "cref:bound-c"],
      ["raw:other", "cref:other-bound"],
    ]) {
      repository.upsertRawReference({
        rawReferenceId,
        sourceRef: "1:SRC",
        referencesArtifactHash: "hash:refs",
        referenceIndex: 1,
        rawHash: `hash:${rawReferenceId}`,
        parsedTitle: "Duplicate Bound",
        normalizedTitle: "duplicate bound",
        year: "2026",
        authorsJson: "[]",
        rawReference: "Duplicate Bound. 2026.",
        canonicalReferenceId,
        status: "active",
        diagnosticsJson: "[]",
      });
    }
    for (const [bindingId, canonicalReferenceId, itemKey] of [
      ["binding:a", "cref:bound-a", "BOUND"],
      ["binding:b", "cref:bound-b", "BOUND"],
      ["binding:c", "cref:bound-c", "BOUND"],
      ["binding:other", "cref:other-bound", "OTHER"],
    ]) {
      repository.upsertReferenceBinding({
        bindingId,
        canonicalReferenceId,
        libraryId: 1,
        itemKey,
        status: "accepted",
        confidence: "manual",
        reviewer: "test",
        basisHash: `hash:${bindingId}`,
        diagnosticsJson: "[]",
      });
    }
    repository.upsertCitationNode({
      literatureItemId: "cref:external",
      nodeStatus: "active",
      hasZoteroBinding: false,
      title: "External Work",
      year: "2026",
      summaryJson: JSON.stringify({ existing: true }),
      updatedAt: "2026-06-09T00:00:00.000Z",
    });

    const input = await service.getSynthesisWorkbenchSurfaceInput("index");
    const rows = input.registry?.canonicalRows || [];
    const boundRow = rows.find((row) => row.projected_literature_item_id === "1:BOUND");
    const externalRow = rows.find(
      (row) => row.effective_canonical_id === "cref:external",
    );

    assert.isOk(boundRow);
    assert.sameMembers(boundRow?.physical_canonical_ids || [], [
      "cref:bound-a",
      "cref:bound-b",
      "cref:bound-c",
    ]);
    assert.equal(boundRow?.raw_reference_count, 3);
    assert.equal(
      externalRow?.incoming_redirects?.[0]?.from?.title,
      "Stale Redirect Source",
    );
    assert.deepEqual(externalRow?.incoming_redirects?.[0]?.from?.authors, [
      "Source Author",
    ]);
    assert.deepEqual(externalRow?.incoming_redirects?.[0]?.from?.identifiers, {
      doi: "10.1000/source",
    });
    assert.equal(externalRow?.incoming_redirects?.[0]?.from?.status, "stale");

    const updatedMetadata = await service.updateCanonicalReferenceMetadata({
      canonicalReferenceId: "cref:external",
      patch: {
        title: "External Better Title",
        year: "2027",
        authors: ["External Author"],
        identifiers: { doi: "10.1000/external" },
      },
    });
    assert.equal(updatedMetadata.ok, true);
    const updatedExternal = repository.listCanonicalReferences({
      canonicalReferenceIds: ["cref:external"],
    })[0];
    assert.equal(updatedExternal.title, "External Better Title");
    assert.equal(updatedExternal.normalizedTitle, "external better title");
    assert.equal(updatedExternal.year, "2027");
    assert.deepEqual(JSON.parse(updatedExternal.authorsJson || "[]"), [
      "External Author",
    ]);
    assert.deepEqual(JSON.parse(updatedExternal.identifiersJson || "{}"), {
      doi: "10.1000/external",
    });
    const updatedNode = repository.listCitationNodes({
      literatureItemIds: ["cref:external"],
    })[0];
    assert.equal(updatedNode?.title, "External Better Title");
    assert.equal(updatedNode?.year, "2027");
    assert.equal(
      JSON.parse(updatedNode?.summaryJson || "{}")
        .canonical_metadata_updated_at,
      "2026-06-10T00:00:00.000Z",
    );
    assert.equal(
      repository.getCacheBasis("citation-graph:library")?.status,
      "stale",
    );

    const boundMetadata = await service.updateCanonicalReferenceMetadata({
      canonicalReferenceId: "cref:bound-a",
      patch: { title: "Should Not Apply" },
    });
    assert.equal(boundMetadata.ok, false);
    assert.equal(boundMetadata.status, "bound_to_zotero");

    const conflicting = await service.mergeEffectiveCanonicalReference({
      sourceEffectiveCanonicalId: "cref:bound-a",
      targetEffectiveCanonicalId: "cref:other-bound",
    });
    assert.equal(conflicting.ok, false);
    assert.equal(conflicting.status, "conflicting_bindings");

    const applied = await service.applyCanonicalRevisionMergeRequests({
      requests: [
        {
          sourceEffectiveCanonicalId: "cref:bound-c",
          targetEffectiveCanonicalId: "cref:bound-b",
        },
      ],
    });
    assert.equal(applied.ok, true);
    assert.equal(applied.applied_count, 1);
    assert.isTrue(
      repository
        .listCanonicalReferenceRedirects()
        .some(
          (redirect) =>
            redirect.fromCanonicalReferenceId === "cref:bound-c" &&
            redirect.toCanonicalReferenceId === "cref:bound-b",
        ),
    );
    const revisionProposal = repository
      .listReferenceMatchProposals({ kinds: ["canonical_merge"] })
      .find(
        (proposal) =>
          proposal.sourceCanonicalReferenceId === "cref:bound-c" &&
          proposal.targetCanonicalReferenceId === "cref:bound-b" &&
          proposal.status === "accepted",
      );
    assert.isOk(revisionProposal);
    const revisionEvidence = JSON.parse(revisionProposal?.evidenceJson || "{}");
    assert.equal(revisionEvidence.source?.title, "Duplicate Bound C");
    assert.equal(revisionEvidence.target?.title, "Duplicate Bound B");

    const merged = await service.mergeEffectiveCanonicalReference({
      sourceEffectiveCanonicalId: "cref:bound-a",
      targetEffectiveCanonicalId: "cref:bound-b",
    });
    assert.equal(merged.ok, true);
    assert.isTrue(
      repository
        .listCanonicalReferenceRedirects()
        .some(
          (redirect) =>
            redirect.fromCanonicalReferenceId === "cref:bound-a" &&
            redirect.toCanonicalReferenceId === "cref:bound-b",
        ),
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
    assert.equal(graphBasis?.status, "ready");
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
    const rebuild = await service.rebuildCitationGraphCacheNow();
    const metrics = await service.getCitationGraphMetrics({ limit: 2 });
    const byPaper = await service.getCitationGraphMetrics({
      paperRefs: ["1:B"],
    });
    const slice = await service.getCitationGraphSlice({
      paperRef: "1:B",
      direction: "incoming",
    });

    assert.equal(rebuild.metrics, 2);
    assert.isString(rebuild.metricsHash);
    assert.equal(metrics.ok, true);
    assert.equal(metrics.status, "ready");
    assert.equal(metrics.diagnostics.metrics_found, true);
    assert.isTrue(
      metrics.items.some((item) => item.node_id === "zotero:item:B"),
    );
    assert.equal(byPaper.items[0].paper_ref, "1:B");
    assert.isAtLeast(byPaper.items[0].internal_in_degree, 1);
    assert.isAbove(byPaper.items[0].internal_pagerank, 0);
    assert.isString(byPaper.items[0].component_id);
    assert.equal(
      slice.nodes.find((node: any) => node.node_id === "zotero:item:B")?.metrics
        ?.internal_in_degree,
      1,
    );
  });

  it("refreshes complex metrics after incremental citation graph updates", async function () {
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

    const updated = createSynthesisService({
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
            { title: "Gamma Paper", year: "2025", authors: ["Gamma"] },
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
          year: "2025",
          authors: ["Gamma"],
        },
      ],
    });

    await updated.refreshReferenceSidecarNow();
    const staleSnapshot = await updated.getSynthesisSnapshot();

    assert.equal(
      staleSnapshot.graph.diagnostics.cache_status,
      "stale",
    );

    const refresh = await updated.refreshCitationGraphCacheIncrementalNow();
    assert.equal(refresh.status, "completed");
    assert.include(refresh.affected_source_refs, "1:A");

    const metrics = await updated.getCitationGraphMetrics({
      paperRefs: ["1:C"],
    });

    assert.equal(metrics.status, "ready");
    assert.equal(metrics.diagnostics.metrics_found, true);
    assert.equal(metrics.diagnostics.stale, false);
    assert.equal(metrics.items[0].paper_ref, "1:C");
    assert.isAbove(metrics.items[0].internal_pagerank, 0);
    assert.isString(metrics.items[0].component_id);
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
    assert.include(
      metrics.diagnostics.recommended_commands,
      "refreshCitationGraphMetricsNow",
    );
    assert.notInclude(
      metrics.diagnostics.recommended_commands,
      "rebuildCitationGraphCacheNow",
    );
  });

  it("refreshes graph metrics without rebuilding graph rows", async function () {
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
        {
          literatureItemId: "1:B",
          nodeStatus: "active",
          hasZoteroBinding: true,
          title: "Beta",
          year: "2024",
        },
      ],
      edges: [
        {
          edgeId: "edge:a-b",
          sourceLiteratureItemId: "1:A",
          targetLiteratureItemId: "1:B",
          edgeStatus: "accepted",
          weight: 1,
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
          sourceStructureVersion: 1,
        },
        {
          literatureItemId: "1:B",
          outgoingCount: 0,
          incomingCount: 1,
          matchedOutgoingCount: 0,
          unresolvedOutgoingCount: 0,
          ambiguousOutgoingCount: 0,
          localDegree: 1,
          sourceStructureVersion: 1,
        },
      ],
    });
    repository.upsertCitationGraphLayoutState({
      viewKey: "workbench_overview",
      preset: "force",
      graphHash: "sha256:old-layout",
      layoutHash: "sha256:layout",
      layoutJson: "{}",
      status: "ready",
    });
    repository.upsertCacheBasis({
      cacheKey: "citation-graph:library",
      cacheKind: "citation_graph",
      scopeKind: "library",
      scopeRef: "1",
      status: "ready",
      basisKind: "test",
      basisValue: "ready",
      sourceHash: "sha256:graph",
      updatedAt: "2026-05-12T00:00:00.000Z",
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
    });
    const beforeEdges = repository.listCitationEdges();
    const beforeLayouts = repository.listCitationGraphLayoutStates();
    const stale = await service.getCitationGraphMetrics();

    assert.equal(stale.status, "stale");
    assert.equal(stale.diagnostics.metrics_found, false);

    const refreshed = await service.refreshCitationGraphMetricsNow();
    const ready = await service.getCitationGraphMetrics({
      paperRefs: ["1:B"],
    });

    assert.equal(refreshed.status, "completed");
    assert.equal(refreshed.metric_count, 2);
    assert.equal(ready.status, "ready");
    assert.equal(ready.diagnostics.metrics_found, true);
    assert.isAbove(ready.items[0].internal_pagerank, 0);
    assert.deepEqual(repository.listCitationEdges(), beforeEdges);
    assert.deepEqual(repository.listCitationGraphLayoutStates(), beforeLayouts);
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
      prospective_topic_relation_proposals: {
        path: "result/sidecars/prospective-topic-relation-proposals.json",
        hash: "sha256:prospective-topic-relation-proposals",
        content_type: "json",
        schema_id: "synthesis.prospective_topic_relation_proposals",
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
      "result/sidecars/prospective-topic-relation-proposals.json",
      JSON.stringify({
        schema_id: "synthesis.prospective_topic_relation_proposals",
        proposals: [],
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

function v2SectionsWithEvidence(payloadHash = "") {
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
          source_paper_refs: ["1:DETR"],
          strengths: ["Unified detection formulation"],
          limitations: ["Fixture route has one paper"],
          maturity: "early fixture",
        },
      ],
    },
    comparison_matrix: {
      dimensions: ["problem addressed"],
      rows: [{ id: "cmp:detr", source_paper_refs: ["1:DETR"] }],
    },
    improvement_dimensions: {
      summary: {
        text: "The fixture treats end-to-end formulation as the primary improvement dimension.",
      },
      dimensions: [
        {
          id: "dimension:detr",
          title: "End-to-end formulation",
          analysis:
            "DETR is represented as a fixture improvement dimension for object detection synthesis.",
          source_paper_refs: ["1:DETR"],
        },
      ],
    },
    claims: [
      {
        id: "claim:detr",
        text: "DETR introduced end-to-end detection.",
        analysis:
          "The fixture claim is supported by DETR's set-prediction formulation.",
        source_paper_refs: ["1:DETR"],
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
          source_paper_refs: ["1:DETR"],
        },
      ],
    },
    source_papers: [
      {
        paper_ref: "1:DETR",
        title: "Paper DETR",
        digest_ref: {
          paper_ref: "1:DETR",
          note_key: "digest-markdown-note",
          payload_type: "digest-markdown",
          ...(payloadHash ? { payload_hash: payloadHash } : {}),
        },
      },
    ],
    debates: [
      {
        id: "debate:detr",
        evidence_type: "methodological_tradeoff",
        source_paper_refs: ["1:DETR"],
      },
    ],
    coverage: {
      paper_count: 1,
      external_literature_count: 0,
      coverage_verdict: "partial",
      coverage_reason: "Fixture covers one DETR route.",
      coverage_caveats: [],
      external_context_summary:
        "This is a summary of external literature coverage.",
      suggested_collection_directions: [],
    },
    future_directions: [
      {
        id: "future:benchmark-coverage",
        title: "Broaden benchmark comparison",
        direction_type: "evaluation_gap",
        current_limitation:
          "The fixture source set only covers a single DETR evidence boundary.",
        future_direction:
          "Future synthesis should compare additional benchmark settings before making stronger coverage claims.",
        rationale:
          "The source paper fixture supports a narrow validation path and motivates broader evaluation.",
        source_paper_refs: ["1:DETR"],
      },
    ],
    review_outline: {
      topic_importance:
        "Object detection is a core perception task that can be reviewed from the current source set.",
      writing_strategies: [
        {
          id: "strategy:fixture",
          title: "Source paper route review",
          review_thesis:
            "Use DETR as a minimal source-paper route to explain query-based object detection.",
          writing_strategy:
            "Start with the task definition, explain the DETR route, then state coverage limits.",
          section_plan: [
            "Define object detection",
            "Explain the DETR source route",
            "Summarize coverage limits",
          ],
          best_for: "A minimal fixture review.",
          risks:
            "The fixture has one source paper and cannot support field-wide conclusions.",
          source_paper_refs: ["1:DETR"],
        },
      ],
      recommended_strategy_id: "strategy:fixture",
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
      body: [
        "# Object Detection",
        "",
        "This fixture topic synthesis describes object detection through a single DETR evidence paper.",
        "",
        "## 技术路线",
        "",
        "### Query-based detection",
        "",
        "- 定义：DETR introduced a set-prediction framing for object detection.",
        "- 代表文献：[1]",
        "",
        "## 时间线",
        "",
        "### DETR set prediction (2020) —— *method introduction*",
        "",
        "- 主要成果：DETR introduced a set-prediction framing that reduced reliance on hand-designed post-processing.",
        "- 代表文献：[1]",
        "",
        "## 文献列表",
        "",
        "- [1] *DETR* (2020) {1:DETR} :red_circle:",
      ].join("\n"),
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
    const synthesisDataRoot = path.join(root, "data", "synthesis");
    const paths = buildSynthesisStoragePaths(root, "object-detection") as any;

    assert.equal(
      paths.currentManifest,
      path.join(
        synthesisDataRoot,
        "topics",
        "object-detection",
        "current",
        "manifest.json",
      ),
    );
    assert.equal(
      paths.currentArtifact,
      path.join(
        synthesisDataRoot,
        "topics",
        "object-detection",
        "current",
        "artifact.json",
      ),
    );
    assert.equal(
      paths.currentMetadata,
      path.join(
        synthesisDataRoot,
        "topics",
        "object-detection",
        "current",
        "metadata.json",
      ),
    );
    assert.equal(
      paths.currentSectionsRoot,
      path.join(
        synthesisDataRoot,
        "topics",
        "object-detection",
        "current",
        "sections",
      ),
    );
    assert.notProperty(paths, "currentMarkdown");
    assert.notProperty(paths, "currentExportMarkdown");
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
    const artifact = JSON.parse(
      await fs.readFile(paths.currentArtifact, "utf8"),
    );
    const reportBody = artifact.synthesis_report?.body || "";

    assert.equal(result.status, "persisted");
    assert.isTrue(await exists(paths.currentManifest));
    assert.isTrue(await exists(paths.currentArtifact));
    assert.isTrue(await exists(paths.currentMetadata));
    assert.equal(
      await exists(legacyCurrentExportPath(root, "object-detection")),
      false,
    );
    assert.isTrue(
      await exists(path.join(paths.currentSectionsRoot, "claims.json")),
    );
    assert.lengthOf(mirror.upserts, 0);
    assert.equal(reviewInput.topic.markdown, reportBody);
    assert.include(reportBody, "## 技术路线");
    assert.include(reportBody, "DETR introduced a set-prediction framing");
    assert.notInclude(reportBody, "```json");
    assert.equal(
      reviewInput.structured_topic?.artifact.schema_id,
      "synthesis.topic_synthesis_artifact",
    );
    assert.isArray(reviewInput.structured_topic?.claims);
    assert.isObject(reviewInput.structured_topic?.timeline_events);
    assert.isArray(reviewInput.structured_topic?.source_papers);
    assert.isString(
      (reviewInput.structured_topic?.coverage as any).external_context_summary,
    );
  });

  it("applies split final candidates using manifest sidecar paths and exposes provenance", async function () {
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
      v2TopicBundle({
        artifact_metadata: {
          runtime: "split-skill",
          topic_id: "object-detection",
        },
        candidate_output_path: "result/final-output.candidate.json",
      }),
      v2SectionContext(v2SectionsWithEvidence(hashMarkdown("# Digest DETR"))),
    );
    const detail = await service.readTopicDetail({
      topicId: "object-detection",
    });

    assert.equal(result.status, "persisted");
    assert.equal(
      detail.artifact_provenance.manifest_schema_id,
      "synthesis.topic_analysis_manifest",
    );
    assert.equal(detail.artifact_provenance.sidecar_count, 4);
    assert.isAtLeast(Number(detail.artifact_provenance.section_count), 10);
    assert.equal(
      detail.artifact_provenance.sidecars.topic_interest_metadata.schema_id,
      "topic_interest_metadata.v1",
    );
  });

  it("rejects incomplete split manifests with actionable diagnostics", async function () {
    const root = await makeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => "2026-05-16T00:00:00.000Z",
      registryInputs: [],
    });
    const files = new Map<string, string>([
      [
        "runtime/payloads/resolver.json",
        JSON.stringify({
          resolver: { mode: "explicit", paper_refs: ["1:DETR"] },
          resolved_paper_set: {
            papers: [{ paper_ref: "1:DETR", match_reasons: ["explicit"] }],
          },
          resolver_diagnostics: { final_count: 1 },
        }),
      ],
      [
        "result/topic-analysis.json",
        JSON.stringify({
          schema_id: "synthesis.topic_analysis_manifest",
          schema_version: "1.0.0",
          operation: "create",
          language: "zh-CN",
          sections: {
            summary: {
              path: "result/sections/summary.json",
              hash: "sha256:summary",
            },
            coverage: {
              path: "result/sections/coverage.json",
              hash: "sha256:coverage",
            },
          },
          sidecars: {},
        }),
      ],
    ]);

    try {
      await service.applyTopicSynthesisResult(
        v2TopicBundle({
          artifact_metadata: { runtime: "split-skill" },
        }),
        {
          bundleReader: {
            readText(pathValue: string) {
              const text = files.get(pathValue);
              if (text === undefined) {
                throw new Error(`missing test run artifact: ${pathValue}`);
              }
              return text;
            },
          },
        },
      );
      assert.fail("expected incomplete split manifest to be rejected");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /invalid split topic analysis manifest: split finalize must produce the complete host-apply-ready section set/i,
      );
    }
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

    for (const [topicId, title] of [
      ["computer-vision", "Computer Vision"],
      ["set-prediction", "Set Prediction"],
    ]) {
      await service.applyTopicSynthesisResult(
        v2TopicBundle({
          topic_definition: { id: topicId, title },
          artifact_metadata: { topic_id: topicId },
        }),
        v2SectionContext(v2SectionsWithEvidence(hashMarkdown("# Digest DETR"))),
      );
    }

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
              relation_type: "target_is_broader_topic_candidate",
              target_topic_id: "computer-vision",
              target_title: "Computer Vision",
              source_paper_refs: ["1:DETR"],
            },
            {
              relation_type: "related_topic_candidate",
              target_topic_id: "set-prediction",
              target_title: "Set Prediction",
              source_paper_refs: ["1:DETR"],
            },
          ],
        },
        "result/sidecars/prospective-topic-relation-proposals.json": {
          schema_id: "synthesis.prospective_topic_relation_proposals",
          proposals: [
            {
              target_topic_seed: "query-centric object detection",
              relation_type: "related_topic_candidate",
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
    const broaderEdge = graph.edges.find(
      (edge) => edge.relation === "broader_than",
    );
    assert.equal(broaderEdge?.source_topic_id, "computer-vision");
    assert.equal(broaderEdge?.target_topic_id, "object-detection");
    const materialized = graph.nodes.find(
      (node) => node.topic_id === "object-detection",
    );
    assert.equal(materialized?.node_type, "materialized");
    assert.equal(materialized?.paper_count, 1);
    const topics = await service.listTopics();
    const objectDetectionTopic = topics.topics.find(
      (topic) => topic.topic_id === "object-detection",
    );
    assert.deepEqual(
      objectDetectionTopic?.prospective_topic_relation_proposals,
      [
        {
          target_topic_seed: "query-centric object detection",
          relation_type: "related_topic_candidate",
        },
      ],
    );
    const topicContext = await service.getTopicContext({
      topicId: "object-detection",
    });
    assert.deepEqual(topicContext.prospective_topic_relation_proposals, [
      {
        target_topic_seed: "query-centric object detection",
        relation_type: "related_topic_candidate",
      },
    ]);
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
      includeMarkdown: true,
    })) as {
      markdown?: string;
      freshness?: {
        freshness?: string;
        known_dependency_status?: string;
        discovery_status?: string;
        candidate_count?: number;
      };
      discovery_hints?: Array<{ literatureItemId: string }>;
    };
    const topicReport = (await service.getTopicReport({
      topicId: "object-detection",
    })) as {
      ok?: boolean;
      markdown?: string;
      source?: { field?: string; ssot?: string };
    };

    assert.equal(result.status, "persisted");
    assert.isTrue(topicReport.ok);
    assert.equal(topicReport.markdown, topicContext.markdown);
    assert.include(
      topicReport.markdown || "",
      "DETR introduced a set-prediction framing",
    );
    assert.deepEqual(topicReport.source, {
      path: "topics/object-detection/current/artifact.json",
      field: "synthesis_report.body",
      ssot: "runtime.synthesis_report.body",
    });
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

  it("accepts structured paper evidence without digest_ref payload_hash", async function () {
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
      v2SectionContext(v2SectionsWithEvidence()),
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

  it("accepts structured paper evidence when digest_ref hash differs from current Zotero artifact", async function () {
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

    const result = await service.applyTopicSynthesisResult(
      v2TopicBundle(),
      v2SectionContext(v2SectionsWithEvidence("sha256:stale")),
    );

    assert.equal(result.status, "persisted");
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

  it("does not block apply on stale legacy hash fields", function () {
    const fullUpdateDecision = decideSynthesisApply({
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

    assert.equal(fullUpdateDecision.action, "persist");
    assert.deepEqual(fullUpdateDecision.mismatches, []);
    assert.equal(patchDecision.action, "persist");
    assert.deepEqual(patchDecision.mismatches, []);
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
