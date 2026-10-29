import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkSynthesisWorkerStructureWitnesses } from "../../scripts/synthesis/check-synthesis-native-worker-transfer-parity";
import type { StructureCoverageInput } from "../../scripts/synthesis/synthesisProtocolStructureCoverage";

type Witness = Parameters<NonNullable<StructureCoverageInput["onWitness"]>>[0];

const SCHEMA_REF =
  "schemas/worker.schema.json#/$defs/CitationGraphMetricsRunHeader";
const OBLIGATION_ID = SCHEMA_REF + "::fixture:admission";

function witness(): Witness {
  return {
    id: "fixture",
    obligationId: OBLIGATION_ID,
    caseId: "fixture",
    schemaRef: SCHEMA_REF,
    expectValid: true,
    instancePath: "",
    outcome: "covered",
    value: {},
    root: { schemaRef: SCHEMA_REF, value: {}, seedValue: {}, valid: true },
  };
}

const PRELUDE = [
  "#!/usr/bin/env node",
  'const fs = require("node:fs");',
  'const path = require("node:path");',
  "const dir = path.dirname(process.argv[1]);",
  'process.on("exit", () => fs.writeFileSync(path.join(dir, "worker.closed"), ""));',
  'process.on("SIGTERM", () => setTimeout(() => process.exit(0), 150));',
  'console.log(JSON.stringify({ protocol: "synthesis-rust-worker.v1", type: "ready" }));',
  "process.stdin.resume();",
  'process.stdin.on("data", () => {});',
].join("\n");

const IDLE_WORKER = PRELUDE;
const STUBBORN_WORKER = [
  "#!/usr/bin/env node",
  'const fs = require("node:fs");',
  'const path = require("node:path");',
  "const dir = path.dirname(process.argv[1]);",
  'process.on("exit", () => fs.writeFileSync(path.join(dir, "worker.closed"), ""));',
  'process.on("SIGTERM", () => {});',
  'console.log(JSON.stringify({ protocol: "synthesis-rust-worker.v1", type: "ready" }));',
  "process.stdin.resume();",
  'process.stdin.on("data", () => {});',
].join("\n");
const EARLY_EXIT_WORKER = [
  "#!/usr/bin/env node",
  'const fs = require("node:fs");',
  'const path = require("node:path");',
  "const dir = path.dirname(process.argv[1]);",
  'process.on("exit", () => fs.writeFileSync(path.join(dir, "worker.closed"), ""));',
  'console.log(JSON.stringify({ protocol: "synthesis-rust-worker.v1", type: "ready" }));',
].join("\n");
const MALFORMED_WORKER = PRELUDE + '\nconsole.log("not json");';
const CANCELED_WORKER =
  PRELUDE +
  "\nconsole.log(JSON.stringify({" +
  ' protocol: "synthesis-rust-worker.v1",' +
  ' type: "canceled",' +
  ' taskId: "corpus:citation_graph_metrics.v1",' +
  ' code: "worker_canceled" }));';

function createWorkerFixture(source: string) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-worker-cancellation-"),
  );
  const binaryDir = path.join(root, "rust/synthesis-sidecar/target/debug");
  fs.mkdirSync(binaryDir, { recursive: true });
  const executable = path.join(
    binaryDir,
    "synthesis-sidecar" + (process.platform === "win32" ? ".exe" : ""),
  );
  fs.writeFileSync(
    executable,
    `${source}\nfs.writeFileSync(path.join(dir, "worker.pid"), String(process.pid));`,
    "utf8",
  );
  fs.chmodSync(executable, 0o755);
  return {
    root,
    pidPath: path.join(binaryDir, "worker.pid"),
    closedPath: path.join(binaryDir, "worker.closed"),
  };
}

async function waitForFile(file: string) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (fs.existsSync(file)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("fixture did not start: " + file);
}

describe("Synthesis worker admission lifecycle", function () {
  before(function () {
    // The fixture is a Node script; Windows cannot spawn it as a native binary.
    if (process.platform === "win32") this.skip();
  });

  it("rejects an aborted admission after the worker closes", async function () {
    this.timeout(10_000);
    const fixture = createWorkerFixture(IDLE_WORKER);
    const controller = new AbortController();
    try {
      const outcome = checkSynthesisWorkerStructureWitnesses(
        [witness()],
        fixture.root,
        controller.signal,
      ).then(
        () => undefined,
        (error: unknown) => error,
      );
      await waitForFile(fixture.pidPath);
      controller.abort();
      const error = await outcome;
      assert.instanceOf(error, Error);
      assert.equal((error as Error).name, "AbortError");
      assert.isTrue(
        fs.existsSync(fixture.closedPath),
        "worker must close before admission settles",
      );
      const pid = Number(fs.readFileSync(fixture.pidPath, "utf8"));
      assert.equal(
        (() => {
          try {
            process.kill(pid, 0);
            return "running";
          } catch (killError) {
            return (killError as NodeJS.ErrnoException).code;
          }
        })(),
        "ESRCH",
      );
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it("returns promptly when the worker exits before a terminal frame", async function () {
    this.timeout(10_000);
    const fixture = createWorkerFixture(EARLY_EXIT_WORKER);
    try {
      const result = await checkSynthesisWorkerStructureWitnesses(
        [witness()],
        fixture.root,
        AbortSignal.timeout(5_000),
      );
      assert.deepEqual(result.unavailable, [OBLIGATION_ID]);
      assert.isTrue(fs.existsSync(fixture.closedPath));
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it("force-kills a worker that ignores SIGTERM before settling", async function () {
    this.timeout(10_000);
    const fixture = createWorkerFixture(STUBBORN_WORKER);
    const controller = new AbortController();
    try {
      const outcome = checkSynthesisWorkerStructureWitnesses(
        [witness()],
        fixture.root,
        controller.signal,
      ).then(
        () => undefined,
        (error: unknown) => error,
      );
      await waitForFile(fixture.pidPath);
      controller.abort();
      const error = await outcome;
      assert.instanceOf(error, Error);
      assert.equal((error as Error).name, "AbortError");
      const pid = Number(fs.readFileSync(fixture.pidPath, "utf8"));
      assert.equal(
        (() => {
          try {
            process.kill(pid, 0);
            return "running";
          } catch (killError) {
            return (killError as NodeJS.ErrnoException).code;
          }
        })(),
        "ESRCH",
      );
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it("does not hang when a frame is not JSON", async function () {
    this.timeout(10_000);
    const fixture = createWorkerFixture(MALFORMED_WORKER);
    try {
      const result = await checkSynthesisWorkerStructureWitnesses(
        [witness()],
        fixture.root,
        AbortSignal.timeout(5_000),
      );
      assert.deepEqual(result.unavailable, [OBLIGATION_ID]);
      assert.isTrue(fs.existsSync(fixture.closedPath));
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it("closes the worker before returning a terminal frame result", async function () {
    this.timeout(10_000);
    const fixture = createWorkerFixture(CANCELED_WORKER);
    try {
      const result = await checkSynthesisWorkerStructureWitnesses(
        [witness()],
        fixture.root,
        AbortSignal.timeout(5_000),
      );
      assert.deepEqual(result.verified, [OBLIGATION_ID]);
      assert.isTrue(
        fs.existsSync(fixture.closedPath),
        "worker must close before admission settles",
      );
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
