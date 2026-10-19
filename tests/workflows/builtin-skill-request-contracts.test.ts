import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { installNodeZoteroTransactionStub } from "../helpers/nodeZoteroTransactionStub";
import { nativeFixtureMutations } from "../helpers/nativeFixtureMutations";
import {
  buildSelectionContext,
  itemRef,
} from "../helpers/workflowSelectionContext";
import { lockSelection } from "../../src/modules/selectionContext";
import { validateBuiltinSkillRequests } from "../helpers/builtinSkillRequestContracts";
import type { LoadedWorkflow } from "../../src/workflows/types";
import { normalizeWorkflowParamsBySchema } from "../../src/modules/workflow/settings/workflowSettingsDomain";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";

// Package declarations own discovery; this table supplies executable inputs.
const scenarios: Record<string, Record<string, unknown>[]> = {
  "collection-collector": [
    { collection: "1:COLLECT1", collectionScope: "Synthetic research" },
  ],
  "export-research-bundle": [
    {
      paperTitle: "Synthetic manuscript",
      researchContent: "Synthetic research",
    },
    {
      paperTitle: "Synthetic manuscript",
      researchContent: "Synthetic research",
      articleType: "survey",
      maxTopics: 0,
      maxCorePapers: 1,
      maxRelatedPapers: 1,
    },
  ],
  "literature-explainer": [{}, { language: "en-US" }],
  "literature-translator": [
    {},
    { target_language: "en-US", mode: "high_quality" },
  ],
  "literature-deep-reading": [{}, { mode: "high_quality" }],
  "literature-analysis": [
    { auto_tag_regulator: false },
    { auto_tag_regulator: true, auto_tag_infer_tag: false },
  ],
  "literature-metadata-curator": [{ skip_identifier_fast_path: true }],
  "literature-search-ingest": [
    {},
    {
      query: "Synthetic evidence",
      searchMode: "targeted_ingest",
      searchBreadth: "quick",
      languageHints: ["en-US"],
      targetCollection: "1:COLLECT1",
    },
  ],
  "tag-bootstrapper": [{}, { tag_note_language: "en-US" }],
  "tag-regulator": [{}, { infer_tag: false, tag_note_language: "en-US" }],
  "topic-planner": [{}, { language: "en-US" }],
  "create-topic-synthesis": [
    { topicSeed: "Synthetic topic" },
    {
      usePlannedTopic: false,
      topicSeed: "Synthetic topic",
      plannedTopicId: "",
    },
    {
      usePlannedTopic: true,
      plannedTopicId: "planned-synthetic",
      topicSeed: "",
    },
  ],
  "update-topic-synthesis": [{ topicId: "synthetic-topic" }],
  "manuscript-literature-framing": [
    { paperTitle: "Synthetic manuscript" },
    {
      paperTitle: "Synthetic manuscript",
      language: "en-US",
      targetVenue: "Synthetic venue",
      articleType: "survey",
      stylePreference: "concise",
    },
  ],
  "debug-host-bridge-connectivity-probe": [{}],
  "debug-host-bridge-connectivity-sequence-probe": [{}],
  "debug-host-queue-probe": [{}],
  "debug-interactive-choice-probe": [{}],
  "debug-apply-existing-parent-bundle": [{}],
  "debug-apply-manifest-bundle": [{}],
  "debug-apply-single-bundle": [{}],
  "debug-apply-single-result": [{}],
  "debug-apply-sequence-bundle": [{}],
  "debug-apply-sequence-result": [{}],
  "debug-apply-bundle-then-result": [
    { run_result_step: true },
    { run_result_step: false },
  ],
  "debug-apply-result-then-bundle": [
    { skip_result_step: false },
    { skip_result_step: true },
  ],
  "debug-interactive-then-result": [{}],
  "debug-sequence-linear-probe": [{}],
  "debug-sequence-workspace-reuse-probe": [{}],
  "debug-sequence-file-handoff-probe": [{}],
  "debug-sequence-context-isolation-probe": [{}],
  "debug-sequence-countdown-probe": [{}],
};

describe("builtin Workflow to Skill request contracts", function () {
  this.timeout(30_000);
  let workflows: LoadedWorkflow[];
  let root: string;
  let restoreTransaction: (() => void) | undefined;
  let previousRuntimeRoot: string | undefined;
  const admittedBoundaries = new Set<string>();
  const unusedNamespaces = new Set<string>();
  before(async function () {
    setDebugModeOverrideForTests(true);
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    assert.isEmpty(loaded.errors);
    workflows = loaded.workflows;
  });
  beforeEach(async function () {
    setDebugModeOverrideForTests(true);
    root = await fs.mkdtemp(path.join(os.tmpdir(), "builtin-skill-contract-"));
    previousRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = path.join(root, "state");
    resetPluginStateStoreForTests();
    restoreTransaction = installNodeZoteroTransactionStub();
  });
  afterEach(async function () {
    restoreTransaction?.();
    resetPluginStateStoreForTests();
    if (previousRuntimeRoot === undefined)
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRuntimeRoot;
    setDebugModeOverrideForTests();
    await fs.rm(root, { recursive: true, force: true });
  });
  after(function () {
    console.info(
      `builtin request evidence: ${admittedBoundaries.size} validated Skill/schema boundaries; ${unusedNamespaces.size} unused Skill namespaces`,
    );
    console.info(
      `unused namespaces: ${[...unusedNamespaces].sort().join(", ")}`,
    );
  });

  it("accounts for all registered producers and separates non-Skill workflows", async function () {
    const declared: string[] = [];
    for (const entry of await fs.readdir("workflows_builtin", {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const file = path.join(
        "workflows_builtin",
        entry.name,
        "workflow-package.json",
      );
      const pack = JSON.parse(await fs.readFile(file, "utf8"));
      for (const relative of pack.workflows) {
        declared.push(
          JSON.parse(
            await fs.readFile(path.join(path.dirname(file), relative), "utf8"),
          ).id,
        );
      }
    }
    assert.sameMembers(
      workflows.map((w) => w.manifest.id),
      declared,
    );
    const producers = workflows.filter(
      (w) =>
        w.manifest.provider === "skillrunner" || w.manifest.provider === "acp",
    );
    assert.sameMembers(
      Object.keys(scenarios),
      producers.map((w) => w.manifest.id),
    );
    const nonSkill = workflows.filter((w) => !producers.includes(w));
    assert.isTrue(
      nonSkill.every((w) =>
        ["pass-through", "generic-http"].includes(w.manifest.provider),
      ),
    );
    console.info(
      `builtin request inventory: ${producers.length} Skill producers; ${nonSkill.length} non-Skill workflows`,
    );
  });

  async function exercise(
    workflowId: string,
    params: Record<string, unknown>,
    fixture:
      | "normal"
      | "score-only"
      | "alignment"
      | "metadata-matched"
      | "metadata-missing"
      | "metadata-failed"
      | "pdf" = "normal",
  ) {
    const workflow = workflows.find((w) => w.manifest.id === workflowId)!;
    assert.isOk(workflow);
    const parent = await nativeFixtureMutations.item.create({
      itemType: "journalArticle",
      fields: { title: "Synthetic source", DOI: "10.1234/synthetic" },
    });
    if (fixture === "metadata-missing") {
      parent.setField("DOI", "");
      await parent.saveTx();
    }
    const sourcePath = path.join(
      root,
      fixture === "pdf" ? "paper.pdf" : "paper.md",
    );
    await fs.writeFile(
      sourcePath,
      fixture === "pdf" ? "%PDF-1.7\n" : "# Synthetic source\n\nBody.\n",
      "utf8",
    );
    const attachment = await nativeFixtureMutations.attachment.createFromPath({
      parent,
      path: sourcePath,
      title: path.basename(sourcePath),
      mimeType: fixture === "pdf" ? "application/pdf" : "text/markdown",
    });
    const selection =
      workflow.manifest.inputs.member.kind === "attachment"
        ? await buildSelectionContext([attachment])
        : workflow.manifest.inputs.member.kind === "parent"
          ? await buildSelectionContext([parent])
          : lockSelection([]);
    const client = createSynthesisClientFromPort({
      loadTagVocabulary: async () => ({
        entries: [],
        aliases: {},
        abbrev: {},
        validation_warnings: [],
        protocol: {
          version: "1",
          facets: ["topic"],
          tag_pattern: "^[a-z]+:.+$",
          max_tag_length: 120,
        },
        manifest: {
          manifest_hash: `sha256:${"a".repeat(64)}`,
          entry_count: 0,
          tag_count: 0,
          active_count: 0,
          updated_at: "2026-10-19T00:00:00Z",
          source_protocol_version: "1",
          projection_target: "synthetic",
        },
      }),
      exportTagVocabularyForRegulator: async () => ({
        vocabularyHash: "synthetic",
        allowedTags: ["topic:synthetic"],
      }),
      readPaperArtifacts: async () => ({ artifacts: [], diagnostics: [] }),
    });
    const hostApi = createWorkflowHostApi({
      synthesis: createWorkflowSynthesisHostApi({
        resolveClient: async () => client,
      }),
    });
    const metadataEvidence = {
      normalizedIdentifier: "10.1234/synthetic",
      candidateCount: fixture === "metadata-matched" ? 1 : 0,
      matchingCandidateCount: fixture === "metadata-matched" ? 1 : 0,
      translators: [],
    };
    hostApi.metadata.translateIdentifier = async () =>
      fixture === "metadata-matched"
        ? {
            outcome: "matched",
            item: {
              schema: "zotero-agents.portable-regular-item.v1",
              itemType: "journalArticle",
              creators: [],
              tags: [],
              fields: { title: "Synthetic match", DOI: "10.1234/synthetic" },
            },
            evidence: metadataEvidence,
          }
        : {
            outcome: "not_found",
            reason: "no_candidate",
            evidence: metadataEvidence,
          };
    if (workflowId === "literature-deep-reading")
      assert.deepEqual(
        await hostApi.synthesis.artifacts.readPaperArtifacts({
          paper_refs: [`1:${parent.key}`],
        }),
        { artifacts: [], diagnostics: [] },
      );
    if (fixture === "score-only") await addCanonicalTriplet(hostApi, parent);
    if (fixture === "alignment")
      await fs.writeFile(
        path.join(
          path.dirname(await attachment.getFilePathAsync()),
          "paper_zh-CN.json",
        ),
        JSON.stringify({ format: "v1", target_language: "zh-CN", blocks: [] }),
        "utf8",
      );
    const workflowParams = normalizeWorkflowParamsBySchema(
      workflow.manifest,
      params,
    );
    for (const [key, value] of Object.entries(params))
      assert.deepEqual(
        workflowParams[key],
        value,
        `${workflowId}: scenario must supply a valid ${key}`,
      );
    const requests = await executeBuildRequests({
      workflow,
      selectionContext: selection,
      executionOptions: { workflowParams },
      runtime: { hostApi, hostApiVersion: 12 },
    });
    if (fixture === "metadata-matched") {
      assert.isEmpty(requests);
      assert.lengthOf(requests.__preflight?.shortCircuitApplies || [], 1);
      return;
    }
    assert.isNotEmpty(
      requests,
      `${workflowId}: a producer scenario must dispatch`,
    );
    for (const request of requests) {
      const evidence = await validateBuiltinSkillRequests({
        workflowId,
        request: request as Parameters<
          typeof validateBuiltinSkillRequests
        >[0]["request"],
        workspaceDir: root,
        hostApi,
      });
      assert.isNotEmpty(evidence);
      for (const row of evidence) {
        row.validated.forEach((key) =>
          admittedBoundaries.add(`${row.skillId}/${key}`),
        );
        row.unused.forEach((key) =>
          unusedNamespaces.add(`${row.skillId}/${key}`),
        );
      }
      const skillIds = evidence.map((row) => row.skillId);
      if (workflowId === "literature-analysis" && fixture !== "score-only") {
        assert.deepEqual(
          skillIds,
          workflowParams.auto_tag_regulator
            ? ["literature-analysis", "tag-regulator"]
            : ["literature-analysis"],
        );
      }
      if (workflowId === "literature-deep-reading" && fixture !== "alignment")
        assert.deepEqual(skillIds, [
          "literature-translator",
          "literature-deep-reading",
        ]);
      if (workflowId === "debug-apply-bundle-then-result")
        assert.lengthOf(evidence, workflowParams.run_result_step ? 2 : 1);
      if (workflowId === "debug-apply-result-then-bundle")
        assert.lengthOf(evidence, workflowParams.skip_result_step ? 1 : 2);
      if (workflowId === "create-topic-synthesis")
        assert.deepEqual(skillIds, [
          "create-topic-synthesis-prepare",
          "topic-synthesis-core-enrichment",
          "topic-synthesis-finalize",
        ]);
      if (workflowId === "literature-analysis" && evidence.length === 2)
        assert.match(
          String(evidence[1].request.input?.digest_markdown),
          /digest\.md$/,
        );
      if (workflowId === "debug-sequence-file-handoff-probe")
        assert.match(
          String(evidence[1].request.input?.artifact_file),
          /probe-artifact\.json$/,
        );
      if (fixture === "score-only") {
        assert.deepEqual(
          evidence.map((row) => row.skillId),
          ["literature-analysis"],
        );
        assert.isTrue(evidence[0].request.parameter?.score_only);
      }
      if (fixture === "alignment")
        assert.deepEqual(
          evidence.map((row) => row.skillId),
          ["literature-deep-reading"],
        );
    }
  }

  for (const [workflowId, cases] of Object.entries(scenarios)) {
    cases.forEach((params, index) => {
      it(`${workflowId} scenario ${index + 1} validates every concrete request`, async function () {
        await exercise(workflowId, params);
      });
    });
  }

  for (const [name, workflowId, params, fixture] of [
    [
      "analysis score-only skips downstream tags",
      "literature-analysis",
      { auto_tag_regulator: true },
      "score-only",
    ],
    [
      "deep reading reuses alignment",
      "literature-deep-reading",
      {},
      "alignment",
    ],
    ["deep reading PDF fallback", "literature-deep-reading", {}, "pdf"],
    [
      "metadata matched preflight skips Agent",
      "literature-metadata-curator",
      {},
      "metadata-matched",
    ],
    [
      "metadata without identifier uses Skill",
      "literature-metadata-curator",
      {},
      "metadata-missing",
    ],
    [
      "metadata failed lookup uses Skill",
      "literature-metadata-curator",
      {},
      "metadata-failed",
    ],
  ] as const) {
    it(name, async function () {
      await exercise(workflowId, params, fixture);
    });
  }
});

async function addCanonicalTriplet(
  host: ReturnType<typeof createWorkflowHostApi>,
  parent: Zotero.Item,
) {
  const parentRef = itemRef(parent);
  const results = [
    await host.literatureArtifacts.upsertDigest({
      operationId: `contract-digest:${parent.key}`,
      parentRef,
      markdown: "# Synthetic digest",
    }),
    await host.literatureArtifacts.upsertReferences({
      operationId: `contract-references:${parent.key}`,
      parentRef,
      references: { schema: "source_reference_artifact.v1", references: [] },
    }),
    await host.literatureArtifacts.upsertCitationAnalysis({
      operationId: `contract-citation:${parent.key}`,
      parentRef,
      citationAnalysis: {
        schema: "citation_analysis_artifact.v1",
        meta: {
          language: "en",
          scope: { section_title: null, line_start: null, line_end: null },
          scope_source: null,
          scope_decision: {
            selection_reason: null,
            covered_sections: [],
            fallback_from: null,
            fallback_reason: null,
          },
          mapping_reliability: "normal",
          reference_extraction: { status: "completed" },
        },
        summary: "Synthetic context.",
        timeline: {
          early: { summary: "", sourceReferenceIds: [] },
          mid: { summary: "", sourceReferenceIds: [] },
          recent: { summary: "", sourceReferenceIds: [] },
        },
        items: [],
        unresolved: [],
      },
    }),
  ];
  for (const result of results)
    assert.equal(result.outcome, "committed", JSON.stringify(result));
}
