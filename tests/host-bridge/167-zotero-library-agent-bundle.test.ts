import { assert } from "chai";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { validateAcpSkillFinalPayload } from "../../src/modules/acp/skillRun/acpSkillOutputValidator";

const GENERIC_ROOT = join(process.cwd(), "skills_src/zotero-library-agent");
const SOURCE_ROOT = join(GENERIC_ROOT, "skills/zotero-library-agent");

const TASKS = [
  "zotero-library-query",
  "zotero-literature-acquisition",
  "zotero-literature-analysis",
  "zotero-research-synthesis",
  "zotero-library-curation",
] as const;

const GENERIC_SKILLS = ["zotero-library-agent", ...TASKS] as const;

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

const PLAYBOOK_DEEP_SECTIONS: Record<(typeof TASKS)[number], string[]> = {
  "zotero-library-query": [
    "Query decision matrix",
    "Evidence delivery contracts",
    "Escalation and handoff",
  ],
  "zotero-literature-acquisition": [
    "Search-plan templates",
    "Candidate decision records",
    "Batch and partial-outcome matrix",
  ],
  "zotero-literature-analysis": [
    "Analytical deliverable patterns",
    "Comparison and contradiction handling",
    "Evidence-gap matrix",
  ],
  "zotero-research-synthesis": [
    "Derived-model decision records",
    "Maintenance preconditions and receipts",
    "Export evidence matrix",
  ],
  "zotero-library-curation": [
    "Batch proposal records",
    "Destructive-change review",
    "Residual-delta recovery",
  ],
};

const TASK_WORKFLOW_STAGES: Record<(typeof TASKS)[number], string[]> = {
  "zotero-library-query": [
    "Classify and resolve scope",
    "Collect live evidence",
    "State the bounded answer",
  ],
  "zotero-literature-acquisition": [
    "Establish candidate boundary",
    "Resolve live identity and duplicates",
    "Propose, authorize, and verify",
  ],
  "zotero-literature-analysis": [
    "Establish source basis",
    "Analyze with locators",
    "Validate workflow deliverables",
  ],
  "zotero-research-synthesis": [
    "Establish source and model boundary",
    "Separate read, workflow, and maintenance",
    "Verify each requested output",
  ],
  "zotero-library-curation": [
    "Resolve target and proposal",
    "Choose and authorize the write",
    "Verify and recover outcomes",
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

function section(markdown: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(
      `^## ${escaped}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`,
      "m",
    ).exec(markdown)?.[1] || ""
  );
}

function assertReferenceIsOnDemand(
  skill: string,
  reference: string,
  label: string,
) {
  assert.notInclude(section(skill, "Workflow"), reference, label);
  const references = section(skill, "References");
  assert.include(references, reference, label);
  const escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    references,
    new RegExp(
      `(?:read|use|load|consult)[\\s\\S]{0,180}${escaped}[\\s\\S]{0,180}\\bwhen\\b`,
      "i",
    ),
    label,
  );
  assert.notMatch(
    references,
    /(?:read|use|load|consult)[\s\S]{0,120}\b(?:before|first|at the start)\b/i,
    label,
  );
}

function builtinWorkflowManifests(
  root = join(process.cwd(), "workflows_builtin"),
) {
  const manifests: Array<Record<string, unknown>> = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = join(root, entry.name);
    if (entry.isDirectory()) {
      manifests.push(...builtinWorkflowManifests(target));
    } else if (entry.name === "workflow.json") {
      const manifest = JSON.parse(readFileSync(target, "utf8"));
      if (manifest.debug_only !== true) manifests.push(manifest);
    }
  }
  return manifests.sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  );
}

function catalogEntry(catalog: string, workflowId: string) {
  const escaped = workflowId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^### \`${escaped}\`\\s*$([\\s\\S]*?)(?=^### \`|(?![\\s\\S]))`,
    "m",
  ).exec(catalog)?.[1];
}

describe("zotero library agent source suite", function () {
  it("renders every official non-debug built-in workflow into one optional catalog", function () {
    const catalog = readFileSync(
      join(
        process.cwd(),
        "addon/content/host-bridge-skills/zotero-library-agent/references/workflow-catalog.md",
      ),
      "utf8",
    );
    const workflows = builtinWorkflowManifests();
    assert.lengthOf(workflows, 20);
    for (const workflow of workflows) {
      const workflowId = String(workflow.id);
      const entry = catalogEntry(catalog, workflowId);
      assert.isDefined(entry, `catalog omits ${workflowId}`);
      assert.include(entry || "", String(workflow.label), workflowId);
      assert.include(entry || "", String(workflow.description), workflowId);
      assert.include(entry || "", "Provider requirements", workflowId);
      assert.include(entry || "", "Selection", workflowId);
      assert.include(entry || "", "Result evidence", workflowId);
    }
    assert.include(catalog, "workflow list");
    assert.include(catalog, "workflow describe");
    assert.include(catalog, "workflow validate");
    assert.include(catalog, "workflow profile validate");
    assert.include(catalog, "workflow submit");
    assert.notMatch(catalog, /^### `debug-/m);
    assert.isAtLeast(catalog.split(/\r?\n/).length, 350);
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
      "Natural-language task intake",
      "Visible multi-stage plans",
      "End-to-end compositions",
    ]) {
      assert.include(model, `## ${section}`, section);
    }
    assert.isAtLeast(model.split(/\r?\n/).length, 350);
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
    assert.lengthOf(schema.examples, 3);
    const validate = new Ajv({ allErrors: true, strict: false }).compile(
      schema,
    );
    for (const payload of [
      {
        schema: "zotero-library-task.result.v1",
        status: "completed",
        summary: "The bounded library query completed.",
      },
      {
        schema: "zotero-library-task.result.v1",
        status: "canceled",
        summary: "A material scope decision is still required.",
        diagnostics: [{ code: "scope_required", message: "Choose a scope." }],
      },
      {
        schema: "zotero-library-task.result.v1",
        status: "failed",
        summary: "The requested evidence could not be retrieved.",
        evidence: [{ kind: "zotero-item", ref: { key: "AAAA1111" } }],
        artifacts: [
          {
            path: "/tmp/result.md",
            role: "partial-analysis",
            mediaType: "text/markdown",
          },
        ],
        diagnostics: [{ code: "content_unavailable", message: "No PDF." }],
      },
    ]) {
      assert.isTrue(validate(payload), JSON.stringify(validate.errors));
    }
    for (const payload of [
      {
        schema: "zotero-library-task.result.v1",
        status: "completed",
      },
      {
        schema: "zotero-library-task.result.v1",
        status: "partial",
        summary: "Invented status.",
      },
      {
        schema: "zotero-library-task.result.v1",
        status: "completed",
        summary: "Contains a transport field.",
        __SKILL_DONE__: true,
      },
      {
        schema: "zotero-library-task.result.v1",
        status: "completed",
        summary: "Incomplete evidence.",
        evidence: [{ kind: "zotero-item" }],
      },
      {
        schema: "zotero-library-task.result.v1",
        status: "completed",
        summary: "Incomplete artifact.",
        artifacts: [{ path: "/tmp/result.md" }],
      },
      {
        schema: "zotero-library-task.result.v1",
        status: "failed",
        summary: "Incomplete diagnostic.",
        diagnostics: [{ code: "failure" }],
      },
    ]) {
      assert.isFalse(validate(payload), JSON.stringify(payload));
    }
  });

  it("materializes and validates the shared result contract for every Generic Skill", async function () {
    const minimal = {
      schema: "zotero-library-task.result.v1",
      status: "completed",
      summary: "The bounded task completed.",
    };
    for (const skill of GENERIC_SKILLS) {
      const root = join(
        process.cwd(),
        "addon/content/host-bridge-skills",
        skill,
      );
      const runner = JSON.parse(
        readFileSync(join(root, "assets/runner.json"), "utf8"),
      );
      assert.strictEqual(
        runner.schemas.output,
        "assets/output.schema.json",
        skill,
      );
      const valid = await validateAcpSkillFinalPayload({
        payload: minimal,
        runnerJson: runner,
        primarySkillDir: root,
      });
      assert.isTrue(valid.ok, `${skill}: ${valid.errors.join("; ")}`);
      const invalid = await validateAcpSkillFinalPayload({
        payload: { ...minimal, __SKILL_DONE__: true },
        runnerJson: runner,
        primarySkillDir: root,
      });
      assert.isFalse(invalid.ok, skill);
    }
  });
});
