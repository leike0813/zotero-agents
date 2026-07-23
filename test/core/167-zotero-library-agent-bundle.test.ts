import { assert } from "chai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";

const GENERIC_ROOT = join(process.cwd(), "skills_src/zotero-library-agent");
const SOURCE_ROOT = join(GENERIC_ROOT, "skills/zotero-library-agent");

const TASKS = [
  "zotero-library-query",
  "zotero-literature-acquisition",
  "zotero-literature-analysis",
  "zotero-research-synthesis",
  "zotero-library-curation",
] as const;

const PLAYBOOK_SECTIONS: Record<(typeof TASKS)[number], string[]> = {
  "zotero-library-query": [
    "Context and identity",
    "Library discovery and paging",
    "Notes, attachments, and readiness",
    "Synthesis and answer evidence",
    "Recovery and near misses",
  ],
  "zotero-literature-acquisition": [
    "Search boundary and candidates",
    "Duplicate and identity checks",
    "Acquisition and readiness",
    "Workflow and write authority",
    "Recovery and near misses",
  ],
  "zotero-literature-analysis": [
    "Source availability and evidence levels",
    "Analysis procedure",
    "Workflow-produced analysis",
    "Deliverables and completion evidence",
    "Recovery and near misses",
  ],
  "zotero-research-synthesis": [
    "Synthesis model selection",
    "Source and freshness discipline",
    "Workflow and maintenance boundaries",
    "Ordered synthesis lifecycle",
    "Recovery and near misses",
  ],
  "zotero-library-curation": [
    "Change classification and proposal",
    "Mutation and file workflows",
    "Products and durable artifacts",
    "Verification and partial outcomes",
    "Recovery and near misses",
  ],
};

function read(relative: string) {
  return readFileSync(join(SOURCE_ROOT, relative), "utf8");
}

function referencesLinkedFrom(skill: string) {
  return Array.from(
    new Set(
      Array.from(
        skill.matchAll(/\]\((references\/[^)#]+\.md)\)/g),
        (match) => match[1],
      ),
    ),
  );
}

describe("zotero library agent source suite", function () {
  it("defines one coordinator and five independently executable research tasks", function () {
    const coordinator = read("SKILL.md");
    assert.include(coordinator, "# Zotero Library Agent");
    assert.include(coordinator, "## Routing");
    assert.deepEqual(referencesLinkedFrom(coordinator), [
      "references/research-task-model.md",
    ]);

    for (const task of TASKS) {
      const skillPath = `skills/${task}/SKILL.md`;
      const playbook = `skills/${task}/references/playbook.md`;
      const skill = readFileSync(join(GENERIC_ROOT, skillPath), "utf8");
      assert.match(skill, new RegExp(`name: ${task}`));
      assert.match(skill, /description: .+Use when /);
      assert.isAtMost(
        skill.match(/^description: (.+)$/m)?.[1].length || Infinity,
        240,
      );
      for (const heading of [
        "Goal",
        "Inputs",
        "Workflow",
        "Hard constraints",
        "LLM And Tool Responsibilities",
        "Completion",
        "Failure handling",
        "References",
      ]) {
        assert.include(skill, `## ${heading}`, `${task} lacks ${heading}`);
      }
      assert.deepEqual(referencesLinkedFrom(skill), ["references/playbook.md"]);
      assert.include(skill, "zotero-library-task.result.v1");
      assert.include(skill, "`schema`");
      assert.include(skill, "`status`");
      assert.include(skill, "`summary`");
      assert.include(skill, "`completed`");
      assert.include(skill, "`canceled`");
      assert.include(skill, "`failed`");
      assert.include(skill, "Do not invent handles");
      const playbookContent = readFileSync(
        join(GENERIC_ROOT, playbook),
        "utf8",
      );
      for (const section of PLAYBOOK_SECTIONS[task]) {
        assert.include(playbookContent, `## ${section}`, `${task}: ${section}`);
      }
    }
  });

  it("keeps complete cross-task and workflow policy in the coordinator reference", function () {
    const model = read("references/research-task-model.md");
    for (const section of [
      "Routing decisions",
      "Task composition",
      "Workflow execution ownership",
      "Agent-owned handoff",
      "Evidence, files, and Products",
      "Multi-stage research lifecycle",
      "Recovery and near misses",
    ]) {
      assert.include(model, `## ${section}`, section);
    }
  });

  it("uses one task result contract with inline evidence", function () {
    const schema = JSON.parse(
      readFileSync(join(GENERIC_ROOT, "shared/output.schema.json"), "utf8"),
    );
    assert.strictEqual(schema.$id, "zotero-library-task.result.v1");
    assert.deepEqual(schema.required, ["schema", "status", "summary"]);
    assert.deepEqual(schema.properties.status.enum, [
      "completed",
      "canceled",
      "failed",
    ]);
    assert.property(schema.properties, "evidence");
    assert.property(schema.properties, "artifacts");
    assert.property(schema.properties, "diagnostics");
    assert.notProperty(schema.properties, "evidence_file");
    assert.doesNotThrow(() =>
      new Ajv({ allErrors: true, strict: false }).compile(schema),
    );
  });

  it("uses the shared runner template and does not retain evidence-helper sources", function () {
    const runner = JSON.parse(read("runner.json"));
    const template = JSON.parse(
      readFileSync(
        join(GENERIC_ROOT, "shared/task-runner.template.json"),
        "utf8",
      ),
    );
    assert.strictEqual(runner.id, "zotero-library-agent");
    assert.strictEqual(runner.schemas.output, "assets/output.schema.json");
    assert.strictEqual(
      template.schema,
      "zotero-library-task.runner-template.v1",
    );
    assert.strictEqual(template.schemas.output, "assets/output.schema.json");
    assert.notInclude(read("SKILL.md"), "evidence_file");
  });

  it("makes the coordinator independently executable with an explicit tool boundary", function () {
    const skill = read("SKILL.md");
    assert.include(skill, "## LLM And Tool Responsibilities");
    assert.include(skill, "zotero-library-task.result.v1");
    for (const token of [
      "`schema`",
      "`status`",
      "`summary`",
      "`completed`",
      "`canceled`",
      "`failed`",
      "Do not invent handles",
    ]) {
      assert.include(skill, token);
    }
    assert.include(skill, "materially change the candidate set or conclusion");
    assert.include(skill, "current user decision");
  });
});
