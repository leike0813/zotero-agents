import { assert } from "chai";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  classifyTestResult,
  parseCompilerArtifacts,
  profileRustTests,
} from "../../scripts/test-rust-profile";

type FixtureOutcome = "passed" | "failed" | "ignored" | "hang";

async function createFixture(
  root: string,
  tests: Array<{ name: string; outcome: FixtureOutcome }>,
) {
  const bin = path.join(root, "bin");
  const executable = path.join(root, "fake-rust-test");
  const cargoArgs = path.join(root, "cargo-args.jsonl");
  const invocations = path.join(root, "invocations.jsonl");
  const started = path.join(root, "started");
  const crateRoot = path.join(root, "crates", "fixture");
  const manifestPath = path.join(crateRoot, "Cargo.toml");
  await mkdir(bin);
  await mkdir(crateRoot, { recursive: true });

  await writeFile(
    path.join(bin, "cargo"),
    `#!/usr/bin/env node
const fs = require("node:fs");
fs.appendFileSync(${JSON.stringify(cargoArgs)}, JSON.stringify(process.argv.slice(2)) + "\\n");
process.stdout.write([
  {
    reason: "compiler-artifact",
    manifest_path: ${JSON.stringify(manifestPath)},
    profile: { test: true },
    executable: ${JSON.stringify(executable)}
  },
  {
    reason: "compiler-artifact",
    manifest_path: ${JSON.stringify(manifestPath)},
    profile: { test: false },
    executable: ${JSON.stringify(path.join(root, "non-test-binary"))}
  }
].map(JSON.stringify).join("\\n") + "\\n");
`,
    { mode: 0o755 },
  );

  await writeFile(
    executable,
    `#!/usr/bin/env node
const fs = require("node:fs");
const tests = ${JSON.stringify(tests)};
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(invocations)}, JSON.stringify({ args, cwd: process.cwd() }) + "\\n");
if (args.includes("--list")) {
  for (const test of tests) process.stdout.write(test.name + ": test\\n");
  process.exit(0);
}
const index = args.indexOf("--exact");
const test = tests.find((candidate) => candidate.name === args[index + 1]);
if (!test) {
  process.stdout.write("running 0 tests\\n");
  process.exit(0);
}
if (test.outcome === "hang") {
  fs.writeFileSync(${JSON.stringify(started)}, "started");
  process.stdout.write("test " + test.name + " ... ok\\n");
  setInterval(() => {}, 1000);
} else {
  const result = test.outcome === "passed" ? "ok" : test.outcome === "failed" ? "FAILED" : "ignored";
  process.stdout.write("test " + test.name + " ... " + result + "\\n");
  const passed = test.outcome === "passed" ? 1 : 0;
  const failed = test.outcome === "failed" ? 1 : 0;
  const ignored = test.outcome === "ignored" ? 1 : 0;
  process.stdout.write(
    "test result: " + (failed ? "FAILED" : "ok") + ". " + passed + " passed; " +
      failed + " failed; " + ignored + " ignored; 0 measured; 0 filtered out; finished in 0.00s\\n"
  );
  process.exit(test.outcome === "failed" ? 1 : 0);
}
`,
    { mode: 0o755 },
  );

  return { bin, cargoArgs, crateRoot, invocations, started };
}

async function withFakeCargo<T>(bin: string, action: () => Promise<T>) {
  const previous = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${previous || ""}`;
  try {
    return await action();
  } finally {
    if (previous === undefined) delete process.env.PATH;
    else process.env.PATH = previous;
  }
}

async function readProfile(root: string) {
  const profile = path.join(root, "profile");
  const entries = await readdir(profile, { withFileTypes: true });
  const evidence = entries.find(
    (entry) => entry.isFile() && entry.name.endsWith(".jsonl"),
  )?.name;
  assert.ok(evidence, "expected a Rust profile JSONL file");
  const records = (await readFile(path.join(profile, evidence), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const logs = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) =>
          (await readdir(path.join(profile, entry.name))).filter((name) =>
            name.endsWith(".log"),
          ),
        ),
    )
  ).flat();
  return { records, logs };
}

describe("Rust compiler artifact parsing", function () {
  it("uses each executable's package manifest as its working directory", function () {
    const root = path.resolve("fixture-workspace");
    const alpha = path.join(root, "crates", "alpha", "Cargo.toml");
    const beta = path.join(root, "crates", "beta", "Cargo.toml");
    const alphaExecutable = path.join(root, "target", "debug", "deps", "alpha");
    const betaExecutable = path.join(root, "target", "debug", "deps", "beta");
    const output = [
      {
        reason: "compiler-artifact",
        manifest_path: alpha,
        profile: { test: true },
        executable: alphaExecutable,
      },
      {
        reason: "compiler-artifact",
        manifest_path: beta,
        profile: { test: true },
        executable: betaExecutable,
      },
      {
        reason: "compiler-artifact",
        manifest_path: alpha,
        profile: { test: false },
        executable: path.join(root, "target", "debug", "deps", "alpha-lib"),
      },
    ]
      .map(JSON.stringify)
      .join("\n");

    assert.deepEqual(parseCompilerArtifacts(output, root), [
      { cwd: path.dirname(alpha), executable: alphaExecutable },
      { cwd: path.dirname(beta), executable: betaExecutable },
    ]);
  });

  it("resolves relative artifact paths from the cargo working directory", function () {
    const root = path.resolve("relative-fixture");
    const output = JSON.stringify({
      reason: "compiler-artifact",
      manifest_path: "crates/alpha/Cargo.toml",
      profile: { test: true },
      executable: "target/debug/deps/alpha",
    });

    assert.deepEqual(parseCompilerArtifacts(output, root), [
      {
        cwd: path.join(root, "crates", "alpha"),
        executable: path.join(root, "target", "debug", "deps", "alpha"),
      },
    ]);
  });
});

describe("Rust test result classification", function () {
  it("uses the completed libtest summary when child output splits the result line", function () {
    const summary = (passed: number, ignored = 0) =>
      `test result: ok. ${passed} passed; 0 failed; ${ignored} ignored; 0 measured; 9 filtered out; finished in 0.08s\n`;
    assert.equal(
      classifyTestResult(
        `test lifecycle ... {"phase":"ready"}\nok\n${summary(1)}`,
        0,
      ),
      "passed",
    );
    assert.equal(classifyTestResult(summary(0, 1), 0), "ignored");
    assert.equal(classifyTestResult(summary(0), 0), "failed");
    assert.equal(classifyTestResult(summary(2), 0), "failed");
    assert.equal(classifyTestResult("test lifecycle ... ok\n", 0), "failed");
    assert.equal(classifyTestResult(summary(1) + summary(0), 0), "failed");
  });
  it("does not hide a nonzero exit behind ignored output", function () {
    const ignored =
      "test result: ok. 0 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.00s\n";

    assert.equal(classifyTestResult(ignored, 0), "ignored");
    assert.equal(classifyTestResult(ignored, 1), "failed");
    assert.equal(
      classifyTestResult(
        "test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n",
        0,
      ),
      "passed",
    );
  });
});

describe("Rust test profiling", function () {
  this.timeout(10000);

  before(function () {
    if (process.platform === "win32") this.skip();
  });

  it("uses the locked synthesis command and records isolated test processes", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "rust-profile-"));
    const fixture = await createFixture(root, [
      { name: "tests::passes", outcome: "passed" },
      { name: "tests::ignored_case", outcome: "ignored" },
    ]);

    await withFakeCargo(fixture.bin, () =>
      profileRustTests({
        script: "test:synthesis-rust-sidecar",
        directory: root,
      }),
    );

    const cargoArgs = JSON.parse(
      (await readFile(fixture.cargoArgs, "utf8")).trim(),
    );
    assert.includeMembers(cargoArgs, [
      "+nightly-2026-07-25",
      "test",
      "--no-run",
      "--message-format=json",
      "--locked",
      "--no-fail-fast",
      "--workspace",
      "--manifest-path",
    ]);
    assert.equal(
      cargoArgs[cargoArgs.indexOf("--manifest-path") + 1],
      "rust/synthesis-sidecar/Cargo.toml",
    );

    const { logs, records } = await readProfile(root);
    assert.equal(records[0].kind, "rust-profile-prepare");
    assert.equal(records[0].status, "passed");
    assert.equal(records[0].binaries.length, 1);
    assert.deepEqual(
      records.slice(1).map((record) => record.status),
      ["passed", "ignored"],
    );
    for (const record of records.slice(1)) {
      assert.equal(record.kind, "rust-sample");
      assert.equal(record.measurement, "isolated-process");
      assert.equal(record.file, path.join(root, "fake-rust-test"));
      assert.isAtLeast(record.durationMs, 0);
      assert.isTrue(Number.isFinite(record.startMs));
    }
    assert.lengthOf(logs, 4);
    assert.lengthOf(new Set(logs), logs.length);
    const invocations = (await readFile(fixture.invocations, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.isNotEmpty(invocations);
    for (const invocation of invocations) {
      assert.equal(invocation.cwd, fixture.crateRoot);
    }
    for (const record of records.slice(1)) {
      assert.equal(record.cwd, fixture.crateRoot);
    }
  });

  it("keeps failed samples and reports the test exit", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "rust-profile-fail-"));
    const fixture = await createFixture(root, [
      { name: "tests::passes", outcome: "passed" },
      { name: "tests::fails", outcome: "failed" },
    ]);

    let error: unknown;
    try {
      await withFakeCargo(fixture.bin, () =>
        profileRustTests({
          script: "test:host-bridge:rust",
          directory: root,
        }),
      );
    } catch (caught) {
      error = caught;
    }

    assert.instanceOf(error, Error);
    assert.include(String(error), "1 Rust test");
    const cargoArgs = JSON.parse(
      (await readFile(fixture.cargoArgs, "utf8")).trim(),
    );
    assert.equal(cargoArgs[0], "+1.88.0");
    assert.notInclude(cargoArgs, "--workspace");
    const { records } = await readProfile(root);
    assert.deepEqual(
      records.slice(1).map((record) => record.status),
      ["passed", "failed"],
    );
  });

  it("cancels the active isolated test and records it as canceled", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "rust-profile-cancel-"));
    const fixture = await createFixture(root, [
      { name: "tests::hangs", outcome: "hang" },
    ]);
    const controller = new AbortController();
    const running = withFakeCargo(fixture.bin, () =>
      profileRustTests({
        script: "test:acp-ws-bridge:rust",
        directory: root,
        signal: controller.signal,
      }),
    );

    const deadline = Date.now() + 3000;
    while (true) {
      try {
        await readFile(fixture.started);
        break;
      } catch {
        if (Date.now() > deadline)
          throw new Error("fake Rust test did not start");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    controller.abort();

    let error: unknown;
    try {
      await running;
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, Error);
    assert.equal((error as Error).name, "AbortError");
    const { records } = await readProfile(root);
    assert.equal(records.at(-1).status, "canceled");
  });
});
