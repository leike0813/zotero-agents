import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { runLoggedProcess } from "./test-run-report";
import pkg from "../package.json";

type RustProfileScript =
  | "test:synthesis-rust-sidecar"
  | "test:host-bridge:rust"
  | "test:acp-ws-bridge:rust";

const RUST_PROFILE_SCRIPTS = new Set<string>([
  "test:synthesis-rust-sidecar",
  "test:host-bridge:rust",
  "test:acp-ws-bridge:rust",
]);

type RustSample = {
  kind: "rust-sample";
  name: string;
  file: string;
  cwd: string;
  startMs: number;
  durationMs: number;
  status: "passed" | "failed" | "ignored" | "canceled";
  measurement: "isolated-process";
};

let runSequence = 0;

export async function profileRustTests(args: {
  script: string;
  directory: string;
  signal?: AbortSignal;
}): Promise<void> {
  if (!RUST_PROFILE_SCRIPTS.has(args.script)) {
    throw new Error(`Unsupported Rust test script: ${args.script}`);
  }
  const [command, ...cargoArgs] =
    pkg.scripts[args.script as RustProfileScript].split(/\s+/);
  const manifestPath = cargoArgs[cargoArgs.indexOf("--manifest-path") + 1];
  if (
    command !== "cargo" ||
    cargoArgs[1] !== "test" ||
    !cargoArgs.includes("--manifest-path")
  )
    throw new Error(`Unsupported Cargo invocation: ${args.script}`);
  const directory = path.resolve(args.directory);
  const profileDirectory = path.join(directory, "profile");
  const runDirectory = path.join(
    profileDirectory,
    `rust-${Date.now()}-${process.pid}-${++runSequence}`,
  );
  const evidenceFile = `${runDirectory}.jsonl`;
  await mkdir(runDirectory, { recursive: true });

  throwIfAborted(args.signal);
  const compileLog = path.join(runDirectory, "compile.log");
  const compileStart = performance.now();
  const compile = await runLoggedProcess(
    command,
    [...cargoArgs, "--no-run", "--message-format=json"],
    {
      log: compileLog,
      env: process.env,
      cwd: process.cwd(),
      signal: args.signal,
    },
  );
  const compileDurationMs = performance.now() - compileStart;
  const executables = parseCompilerArtifacts(
    await readFile(compileLog, "utf8"),
    process.cwd(),
  );
  const compileStatus = args.signal?.aborted
    ? "canceled"
    : compile.exitCode === 0
      ? "passed"
      : "failed";
  await appendRecord(evidenceFile, {
    kind: "rust-profile-prepare",
    name: "cargo test --no-run",
    script: args.script,
    toolchain: cargoArgs[0],
    manifestPath,
    startMs: performance.timeOrigin + compileStart,
    durationMs: compileDurationMs,
    status: compileStatus,
    exitCode: compile.exitCode,
    binaries: executables,
    measurement: "cargo-test-no-run",
  });

  throwIfAborted(args.signal);
  if (compile.exitCode !== 0) {
    throw new Error(
      `Rust test compilation exited with code ${compile.exitCode}; see ${compileLog}`,
    );
  }
  if (!executables.length) {
    throw new Error(
      `Rust test compilation produced no test executables; see ${compileLog}`,
    );
  }

  const failed: string[] = [];
  for (const [binaryIndex, executable] of executables.entries()) {
    throwIfAborted(args.signal);
    const listLog = path.join(
      runDirectory,
      `${binaryIndex.toString().padStart(3, "0")}-list.log`,
    );
    const listed = await runLoggedProcess(
      executable.executable,
      ["--list", "--format", "terse"],
      {
        log: listLog,
        env: process.env,
        cwd: executable.cwd,
        signal: args.signal,
      },
    );
    throwIfAborted(args.signal);
    if (listed.exitCode !== 0) {
      throw new Error(
        `Rust test discovery exited with code ${listed.exitCode}; see ${listLog}`,
      );
    }
    const tests = parseTerseTests(await readFile(listLog, "utf8"));

    for (const [testIndex, name] of tests.entries()) {
      throwIfAborted(args.signal);
      const testLog = path.join(
        runDirectory,
        `${binaryIndex.toString().padStart(3, "0")}-${testIndex
          .toString()
          .padStart(4, "0")}.log`,
      );
      const start = performance.now();
      const result = await runLoggedProcess(
        executable.executable,
        ["--exact", name, "--test-threads=1"],
        {
          log: testLog,
          env: process.env,
          cwd: executable.cwd,
          signal: args.signal,
        },
      );
      const durationMs = performance.now() - start;
      const output = await readFile(testLog, "utf8");
      const status = args.signal?.aborted
        ? "canceled"
        : classifyTestResult(output, result.exitCode);
      const sample: RustSample = {
        kind: "rust-sample",
        name,
        file: executable.executable,
        cwd: executable.cwd,
        startMs: performance.timeOrigin + start,
        durationMs,
        status,
        measurement: "isolated-process",
      };
      await appendRecord(evidenceFile, sample);
      if (status === "failed") failed.push(name);
      throwIfAborted(args.signal);
    }
  }

  if (failed.length) {
    throw new Error(
      `${failed.length} Rust test${failed.length === 1 ? "" : "s"} failed during profiling: ${failed.join(", ")}`,
    );
  }
}

export function parseCompilerArtifacts(
  output: string,
  baseDirectory = process.cwd(),
) {
  const executables = new Map<string, { executable: string; cwd: string }>();
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const message = JSON.parse(line);
      if (
        message?.reason === "compiler-artifact" &&
        message.profile?.test === true &&
        typeof message.executable === "string" &&
        message.executable &&
        typeof message.manifest_path === "string" &&
        message.manifest_path
      ) {
        const executable = path.resolve(baseDirectory, message.executable);
        executables.set(executable, {
          executable,
          cwd: path.dirname(path.resolve(baseDirectory, message.manifest_path)),
        });
      }
    } catch {
      // Cargo can interleave non-JSON diagnostics with its JSON stream.
    }
  }
  return [...executables.values()];
}

function parseTerseTests(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => /^(.+): test$/.exec(line.trim())?.[1].trim())
    .filter((name): name is string => Boolean(name));
}

export function classifyTestResult(
  output: string,
  exitCode: number,
): RustSample["status"] {
  if (exitCode !== 0) return "failed";
  const summary = [
    ...output.matchAll(
      /^test result: (ok|FAILED)\. (\d+) passed; (\d+) failed; (\d+) ignored;/gm,
    ),
  ].at(-1);
  if (!summary || summary[1] !== "ok") return "failed";
  const [, , passed, failed, ignored] = summary;
  if (passed === "1" && failed === "0" && ignored === "0") return "passed";
  if (passed === "0" && failed === "0" && ignored === "1") return "ignored";
  return "failed";
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  const error = new Error("Rust test profiling canceled");
  error.name = "AbortError";
  throw error;
}

async function appendRecord(file: string, record: object) {
  await appendFile(file, `${JSON.stringify(record)}\n`);
}
