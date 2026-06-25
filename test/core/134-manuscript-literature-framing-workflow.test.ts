import { assert } from "chai";
import fs from "fs/promises";
import { buildAcpSkillResourceManifest } from "../../src/modules/acpSkillResourceManifest";
import { validateAcpSkillFinalPayload } from "../../src/modules/acpSkillOutputValidator";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { loadWorkflowManifests } from "../../src/workflows/loader";

describe("Manuscript Literature Framing workflow contract", function () {
  it("ships a SkillRunner interactive manuscript literature framing workflow", async function () {
    const workflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/manuscript-literature-framing/workflow.json",
        "utf8",
      ),
    );

    assert.equal(workflow.id, "manuscript-literature-framing");
    assert.equal(workflow.label, "Manuscript Literature Framing");
    assert.equal(
      workflow.request?.create?.skill_id,
      "manuscript-literature-framing",
    );
    assert.equal(
      workflow.taskNameTemplate,
      "Frame manuscript literature: {paperTitle}",
    );
    assert.equal(workflow.inputs?.unit, "workflow");
    assert.equal(workflow.request?.create?.mode, "interactive");
    assert.equal(workflow.provider, "skillrunner");
    assert.equal(workflow.result?.fetch?.type, "bundle");
    assert.deepEqual(workflow.result?.expects?.artifacts, [
      "result/manuscript-literature-framing-artifacts.json",
    ]);
    assert.notProperty(workflow.execution || {}, "supportedBackends");
    assert.isTrue(workflow.execution?.zoteroHostAccess?.required);
    assert.notProperty(workflow.execution || {}, "mcp");
    assert.equal(workflow.parameters?.paperTitle?.type, "string");
  });

  it("loads from the builtin synthesis-layer workflow package and builds one workflow-unit request", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "manuscript-literature-framing",
    );
    assert.isOk(workflow);

    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: { items: { attachments: [] } },
      executionOptions: {
        workflowParams: {
          paperTitle: "Efficient Detector Adaptation in Degraded Visual Scenes",
          language: "en-US",
          targetVenue: "IEEE T-IP",
          articleType: "original research",
        },
      },
    })) as Array<{
      taskName?: string;
      fetch_type?: string;
      parameter?: Record<string, unknown>;
      runtime_options?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(
      requests[0].taskName,
      "Frame manuscript literature: Efficient Detector Adaptation in Degraded Visual Scenes",
    );
    assert.equal(requests[0].fetch_type, "bundle");
    assert.equal(
      requests[0].parameter?.paperTitle,
      "Efficient Detector Adaptation in Degraded Visual Scenes",
    );
    assert.isUndefined(
      (requests[0] as any).runtime_options?.zotero_host_access,
    );
    assert.isUndefined((requests[0] as any).runtime_options?.workflow_mcp);
  });

  it("registers the workflow in the builtin synthesis-layer package and packaged manifest", async function () {
    const packageJson = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/workflow-package.json",
        "utf8",
      ),
    );
    const manifest = JSON.parse(
      await fs.readFile("workflows_builtin/manifest.json", "utf8"),
    );
    assert.include(
      packageJson.workflows,
      "manuscript-literature-framing/workflow.json",
    );
    assert.include(
      manifest.files,
      "synthesis-layer/manuscript-literature-framing/workflow.json",
    );
  });

  it("ships a package hook that stays compatible with the Zotero hook bundler", async function () {
    const hookSource = await fs.readFile(
      "workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs",
      "utf8",
    );

    assert.match(hookSource, /export\s+async\s+function\s+applyResult\b/);
    assert.notMatch(hookSource, /export\s+default\b/);
  });

  it("ships a self-contained manuscript literature framing skill package", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["manuscript-literature-framing"];
    assert.isOk(entry);
    const manifest = await buildAcpSkillResourceManifest(entry);
    const files = manifest.files.map((file) => file.relativePath).sort();

    assert.include(files, "SKILL.md");
    assert.include(files, "assets/runner.json");
    assert.include(files, "assets/parameter.schema.json");
    assert.include(files, "assets/output.schema.json");
    assert.include(
      files,
      "references/scientific_introduction_related_work_writing_guide_zh.md",
    );
    assert.notInclude(files, "references/introduction_related_work_guide.md");
    assert.include(files, "scripts/gate_runtime.py");
    assert.include(files, "scripts/stage_runtime.py");
    assert.include(files, "scripts/runtime_state.py");
  });

  it("documents interaction gates, host usage, citekey policy, and product artifact metadata", async function () {
    const skill = await fs.readFile(
      "skills_builtin/manuscript-literature-framing/SKILL.md",
      "utf8",
    );
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/manuscript-literature-framing/assets/runner.json",
        "utf8",
      ),
    );
    const prompt = runner.entrypoint?.prompts?.common || "";

    for (const text of [skill, prompt]) {
      assert.include(text, "topics.list");
      assert.include(text, "topics.get_review_input");
      assert.include(text, "prepare_paper_reading_context");
      assert.include(text, "manuscript intent");
      assert.include(text, "material");
      assert.include(text, "framing analysis");
      assert.include(text, "LLM");
      assert.include(text, "Scripts");
      assert.include(text, "confirmed writing plan");
      assert.include(text, "\\cite{zotero_citekey}");
      assert.include(text, "% TODO citation: paper_ref");
      assert.include(text, "writing.manuscript_literature_framing");
      assert.include(text, "artifact_manifest_path");
    }
    assert.notInclude(prompt, "MCP");
    assert.notInclude(skill, "MCP");
    assert.include(
      skill,
      "背景动机 → 具体问题 → 现有路线 → gap → 本文定位/贡献 → 结构引导",
    );
    assert.include(
      skill,
      "taxonomy / method lines / benchmark dimensions / debates",
    );
    assert.include(skill, "survey-of-surveys");
    assert.include(skill, "persist_domain_route_analysis");
    assert.include(skill, "persist_gap_alignment_analysis");
    assert.include(
      skill,
      "scientific_introduction_related_work_writing_guide_zh.md",
    );
    assert.notInclude(skill, "introduction_related_work_guide.md");
    assert.notInclude(prompt, "introduction_related_work_guide.md");
  });

  it("validates completed and canceled final outputs", async function () {
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/manuscript-literature-framing/assets/runner.json",
        "utf8",
      ),
    );
    const outputSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/manuscript-literature-framing/assets/output.schema.json",
        "utf8",
      ),
    );
    const primarySkillDir = "skills_builtin/manuscript-literature-framing";
    const completedSchema = outputSchema.oneOf[0];
    assert.include(completedSchema.required, "artifact_manifest_path");
    assert.notInclude(completedSchema.required, "assets");
    assert.notInclude(completedSchema.required, "status");
    assert.equal(
      completedSchema.properties.artifact_manifest_path["x-type"],
      "artifact-manifest",
    );
    const completed = await validateAcpSkillFinalPayload({
      runnerJson: runner,
      primarySkillDir,
      readArtifactText: async () =>
        JSON.stringify({
          introduction: "D:/run/result/introduction.tex",
          related_work: "D:/run/result/related-work.tex",
        }),
      payload: {
        __SKILL_DONE__: true,
        kind: "writing.manuscript_literature_framing",
        title: "Efficient Detector Adaptation in Degraded Visual Scenes",
        language: "en-US",
        topic_ids: ["object-detection"],
        artifact_manifest_path:
          "D:/run/result/manuscript-literature-framing-artifacts.json",
      },
    });
    assert.deepEqual(completed.errors, []);

    const canceled = await validateAcpSkillFinalPayload({
      runnerJson: runner,
      primarySkillDir,
      payload: {
        __SKILL_DONE__: true,
        kind: "manuscript_literature_framing_canceled",
        status: "canceled",
        reason: "no_relevant_topic_synthesis",
        message: "Create a topic synthesis first.",
        paperTitle: "Efficient Detector Adaptation in Degraded Visual Scenes",
      },
    });
    assert.deepEqual(canceled.errors, []);
  });

  it("runtime scripts expose the required gates and final drafting actions", async function () {
    const gate = await fs.readFile(
      "skills_builtin/manuscript-literature-framing/scripts/gate_runtime.py",
      "utf8",
    );
    const stage = await fs.readFile(
      "skills_builtin/manuscript-literature-framing/scripts/stage_runtime.py",
      "utf8",
    );

    assert.include(gate, "persist_intent_brief");
    assert.include(gate, "confirm_intent");
    assert.include(gate, "persist_material_plan");
    assert.include(gate, "confirm_material_scope");
    assert.include(gate, "persist_domain_route_analysis");
    assert.include(gate, "persist_timeline_analysis");
    assert.include(gate, "persist_gap_alignment_analysis");
    assert.include(gate, "persist_framing_synthesis");
    assert.include(gate, "confirm_writing_plan");
    assert.include(stage, "persist_intent_brief");
    assert.include(stage, "confirm_intent");
    assert.include(stage, "persist_material_plan");
    assert.include(stage, "confirm_material_scope");
    assert.include(stage, "persist_evidence_inventory");
    assert.include(stage, "persist_domain_route_analysis");
    assert.include(stage, "persist_timeline_analysis");
    assert.include(stage, "persist_gap_alignment_analysis");
    assert.include(stage, "persist_framing_synthesis");
    assert.include(stage, "persist_writing_plan");
    assert.include(stage, "confirm_writing_plan");
    assert.include(gate, "persist_final_draft");
    assert.include(stage, "persist_final_draft");
    assert.include(gate, "Path(__file__).resolve().with_name");
    assert.include(gate, "required_writes");
    assert.include(stage, "ARTIFACT_MANIFEST_FILENAME");
    assert.include(stage, "require_existing_file");
    assert.notInclude(stage, '"assets": assets');
  });
});
