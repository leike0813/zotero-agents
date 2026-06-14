import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import Ajv2020 from "ajv/dist/2020";

const createPrepareRoot = path.join(
  "skills_builtin",
  "create-topic-synthesis-prepare",
);
const updatePrepareRoot = path.join(
  "skills_builtin",
  "update-topic-synthesis-prepare",
);

function pythonCommand() {
  return process.env.PYTHON || "python";
}

function runGate(
  runtimeRoot: string,
  runRoot: string,
  args: string[],
): Record<string, any> {
  const output = execFileSync(
    pythonCommand(),
    [path.resolve(runtimeRoot, "scripts/gate.py"), ...args],
    { cwd: runRoot, encoding: "utf8", stdio: "pipe" },
  );
  return JSON.parse(output);
}

async function readText(filePath: string) {
  return fs.readFile(path.join(process.cwd(), filePath), "utf8");
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function createFakeZoteroBridge(runRoot: string) {
  const binDir = path.join(runRoot, ".zotero-bridge", "bin");
  await fs.mkdir(binDir, { recursive: true });
  const fakeScript = path.join(binDir, "fake-zotero-bridge.cjs");
  await fs.writeFile(
    fakeScript,
    [
      "const fs = require('fs');",
      "const path = require('path');",
      "const args = process.argv.slice(2);",
      "const inputIndex = args.indexOf('--input');",
      "const inputArg = args[inputIndex + 1];",
      "const inputText = inputArg.startsWith('@') ? fs.readFileSync(path.resolve(process.cwd(), inputArg.slice(1)), 'utf8') : inputArg;",
      "const input = JSON.parse(inputText);",
      "const command = args.slice(0, inputIndex).join(' ');",
      "fs.mkdirSync(path.join(process.cwd(), 'runtime', 'payloads'), { recursive: true });",
      "function send(data) { process.stdout.write(JSON.stringify({ ok: true, data: { approval: 'none', data } })); }",
      "if (command === 'resolvers resolve') {",
      "  fs.appendFileSync(path.join(process.cwd(), 'runtime', 'host-resolver-inputs.jsonl'), JSON.stringify(input) + '\\n');",
      "  send({ ok: true, papers: [{ paper_ref: '1:DETR', item_key: 'DETR', title: 'DETR', match_reasons: ['paper_refs'] }], diagnostics: { final_count: 1 } });",
      "  process.exit(0);",
      "}",
      "if (command === 'citation-graph get-metrics') {",
      "  const refs = input.paper_refs || input.paperRefs || [];",
      "  send({ ok: true, status: 'ready', items: refs.map((paper_ref) => ({ paper_ref, status: 'ready' })) });",
      "  process.exit(0);",
      "}",
      "if (command === 'paper-artifacts export-filtered') {",
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
  await fs.writeFile(
    path.join(binDir, "zotero-bridge.cmd"),
    '@echo off\r\nnode "%~dp0\\fake-zotero-bridge.cjs" %*\r\n',
    "utf8",
  );
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

  it("keeps resolver schemas on the direct Host Bridge payload contract", async function () {
    const createSchema = await readText(
      "skills_builtin/create-topic-synthesis-prepare/assets/schemas/stage-20-resolver-and-workset.schema.json",
    );
    const updateSchema = await readText(
      "skills_builtin/update-topic-synthesis-prepare/assets/schemas/stage-10-update-topic-context.schema.json",
    );

    assert.isTrue(
      validateWithSchema(createSchema, {
        resolver: { paper_refs: ["1:DETR"], combine: "union" },
        resolver_reasoning: "Fixture resolver.",
        operation_intent: "create",
      }),
    );
    assert.isFalse(
      validateWithSchema(createSchema, {
        resolver: { mode: "explicit", paper_refs: ["1:DETR"] },
        resolver_reasoning: "Legacy resolver.",
        operation_intent: "create",
      }),
    );
    assert.isTrue(
      validateWithSchema(updateSchema, {
        update_decision: {
          action: "continue",
          reason: "Fixture audit found candidates.",
          message: "Proceed.",
        },
        resolver: {
          tag: { and: ["object-detection"] },
          collection_key: ["COLL_A"],
          combine: "intersection",
        },
        resolver_reasoning: "Narrow to matching selector types.",
      }),
    );
    assert.isFalse(
      validateWithSchema(updateSchema, {
        update_decision: {
          action: "continue",
          reason: "Fixture audit found candidates.",
          message: "Proceed.",
        },
        resolver: { mode: "mixed", include: [] },
        resolver_reasoning: "Legacy resolver.",
      }),
    );
  });

  it("submits resolver proposals to Host Bridge as raw resolver payloads", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-runtime-contract-"),
    );
    const dbPath = "runtime/topic-synthesis.sqlite";
    await createFakeZoteroBridge(runRoot);

    runGate(createPrepareRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "run",
    ]);
    await writeJson(path.join(runRoot, "runtime/payloads/topic-context.json"), {
      topic_title: "DETR-style Object Detection",
      aliases: ["query detector"],
      definition: "Query-based object detection methods derived from DETR.",
      scope_include: ["DETR-style detection"],
      scope_exclude: ["generic image classification"],
      duplicate_status: "none",
      duplicate_candidate_ids: [],
      duplicate_reason: "",
    });
    runGate(createPrepareRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "submit",
      "--payload",
      "runtime/payloads/topic-context.json",
    ]);

    await writeJson(
      path.join(runRoot, "runtime/payloads/resolver-proposal.json"),
      {
        resolver: { paper_refs: ["1:DETR"], combine: "union" },
        resolver_reasoning: "Fixture resolver selects the representative DETR paper.",
        operation_intent: "create",
      },
    );
    const result = runGate(createPrepareRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "submit",
      "--payload",
      "runtime/payloads/resolver-proposal.json",
    ]);

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
  });

  it("keeps generated agent-facing instructions on the simplified resolver contract", async function () {
    const createSkill = await readText(
      "skills_builtin/create-topic-synthesis-prepare/SKILL.md",
    );
    const updateSkill = await readText(
      "skills_builtin/update-topic-synthesis-prepare/SKILL.md",
    );
    for (const text of [createSkill, updateSkill]) {
      assert.include(text, "`tag`");
      assert.include(text, "`collection_key`");
      assert.include(text, "`paper_refs`");
      assert.include(text, "`combine`");
      assert.notInclude(text, "mode: \"explicit\"");
      assert.notInclude(text, "mode: \"mixed\"");
      assert.notInclude(text, "mode: \"tag_query\"");
    }
  });
});
