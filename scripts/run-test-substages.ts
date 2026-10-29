import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  npmCommand,
  runLoggedProcess,
  writeTestResult,
  type TestResult,
} from "./test-run-report";

export type TestSubstage = {
  id: string;
  script: string;
  args?: string[];
  zotero?: boolean;
};

export const NATIVE_STAGE1_STEPS: TestSubstage[] = [
  { id: "native-build", script: "build:synthesis-rust-sidecar" },
  {
    id: "native-worker-parity",
    script: "check:synthesis-native-worker-transfer-parity",
  },
  {
    id: "native-tests",
    script: "test:node",
    args: ["--suite", "synthesis-native-stage1"],
  },
  {
    id: "native-cross-language",
    script: "check:synthesis-cross-language-contracts",
    args: ["--stress"],
  },
];

export const ZOTERO_FULL_STEPS: TestSubstage[] = [
  { id: "zotero-core", script: "test:zotero:core:full", zotero: true },
  { id: "zotero-ui", script: "test:zotero:ui:full", zotero: true },
  { id: "zotero-workflow", script: "test:zotero:workflow:full", zotero: true },
  { id: "zotero-e2e", script: "test:zotero:e2e", zotero: true },
];

async function runInherited(step: TestSubstage, env: NodeJS.ProcessEnv) {
  const command = npmCommand(step.script, step.args);
  return new Promise<number>((resolve) => {
    const child = spawn(command.command, command.args, {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export async function runTestSubstages(
  steps: TestSubstage[],
  options: {
    env?: NodeJS.ProcessEnv;
    aggregate?: boolean;
    run?: typeof runInherited;
  } = {},
) {
  const env = options.env || process.env;
  const directory = env.ZOTERO_TEST_REPORT_DIR;
  const aggregate = options.aggregate ?? Boolean(directory);
  let firstFailure = 0;
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  if (directory) {
    process.on("SIGTERM", interrupt);
    process.on("SIGINT", interrupt);
  }
  try {
    for (const step of steps) {
      if (controller.signal.aborted) return 130;
      const started = Date.now();
      console.log(`[test-stage] ${step.id}`);
      const commandText = `npm run ${step.script}${step.args?.length ? ` -- ${step.args.join(" ")}` : ""}`;
      const log = directory
        ? path.join(directory, "logs", `${step.id}.log`)
        : undefined;
      const result: TestResult = {
        id: step.id,
        label: step.id,
        command: commandText,
        durationMs: 0,
        exitCode: 1,
        status: "failed",
        log,
      };
      try {
        const stepEnv = {
          ...env,
          ...(directory ? { ZOTERO_TEST_REPORT_SCOPE: step.id } : {}),
        };
        if (log && !options.run) {
          const command = npmCommand(step.script, step.args);
          result.exitCode = (
            await runLoggedProcess(command.command, command.args, {
              env: stepEnv,
              log,
              signal: controller.signal,
            })
          ).exitCode;
        } else
          result.exitCode = await (options.run || runInherited)(step, stepEnv);
        result.status = result.exitCode ? "failed" : "passed";
        if (directory && step.zotero) {
          const { readZoteroTestReport } = await import("./zotero-test-report");
          const evidence = await readZoteroTestReport(
            path.join(directory, "results", `${step.id}.events.jsonl`),
          );
          result.counts = evidence.counts;
          result.failures = evidence.failures;
          if (!evidence.complete) {
            result.status = "incomplete";
            result.exitCode ||= 1;
          } else if (evidence.failures.length) {
            result.status = "failed";
            result.exitCode ||= 1;
          }
        }
      } catch (error) {
        result.exitCode ||= 1;
        result.status = "failed";
        if (log)
          await appendFile(
            log,
            `\n${error instanceof Error ? error.stack : error}\n`,
          ).catch(() => undefined);
        else console.error(error);
      }
      result.durationMs = Date.now() - started;
      if (directory) {
        try {
          await writeTestResult(directory, result);
        } catch (error) {
          result.exitCode ||= 1;
          console.error(error);
        }
      }
      firstFailure ||= result.exitCode;
      if (firstFailure && !aggregate) return firstFailure;
    }
    return controller.signal.aborted ? 130 : firstFailure;
  } finally {
    if (directory) {
      process.removeListener("SIGTERM", interrupt);
      process.removeListener("SIGINT", interrupt);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void runTestSubstages(NATIVE_STAGE1_STEPS).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
