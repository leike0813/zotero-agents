import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import {
  compileSkillJsonSchema,
  validateAcpSkillRunRequestAgainstSchemas,
  validateRunnerManifestShape,
  validateSkillSchemaAnnotations,
} from "../../src/modules/acp/skillRun/acpSkillSchemaAssets";
import { renderTopicSynthesisSkills } from "../../skills_src/topic-synthesis/renderer/render_topic_synthesis_skills";

const suiteRoot = path.join("skills_src", "topic-synthesis");
const generatedSkillIds = [
  "create-topic-synthesis-prepare",
  "update-topic-synthesis-prepare",
  "topic-synthesis-core-enrichment",
  "topic-synthesis-finalize",
];

const expectedHardTimeoutSeconds: Record<string, number> = {
  "create-topic-synthesis-prepare": 3600,
  "update-topic-synthesis-prepare": 3600,
  "topic-synthesis-core-enrichment": 1800,
  "topic-synthesis-finalize": 1800,
};

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

const taxonomyAxisTypes = [
  "problem_formulation",
  "technical_mechanism",
  "evidence_scope",
  "research_route",
  "application_context",
];

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
  assert.notProperty(example.taxonomy, "nodes");
  assert.isArray(example.taxonomy?.axes);
  assert.isAtLeast(example.taxonomy.axes.length, 2);
  assert.isAtMost(example.taxonomy.axes.length, 5);
  for (const axis of example.taxonomy.axes) {
    assert.include(taxonomyAxisTypes, axis.axis_type);
    assert.isArray(axis.nodes);
    assert.isNotEmpty(axis.nodes);
    for (const route of axis.nodes) {
      assert.isObject(route);
      for (const key of [
        "definition",
        "core_problem",
        "mechanism",
        "maturity",
      ]) {
        assert.isString(route[key], `taxonomy route should include ${key}`);
        assert.isNotEmpty(
          route[key],
          `taxonomy route ${key} should not be empty`,
        );
      }
      assert.isArray(route.strengths);
      assert.isNotEmpty(route.strengths);
      assert.isArray(route.limitations);
      assert.isNotEmpty(route.limitations);
      assert.isArray(route.source_paper_refs);
      assert.isNotEmpty(route.source_paper_refs);
    }
  }

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

function collectStringTitlePaths(value: unknown, pathParts: string[] = []) {
  const paths: string[] = [];
  if (!value || typeof value !== "object") {
    return paths;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      paths.push(
        ...collectStringTitlePaths(item, [...pathParts, String(index)]),
      );
    });
    return paths;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    if (key === "title" && typeof child === "string") {
      paths.push(childPath.join("."));
    }
    paths.push(...collectStringTitlePaths(child, childPath));
  }
  return paths;
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

function normalizePathForAssert(value: unknown) {
  return String(value || "").replace(/\\/g, "/");
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
      assert.deepEqual(runnerJson.execution_modes, ["auto"]);
      assert.equal(runnerJson.max_attempt, 12);
      assert.equal(
        runnerJson.runtime?.default_options?.hard_timeout_seconds,
        expectedHardTimeoutSeconds[skillId],
      );
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

  it("renders package-local schemas that satisfy Skill Runner meta-schemas", async function () {
    for (const skillId of generatedSkillIds) {
      for (const schemaKey of ["input", "parameter", "output"] as const) {
        const schema = JSON.parse(
          await fs.readFile(
            path.join(
              "skills_builtin",
              skillId,
              "assets",
              `${schemaKey}.schema.json`,
            ),
            "utf8",
          ),
        ) as Record<string, unknown>;
        assert.deepEqual(
          [
            ...compileSkillJsonSchema({ schema, schemaKey }),
            ...validateSkillSchemaAnnotations({ schema, schemaKey }),
          ],
          [],
          `${skillId} ${schemaKey} schema must satisfy Skill Runner meta-schema`,
        );
      }
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
        assert.include(serialized, "artifact_manifest_path");
        assert.include(serialized, "artifact-manifest");
        assert.notInclude(serialized, "analysis_manifest_path");
        assert.isFalse(
          validate({
            __SKILL_DONE__: true,
            kind: "topic_synthesis",
            operation: "create",
            language: "zh-CN",
            topic_definition: { id: "detr", title: "DETR" },
            artifact_manifest_path:
              "D:/workspace/result/topic-synthesis-artifacts.json",
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
            db_path: "D:/workspace/runtime/topic-synthesis.sqlite",
            handoff_manifest_path:
              "D:/workspace/runtime/handoff/prepare-analysis-context.json",
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

  it("keeps package-local output schemas free of schema title annotations", async function () {
    for (const skillId of generatedSkillIds) {
      const schema = JSON.parse(
        await fs.readFile(
          path.join("skills_builtin", skillId, "assets", "output.schema.json"),
          "utf8",
        ),
      ) as Record<string, any>;
      assert.deepEqual(
        collectStringTitlePaths(schema),
        [],
        `${skillId} output schema should not spend output-token context on schema title annotations`,
      );
      if (skillId === "topic-synthesis-finalize") {
        assert.property(
          schema.oneOf?.[0]?.properties?.topic_definition?.properties,
          "title",
          "business topic title field must remain part of the final output contract",
        );
      }
    }
  });

  it("renders target-resolution and cancellation schemas", async function () {
    const createContextSchema = JSON.parse(
      await fs.readFile(
        path.join(
          "skills_builtin",
          "create-topic-synthesis-prepare",
          "assets/schemas/stage-10-create-topic-context.schema.json",
        ),
        "utf8",
      ),
    );
    assert.sameMembers(
      createContextSchema.properties.target_decision.properties.action.enum,
      ["create_new", "use_planned_topic", "cancel_materialized_duplicate"],
    );

    const outputSchema = JSON.parse(
      await fs.readFile(
        path.join(
          "skills_builtin",
          "create-topic-synthesis-prepare",
          "assets/output.schema.json",
        ),
        "utf8",
      ),
    );
    const canceled = outputSchema.oneOf.find(
      (branch: any) =>
        branch.properties?.kind?.const === "topic_synthesis_canceled",
    );
    assert.property(canceled.properties, "retryable");
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
      assert.include(scriptText, '["synthesis", "resolver", "resolve"]');
      assert.include(scriptText, '["synthesis", "graph", "get-metrics"]');
      assert.include(
        scriptText,
        '["synthesis", "artifact", "export-filtered"]',
      );
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
      const dbPath = normalizePathForAssert(instruction.db_path);
      assert.match(dbPath, /\/runtime\/topic-synthesis\.sqlite$/);
      assert.isTrue(
        path.isAbsolute(String(instruction.db_path || "")),
        "gate instruction db_path should be absolute",
      );
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
