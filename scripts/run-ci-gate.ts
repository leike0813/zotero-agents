import { spawn } from "child_process";
import { pathToFileURL } from "node:url";
import { getCiGateStages, type CiGateName } from "./ci-gate-plan";
import path from "node:path";
import { appendFile } from "node:fs/promises";
import { TestRunReport, npmCommand, runLoggedProcess } from "./test-run-report";

function normalizeGateName(value: string): CiGateName {
  const gate = value.trim().toLowerCase();
  if (
    gate === "pr" ||
    gate === "release" ||
    gate === "full" ||
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
  const runScript = options.runScript || runNpmScript;
  const stages = getCiGateStages(gate);
  const report =
    gate === "full" && options.reportRoot !== false
      ? await TestRunReport.create(options.reportRoot)
      : undefined;
  // Aggregate context belongs to this invocation, never to inherited shell state.
  delete env.ZOTERO_TEST_REPORT_DIR;
  delete env.ZOTERO_TEST_REPORT_SCOPE;
  if (report) env.ZOTERO_TEST_REPORT_DIR = report.directory;
  if (report) env.FORCE_COLOR = "0";
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
        if (gate !== "full") return exitCode;
      }
    }
    if (report) {
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
        await report.finish(interrupted || firstFailure);
      } catch {
        firstFailure ||= 1;
        console.log("! 报告未完整写入，结果不可视为通过。");
      }
      console.log(report.chart());
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
  void runCiGate(normalizeGateName(process.argv[2] || "pr")).then(
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
