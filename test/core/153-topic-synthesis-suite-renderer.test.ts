import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import {
  validateAcpSkillRunRequestAgainstSchemas,
  validateRunnerManifestShape,
} from "../../src/modules/acpSkillSchemaAssets";
import { renderTopicSynthesisSkills } from "../../skills_src/topic-synthesis/renderer/render_topic_synthesis_skills";

const suiteRoot = path.join("skills_src", "topic-synthesis");
const generatedSkillIds = [
  "create-topic-synthesis-prepare",
  "update-topic-synthesis-prepare",
  "topic-synthesis-core-enrichment",
  "topic-synthesis-finalize",
];

const expectedStageSchemas: Record<string, string[]> = {
  "create-topic-synthesis-prepare": [
    "stage-10-create-topic-context.schema.json",
    "stage-20-resolver-and-workset.schema.json",
    "stage-30-prepare-analysis-context.schema.json",
  ],
  "update-topic-synthesis-prepare": [
    "stage-10-update-topic-context.schema.json",
    "stage-30-prepare-analysis-context.schema.json",
  ],
  "topic-synthesis-core-enrichment": [
    "stage-40-core-synthesis.schema.json",
    "stage-50-kg-enrichment.schema.json",
  ],
  "topic-synthesis-finalize": [
    "stage-60-coverage-and-collection-suggestions.schema.json",
    "stage-70-summary.schema.json",
  ],
};

async function assertFileExists(filePath: string) {
  await fs.access(filePath);
}

function extractInlineExample(skillText: string, schemaName: string) {
  const marker = `schema 文件：assets/schemas/${schemaName}`;
  const markerIndex = skillText.indexOf(marker);
  assert.isAtLeast(markerIndex, 0, `missing schema marker for ${schemaName}`);
  const match = skillText.slice(markerIndex).match(/```json\n([\s\S]*?)\n```/);
  assert.isNotNull(match, `missing inline JSON example for ${schemaName}`);
  return JSON.parse(match![1]);
}

function assertStage40ExampleCoversGateFields(example: any) {
  assert.notProperty(example, "positioning");
  assert.isString(example.taxonomy?.summary?.text);
  assert.isNotEmpty(example.taxonomy.summary.text);
  const route = example.taxonomy?.nodes?.[0];
  assert.isObject(route);
  for (const key of ["definition", "core_problem", "mechanism", "maturity"]) {
    assert.isString(route[key], `taxonomy route should include ${key}`);
    assert.isNotEmpty(route[key], `taxonomy route ${key} should not be empty`);
  }
  assert.isArray(route.strengths);
  assert.isNotEmpty(route.strengths);
  assert.isArray(route.limitations);
  assert.isNotEmpty(route.limitations);
  assert.isArray(route.source_paper_refs);
  assert.isNotEmpty(route.source_paper_refs);

  const timelineEvent = example.timeline_events?.events?.[0];
  assert.isString(timelineEvent?.description);
  assert.isNotEmpty(timelineEvent.description);
  assert.isString(timelineEvent.phase);
  assert.isNotEmpty(timelineEvent.phase);
  assert.isArray(timelineEvent.source_paper_refs);
  assert.isNotEmpty(timelineEvent.source_paper_refs);

  const claim = example.claims?.[0];
  assert.isString(claim?.analysis);
  assert.isNotEmpty(claim.analysis);
  assert.isTrue(
    Boolean(claim.scope) ||
      Boolean(claim.applicability) ||
      Array.isArray(claim.limitations),
    "claim should include scope, applicability, or limitations",
  );
  assert.isArray(claim.source_paper_refs);
  assert.isNotEmpty(claim.source_paper_refs);

  const futureDirection = example.future_directions?.[0];
  assert.isObject(futureDirection);
  for (const key of [
    "id",
    "title",
    "direction_type",
    "current_limitation",
    "future_direction",
    "rationale",
  ]) {
    assert.isString(
      futureDirection[key],
      `future direction should include ${key}`,
    );
    assert.isNotEmpty(
      futureDirection[key],
      `future direction ${key} should not be empty`,
    );
  }
  assert.isArray(futureDirection.source_paper_refs);
  assert.isNotEmpty(futureDirection.source_paper_refs);

  const reviewOutline = example.review_outline;
  assert.isString(reviewOutline?.topic_importance);
  assert.isNotEmpty(reviewOutline.topic_importance);
  const strategy = reviewOutline.writing_strategies?.[0];
  assert.isObject(strategy);
  for (const key of [
    "id",
    "title",
    "review_thesis",
    "writing_strategy",
    "best_for",
    "risks",
  ]) {
    assert.isString(strategy[key], `writing strategy should include ${key}`);
    assert.isNotEmpty(
      strategy[key],
      `writing strategy ${key} should not be empty`,
    );
  }
  assert.isArray(strategy.section_plan);
  assert.isNotEmpty(strategy.section_plan);
  assert.include(
    reviewOutline.writing_strategies.map((row: any) => row.id),
    reviewOutline.recommended_strategy_id,
  );
}

async function collectFileMap(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function visit(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        const relativePath = path
          .relative(root, fullPath)
          .split(path.sep)
          .join("/");
        result[relativePath] = await fs.readFile(fullPath, "utf8");
      }
    }
  }
  await visit(root);
  return result;
}

function runGateFromOtherCwd(skillId: string, extraArgs: string[] = []) {
  const scriptPath = path.resolve(
    "skills_builtin",
    skillId,
    "scripts",
    "gate.py",
  );
  const cwd = fsSync.mkdtempSync(
    path.join(os.tmpdir(), "topic-synthesis-gate-cwd-"),
  );
  const arProject = path.join(os.homedir(), ".ar");
  const arPyproject = path.join(arProject, "pyproject.toml");
  const args = [
    scriptPath,
    "--db",
    "runtime/topic-synthesis.sqlite",
    ...extraArgs,
  ];
  const output = fsSync.existsSync(arPyproject)
    ? execFileSync(
        "uv",
        ["run", `--project=${arProject}`, "--locked", "--", "python", ...args],
        { cwd, encoding: "utf8", stdio: "pipe" },
      )
    : execFileSync(process.env.PYTHON || "python", args, {
        cwd,
        encoding: "utf8",
        stdio: "pipe",
      });
  return JSON.parse(output) as Record<string, unknown>;
}

function runGateRawFromOtherCwd(skillId: string) {
  const scriptPath = path.resolve(
    "skills_builtin",
    skillId,
    "scripts",
    "gate.py",
  );
  const cwd = fsSync.mkdtempSync(
    path.join(os.tmpdir(), "topic-synthesis-gate-raw-cwd-"),
  );
  const arProject = path.join(os.homedir(), ".ar");
  const arPyproject = path.join(arProject, "pyproject.toml");
  const args = [scriptPath, "--db", "runtime/topic-synthesis.sqlite"];
  const env = { ...process.env, PYTHONUTF8: "0" };
  return fsSync.existsSync(arPyproject)
    ? execFileSync(
        "uv",
        ["run", `--project=${arProject}`, "--locked", "--", "python", ...args],
        { cwd, env, stdio: "pipe" },
      )
    : execFileSync(process.env.PYTHON || "python", args, {
        cwd,
        env,
        stdio: "pipe",
      });
}

describe("Topic synthesis suite renderer", function () {
  it("keeps the suite source structure complete", async function () {
    const requiredFiles = [
      "contracts/paths.yaml",
      "contracts/stages.yaml",
      "contracts/handoff.schema.json",
      "contracts/stdout-envelope.schema.json",
      "contracts/db-schema.sql",
      "contracts/stage-guidance.yaml",
      "renderer/render_topic_synthesis_skills.ts",
      "runtime/topic_synthesis_runtime/common/gate.py",
      "runtime/topic_synthesis_runtime/common/topic_synthesis_db.py",
    ];
    for (const filePath of requiredFiles) {
      await assertFileExists(path.join(suiteRoot, filePath));
    }

    for (const schemaName of Object.values(expectedStageSchemas).flat()) {
      await assertFileExists(
        path.join(suiteRoot, "contracts", "payload-schemas", schemaName),
      );
    }

    for (const skillId of generatedSkillIds) {
      await assertFileExists(
        path.join(suiteRoot, "templates", skillId, "SKILL.md.j2"),
      );
    }
    assert.isFalse(
      fsSync.existsSync(
        path.join(
          "skills_builtin",
          "update-topic-synthesis-prepare",
          "assets",
          "schemas",
          "stage-20-resolver-and-workset.schema.json",
        ),
      ),
      "update prepare package should not retain the create-only Stage 20 schema",
    );
  });

  it("keeps suite output schemas free of ACP control fields", async function () {
    const stdoutEnvelope = await fs.readFile(
      path.join(suiteRoot, "contracts", "stdout-envelope.schema.json"),
      "utf8",
    );
    assert.notInclude(stdoutEnvelope, "__SKILL_DONE__");
  });

  it("renders deterministic self-contained packages", async function () {
    const rootA = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-render-a-"),
    );
    const rootB = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-render-b-"),
    );

    await renderTopicSynthesisSkills(rootA);
    await renderTopicSynthesisSkills(rootB);

    const mapA = await collectFileMap(rootA);
    const mapB = await collectFileMap(rootB);
    assert.deepEqual(mapA, mapB);

    for (const skillId of generatedSkillIds) {
      assert.property(mapA, `${skillId}/SKILL.md`);
      assert.property(mapA, `${skillId}/scripts/gate.py`);
      assert.property(mapA, `${skillId}/scripts/topic_synthesis_db.py`);
      assert.property(mapA, `${skillId}/assets/runner.json`);
      assert.property(mapA, `${skillId}/assets/input.schema.json`);
      assert.property(mapA, `${skillId}/assets/parameter.schema.json`);
      assert.property(mapA, `${skillId}/assets/output.schema.json`);
    }
  });

  it("renders normalized runner manifests with input, parameter, and output schemas", async function () {
    for (const skillId of generatedSkillIds) {
      const skillDir = path.join("skills_builtin", skillId);
      const runnerJson = JSON.parse(
        await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
      );
      const errors = validateRunnerManifestShape({
        runnerJson,
        skillDirName: skillId,
        skillFrontmatterName: skillId,
      });
      assert.deepEqual(errors, [], `${skillId} runner.json should be valid`);
      assert.deepEqual(runnerJson.execution_modes, ["interactive"]);
      assert.equal(runnerJson.max_attempt, 12);
      assert.deepEqual(runnerJson.schemas, {
        input: "assets/input.schema.json",
        parameter: "assets/parameter.schema.json",
        output: "assets/output.schema.json",
      });
      assert.isObject(runnerJson.entrypoint?.prompts);

      const parameterSchema = JSON.parse(
        await fs.readFile(
          path.join(skillDir, "assets", "parameter.schema.json"),
          "utf8",
        ),
      );
      const parameterKeys = Object.keys(
        parameterSchema.properties || {},
      ).sort();
      const requiredKeys = [...(parameterSchema.required || [])].sort();
      if (skillId === "create-topic-synthesis-prepare") {
        assert.deepEqual(parameterKeys, ["language", "topicSeed"]);
        assert.deepEqual(requiredKeys, ["topicSeed"]);
      } else if (skillId === "update-topic-synthesis-prepare") {
        assert.deepEqual(parameterKeys, ["topicId"]);
        assert.deepEqual(requiredKeys, ["topicId"]);
      } else {
        assert.deepEqual(parameterKeys, ["language", "topicId", "topicSeed"]);
        assert.deepEqual(requiredKeys, []);
      }
      assert.notProperty(parameterSchema.properties || {}, "updateScope");
      assert.notProperty(parameterSchema.properties || {}, "updateMode");
      assert.notProperty(parameterSchema.properties || {}, "updateReason");

      const request =
        skillId === "create-topic-synthesis-prepare"
          ? {
              parameter: { topicSeed: "DETR", language: "zh-CN" },
            }
          : skillId === "update-topic-synthesis-prepare"
            ? {
                parameter: { topicId: "detr-topic" },
              }
            : {
                input: {
                  handoff: {
                    kind: "topic_synthesis_handoff",
                    handoff: "prepare_analysis_context",
                  },
                },
                parameter: { topicSeed: "DETR", language: "zh-CN" },
              };
      const validation = await validateAcpSkillRunRequestAgainstSchemas({
        request: {
          kind: "acp.skill.run.v1",
          skill_id: skillId,
          ...request,
        } as any,
        runnerJson,
        skillDir,
        workspaceDir: process.cwd(),
      });
      assert.isTrue(
        validation.ok,
        `${skillId} input/parameter schema should accept sequence step request: ${validation.errors.join("; ")}`,
      );
    }
  });

  it("keeps generated packages local to their own stage schemas", async function () {
    for (const skillId of generatedSkillIds) {
      const schemaDir = path.join(
        "skills_builtin",
        skillId,
        "assets",
        "schemas",
      );
      const schemaFiles = (await fs.readdir(schemaDir))
        .filter((fileName) => fileName.startsWith("stage-"))
        .sort();
      assert.deepEqual(schemaFiles, expectedStageSchemas[skillId]);
    }
  });

  it("keeps generated packages on a single SKILL.md instruction surface", async function () {
    for (const skillId of generatedSkillIds) {
      assert.isFalse(
        fsSync.existsSync(path.join("skills_builtin", skillId, "references")),
        `${skillId} should not generate package-local references`,
      );
      assert.isFalse(
        fsSync.existsSync(
          path.join("skills_builtin", skillId, "references", "stages"),
        ),
        `${skillId} should not generate stage reference markdown files`,
      );
    }
  });

  it("renders package-local output schemas for handoff and final result packages", async function () {
    for (const skillId of generatedSkillIds) {
      const schema = JSON.parse(
        await fs.readFile(
          path.join("skills_builtin", skillId, "assets", "output.schema.json"),
          "utf8",
        ),
      ) as Record<string, any>;
      const serialized = JSON.stringify(schema);
      assert.notInclude(serialized, "__SKILL_DONE__");
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validate = ajv.compile(schema);
      if (skillId === "topic-synthesis-finalize") {
        assert.include(serialized, "topic_synthesis");
        assert.include(serialized, "topic_synthesis_canceled");
        assert.notInclude(serialized, "topic_synthesis_handoff");
        assert.notInclude(serialized, "handoff_manifest_path");
        assert.isFalse(
          validate({
            __SKILL_DONE__: true,
            kind: "topic_synthesis",
            operation: "create",
            language: "zh-CN",
            topic_definition: { id: "detr", title: "DETR" },
            resolver_manifest_path: "runtime/payloads/resolver.json",
            analysis_manifest_path: "result/topic-analysis.json",
            candidate_output_path: "result/final-output.candidate.json",
          }),
          `${skillId} output schema must reject ACP control fields`,
        );
      } else {
        assert.include(serialized, "topic_synthesis_handoff");
        assert.include(serialized, "handoff_manifest_path");
        assert.include(serialized, "topic_synthesis_canceled");
        assert.notInclude(serialized, "analysis_manifest_path");
        assert.isFalse(
          validate({
            __SKILL_DONE__: true,
            kind: "topic_synthesis_handoff",
            handoff: "prepare_analysis_context",
            operation: "create",
            db_path: "runtime/topic-synthesis.sqlite",
            handoff_manifest_path:
              "runtime/handoff/prepare-analysis-context.json",
            next_skill_id: "topic-synthesis-core-enrichment",
          }),
          `${skillId} output schema must reject ACP control fields`,
        );
        assert.isTrue(
          validate({
            kind: "topic_synthesis_canceled",
            status: "canceled",
            reason: "duplicate_topic",
            message: "Topic synthesis was canceled.",
          }),
          `${skillId} output schema must accept business canceled results`,
        );
      }
    }
  });

  it("renders SKILL.md with only local canonical stages", async function () {
    const allStageIds = Object.values({
      create: [
        "stage_00_runtime_setup",
        "stage_10_create_topic_context",
        "stage_20_resolver_and_workset",
        "stage_30_prepare_analysis_context",
      ],
      update: [
        "stage_00_runtime_setup",
        "stage_10_update_topic_context",
        "stage_20_resolver_and_workset",
        "stage_30_prepare_analysis_context",
      ],
      core: [
        "stage_00_runtime_state_check",
        "stage_40_core_synthesis",
        "stage_50_kg_enrichment",
      ],
      finalize: [
        "stage_00_runtime_state_check",
        "stage_60_coverage_and_collection_suggestions",
        "stage_70_summary",
      ],
    }).flat();

    for (const skillId of generatedSkillIds) {
      const skillText = await fs.readFile(
        path.join("skills_builtin", skillId, "SKILL.md"),
        "utf8",
      );
      const localStages = skillText.match(/stage_\d+_[a-z_]+/g) || [];
      for (const stageId of allStageIds) {
        const shouldContain =
          expectedStageSchemas[skillId].some((schema) =>
            schema.includes(
              stageId.replace(/^stage_/, "").replaceAll("_", "-"),
            ),
          ) ||
          (skillId.includes("prepare") &&
            stageId === "stage_00_runtime_setup") ||
          (!skillId.includes("prepare") &&
            stageId === "stage_00_runtime_state_check") ||
          (skillId.includes("create") &&
            stageId === "stage_10_create_topic_context") ||
          (skillId.includes("update") &&
            stageId === "stage_10_update_topic_context") ||
          (skillId.includes("core") &&
            ["stage_40_core_synthesis", "stage_50_kg_enrichment"].includes(
              stageId,
            )) ||
          (skillId.includes("finalize") &&
            [
              "stage_60_coverage_and_collection_suggestions",
              "stage_70_summary",
            ].includes(stageId));
        if (!shouldContain) {
          assert.notInclude(
            localStages.join("\n"),
            stageId,
            `${skillId} should not expose ${stageId}`,
          );
        }
      }

      assert.notInclude(skillText, "stage_11_render_and_validate");
      assert.notInclude(skillText, "persist_cross_paper_evidence_map");
      assert.notInclude(skillText, "persist_kg_proposals");
      assert.notInclude(skillText, "compatibility");
      assert.notInclude(skillText, "Non-final");
      assert.notInclude(skillText, "The final skill outputs");
      assert.notInclude(skillText, "final output envelope");
      assert.notInclude(skillText, "stage_5_paper_triage");
      assert.notInclude(skillText, "stage_6_cross_paper_map");
      assert.notInclude(skillText, "stage_8_core_synthesis");
      assert.notInclude(skillText, "stage_9_kg_enrichment");
      assert.notInclude(skillText, "stage_10_summary_coverage");
      assert.notInclude(skillText, "stage_11_render_and_validate");
      assert.notInclude(skillText, "persist_topic_context");
      assert.notInclude(skillText, "persist_resolver");
      assert.notInclude(skillText, "persist_paper_triage");
      assert.notInclude(skillText, "paper-triage-batch.json");
      assert.notInclude(skillText, "core-analytical-sections.json");
      assert.notInclude(skillText, "external-statistics-report.json");
      assert.notInclude(skillText, "paper_evidence");
      assert.notInclude(skillText, "evidence_map");
      assert.notInclude(skillText, "evidence_refs");
      assert.notInclude(skillText, "paper_evidence_refs");
      assert.notInclude(skillText, "evidence_map_refs");
      assert.notInclude(skillText, "topic_relation_candidates");
      if (skillId === "update-topic-synthesis-prepare") {
        assert.notInclude(skillText, "update_patch");
        assert.notInclude(skillText, "changed_sections");
        assert.notInclude(skillText, "update_assessment");
      }
      assert.notInclude(skillText, "runtime/views/synthesis-report.md");
      assert.notInclude(
        skillText,
        "runtime/views/synthesis-report.manifest.json",
      );
      assert.notInclude(skillText, '"analyses"');
    }
  });

  it("keeps external literature context scoped to finalize, not core enrichment", async function () {
    const coreSkill = await fs.readFile(
      path.join(
        "skills_builtin",
        "topic-synthesis-core-enrichment",
        "SKILL.md",
      ),
      "utf8",
    );
    const finalizeSkill = await fs.readFile(
      path.join("skills_builtin", "topic-synthesis-finalize", "SKILL.md"),
      "utf8",
    );

    assert.notInclude(
      coreSkill,
      "runtime/views/external-literature-context.md",
    );
    assert.include(
      finalizeSkill,
      "runtime/views/external-literature-context.md",
    );
    assert.notInclude(coreSkill, "external-literature context");
    assert.notInclude(finalizeSkill, "No external network literature");
    assert.notInclude(finalizeSkill, "未抓取");
  });

  it("renders generated SKILL.md prose in Chinese", async function () {
    const forbiddenEnglishFragments = [
      "Required Runtime Inputs",
      "Execution Contract",
      "Runtime State",
      "Stage Loop",
      "Output Contract",
      "Failure Rules",
      "This skill outputs",
      "Payload skeleton",
      "required reads",
      "payload path",
      "payload schema",
      "stage kind",
      "task:",
      "Do not",
      "Validate the returned object",
    ];

    for (const skillId of generatedSkillIds) {
      const skillText = await fs.readFile(
        path.join("skills_builtin", skillId, "SKILL.md"),
        "utf8",
      );
      assert.include(skillText, "## 必需运行输入");
      assert.include(skillText, "## 产品目标与质量标准");
      assert.include(skillText, "## 执行合同");
      assert.include(skillText, "## zotero-bridge CLI 使用说明");
      assert.include(skillText, "优先使用工作区注入的 Host Bridge shim");
      assert.include(skillText, ".\\.zotero-bridge\\bin\\zotero-bridge.cmd");
      assert.include(skillText, "./.zotero-bridge/bin/zotero-bridge");
      assert.include(skillText, "才使用裸命令 `zotero-bridge`");
      assert.include(skillText, "## 运行状态");
      assert.include(skillText, "## LLM 与脚本职责边界");
      assert.include(skillText, "## 阶段循环");
      assert.include(skillText, "## 严格执行顺序");
      assert.include(skillText, "## 输出合同");
      assert.include(skillText, "## 失败规则");
      assert.include(skillText, "本 stage 精确执行序列");
      assert.include(skillText, "语义处理步骤");
      assert.include(skillText, "质量检查");
      assert.include(skillText, "常见错误");
      assert.include(skillText, "Payload JSON 示例");
      assert.include(skillText, "--action run");
      assert.include(skillText, "--action submit --payload");
      assert.include(
        skillText,
        'python scripts/gate.py --db "runtime/topic-synthesis.sqlite"',
      );
      assert.notInclude(skillText, "uv run");
      assert.notInclude(skillText, "$HOME/.ar");
      assert.notInclude(skillText, "--project");
      assert.notInclude(skillText, "--locked");
      assert.notInclude(skillText, "直接调用裸命令 `zotero-bridge`");
      assert.include(skillText, "重新运行 gate");
      for (const fragment of forbiddenEnglishFragments) {
        assert.notInclude(skillText, fragment);
      }
    }
  });

  it("renders skill-local quality goals and LLM/runtime boundaries", async function () {
    const createSkill = await fs.readFile(
      path.join("skills_builtin", "create-topic-synthesis-prepare", "SKILL.md"),
      "utf8",
    );
    const coreSkill = await fs.readFile(
      path.join(
        "skills_builtin",
        "topic-synthesis-core-enrichment",
        "SKILL.md",
      ),
      "utf8",
    );
    const finalizeSkill = await fs.readFile(
      path.join("skills_builtin", "topic-synthesis-finalize", "SKILL.md"),
      "utf8",
    );

    assert.include(createSkill, "resolver proposal 要可复现");
    assert.include(createSkill, "per-paper triage");
    assert.notInclude(createSkill, "taxonomy 必须解释研究路线");
    assert.notInclude(createSkill, "coverage verdict 必须解释");

    assert.include(coreSkill, "taxonomy 必须解释研究路线");
    assert.include(coreSkill, "source_paper_refs");
    assert.include(coreSkill, "topic_definition 和 scope_boundary");
    assert.include(coreSkill, "语义边界真源");
    assert.notInclude(coreSkill, "positioning");
    assert.include(coreSkill, "不要让库内样本密集子域反向改写 topic identity");
    assert.include(coreSkill, "不要把大 topic 收缩成 resolved papers");
    assert.include(coreSkill, "Object Detection 是 Computer Vision 的下位任务");
    assert.include(coreSkill, "KG enrichment");
    assert.include(coreSkill, "existing_topic_relation_proposals");
    assert.include(coreSkill, "prospective_topic_relation_proposals");
    assert.include(coreSkill, "topics list --input '{}'");
    assert.include(coreSkill, "target_is_broader_topic_candidate");
    assert.include(coreSkill, "target_is_narrower_topic_candidate");
    assert.include(
      coreSkill,
      "所有关系判断都以当前 synthesis topic 指向 target topic",
    );
    assert.include(coreSkill, "overlap 只用于互不包含的部分交叉范围");
    assert.include(
      coreSkill,
      "不能因为 workset 偏向 DETR 就把当前 topic 改写成 DETR-series",
    );
    assert.notMatch(coreSkill, /(^|[^_])broader_topic_candidate/);
    assert.notInclude(coreSkill, "duplicate check 判断");
    assert.notInclude(coreSkill, "coverage verdict、coverage reason");

    assert.include(finalizeSkill, "coverage verdict 必须解释");
    assert.include(finalizeSkill, "workset 子域偏置");
    assert.include(finalizeSkill, "库内文献集中于 DETR/检测时");
    assert.include(finalizeSkill, "最终 summary_brief");
    assert.notInclude(finalizeSkill, "resolver proposal 设计");
    assert.notInclude(finalizeSkill, "taxonomy、timeline、positioning");
  });

  it("renders Stage 30 hard constraints against scripted paper triage", async function () {
    for (const skillId of [
      "create-topic-synthesis-prepare",
      "update-topic-synthesis-prepare",
    ]) {
      const skillText = await fs.readFile(
        path.join("skills_builtin", skillId, "SKILL.md"),
        "utf8",
      );
      assert.include(skillText, "stage_30_prepare_analysis_context");
      assert.include(skillText, "硬性约束");
      assert.include(skillText, "逐篇阅读 runtime 导出的 paper artifacts");
      assert.include(skillText, "不得编写或运行脚本");
      assert.include(skillText, "relevance、quality、core_digest 和 caveats");
      assert.include(skillText, "Subagent 委派建议");
      assert.include(skillText, "推荐把 paper triage 按 paper_ref 分批委派");
      assert.include(skillText, "委派 prompt 模板");
      assert.include(skillText, "只返回 JSON 数组");
      assert.include(skillText, "subagent 只返回 assessment row 草案");
      assert.include(
        skillText,
        "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      );
      assert.include(skillText, "runtime/payloads/artifacts/");
      assert.notInclude(skillText, "runtime/views/filtered-paper-artifacts/");
    }

    const updateSkill = await fs.readFile(
      path.join("skills_builtin", "update-topic-synthesis-prepare", "SKILL.md"),
      "utf8",
    );
    assert.include(updateSkill, "source_materials.status=complete");
    assert.include(updateSkill, "不表示 triage 完整");
    assert.include(updateSkill, "triage_required_refs");
    assert.include(updateSkill, "saved triage refs 的覆盖缺口");
    assert.include(updateSkill, "不只是 resolver diff 中的 added refs");
    assert.include(updateSkill, "resolve_diff.added_refs");
    assert.include(updateSkill, "没有新增 resolved papers 就取消本次 update");
  });

  it("renders executable Host read commands instead of opaque Host labels", async function () {
    const createSkill = await fs.readFile(
      path.join("skills_builtin", "create-topic-synthesis-prepare", "SKILL.md"),
      "utf8",
    );
    const updateSkill = await fs.readFile(
      path.join("skills_builtin", "update-topic-synthesis-prepare", "SKILL.md"),
      "utf8",
    );

    assert.notInclude(createSkill, "Host 主题列表");
    assert.notInclude(createSkill, "Host 文库索引");
    assert.notInclude(updateSkill, "Host 主题上下文");
    assert.notInclude(updateSkill, "Host 文库索引");
    assert.include(createSkill, "<zotero-bridge> topics list --input '{}'");
    assert.include(
      createSkill,
      '<zotero-bridge> library-index get --input \'{"cursor":0,"limit":200}\'',
    );
    assert.include(updateSkill, "runtime/payloads/update-audit-report.json");
    assert.include(
      updateSkill,
      '<zotero-bridge> library-index get --input \'{"cursor":0,"limit":200}\'',
    );
  });

  it("renders prepare hard-gate cancellation instructions", async function () {
    const createSkill = await fs.readFile(
      path.join("skills_builtin", "create-topic-synthesis-prepare", "SKILL.md"),
      "utf8",
    );
    const updateSkill = await fs.readFile(
      path.join("skills_builtin", "update-topic-synthesis-prepare", "SKILL.md"),
      "utf8",
    );

    assert.include(createSkill, "duplicate_status");
    assert.include(createSkill, "硬门禁失败");
    assert.include(createSkill, "reason: \"duplicate_topic\"");
    assert.include(createSkill, "不进入 Stage 20");
    assert.include(createSkill, "topic_synthesis_canceled");
    assert.include(createSkill, "短路后续 steps");

    assert.include(updateSkill, "Stage 00 已生成 canceled output");
    assert.include(updateSkill, "update_decision.action");
    assert.include(updateSkill, "resolver proposal 删除或改写");
    assert.include(updateSkill, "topic_synthesis_canceled");
    assert.include(updateSkill, "停止后续 steps");
  });

  it("renders schema-valid inline payload examples from stage guidance", async function () {
    for (const skillId of generatedSkillIds) {
      const skillText = await fs.readFile(
        path.join("skills_builtin", skillId, "SKILL.md"),
        "utf8",
      );
      for (const schemaName of expectedStageSchemas[skillId]) {
        const schema = JSON.parse(
          await fs.readFile(
            path.join(
              "skills_builtin",
              skillId,
              "assets",
              "schemas",
              schemaName,
            ),
            "utf8",
          ),
        );
        const example = extractInlineExample(skillText, schemaName);
        const ajv = new Ajv2020({ allErrors: true, strict: false });
        const validate = ajv.compile(schema);
        assert.isTrue(validate(example), ajv.errorsText(validate.errors));
      }
    }
  });

  it("keeps payload schema examples valid and deep enough for gate-facing fields", async function () {
    for (const schemaName of Object.values(expectedStageSchemas).flat()) {
      const schema = JSON.parse(
        await fs.readFile(
          path.join(suiteRoot, "contracts", "payload-schemas", schemaName),
          "utf8",
        ),
      );
      const ajv = new Ajv2020({ allErrors: true, strict: false });
      const validate = ajv.compile(schema);
      for (const example of schema.examples || []) {
        assert.isTrue(
          validate(example),
          `${schemaName}: ${ajv.errorsText(validate.errors)}`,
        );
        if (schemaName === "stage-40-core-synthesis.schema.json") {
          assertStage40ExampleCoversGateFields(example);
        }
        if (
          schemaName ===
          "stage-60-coverage-and-collection-suggestions.schema.json"
        ) {
          assert.notProperty(example, "reliability_summary");
          assert.property(example, "coverage_reason");
          assert.property(example, "external_context_summary");
          assert.property(example, "suggested_collection_directions");
        }
      }
      if (
        schemaName ===
        "stage-60-coverage-and-collection-suggestions.schema.json"
      ) {
        assert.notInclude(schema.required || [], "reliability_summary");
        assert.notProperty(schema.properties || {}, "reliability_summary");
      }
    }
  });

  it("renders Stage 40 inline examples with apply-ready nested fields", async function () {
    const skillText = await fs.readFile(
      path.join(
        "skills_builtin",
        "topic-synthesis-core-enrichment",
        "SKILL.md",
      ),
      "utf8",
    );
    const example = extractInlineExample(
      skillText,
      "stage-40-core-synthesis.schema.json",
    );
    assertStage40ExampleCoversGateFields(example);
  });

  it("does not import suite source from generated scripts", async function () {
    for (const skillId of generatedSkillIds) {
      for (const scriptName of ["gate.py", "topic_synthesis_db.py"]) {
        const scriptText = await fs.readFile(
          path.join("skills_builtin", skillId, "scripts", scriptName),
          "utf8",
        );
        assert.notInclude(scriptText, "skills_src");
        assert.notInclude(scriptText, "topic-synthesis/renderer");
      }
    }
  });

  it("renders runtime cascade commands against the current Host Bridge CLI namespace", async function () {
    for (const skillId of generatedSkillIds) {
      const scriptText = await fs.readFile(
        path.join(
          "skills_builtin",
          skillId,
          "scripts",
          "topic_synthesis_db.py",
        ),
        "utf8",
      );
      assert.include(scriptText, '["resolvers", "resolve"]');
      assert.include(scriptText, '["citation-graph", "get-metrics"]');
      assert.include(scriptText, '["paper-artifacts", "export-filtered"]');
      assert.notInclude(scriptText, '["synthesis", "resolve-resolver"]');
      assert.notInclude(
        scriptText,
        '["synthesis", "get-citation-graph-metrics"]',
      );
      assert.notInclude(
        scriptText,
        '["synthesis", "export-filtered-paper-artifacts"]',
      );
    }
  });

  it("returns a stable gate instruction from a non-package cwd", function () {
    this.timeout(10000);

    for (const skillId of generatedSkillIds) {
      const instruction = runGateFromOtherCwd(skillId);
      assert.equal(instruction.skill_id, skillId);
      assert.equal(instruction.db_path, "runtime/topic-synthesis.sqlite");
      assert.isString(instruction.stage);
      assert.isString(instruction.task);
      assert.property(instruction, "needs_payload");
      if (typeof instruction.command === "string") {
        assert.include(instruction.command, "python");
        assert.notInclude(instruction.command, "uv run");
        assert.notInclude(instruction.command, "$HOME/.ar");
      }
    }
  });

  it("emits schema-valid business cancel output with optional identifiers", async function () {
    this.timeout(10000);

    const output = runGateFromOtherCwd("create-topic-synthesis-prepare", [
      "--action",
      "cancel",
      "--reason",
      "duplicate_topic",
      "--message",
      "Existing topic matches the requested seed.",
      "--topic-seed",
      "DETR",
      "--duplicate-topic-id",
      "detr-style-object-detection",
    ]);
    assert.isTrue(output.__SKILL_DONE__);
    assert.notProperty(output, "skill_id");
    assert.equal(output.reason, "duplicate_topic");
    assert.equal(output.topic_seed, "DETR");
    assert.equal(output.duplicate_topic_id, "detr-style-object-detection");

    const businessOutput = { ...output };
    delete businessOutput.__SKILL_DONE__;
    const schema = JSON.parse(
      await fs.readFile(
        path.join(
          "skills_builtin",
          "create-topic-synthesis-prepare",
          "assets",
          "output.schema.json",
        ),
        "utf8",
      ),
    );
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    assert.isTrue(validate(businessOutput), ajv.errorsText(validate.errors));
  });

  it("emits gate JSON as UTF-8 bytes on Windows-style Python settings", function () {
    const output = runGateRawFromOtherCwd("create-topic-synthesis-prepare");
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(output);
    const instruction = JSON.parse(decoded) as Record<string, unknown>;

    assert.equal(instruction.skill_id, "create-topic-synthesis-prepare");
    assert.include(String(instruction.task), "初始化");
  });
});
