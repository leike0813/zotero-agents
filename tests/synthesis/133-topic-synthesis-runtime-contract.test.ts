import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import Ajv2020 from "ajv/dist/2020";
import { startHostBridgeCliFixtureHarness } from "../helpers/hostBridgeCliHarness";
import { pythonRuntimeCommand } from "../helpers/pythonRuntime";

const createPrepareRoot = path.join(
  "skills_builtin",
  "create-topic-synthesis-prepare",
);
const updatePrepareRoot = path.join(
  "skills_builtin",
  "update-topic-synthesis-prepare",
);

function runGate(
  runtimeRoot: string,
  runRoot: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): Record<string, any> {
  const command = pythonRuntimeCommand([
    path.resolve(runtimeRoot, "scripts/gate.py"),
    ...args,
  ]);
  const output = execFileSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, ...env },
  });
  return JSON.parse(output);
}

async function readText(filePath: string) {
  return fs.readFile(path.join(process.cwd(), filePath), "utf8");
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function createBridgeHarness(runRoot: string) {
  const fixtureRoot = path.join(runRoot, "runtime", "test-fixtures");
  await fs.mkdir(fixtureRoot, { recursive: true });
  const provider = path.join(fixtureRoot, "host-bridge-provider.cjs");
  await fs.writeFile(
    provider,
    [
      "const fs = require('fs');",
      "const path = require('path');",
      "const { command, input } = JSON.parse(process.argv[2]);",
      "fs.mkdirSync(path.join(process.cwd(), 'runtime', 'payloads'), { recursive: true });",
      "function send(data) { process.stdout.write(JSON.stringify(data)); }",
      "if (command === 'synthesis resolver resolve') {",
      "  fs.appendFileSync(path.join(process.cwd(), 'runtime', 'host-resolver-inputs.jsonl'), JSON.stringify(input) + '\\n');",
      "  send({ ok: true, errors: [], candidates: [{ paper_ref: '1:DETR', item_key: 'DETR', title: 'DETR', match_reasons: ['paper_refs'] }], nextCursor: '', hasMore: false, returned: 1, total: 1, limit: Number(input.limit || 25), diagnostics: { final_count: 1, rejected: false } });",
      "  process.exit(0);",
      "}",
      "if (command === 'synthesis graph get-metrics') {",
      "  const refs = input.paper_refs || input.paperRefs || [];",
      "  send({ ok: true, status: 'ready', metrics: refs.map((paper_ref) => ({ paper_ref, status: 'ready' })), nextCursor: '', hasMore: false, returned: refs.length, total: refs.length, limit: Number(input.limit || 25) });",
      "  process.exit(0);",
      "}",
      "if (command === 'synthesis artifact export-filtered') {",
      "  const refs = input.paper_refs || [];",
      "  const manifest = { exported_by: 'paper_artifacts.export_filtered', papers: refs.map((paper_ref) => ({ paper_ref, artifacts: [] })) };",
      "  fs.writeFileSync(path.join(process.cwd(), 'runtime', 'payloads', 'paper-artifacts-manifest.json'), JSON.stringify(manifest, null, 2));",
      "  send(manifest);",
      "  process.exit(0);",
      "}",
      "process.stdout.write(JSON.stringify({ ok: false, error: { code: 'unsupported_command', command } }));",
      "process.exit(2);",
      "",
    ].join("\n"),
    "utf8",
  );
  return startHostBridgeCliFixtureHarness({
    commands: [
      "synthesis resolver resolve",
      "synthesis graph get-metrics",
      "synthesis artifact export-filtered",
    ],
    providerPath: provider,
    cwd: runRoot,
  });
}

function validateWithSchema(schemaText: string, value: unknown) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(JSON.parse(schemaText));
  return validate(value);
}

describe("Topic synthesis runtime contract", function () {
  this.timeout(30000);

  it("ships current package-local prepare runtime resources", async function () {
    for (const runtimeRoot of [createPrepareRoot, updatePrepareRoot]) {
      for (const relativePath of [
        "SKILL.md",
        "assets/runner.json",
        "scripts/gate.py",
        "scripts/topic_synthesis_db.py",
      ]) {
        await fs.access(path.join(runtimeRoot, relativePath));
      }
    }
    await fs.access(
      path.join(
        createPrepareRoot,
        "assets/schemas/stage-20-resolver-and-workset.schema.json",
      ),
    );
    await fs.access(
      path.join(
        updatePrepareRoot,
        "assets/schemas/stage-10-update-topic-context.schema.json",
      ),
    );
  });

  for (const [stage, schemaPath, fields] of [
    [
      "create Stage 20",
      "skills_builtin/create-topic-synthesis-prepare/assets/schemas/stage-20-resolver-and-workset.schema.json",
      { operation_intent: "create" },
    ],
    [
      "update Stage 10",
      "skills_builtin/update-topic-synthesis-prepare/assets/schemas/stage-10-update-topic-context.schema.json",
      {
        update_decision: {
          action: "continue",
          reason: "Source material requires an update.",
          message: "Proceed.",
        },
      },
    ],
  ] as const) {
    it(`validates ${stage} resolver selectors against the Host Bridge contract`, async function () {
      const schema = await readText(schemaPath);
      const cases: Array<[string, unknown, boolean]> = [
        ["omitted defaults", { paper_refs: ["1:DETR"] }, true],
        [
          "intersection without collections",
          {
            tag: { and: ["object-detection", "detr"] },
            collection_key: [],
            paper_refs: ["1:DETR"],
            combine: "intersection",
          },
          true,
        ],
        [
          "tag with empty selector arrays",
          {
            tag: { or: ["detr"], not: ["classification"] },
            collection_key: [],
            paper_refs: [],
          },
          true,
        ],
        [
          "collection without explicit refs",
          { collection_key: ["COLL_A"], paper_refs: [] },
          true,
        ],
        ["scalar tag", { tag: "detr" }, false],
        ["array tag", { tag: ["detr"] }, false],
        ["scalar tag operator", { tag: { and: "detr" } }, false],
        ["scalar collection", { collection_key: "COLL_A" }, false],
        ["empty tag", { tag: {}, paper_refs: ["1:DETR"] }, false],
        [
          "empty tag operator",
          { tag: { and: [] }, paper_refs: ["1:DETR"] },
          false,
        ],
        ["empty selectors only", { collection_key: [], paper_refs: [] }, false],
        ["invalid ref", { paper_refs: [""] }, false],
        ["legacy DSL", { mode: "explicit", paper_refs: ["1:DETR"] }, false],
      ];
      for (const [label, resolver, expected] of cases) {
        assert.equal(
          validateWithSchema(schema, {
            ...fields,
            resolver,
            resolver_reasoning: "Fixture scope.",
          }),
          expected,
          label,
        );
      }
    });
  }

  it("submits resolver proposals to Host Bridge as raw resolver payloads", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-runtime-contract-"),
    );
    const dbPath = "runtime/topic-synthesis.sqlite";
    const harness = await createBridgeHarness(runRoot);
    const env = harness.env;
    try {
      runGate(
        createPrepareRoot,
        runRoot,
        ["--db", dbPath, "--action", "run"],
        env,
      );
      await writeJson(
        path.join(runRoot, "runtime/payloads/topic-context.json"),
        {
          topic_title: "DETR-style Object Detection",
          aliases: ["query detector"],
          definition: "Query-based object detection methods derived from DETR.",
          scope_include: ["DETR-style detection"],
          scope_exclude: ["generic image classification"],
          target_decision: {
            action: "create_new",
            candidate_topic_ids: [],
            reason: "No same-identity topic exists in the fixture.",
          },
        },
      );
      runGate(
        createPrepareRoot,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/topic-context.json",
        ],
        env,
      );

      await writeJson(
        path.join(runRoot, "runtime/payloads/resolver-proposal.json"),
        {
          resolver: { paper_refs: ["1:DETR"], combine: "union" },
          resolver_reasoning:
            "Fixture resolver selects the representative DETR paper.",
          operation_intent: "create",
        },
      );
      const result = runGate(
        createPrepareRoot,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/resolver-proposal.json",
        ],
        env,
      );

      assert.deepEqual(result.result.paper_refs, ["1:DETR"]);
      const hostInputs = await fs.readFile(
        path.join(runRoot, "runtime/host-resolver-inputs.jsonl"),
        "utf8",
      );
      assert.include(hostInputs, '"paper_refs":["1:DETR"]');
      assert.notInclude(hostInputs, '"resolver"');
      const manifest = JSON.parse(
        await fs.readFile(
          path.join(runRoot, "runtime/payloads/resolver.json"),
          "utf8",
        ),
      );
      assert.deepEqual(manifest.resolver, {
        paper_refs: ["1:DETR"],
        combine: "union",
      });
    } finally {
      await harness.close();
    }
  });
});
