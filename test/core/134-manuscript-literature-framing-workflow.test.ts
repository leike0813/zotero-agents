import { assert } from "chai";
import fs from "fs/promises";
import { buildAcpSkillResourceManifest } from "../../src/modules/acpSkillResourceManifest";
import { validateAcpSkillFinalPayload } from "../../src/modules/acpSkillOutputValidator";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { loadWorkflowManifests } from "../../src/workflows/loader";

const REQUIRED_TOOLS = [
  "synthesis.list_topics",
  "synthesis.get_review_input",
  "synthesis.get_paper_registry",
  "synthesis.get_citation_graph_metrics",
  "synthesis.get_citation_graph_slice",
  "synthesis.resolve_topic_paper_digest",
  "list_library_items",
  "search_items",
  "get_item_detail",
  "get_item_notes",
  "list_note_payloads",
  "get_note_payload",
  "get_item_attachments",
  "prepare_paper_reading_context",
];

describe("Manuscript Literature Framing workflow contract", function () {
  it("ships an ACP-only interactive manuscript literature framing workflow", async function () {
    const workflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/manuscript-literature-framing/workflow.json",
        "utf8",
      ),
    );

    assert.equal(workflow.id, "manuscript-literature-framing");
    assert.equal(workflow.label, "Manuscript Literature Framing");
    assert.equal(workflow.request?.create?.skill_id, "manuscript-literature-framing");
    assert.equal(workflow.taskNameTemplate, "Frame manuscript literature: {paperTitle}");
    assert.equal(workflow.inputs?.unit, "workflow");
    assert.equal(workflow.execution?.skillrunner_mode, "interactive");
    assert.equal(workflow.provider, "acp");
    assert.notProperty(workflow.execution || {}, "supportedBackends");
    assert.sameMembers(workflow.execution?.mcp?.requiredTools || [], REQUIRED_TOOLS);
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
      parameter?: Record<string, unknown>;
      runtime_options?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(
      requests[0].taskName,
      "Frame manuscript literature: Efficient Detector Adaptation in Degraded Visual Scenes",
    );
    assert.equal(
      requests[0].parameter?.paperTitle,
      "Efficient Detector Adaptation in Degraded Visual Scenes",
    );
    assert.deepEqual((requests[0] as any).runtime_options?.workflow_mcp, {
      required_tools: REQUIRED_TOOLS,
    });
  });

  it("registers the workflow in the builtin synthesis-layer package and packaged manifest", async function () {
    const packageJson = JSON.parse(
      await fs.readFile("workflows_builtin/synthesis-layer/workflow-package.json", "utf8"),
    );
    const manifest = JSON.parse(await fs.readFile("workflows_builtin/manifest.json", "utf8"));
    assert.include(
      packageJson.workflows,
      "manuscript-literature-framing/workflow.json",
    );
    assert.include(
      manifest.files,
      "synthesis-layer/manuscript-literature-framing/workflow.json",
    );
  });

  it("ships a self-contained manuscript literature framing skill package", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["manuscript-literature-framing"];
    assert.isOk(entry);
    const manifest = await buildAcpSkillResourceManifest(entry);
    const files = manifest.files.map((file) => file.relativePath).sort();

    assert.include(files, "SKILL.md");
    assert.include(files, "assets/runner.json");
    assert.include(files, "assets/output.schema.json");
    assert.include(files, "references/scientific_introduction_related_work_writing_guide_zh.md");
    assert.notInclude(files, "references/introduction_related_work_guide.md");
    assert.include(files, "scripts/gate_runtime.py");
    assert.include(files, "scripts/stage_runtime.py");
    assert.include(files, "scripts/runtime_state.py");
  });

  it("documents interaction gates, MCP usage, citekey policy, and product artifact metadata", async function () {
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
      assert.include(text, "synthesis.list_topics");
      assert.include(text, "synthesis.get_review_input");
      assert.include(text, "prepare_paper_reading_context");
      assert.include(text, "manuscript context");
      assert.include(text, "confirmed topics");
      assert.include(text, "confirmed writing plan");
      assert.include(text, "\\cite{zotero_citekey}");
      assert.include(text, "% TODO citation: paper_ref");
      assert.include(text, "writing.manuscript_literature_framing");
    }
    assert.include(prompt, "do not search MCP configuration");
    assert.include(skill, "背景动机 → 具体问题 → 现有路线 → gap → 本文定位/贡献 → 结构引导");
    assert.include(skill, "taxonomy / method lines / benchmark dimensions / debates");
    assert.include(skill, "survey-of-surveys");
    assert.include(skill, "scientific_introduction_related_work_writing_guide_zh.md");
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
    const primarySkillDir = "skills_builtin/manuscript-literature-framing";
    const completed = await validateAcpSkillFinalPayload({
      runnerJson: runner,
      primarySkillDir,
      payload: {
        __SKILL_DONE__: true,
        kind: "writing.manuscript_literature_framing",
        status: "completed",
        title: "Efficient Detector Adaptation in Degraded Visual Scenes",
        language: "en-US",
        assets: {
          introduction_tex: "result/introduction.tex",
          related_work_tex: "result/related-work.tex",
          writing_plan: "result/writing-plan.json",
          citation_map: "result/citation-map.json",
          diagnostics: "result/diagnostics.json",
        },
        topic_ids: ["object-detection"],
        diagnostics_summary: { missing_citekeys: 0, warnings: [] },
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

  it("runtime scripts expose the required gates and final rendering actions", async function () {
    const gate = await fs.readFile(
      "skills_builtin/manuscript-literature-framing/scripts/gate_runtime.py",
      "utf8",
    );
    const stage = await fs.readFile(
      "skills_builtin/manuscript-literature-framing/scripts/stage_runtime.py",
      "utf8",
    );

    assert.include(gate, "collect_manuscript_context");
    assert.include(gate, "confirm_topics");
    assert.include(gate, "confirm_writing_plan");
    assert.include(stage, "persist_manuscript_context");
    assert.include(stage, "persist_topic_recommendations");
    assert.include(stage, "confirm_topics");
    assert.include(stage, "persist_writing_plan");
    assert.include(stage, "confirm_writing_plan");
    assert.include(stage, "render_latex");
  });
});
