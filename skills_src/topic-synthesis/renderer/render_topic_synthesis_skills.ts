import fs from "fs/promises";
import path from "path";
import { format as formatWithPrettier } from "prettier";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

type StageContract = {
  id: string;
  kind: "command" | "payload";
  task: string;
  schema?: string;
  payload_path?: string;
  required_reads?: string[];
};

type SkillContract = {
  id: string;
  title: string;
  description: string;
  operation: string;
  output_kind: "topic_synthesis_handoff" | "topic_synthesis";
  handoff: string;
  next_skill_id: string;
  required_runtime_inputs: string[];
  stages: StageContract[];
};

type StagesDocument = {
  skills: SkillContract[];
};

type StageGuidance = {
  semantic_goal?: string;
  execution_steps?: string[];
  host_read_commands?: Array<{
    command: string;
    purpose: string;
    notes?: string;
  }>;
  runtime_reads?: Array<{
    path: string;
    produced_by: string;
    purpose: string;
  }>;
  required_read_notes?: string[];
  field_guidance?: Record<string, string>;
  quality_checks?: string[];
  common_pitfalls?: string[];
  example?: unknown;
};

type StageGuidanceDocument = {
  stages: Record<string, StageGuidance>;
};

const THIS_FILE = fileURLToPath(import.meta.url);
const SUITE_ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const REPO_ROOT = path.resolve(SUITE_ROOT, "..", "..");
const GENERATED_NOTICE =
  "<!-- 本文件由 skills_src/topic-synthesis 生成，请勿手工修改。 -->";

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

async function readText(...parts: string[]): Promise<string> {
  return fs.readFile(path.join(...parts), "utf8");
}

async function readJson<T>(...parts: string[]): Promise<T> {
  return JSON.parse(await readText(...parts)) as T;
}

function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.split(`{{ ${key} }}`).join(value);
  }
  return rendered.trimEnd() + "\n";
}

function renderList(values: string[]): string {
  if (values.length === 0) return "- 无。";
  return values.map((value) => `- ${value}`).join("\n");
}

function renderNumberedList(values: string[]): string[] {
  return values.map((value, index) => `${index + 1}. ${value}`);
}

function renderBulletList(values: string[]): string[] {
  return values.map((value) => `- ${value}`);
}

function renderFieldGuidance(values: Record<string, string>): string[] {
  return Object.entries(values).map(
    ([fieldName, guidance]) => `- \`${fieldName}\`：${guidance}`,
  );
}

function skillQualityGoals(skill: SkillContract): string {
  const goals: Record<string, string[]> = {
    "create-topic-synthesis-prepare": [
      "topic intent 必须把 seed 转成稳定 topic identity：标题、别名、定义、纳入/排除范围都要能指导 resolver。",
      "duplicate check 只基于 Host topic list 中现有 topic 的 title、description、aliases 和 id，不能把宽泛相关主题误判为同一主题。",
      "resolver proposal 要可复现、边界清楚；runtime 负责执行 resolver cascade，LLM 不手写 resolver result。",
      "paper triage 必须保持 paper-local，为每篇 resolved paper 给出 relevance、quality、core_digest、caveats 和 diagnostics，不提前写跨文献综合。",
    ],
    "update-topic-synthesis-prepare": [
      "topic context 必须忠实保留 Host 返回的 topic id、definition、hashes、section hashes 和 recommended_update。",
      "update assessment 只判断当前 update scope，说明 full/patch/unknown 的原因和 changed sections。",
      "resolver proposal 仍要服务既有 topic 的边界，不能把 create duplicate check 逻辑套到 update。",
      "update path 当前保持 skeleton 边界：只写本 skill schema 接受的准备 payload，不承诺后续完整 update runtime 已实现。",
    ],
    "topic-synthesis-core-enrichment": [
      "taxonomy 必须解释研究路线、机制、边界、代表论文、成熟度、优势和局限，不是标签表。",
      "timeline_events 必须解释历史递进和里程碑逻辑，不是年份列表。",
      "claims、debates、gaps 和 improvement dimensions 必须是 topic-level synthesis，并用 source_paper_refs 指向当前 evidence index 中的文献。",
      "KG enrichment 只补全当前 core synthesis 产生的概念、候选 topic 关系和 matching terms，不写 sidecars 或 canonical KG。",
    ],
    "topic-synthesis-finalize": [
      "coverage verdict 必须解释当前库内材料的覆盖档位，并区分领域真实空白、库内覆盖不足、artifact 证据不足和评价口径缺口。",
      "reliability summary 必须说明本次 synthesis 的证据边界，不能把文献数量或 citation metrics 机械当作可靠性。",
      "external context summary 和 collection suggestions 只服务覆盖判断和入库建议，不能重写 core synthesis。",
      "final summary 必须基于 runtime 已渲染的 synthesis report，不新增未在 report 中出现的 claim。",
    ],
  };
  return renderBulletList(goals[skill.id] || []).join("\n");
}

function llmRuntimeBoundary(skill: SkillContract): {
  llmTasks: string;
  runtimeTasks: string;
} {
  const tasks: Record<string, { llm: string[]; runtime: string[] }> = {
    "create-topic-synthesis-prepare": {
      llm: [
        "create topic intent 和 duplicate check 判断。",
        "resolver proposal 设计。",
        "per-paper triage：relevance、quality、core_digest、caveats、diagnostics。",
      ],
      runtime: [
        "初始化 SQLite、stage state、action receipts、artifact registry 和 hashes。",
        "执行 resolver cascade：`resolve-resolver`、citation metrics、filtered artifact export。",
        "校验并登记 create topic context、resolver proposal 和 paper triage payload。",
        "生成 cross-paper context、external-literature context、source evidence index 和 prepare handoff。",
      ],
    },
    "update-topic-synthesis-prepare": {
      llm: [
        "读取 Host topic context 后写 update scope 判断。",
        "resolver proposal 设计。",
        "per-paper triage：relevance、quality、core_digest、caveats、diagnostics。",
      ],
      runtime: [
        "初始化或校验 SQLite、stage state、action receipts、artifact registry 和 hashes。",
        "执行 resolver cascade：`resolve-resolver`、citation metrics、filtered artifact export。",
        "校验并登记 update topic context、resolver proposal 和 paper triage payload。",
        "生成 cross-paper context、external-literature context、source evidence index 和 prepare handoff；深度 update diff/patch 语义后续单独完善。",
      ],
    },
    "topic-synthesis-core-enrichment": {
      llm: [
        "core synthesis：taxonomy、timeline、positioning、claims、improvement dimensions、debates、gaps、review_outline。",
        "KG enrichment：concept_details、topic_relation_candidates、topic_matching_terms。",
      ],
      runtime: [
        "校验 prepare handoff、DB、artifact hash 和必需 runtime views。",
        "校验并登记 core synthesis 和 KG enrichment payload。",
        "生成 concept candidate context、KG sidecars、topic-interest metadata 和 core handoff。",
      ],
    },
    "topic-synthesis-finalize": {
      llm: [
        "coverage verdict、coverage reason、reliability summary、coverage caveats。",
        "external context summary 和 collection suggestions。",
        "最终 summary_brief、summary_overview 和 key_takeaways。",
      ],
      runtime: [
        "校验 core handoff、sidecars、finalize context 和 report context。",
        "校验并登记 coverage 和 summary payload。",
        "生成完整 Host apply-ready result sections、synthesis report、topic-analysis manifest 和 final-output candidate。",
      ],
    },
  };
  const selected = tasks[skill.id] || { llm: [], runtime: [] };
  return {
    llmTasks: renderBulletList(selected.llm).join("\n"),
    runtimeTasks: renderBulletList(selected.runtime).join("\n"),
  };
}

function renderStageSequence(stage: StageContract): string[] {
  const lines = ["本 stage 精确执行序列：", ""];
  lines.push(
    '1. 在 ACP run workspace 中运行 gate：`python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`。',
  );
  lines.push(`2. 确认 gate JSON 的 \`stage\` 是 \`${stage.id}\`。`);
  if (stage.kind === "command") {
    lines.push("3. 确认 `needs_payload` 是 `false`。");
    lines.push(
      '4. 复制并执行 gate JSON 的 `command` 字段；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action run`。',
    );
    lines.push("5. command 成功后，立刻重新运行 gate，读取下一条指令。");
    return lines;
  }
  lines.push("3. 确认 `needs_payload` 是 `true`。");
  lines.push(
    "4. 读取 gate JSON 的 `required_reads`、`payload_path`、`payload_schema` 和 `submit_command`。",
  );
  lines.push("5. 按下面的“上下文获取方式”取得材料，只写当前 stage payload。");
  lines.push(
    `6. 手写且只手写 \`${stage.payload_path || "<payload_path>"}\`；不要写 runtime-owned 文件。`,
  );
  lines.push(
    '7. 复制并执行 gate JSON 的 `submit_command`；等价模板是 `python scripts/gate.py --db "runtime/topic-synthesis.sqlite" --action submit --payload "<payload_path>"`。',
  );
  lines.push("8. submit 成功后，立刻重新运行 gate，读取下一条指令。");
  return lines;
}

function renderContextAcquisition(
  stage: StageContract,
  guidance: StageGuidance,
): string[] {
  const lines: string[] = [];
  const hostReads = guidance.host_read_commands || [];
  const runtimeReads = guidance.runtime_reads || [];
  if (hostReads.length === 0 && runtimeReads.length === 0) {
    return lines;
  }
  lines.push("", "上下文获取方式：", "");
  for (const read of hostReads) {
    lines.push(`- Host read：\`${read.command}\`。用途：${read.purpose}`);
    if (read.notes) {
      lines.push(`  说明：${read.notes}`);
    }
  }
  for (const read of runtimeReads) {
    lines.push(
      `- Runtime read：\`${read.path}\`。来源：${read.produced_by}。用途：${read.purpose}`,
    );
  }
  const opaqueReads = (stage.required_reads || []).filter(
    (value) =>
      !value.startsWith("Host ") &&
      !hostReads.some((entry) => entry.command === value),
  );
  for (const read of opaqueReads) {
    const alreadyRendered = runtimeReads.some((entry) => entry.path === read);
    if (!alreadyRendered) {
      lines.push(`- Gate required read：\`${read}\`。按 gate 返回路径读取。`);
    }
  }
  return lines;
}

function operationSchemaForSkill(
  skill: SkillContract,
): Record<string, unknown> {
  if (skill.id === "create-topic-synthesis-prepare") {
    return { const: "create" };
  }
  if (skill.id === "update-topic-synthesis-prepare") {
    return { enum: ["update_full", "update_patch"] };
  }
  return { enum: ["create", "update_full", "update_patch"] };
}

function renderOutputContractBody(skill: SkillContract): string {
  if (skill.output_kind === "topic_synthesis_handoff") {
    return [
      `本技能输出一个用于 \`${skill.handoff}\` 的 \`topic_synthesis_handoff\` JSON 对象。`,
      "",
      "- 返回对象必须符合 `assets/output.schema.json`。",
      "- handoff manifest path 和 hash 用来标识本 skill 的持久化输出。",
      "- 大段正文、业务状态和 hashes 仍以 SQLite 与文件为真源。",
    ].join("\n");
  }
  return [
    "本技能输出一个 `topic_synthesis` JSON 对象，或一个 `topic_synthesis_canceled` JSON 对象。",
    "",
    "- 返回对象必须符合 `assets/output.schema.json`。",
    "- 成功输出包含 operation、language、artifact metadata 和 analysis manifest path。",
    "- 运行器负责把通过校验的结果接受为 `result/result.json`。",
  ].join("\n");
}

async function readStageGuidance(): Promise<Record<string, StageGuidance>> {
  const document = parseYaml(
    await readText(SUITE_ROOT, "contracts", "stage-guidance.yaml"),
  ) as StageGuidanceDocument;
  return document.stages || {};
}

async function renderStage(
  stage: StageContract,
  guidance: StageGuidance = {},
): Promise<string> {
  const lines = [
    `### ${stage.id}`,
    "",
    `- stage 类型：${stage.kind}`,
    `- 任务：${stage.task}`,
  ];
  if (guidance.semantic_goal) {
    lines.push(`- 语义目标：${guidance.semantic_goal}`);
  }
  lines.push("");
  lines.push(...renderStageSequence(stage));
  if (guidance.execution_steps?.length) {
    lines.push("");
    lines.push("语义处理步骤：");
    lines.push("");
    lines.push(...renderNumberedList(guidance.execution_steps));
  }
  lines.push(...renderContextAcquisition(stage, guidance));
  if (guidance.required_read_notes?.length) {
    lines.push("");
    lines.push("材料使用说明：");
    lines.push("");
    lines.push(...renderBulletList(guidance.required_read_notes));
  }
  if (stage.kind === "payload") {
    if (!stage.schema || !stage.payload_path) {
      throw new Error(
        `payload stage is missing schema or payload path: ${stage.id}`,
      );
    }
    lines.push(`- payload 路径：${stage.payload_path}`);
    lines.push(`- schema 文件：assets/schemas/${stage.schema}`);
    if (guidance.field_guidance) {
      lines.push("");
      lines.push("字段说明：");
      lines.push("");
      lines.push(...renderFieldGuidance(guidance.field_guidance));
    }
  }
  if (guidance.quality_checks?.length) {
    lines.push("");
    lines.push("质量检查：");
    lines.push("");
    lines.push(...renderBulletList(guidance.quality_checks));
  }
  if (guidance.common_pitfalls?.length) {
    lines.push("");
    lines.push("常见错误：");
    lines.push("");
    lines.push(...renderBulletList(guidance.common_pitfalls));
  }
  if (stage.kind === "payload") {
    const schemaName = stage.schema;
    if (!schemaName) {
      throw new Error(`payload stage is missing schema: ${stage.id}`);
    }
    const schema = await readJson<Record<string, unknown>>(
      SUITE_ROOT,
      "contracts",
      "payload-schemas",
      schemaName,
    );
    const example =
      guidance.example ??
      (Array.isArray(schema.examples) ? schema.examples[0] : {});
    lines.push("");
    lines.push("Payload JSON 示例：");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(example, null, 2));
    lines.push("```");
  }
  return lines.join("\n");
}

async function renderSkillMd(skill: SkillContract): Promise<string> {
  const fragmentsRoot = path.join(SUITE_ROOT, "templates", "fragments");
  const frontmatterTemplate = await readText(
    fragmentsRoot,
    "frontmatter.md.j2",
  );
  const scopeTemplate = await readText(fragmentsRoot, "scope.md.j2");
  const template = await readText(
    SUITE_ROOT,
    "templates",
    skill.id,
    "SKILL.md.j2",
  );
  const stageGuidance = await readStageGuidance();
  const boundary = llmRuntimeBoundary(skill);
  const stageSections = await Promise.all(
    skill.stages.map((stage) => renderStage(stage, stageGuidance[stage.id])),
  );

  const markdown = renderTemplate(template, {
    frontmatter: renderTemplate(frontmatterTemplate, {
      skill_id: skill.id,
      description: skill.description,
    }).trim(),
    generated_notice: GENERATED_NOTICE,
    title: skill.title,
    scope: renderTemplate(scopeTemplate, {
      description: skill.description,
    }).trim(),
    product_goals: renderTemplate(
      await readText(fragmentsRoot, "product-goals.md.j2"),
      { skill_quality_goals: skillQualityGoals(skill) },
    ).trim(),
    required_inputs: renderList(skill.required_runtime_inputs),
    execution_contract: (
      await readText(fragmentsRoot, "execution-contract.md.j2")
    ).trim(),
    zotero_bridge_cli: (
      await readText(fragmentsRoot, "zotero-bridge-cli.md.j2")
    ).trim(),
    runtime_state: (
      await readText(fragmentsRoot, "runtime-state.md.j2")
    ).trim(),
    llm_runtime_boundary: renderTemplate(
      await readText(fragmentsRoot, "llm-runtime-boundary.md.j2"),
      {
        llm_tasks: boundary.llmTasks,
        runtime_tasks: boundary.runtimeTasks,
      },
    ).trim(),
    stage_loop: (await readText(fragmentsRoot, "stage-loop.md.j2")).trim(),
    strict_stage_order: (
      await readText(fragmentsRoot, "strict-stage-order.md.j2")
    ).trim(),
    stages: stageSections.join("\n\n"),
    output_contract: renderTemplate(
      await readText(fragmentsRoot, "output-contract.md.j2"),
      {
        output_contract_body: renderOutputContractBody(skill),
      },
    ).trim(),
    failure_rules: (
      await readText(fragmentsRoot, "failure-rules.md.j2")
    ).trim(),
  });
  return formatWithPrettier(markdown, { parser: "markdown" });
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(
    filePath,
    await formatWithPrettier(JSON.stringify(value), { parser: "json" }),
    "utf8",
  );
}

async function copyFileWithHeader(
  source: string,
  target: string,
): Promise<void> {
  const content = await fs.readFile(source, "utf8");
  await fs.writeFile(target, content, "utf8");
}

function stageSchemaNames(skill: SkillContract): string[] {
  return skill.stages
    .map((stage) => stage.schema)
    .filter((schema): schema is string => Boolean(schema))
    .sort();
}

function runnerJson(skill: SkillContract): Record<string, unknown> {
  return {
    id: skill.id,
    name: skill.title,
    description: skill.description,
    version: "0.1.0",
    execution_modes: ["interactive"],
    max_attempt: 12,
    schemas: {
      input: "assets/input.schema.json",
      parameter: "assets/parameter.schema.json",
      output: "assets/output.schema.json",
    },
    entrypoint: {
      prompts: {
        common:
          "执行生成的 topic synthesis split skill。必须先阅读 SKILL.md，并按 scripts/gate.py 返回的 gate JSON 执行。最终回复使用 ACP final branch：包含 `__SKILL_DONE__: true`，并附加一个符合 assets/output.schema.json 的业务 JSON 对象；output schema 本身不包含 `__SKILL_DONE__`。",
      },
    },
  };
}

function inputSchemaForSkill(skill: SkillContract): Record<string, unknown> {
  const needsHandoff =
    skill.id !== "create-topic-synthesis-prepare" &&
    skill.id !== "update-topic-synthesis-prepare";
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: `${skill.title} Input`,
    type: "object",
    additionalProperties: false,
    ...(needsHandoff
      ? {
          required: ["handoff"],
          properties: {
            handoff: {
              type: "object",
              "x-input-source": "inline",
              additionalProperties: true,
            },
          },
        }
      : { properties: {} }),
  };
}

function parameterSchemaForSkill(
  skill: SkillContract,
): Record<string, unknown> {
  const sharedProperties: Record<string, unknown> = {
    topicSeed: { type: "string", minLength: 1 },
    topicId: { type: "string", minLength: 1 },
    language: { type: "string", minLength: 1 },
  };
  if (skill.id === "create-topic-synthesis-prepare") {
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: `${skill.title} Parameter`,
      type: "object",
      additionalProperties: false,
      properties: {
        topicSeed: sharedProperties.topicSeed,
        language: sharedProperties.language,
      },
      required: ["topicSeed"],
    };
  }
  if (skill.id === "update-topic-synthesis-prepare") {
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: `${skill.title} Parameter`,
      type: "object",
      additionalProperties: false,
      properties: {
        topicId: sharedProperties.topicId,
      },
      required: ["topicId"],
    };
  }
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: `${skill.title} Parameter`,
    type: "object",
    additionalProperties: false,
    properties: sharedProperties,
    required: [],
  };
}

function handoffOutputSchema(skill: SkillContract): Record<string, unknown> {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: `${skill.title} Result`,
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "handoff",
      "operation",
      "db_path",
      "handoff_manifest_path",
      "handoff_manifest_hash",
      "next_skill_id",
      "diagnostics",
    ],
    properties: {
      kind: { const: "topic_synthesis_handoff" },
      handoff: { const: skill.handoff },
      operation: operationSchemaForSkill(skill),
      db_path: { const: "runtime/topic-synthesis.sqlite" },
      handoff_manifest_path: { type: "string", minLength: 1 },
      handoff_manifest_hash: { type: "string", pattern: "^sha256:.+" },
      next_skill_id: skill.next_skill_id
        ? { const: skill.next_skill_id }
        : { type: "string" },
      diagnostics: { type: "array", items: { type: "object" } },
    },
  };
}

function finalOutputSchema(skill: SkillContract): Record<string, unknown> {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: `${skill.title} Result`,
    type: "object",
    additionalProperties: true,
    not: {
      anyOf: [{ required: ["markdown"] }, { required: ["markdown_path"] }],
    },
    oneOf: [
      {
        title: "Completed create topic synthesis",
        type: "object",
        additionalProperties: false,
        not: { required: ["base_hashes"] },
        required: [
          "kind",
          "operation",
          "language",
          "topic_definition",
          "resolver_manifest_path",
          "resolver_diagnostics",
          "artifact_metadata",
          "analysis_manifest_path",
        ],
        properties: {
          kind: { const: "topic_synthesis" },
          operation: { const: "create" },
          language: { type: "string", minLength: 1 },
          topic_definition: {
            type: "object",
            required: ["id", "title"],
            properties: {
              id: { type: "string", minLength: 1 },
              title: { type: "string", minLength: 1 },
            },
          },
          resolver_manifest_path: { type: "string", minLength: 1 },
          resolver_diagnostics: { type: "object" },
          artifact_metadata: { type: "object" },
          analysis_manifest_path: { type: "string", minLength: 1 },
          candidate_output_path: {
            const: "result/final-output.candidate.json",
          },
          diagnostics: { type: "array", items: { type: "object" } },
        },
      },
      {
        title: "Full update topic synthesis",
        type: "object",
        additionalProperties: false,
        required: [
          "kind",
          "operation",
          "language",
          "base_hashes",
          "topic_definition",
          "resolver_manifest_path",
          "resolver_diagnostics",
          "artifact_metadata",
          "analysis_manifest_path",
        ],
        properties: {
          kind: { const: "topic_synthesis" },
          operation: { const: "update_full" },
          language: { type: "string", minLength: 1 },
          base_hashes: { type: "object" },
          topic_definition: {
            type: "object",
            required: ["id", "title"],
            properties: {
              id: { type: "string", minLength: 1 },
              title: { type: "string", minLength: 1 },
            },
          },
          resolver_manifest_path: { type: "string", minLength: 1 },
          resolver_diagnostics: { type: "object" },
          artifact_metadata: { type: "object" },
          analysis_manifest_path: { type: "string", minLength: 1 },
          candidate_output_path: {
            const: "result/final-output.candidate.json",
          },
          diagnostics: { type: "array", items: { type: "object" } },
        },
      },
      {
        title: "Patch update topic synthesis",
        type: "object",
        additionalProperties: false,
        required: [
          "kind",
          "operation",
          "language",
          "read_section_hashes",
          "artifact_metadata",
          "analysis_manifest_path",
        ],
        properties: {
          kind: { const: "topic_synthesis" },
          operation: { const: "update_patch" },
          language: { type: "string", minLength: 1 },
          read_section_hashes: { type: "object" },
          topic_definition: {
            type: "object",
            required: ["id", "title"],
            properties: {
              id: { type: "string", minLength: 1 },
              title: { type: "string", minLength: 1 },
            },
          },
          resolver_manifest_path: { type: "string", minLength: 1 },
          resolver_diagnostics: { type: "object" },
          artifact_metadata: { type: "object" },
          analysis_manifest_path: { type: "string", minLength: 1 },
          candidate_output_path: {
            const: "result/final-output.candidate.json",
          },
          diagnostics: { type: "array", items: { type: "object" } },
        },
      },
      {
        title: "Canceled topic synthesis",
        type: "object",
        additionalProperties: false,
        required: ["kind", "status", "reason", "message"],
        properties: {
          kind: { const: "topic_synthesis_canceled" },
          status: { const: "canceled" },
          reason: { type: "string", minLength: 1 },
          message: { type: "string", minLength: 1 },
          duplicate_topic_id: { type: "string" },
          topic_seed: { type: "string" },
          topic_id: { type: "string" },
        },
      },
    ],
  };
}

function outputSchemaForSkill(skill: SkillContract): Record<string, unknown> {
  return skill.output_kind === "topic_synthesis_handoff"
    ? handoffOutputSchema(skill)
    : finalOutputSchema(skill);
}

async function renderSkillPackage(
  skill: SkillContract,
  outRoot: string,
): Promise<void> {
  const targetRoot = path.join(outRoot, skill.id);
  await fs.rm(targetRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(targetRoot, "scripts"), { recursive: true });
  await fs.mkdir(path.join(targetRoot, "assets", "schemas"), {
    recursive: true,
  });

  await fs.writeFile(
    path.join(targetRoot, "SKILL.md"),
    await renderSkillMd(skill),
    "utf8",
  );
  await copyFileWithHeader(
    path.join(
      SUITE_ROOT,
      "runtime",
      "topic_synthesis_runtime",
      "common",
      "gate.py",
    ),
    path.join(targetRoot, "scripts", "gate.py"),
  );
  await copyFileWithHeader(
    path.join(
      SUITE_ROOT,
      "runtime",
      "topic_synthesis_runtime",
      "common",
      "topic_synthesis_db.py",
    ),
    path.join(targetRoot, "scripts", "topic_synthesis_db.py"),
  );

  await writeJson(
    path.join(targetRoot, "assets", "output.schema.json"),
    outputSchemaForSkill(skill),
  );
  await writeJson(
    path.join(targetRoot, "assets", "input.schema.json"),
    inputSchemaForSkill(skill),
  );
  await writeJson(
    path.join(targetRoot, "assets", "parameter.schema.json"),
    parameterSchemaForSkill(skill),
  );
  await fs.copyFile(
    path.join(SUITE_ROOT, "contracts", "handoff.schema.json"),
    path.join(targetRoot, "assets", "schemas", "handoff.schema.json"),
  );
  for (const schemaName of stageSchemaNames(skill)) {
    await fs.copyFile(
      path.join(SUITE_ROOT, "contracts", "payload-schemas", schemaName),
      path.join(targetRoot, "assets", "schemas", schemaName),
    );
  }
  await writeJson(
    path.join(targetRoot, "assets", "runner.json"),
    runnerJson(skill),
  );
}

export async function renderTopicSynthesisSkills(
  outRoot = path.join(REPO_ROOT, "skills_builtin"),
): Promise<string[]> {
  const stagesRaw = await readText(SUITE_ROOT, "contracts", "stages.yaml");
  const stagesDocument = parseYaml(stagesRaw) as StagesDocument;
  const skills = [...stagesDocument.skills].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const skill of skills) {
    await renderSkillPackage(skill, outRoot);
  }
  return skills.map((skill) => toPosixPath(path.join(outRoot, skill.id)));
}

function parseOutRoot(argv: string[]): string {
  const outIndex = argv.indexOf("--out");
  if (outIndex >= 0) {
    const value = argv[outIndex + 1];
    if (!value) throw new Error("--out requires a directory");
    return path.resolve(value);
  }
  return path.join(REPO_ROOT, "skills_builtin");
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  const outRoot = parseOutRoot(process.argv.slice(2));
  renderTopicSynthesisSkills(outRoot)
    .then((packages) => {
      for (const packagePath of packages) {
        console.log(packagePath);
      }
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
