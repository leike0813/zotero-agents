import { assert } from "chai";
import Ajv from "ajv";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const INGEST_FIXTURE = path.resolve(
  "tests/fixtures/workflow-happy-path/ingest-agent.mjs",
);
const OUTPUT_SCHEMA = path.resolve(
  "skills_builtin/literature-search-ingest/assets/output.schema.json",
);

type StubBehavior = {
  itemOutcome: "created" | "existing";
  itemKey: string;
  enrichment: Array<Record<string, unknown>>;
  fail?: string;
};

/** Writes an external stub for the public CLI boundary; nothing internal is mocked. */
function writeCliStub(root: string, behavior: StubBehavior) {
  const stubDir = path.join(root, ".zotero-bridge", "bin");
  mkdirSync(stubDir, { recursive: true });
  const stubPath = path.join(stubDir, "zotero-bridge");
  const controlPath = path.join(root, "stub-behavior.json");
  const invocationPath = path.join(root, "stub-invocation.json");
  writeFileSync(controlPath, JSON.stringify(behavior), "utf8");
  writeFileSync(
    stubPath,
    `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const argv = process.argv.slice(2);
const inputIndex = argv.indexOf("--input");
const inputArg = inputIndex >= 0 ? argv[inputIndex + 1] : "";
const inputPath = inputArg.startsWith("@") ? inputArg.slice(1) : inputArg;
writeFileSync(process.env.STUB_INVOCATION, JSON.stringify({
  argv,
  input: inputPath ? JSON.parse(readFileSync(path.resolve(inputPath), "utf8")) : null,
}, null, 2));
const behavior = JSON.parse(readFileSync(process.env.STUB_BEHAVIOR, "utf8"));
if (behavior.fail) {
  process.stdout.write(JSON.stringify({
    ok: false,
    error: { code: behavior.fail, category: "capability", message: behavior.fail },
    meta: { cli: "zotero-bridge", schema: "zotero-bridge.cli.v5" },
  }));
  process.exit(8);
}
process.stdout.write(JSON.stringify({
  ok: true,
  data: {
    approval: "zotero-ui-required",
    capability: "literature.ingest",
    data: {
      outcome: "committed",
      receipt: { operation: "literature.ingest", outcome: "committed" },
      result: {
        itemOutcome: behavior.itemOutcome,
        collectionOutcome: "added",
        item: { ref: { libraryId: 1, key: behavior.itemKey }, title: "Synthetic offline ingestion fixture" },
        enrichment: behavior.enrichment,
      },
    },
  },
  meta: { cli: "zotero-bridge", schema: "zotero-bridge.cli.v5" },
}));
`,
    "utf8",
  );
  chmodSync(stubPath, 0o755);
  return { stubPath, controlPath, invocationPath };
}

function ingest(args: {
  root: string;
  query?: string;
  targetCollection?: string;
  behavior: StubBehavior;
}) {
  const stub = writeCliStub(args.root, args.behavior);
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `import(process.env.INGEST_FIXTURE).then(({ handleIngestSkill }) => {
        const output = handleIngestSkill({
          input: { query: process.env.INGEST_QUERY },
          parameter: {
            query: process.env.INGEST_QUERY,
            searchMode: "targeted_ingest",
            targetCollection: process.env.INGEST_COLLECTION,
          },
          workspace: process.env.INGEST_WORKSPACE,
        });
        process.stdout.write(JSON.stringify(output));
      }).catch((error) => {
        process.stderr.write(String(error && error.message ? error.message : error));
        process.exit(1);
      });`,
    ],
    {
      cwd: args.root,
      encoding: "utf8",
      env: {
        ...process.env,
        INGEST_FIXTURE,
        INGEST_QUERY: args.query || "Synthetic offline ingestion",
        INGEST_COLLECTION: args.targetCollection || "1:SYNCOL01",
        INGEST_WORKSPACE: args.root,
        STUB_BEHAVIOR: stub.controlPath,
        STUB_INVOCATION: stub.invocationPath,
      },
    },
  );
  return { stub, result };
}

describe("production workflow literature-search-ingest peer", function () {
  this.timeout(15000);
  const schema = JSON.parse(readFileSync(OUTPUT_SCHEMA, "utf8"));
  const validate = new Ajv({ strict: false }).compile(schema);
  let root = "";

  beforeEach(function () {
    root = mkdtempSync(path.join(os.tmpdir(), "workflow-ingest-peer-"));
  });

  afterEach(function () {
    rmSync(root, { recursive: true, force: true });
  });

  it("ingests through the CLI boundary and reports Host facts truthfully", function () {
    const { stub, result } = ingest({
      root,
      behavior: {
        itemOutcome: "created",
        itemKey: "SYNTHINGEST",
        enrichment: [{ kind: "pdf", outcome: "skipped" }],
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.isTrue(validate(output), JSON.stringify(validate.errors));
    assert.equal(output.kind, "literature_search_ingest");
    assert.deepEqual(output.summary, {
      discovered: 1,
      selected: 1,
      created: 1,
      existing: 0,
      failed: 0,
      notAttempted: 0,
    });
    assert.deepEqual(output.outcomes, [
      {
        title: "Synthetic offline ingestion fixture",
        ingestStatus: "created",
        itemRef: { libraryId: 1, key: "SYNTHINGEST" },
        pdfStatus: "skipped",
        needsCuration: false,
      },
    ]);
    const invocation = JSON.parse(readFileSync(stub.invocationPath, "utf8"));
    assert.deepInclude(invocation.argv, "mutation");
    assert.deepInclude(invocation.argv, "literature-ingest");
    assert.match(
      invocation.argv[invocation.argv.indexOf("--input") + 1],
      /^@runtime\/payloads\/candidate-0001\.json$/,
    );
    assert.equal(invocation.input.paper.fields.title, output.outcomes[0].title);
    assert.deepEqual(invocation.input.collectionRef, {
      libraryId: 1,
      key: "SYNCOL01",
    });
    const ledger = JSON.parse(
      readFileSync(path.join(root, "result", "search-ledger.json"), "utf8"),
    );
    assert.equal(ledger.kind, "literature_search_ingest_ledger");
    assert.equal(ledger.candidateResults[0].ingestStatus, "created");
    assert.deepEqual(ledger.candidateResults[0].itemRef, {
      libraryId: 1,
      key: "SYNTHINGEST",
    });
    const receipt = readFileSync(
      path.join(root, "runtime", "host", "candidate-0001.receipt.json"),
      "utf8",
    );
    assert.equal(JSON.parse(receipt).ok, true);
  });

  it("uses the Host outcome rather than a preferred created status", function () {
    const { result } = ingest({
      root,
      targetCollection: "2:SYNCOL02",
      behavior: {
        itemOutcome: "existing",
        itemKey: "SYNTHEXIST",
        enrichment: [
          { kind: "pdf", outcome: "failed", code: "pdf_attachment_failed" },
        ],
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.isTrue(validate(output), JSON.stringify(validate.errors));
    assert.equal(output.summary.existing, 1);
    assert.equal(output.summary.created, 0);
    assert.deepEqual(output.outcomes[0].itemRef, {
      libraryId: 1,
      key: "SYNTHEXIST",
    });
    assert.equal(output.outcomes[0].ingestStatus, "existing");
    assert.equal(output.outcomes[0].pdfStatus, "failed");
    assert.isTrue(output.outcomes[0].needsCuration);
  });

  it("surfaces a Host mutation failure instead of fabricating success", function () {
    const { result } = ingest({
      root,
      behavior: {
        itemOutcome: "created",
        itemKey: "UNUSED",
        enrichment: [],
        fail: "capability_failed",
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workflow_fixture_bridge_failed/);
    assert.isFalse(
      existsSync(path.join(root, "result", "search-ledger.json")),
      "a failed mutation must not publish a success ledger",
    );
  });
});
