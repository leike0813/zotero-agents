import { assert } from "chai";
import { execFileSync, spawnSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";

const script = path.resolve(
  "skills_builtin/topic-planner/scripts/topic_planner.py",
);

function pythonCommand(args: string[]) {
  const project = path.join(os.homedir(), ".ar");
  return fsSync.existsSync(path.join(project, "pyproject.toml"))
    ? {
        command: "uv",
        args: [
          "run",
          `--project=${project}`,
          "--locked",
          "--",
          "python",
          script,
          ...args,
        ],
      }
    : { command: process.env.PYTHON || "python", args: [script, ...args] };
}

async function writeJson(root: string, name: string, value: unknown) {
  const filePath = path.join(root, name);
  await fs.writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
  return filePath;
}

function contextFixture() {
  return {
    schema_id: "synthesis.topic_planning_context",
    library: {
      index_hash: "library-v1",
      papers: [
        { paper_ref: "1:B", title: "Beta" },
        { paper_ref: "1:A", title: "Alpha" },
      ],
    },
    topics: [],
    topic_graph: {
      manifest: { manifest_hash: "graph-v1" },
      nodes: [],
      edges: [],
      review_items: [],
    },
    diagnostics: { truncated: false },
  };
}

describe("Topic Planner deterministic runtime", function () {
  it("builds stable metadata batches and validates one complete atomic plan", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "topic-planner-"));
    const context = await writeJson(root, "context.json", contextFixture());
    const summaryCommand = pythonCommand([
      "summarize",
      "--context",
      context,
      "--batch-size",
      "1",
    ]);
    const summary = JSON.parse(
      execFileSync(summaryCommand.command, summaryCommand.args, {
        encoding: "utf8",
      }),
    );
    assert.deepEqual(summary.batches, [["1:A"], ["1:B"]]);
    assert.equal(summary.base_graph_hash, "graph-v1");

    const coverage = await writeJson(root, "coverage.json", {
      library_index_hash: "library-v1",
      entries: [
        {
          paper_ref: "1:A",
          state: "uncovered",
          topic_ids: [],
          reason: "No match",
        },
        {
          paper_ref: "1:B",
          state: "uncovered",
          topic_ids: [],
          reason: "No match",
        },
      ],
      overlaps: [],
    });
    const planValue = {
      kind: "topic_plan",
      operation: "reconcile",
      base_graph_hash: "graph-v1",
      library_index_hash: "library-v1",
      topic_actions: [
        {
          action: "create",
          topic_id: "topic-alpha",
          title: "Alpha",
          definition: "Alpha methods.",
          resolver: { paper_refs: ["1:A"] },
          revision: 1,
          basis: [],
        },
      ],
      relation_proposals: [],
      recommended_updates: [],
    };
    const plan = await writeJson(root, "plan.json", planValue);
    const validateCommand = pythonCommand([
      "validate",
      "--context",
      context,
      "--coverage",
      coverage,
      "--plan",
      plan,
    ]);
    assert.deepEqual(
      JSON.parse(
        execFileSync(validateCommand.command, validateCommand.args, {
          encoding: "utf8",
        }),
      ),
      planValue,
    );
  });

  it("rejects provisional paper membership in Planned Topic actions", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "topic-planner-"));
    const context = await writeJson(root, "context.json", contextFixture());
    const coverage = await writeJson(root, "coverage.json", {
      library_index_hash: "library-v1",
      entries: [
        {
          paper_ref: "1:A",
          state: "uncovered",
          topic_ids: [],
          reason: "No match",
        },
        {
          paper_ref: "1:B",
          state: "uncovered",
          topic_ids: [],
          reason: "No match",
        },
      ],
      overlaps: [],
    });
    const plan = await writeJson(root, "plan.json", {
      kind: "topic_plan",
      operation: "reconcile",
      base_graph_hash: "graph-v1",
      library_index_hash: "library-v1",
      topic_actions: [
        {
          action: "create",
          topic_id: "topic-alpha",
          definition: "Alpha methods.",
          resolver: {},
          revision: 1,
          paper_ids: ["1:A"],
        },
      ],
      relation_proposals: [],
      recommended_updates: ["topic-alpha"],
    });
    const command = pythonCommand([
      "validate",
      "--context",
      context,
      "--coverage",
      coverage,
      "--plan",
      plan,
    ]);
    const result = spawnSync(command.command, command.args, {
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.include(result.stderr, "membership fields are forbidden");
  });
});
