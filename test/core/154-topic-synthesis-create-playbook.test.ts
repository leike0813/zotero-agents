import { assert } from "chai";
import Ajv from "ajv/dist/2020";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const playbookRoot = path.join(
  "artifact",
  "topic-synthesis-create-detr-gated-playbook",
);
const runRoot = path.join(
  playbookRoot,
  "workspace",
  "runtime",
  "acp",
  "skill-runs",
  "acp-skill-detr-create-topic-synthesis",
);
const schemaRoot = path.join("skills_src", "topic-synthesis", "contracts");

const runtimePayloadExamples = [
  {
    payload: "runtime/payloads/create-topic-context.json",
    schema: "payload-schemas/stage-10-create-topic-context.schema.json",
  },
  {
    payload: "runtime/payloads/resolver-and-workset.json",
    schema: "payload-schemas/stage-20-resolver-and-workset.schema.json",
  },
  {
    payload: "runtime/payloads/prepare-analysis-context.json",
    schema: "payload-schemas/stage-30-prepare-analysis-context.schema.json",
  },
  {
    payload: "runtime/payloads/core-synthesis.json",
    schema: "payload-schemas/stage-40-core-synthesis.schema.json",
  },
  {
    payload: "runtime/payloads/kg-enrichment.json",
    schema: "payload-schemas/stage-50-kg-enrichment.schema.json",
  },
  {
    payload: "runtime/payloads/coverage-and-collection-suggestions.json",
    schema:
      "payload-schemas/stage-60-coverage-and-collection-suggestions.schema.json",
  },
  {
    payload: "runtime/payloads/summary.json",
    schema: "payload-schemas/stage-70-summary.schema.json",
  },
];

async function readJson<T = any>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function assertFileExists(relativePath: string) {
  await fs.access(path.join(playbookRoot, relativePath));
}

async function sha256(relativeRunPath: string) {
  const buffer = await fs.readFile(path.join(runRoot, relativeRunPath));
  return "sha256:" + crypto.createHash("sha256").update(buffer).digest("hex");
}

function resolverPapers(resolver: any): any[] {
  return resolver?.data?.data?.papers || [];
}

describe("DETR create topic synthesis gated playbook", function () {
  it("keeps the playbook and mirrored ACP run workspace complete", async function () {
    const requiredFiles = [
      "playbook.md",
      "diagnostics.json",
      "discovery/selected-paper-set.json",
      "transcripts/bridge/status.json",
      "transcripts/bridge/debug-status.json",
      "transcripts/bridge/manifest.json",
      "transcripts/bridge/list-topics.json",
      "transcripts/bridge/library-index-page-0.json",
      "transcripts/bridge/resolver-discovery.json",
      "transcripts/bridge/selected-paper-artifact-manifest.json",
      "diagnostics/action-receipts.json",
      "diagnostics/artifact-registry.json",
      "diagnostics/stage-receipts.json",
      "schemas/examples/manifest.json",
    ];

    for (const filePath of requiredFiles) {
      await assertFileExists(filePath);
    }

    for (const filePath of [
      "runtime/input.json",
      "runtime/topic-synthesis.sqlite",
      "runtime/payloads/resolver.json",
      "runtime/payloads/citation-graph-metrics-batch-1.json",
      "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      "runtime/views/cross-paper-context.md",
      "runtime/views/source-paper-evidence-index.json",
      "runtime/handoff/prepare-analysis-context.json",
      "runtime/handoff/core-enrichment.json",
      "runtime/views/concept-candidate-context.json",
      "runtime/views/finalize-context.manifest.json",
      "runtime/views/synthesis-report.md",
      "result/sidecars/concept-cards-proposal.json",
      "result/sidecars/topic-graph-relation-proposals.json",
      "result/sidecars/topic-interest-metadata.json",
      "result/sections/coverage.json",
      "result/sections/summary.json",
      "result/topic-analysis.json",
      "result/final-output.candidate.json",
    ]) {
      await fs.access(path.join(runRoot, filePath));
    }
  });

  it("records a legal ACP skill-runs mirror and real bridge bounded selection", async function () {
    const diagnostics = await readJson<any>(
      path.join(playbookRoot, "diagnostics.json"),
    );
    const resolver = await readJson<any>(
      path.join(playbookRoot, "transcripts/bridge/resolver-discovery.json"),
    );
    const selected = await readJson<any>(
      path.join(playbookRoot, "discovery/selected-paper-set.json"),
    );

    assert.match(
      diagnostics.run_root,
      /^workspace\/runtime\/acp\/skill-runs\/acp-skill-/,
    );
    assert.equal(diagnostics.zotero_side_effects, "none");
    assert.equal(diagnostics.resolver.discovery_total, 22);
    assert.equal(diagnostics.resolver.selected_count, 5);
    assert.equal(diagnostics.resolver.unused_resolver_paper_count, 17);
    assert.lengthOf(selected.papers, 5);

    const resolverRefs = new Set(
      resolverPapers(resolver).map((paper: any) => paper.paper_ref),
    );
    for (const paper of selected.papers) {
      assert.isTrue(
        resolverRefs.has(paper.paper_ref),
        `${paper.paper_ref} should come from resolver result`,
      );
    }
  });

  it("validates all runtime payloads and schema example mirrors", async function () {
    const ajv = new Ajv({ allErrors: true, strict: false });

    for (const example of runtimePayloadExamples) {
      const schema = await readJson(path.join(schemaRoot, example.schema));
      const validate = ajv.compile(schema);

      const runtimePayload = await readJson(
        path.join(runRoot, example.payload),
      );
      assert.isTrue(
        validate(runtimePayload),
        `${example.payload}: ${ajv.errorsText(validate.errors)}`,
      );

      const schemaExamplePath = path.join(
        playbookRoot,
        "schemas/examples",
        path.basename(example.schema).replace(".schema", ""),
      );
      const schemaExample = await readJson(schemaExamplePath);
      assert.isTrue(
        validate(schemaExample),
        `${schemaExamplePath}: ${ajv.errorsText(validate.errors)}`,
      );
    }
  });

  it("validates split handoff manifests and final candidate shape", async function () {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const handoffSchema = await readJson(
      path.join(schemaRoot, "handoff.schema.json"),
    );
    const validateHandoff = ajv.compile(handoffSchema);

    for (const handoffFile of [
      "runtime/handoff/prepare-analysis-context.json",
      "runtime/handoff/core-enrichment.json",
    ]) {
      const manifest = await readJson(path.join(runRoot, handoffFile));
      assert.isTrue(
        validateHandoff(manifest),
        `${handoffFile}: ${ajv.errorsText(validateHandoff.errors)}`,
      );
    }

    const finalCandidate = await readJson<any>(
      path.join(runRoot, "result/final-output.candidate.json"),
    );
    assert.equal(finalCandidate.kind, "topic_synthesis");
    assert.equal(finalCandidate.operation, "create");
    assert.notEqual(finalCandidate.kind, "topic_synthesis_handoff");
    assert.notProperty(finalCandidate, "handoff_manifest_path");
    assert.equal(
      finalCandidate.candidate_output_path,
      "result/final-output.candidate.json",
    );
  });

  it("records gate/action receipts for every stage and artifact hashes", async function () {
    const gateFiles = await fs.readdir(
      path.join(runRoot, "runtime/gate-transcript"),
    );
    const actionFiles = await fs.readdir(
      path.join(runRoot, "runtime/action-transcript"),
    );
    const actionReceipts = await readJson<any>(
      path.join(playbookRoot, "diagnostics/action-receipts.json"),
    );
    const registry = await readJson<any>(
      path.join(playbookRoot, "diagnostics/artifact-registry.json"),
    );

    assert.isAtLeast(gateFiles.length, 13);
    assert.deepEqual(actionFiles, [
      "001-stage_00_runtime_setup-run.json",
      "002-stage_10_create_topic_context-submit.json",
      "003-stage_20_resolver_and_workset-submit.json",
      "004-stage_30_prepare_analysis_context-submit.json",
      "005-stage_00_runtime_state_check-run.json",
      "006-stage_40_core_synthesis-submit.json",
      "007-stage_50_kg_enrichment-submit.json",
      "008-stage_00_runtime_state_check-run.json",
      "009-stage_60_coverage_and_collection_suggestions-submit.json",
      "010-stage_70_summary-submit.json",
    ]);
    assert.deepEqual(
      actionReceipts.actions.map((entry: any) => [
        entry.skill_id,
        entry.stage_id,
        entry.action,
      ]),
      [
        ["create-topic-synthesis-prepare", "stage_00_runtime_setup", "run"],
        [
          "create-topic-synthesis-prepare",
          "stage_10_create_topic_context",
          "submit",
        ],
        [
          "create-topic-synthesis-prepare",
          "stage_20_resolver_and_workset",
          "resolver_cascade_metrics",
        ],
        [
          "create-topic-synthesis-prepare",
          "stage_20_resolver_and_workset",
          "resolver_cascade_artifacts",
        ],
        [
          "create-topic-synthesis-prepare",
          "stage_20_resolver_and_workset",
          "submit",
        ],
        [
          "create-topic-synthesis-prepare",
          "stage_30_prepare_analysis_context",
          "submit",
        ],
        [
          "topic-synthesis-core-enrichment",
          "stage_00_runtime_state_check",
          "run",
        ],
        [
          "topic-synthesis-core-enrichment",
          "stage_40_core_synthesis",
          "submit",
        ],
        ["topic-synthesis-core-enrichment", "stage_50_kg_enrichment", "submit"],
        ["topic-synthesis-finalize", "stage_00_runtime_state_check", "run"],
        [
          "topic-synthesis-finalize",
          "stage_60_coverage_and_collection_suggestions",
          "submit",
        ],
        ["topic-synthesis-finalize", "stage_70_summary", "submit"],
      ],
    );

    const registryByKey = new Map(
      registry.artifacts.map((entry: any) => [entry.artifact_key, entry]),
    );
    for (const key of [
      "resolver_manifest",
      "citation_graph_metrics_batch_1",
      "paper_artifacts_manifest_batch_1",
      "cross_paper_context",
      "source_paper_evidence_index",
      "concept_cards_proposal",
      "topic_graph_relation_proposals",
      "topic_interest_metadata",
      "finalize_context_manifest",
      "coverage_section",
      "summary_section",
      "topic_analysis_manifest",
      "final_candidate",
    ]) {
      const entry = registryByKey.get(key) as any;
      assert.isOk(entry, `${key} should be registered`);
      assert.equal(await sha256(entry.path), entry.hash, `${key} hash`);
    }
  });

  it("documents the bridge transcript and redaction policy", async function () {
    const playbook = await fs.readFile(
      path.join(playbookRoot, "playbook.md"),
      "utf8",
    );
    const allText = await Promise.all(
      [
        "playbook.md",
        "diagnostics.json",
        "transcripts/bridge/manifest.command.json",
        "transcripts/bridge/debug-status.command.json",
      ].map((filePath) =>
        fs.readFile(path.join(playbookRoot, filePath), "utf8"),
      ),
    );

    assert.include(playbook, "zotero-bridge status");
    assert.include(playbook, "resolve-resolver");
    assert.include(playbook, "5 篇");
    assert.include(playbook, "不保留 bearer token");
    assert.notInclude(allText.join("\n"), "c5731f");
    assert.notInclude(allText.join("\n"), "b17142");
    assert.notInclude(allText.join("\n"), "attachment-path:");
  });
});
