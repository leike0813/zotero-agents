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
    "stage-20-resolver-and-workset.schema.json",
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

function runGateFromOtherCwd(skillId: string) {
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
  const args = [scriptPath, "--db", "runtime/topic-synthesis.sqlite"];
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
            resolver_diagnostics: {},
            artifact_metadata: {},
            analysis_manifest_path: "result/topic-analysis.json",
          }),
          `${skillId} output schema must reject ACP control fields`,
        );
      } else {
        assert.include(serialized, "topic_synthesis_handoff");
        assert.include(serialized, "handoff_manifest_path");
        assert.notInclude(serialized, "topic_synthesis_canceled");
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
            handoff_manifest_hash: "sha256:abc",
            next_skill_id: "topic-synthesis-core-enrichment",
            diagnostics: [],
          }),
          `${skillId} output schema must reject ACP control fields`,
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
    assert.include(coreSkill, "KG enrichment");
    assert.notInclude(coreSkill, "duplicate check 判断");
    assert.notInclude(coreSkill, "coverage verdict、coverage reason");

    assert.include(finalizeSkill, "coverage verdict 必须解释");
    assert.include(finalizeSkill, "最终 summary_brief");
    assert.notInclude(finalizeSkill, "resolver proposal 设计");
    assert.notInclude(finalizeSkill, "taxonomy、timeline、positioning");
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
    assert.include(
      createSkill,
      "<zotero-bridge> synthesis list-topics --input '{}'",
    );
    assert.include(
      createSkill,
      '<zotero-bridge> synthesis get-library-index --input \'{"cursor":0,"limit":200}\'',
    );
    assert.include(
      updateSkill,
      '<zotero-bridge> synthesis get-topic-context --input \'{"topicId":"<topic_id>"}\'',
    );
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

  it("returns a stable gate instruction from a non-package cwd", function () {
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

  it("emits gate JSON as UTF-8 bytes on Windows-style Python settings", function () {
    const output = runGateRawFromOtherCwd("create-topic-synthesis-prepare");
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(output);
    const instruction = JSON.parse(decoded) as Record<string, unknown>;

    assert.equal(instruction.skill_id, "create-topic-synthesis-prepare");
    assert.include(String(instruction.task), "初始化");
  });
});
