import { spawn } from "child_process";
import { pathToFileURL } from "node:url";
import { getCiGateStages, type CiGateName } from "./ci-gate-plan";
import path from "node:path";
import { appendFile } from "node:fs/promises";
import { TestRunReport, npmCommand, runLoggedProcess } from "./test-run-report";
import {
  recordProfileSpan,
  writeProfileMetadata,
  writeTestProfile,
} from "./test-profile";
import { profileRustTests } from "./test-rust-profile";
import { testWorkerCount } from "./test-scheduler";

function normalizeGateName(value: string): CiGateName {
  const gate = value.trim().toLowerCase();
  if (
    gate === "pr" ||
    gate === "release" ||
    gate === "full" ||
    gate === "deep" ||
    gate === "workflow"
  )
    return gate;
  throw new Error(`Unknown test gate: ${value}`);
}

async function runNpmScript(
  scriptName: string,
  env: NodeJS.ProcessEnv,
  args: string[] = [],
) {
  const command = npmCommand(scriptName, args);
  const child = spawn(command.command, command.args, {
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  return await new Promise<number>((resolve) => {
    child.on("error", () => resolve(1));
    child.on("close", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
}

export async function runCiGate(
  gate: CiGateName,
  options: {
    env?: NodeJS.ProcessEnv;
    runScript?: typeof runNpmScript;
    reportRoot?: string | false;
    profile?: boolean;
    jobs?: number;
  } = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...(options.env || process.env),
    ZOTERO_WORKFLOW_E2E_MODE: "offline",
  };
  for (const key of Object.keys(env)) {
    if (
      (key.startsWith("ZOTERO_WORKFLOW_E2E_") &&
        key !== "ZOTERO_WORKFLOW_E2E_MODE") ||
      key.startsWith("ZOTERO_SYSTEM_E2E_RESUME_") ||
      key.startsWith("ZOTERO_E2E_GOLD_") ||
      [
        "ZOTERO_TEST_GREP",
        "ZOTERO_SYSTEM_E2E_FAMILIES",
        "ZOTERO_SYSTEM_E2E_COMPLETED_CASES",
        "ZOTERO_E2E_FIXTURE",
      ].includes(key)
    )
      delete env[key];
  }
  if (gate === "workflow") env.ZOTERO_SYSTEM_E2E_FAMILIES = "WF";
  // Only the selected gate owns stress policy; shell state cannot expand a routine run.
  delete env.SYNTHESIS_PROTOCOL_STRESS;
  if (options.jobs) env.ZOTERO_TEST_JOBS = String(options.jobs);
  const runScript = options.runScript || runNpmScript;
  const stages = getCiGateStages(gate);
  const report =
    (gate === "full" || gate === "deep") && options.reportRoot !== false
      ? await TestRunReport.create(options.reportRoot)
      : undefined;
  // Aggregate context belongs to this invocation, never to inherited shell state.
  delete env.ZOTERO_TEST_REPORT_DIR;
  delete env.ZOTERO_TEST_REPORT_SCOPE;
  delete env.ZOTERO_TEST_PROFILE_DIR;
  if (report) env.ZOTERO_TEST_REPORT_DIR = report.directory;
  if (report) env.FORCE_COLOR = "0";
  if (report && options.profile) {
    env.ZOTERO_TEST_PROFILE_DIR = report.directory;
    writeProfileMetadata(report.directory, {
      gate,
      jobs: testWorkerCount(env.ZOTERO_TEST_JOBS),
    });
  }
  const controller = new AbortController();
  let interrupted = 0;
  const interrupt = (signal: NodeJS.Signals) => {
    interrupted = signal === "SIGINT" ? 130 : 143;
    controller.abort();
  };
  const onInt = () => interrupt("SIGINT");
  const onTerm = () => interrupt("SIGTERM");
  if (report) {
    process.on("SIGINT", onInt);
    process.on("SIGTERM", onTerm);
    console.log(`完整测试 · ${stages.length} 阶段 · 报告 ${report.directory}`);
  }
  let firstFailure = 0;
  const suiteStarted = performance.now();
  try {
    for (const [index, stage] of stages.entries()) {
      if (interrupted) break;
      const started = Date.now();
      const progress = () => {
        const text = `[${index + 1}/${stages.length}] ${stage.id} · ${Math.floor((Date.now() - started) / 1000)}s`;
        if (process.stdout.isTTY && report)
          process.stdout.write(`\r\x1b[2K${text}`);
        else console.log(text);
      };
      progress();
      const heartbeat = setInterval(progress, 30000);
      const log = report
        ? path.join(report.directory, "logs", `${stage.id}.log`)
        : undefined;
      const stageEnv = { ...env, ZOTERO_TEST_REPORT_SCOPE: stage.id };
      if (!report) delete stageEnv.ZOTERO_TEST_REPORT_SCOPE;
      let exitCode: number;
      try {
        if (log && !options.runScript) {
          const command = npmCommand(stage.script, stage.args);
          exitCode = (
            await runLoggedProcess(command.command, command.args, {
              log,
              env: stageEnv,
              signal: controller.signal,
            })
          ).exitCode;
        } else exitCode = await runScript(stage.script, stageEnv, stage.args);
      } catch (error) {
        exitCode = 1;
        if (log)
          await appendFile(
            log,
            `${error instanceof Error ? error.stack : error}\n`,
          ).catch(() => undefined);
      } finally {
        clearInterval(heartbeat);
        if (process.stdout.isTTY && report) process.stdout.write("\r\x1b[2K");
      }
      console.log(
        `[${index + 1}/${stages.length}] ${exitCode === 0 ? "✓" : "✗"} ${stage.id} · ${Math.floor((Date.now() - started) / 1000)}s`,
      );
      if (report) {
        try {
          await report.record({
            id: stage.id,
            label: stage.id.replace(/^check-/, "").replace(/^test-/, ""),
            status: interrupted ? "incomplete" : exitCode ? "failed" : "passed",
            exitCode,
            durationMs: Date.now() - started,
            command: `npm run ${stage.script}${stage.args?.length ? ` -- ${stage.args.join(" ")}` : ""}`,
            log,
          });
        } catch {
          exitCode ||= 1;
          console.log("! 报告写入失败，已保留的日志见报告目录。");
        }
      }
      if (exitCode !== 0) {
        firstFailure ||= exitCode;
        if (gate !== "full" && gate !== "deep") return exitCode;
      }
    }
    if (report) {
      if (options.profile)
        recordProfileSpan(
          {
            name: `${gate} suite (excluding supplemental sampling)`,
            kind: "regular-suite",
            startMs: performance.timeOrigin + suiteStarted,
            durationMs: performance.now() - suiteStarted,
            status: interrupted
              ? "incomplete"
              : firstFailure
                ? "failed"
                : "passed",
          },
          report.directory,
        );
      for (const stage of stages.slice(report.stages.length)) {
        await report.record({
          id: stage.id,
          label: stage.id,
          status: "incomplete",
          exitCode: interrupted || 1,
          durationMs: 0,
          command: `npm run ${stage.script}`,
        });
      }
      try {
        if (options.profile && !interrupted && !options.runScript) {
          for (const stage of stages.filter((stage) =>
            [
              "test:synthesis-rust-sidecar",
              "test:host-bridge:rust",
              "test:acp-ws-bridge:rust",
            ].includes(stage.script),
          )) {
            if (interrupted) break;
            const started = performance.now();
            let exitCode = 0;
            const failures: Array<{ title: string; message: string }> = [];
            console.log(`[profile] ${stage.script} · isolated Rust samples`);
            try {
              await profileRustTests({
                script: stage.script,
                directory: report.directory,
                signal: controller.signal,
              });
            } catch (error) {
              exitCode = 1;
              failures.push({ title: stage.script, message: String(error) });
            }
            firstFailure ||= exitCode;
            await report.record({
              id: `profile-${stage.id}`,
              label: `profile ${stage.id}`,
              status: interrupted
                ? "incomplete"
                : exitCode
                  ? "failed"
                  : "passed",
              exitCode,
              durationMs: performance.now() - started,
              command: "isolated Rust profiling (supplemental)",
              failures,
            });
          }
        }
        await report.finish(interrupted || firstFailure);
      } catch {
        firstFailure ||= 1;
        console.log("! 报告未完整写入，结果不可视为通过。");
      }
      console.log(report.chart());
      if (options.profile) writeTestProfile(report.directory);
    }
    return interrupted || firstFailure;
  } finally {
    if (report) {
      process.removeListener("SIGINT", onInt);
      process.removeListener("SIGTERM", onTerm);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const jobsArg =
    process.argv.find((arg) => arg.startsWith("--jobs="))?.slice(7) ??
    (process.argv.includes("--jobs")
      ? process.argv[process.argv.indexOf("--jobs") + 1] || ""
      : undefined);
  void runCiGate(normalizeGateName(process.argv[2] || "pr"), {
    profile: process.argv.includes("--profile"),
    ...(jobsArg !== undefined ? { jobs: testWorkerCount(jobsArg) } : {}),
  }).then(
    (exitCode) => {
      process.exit(exitCode);
    },
    () => {
      console.error(
        "! 测试报告未能完成，请检查 artifacts/test-diagnostics/npm-test 中的日志。",
      );
      process.exitCode = 1;
    },
  );
}
