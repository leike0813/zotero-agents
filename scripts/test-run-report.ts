import { spawn } from "node:child_process";
import { createReadStream, closeSync, openSync, writeSync } from "node:fs";
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";

export type TestFailure = {
  title: string;
  file?: string;
  message?: string;
  stack?: string;
  expected?: unknown;
  actual?: unknown;
};

export type TestResult = {
  id: string;
  label: string;
  status: "passed" | "failed" | "incomplete";
  exitCode: number;
  durationMs: number;
  command: string;
  log?: string;
  counts?: { passed: number; failed: number; pending: number };
  failures?: TestFailure[];
};

export function npmCommand(script: string, args: string[] = []) {
  const argv = ["run", script, ...(args.length ? ["--", ...args] : [])];
  return process.platform === "win32"
    ? { command: "cmd.exe", args: ["/d", "/s", "/c", "npm", ...argv] }
    : { command: "npm", args: argv };
}

export async function runLoggedProcess(
  command: string,
  args: string[],
  options: {
    log: string;
    env: NodeJS.ProcessEnv;
    signal?: AbortSignal;
    cwd?: string;
  },
): Promise<{ exitCode: number }> {
  await mkdir(path.dirname(options.log), { recursive: true });
  const fd = openSync(options.log, "w");
  // Share a file descriptor: no decoding, truncation, or output buffering in JS.
  try {
    return await new Promise((resolve) => {
      const child = spawn(command, args, {
        env: options.env,
        cwd: options.cwd,
        stdio: ["ignore", fd, fd],
        detached: process.platform !== "win32",
        windowsHide: true,
      });
      let failed = false;
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      const terminate = (force = false) => {
        if (!child.pid) return;
        if (process.platform === "win32") {
          const killer = spawn(
            "taskkill",
            ["/pid", String(child.pid), "/t", "/f"],
            { stdio: "ignore", windowsHide: true },
          );
          killer.on("error", () => child.kill());
        } else {
          try {
            process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
          } catch {
            /* Process already exited. */
          }
        }
      };
      const abort = () => {
        terminate();
        killTimer = setTimeout(() => terminate(true), 5000);
        killTimer.unref();
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      if (options.signal?.aborted) abort();
      child.on("error", (error) => {
        failed = true;
        writeSync(fd, `${error.stack || error}\n`);
      });
      child.on("close", (code, signal) => {
        if (options.signal?.aborted) terminate(true);
        clearTimeout(killTimer);
        options.signal?.removeEventListener("abort", abort);
        resolve({
          exitCode: options.signal?.aborted
            ? 130
            : failed
              ? 1
              : (code ??
                (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1)),
        });
      });
    });
  } finally {
    closeSync(fd);
  }
}

export async function writeTestResult(directory: string, result: TestResult) {
  const file = path.join(directory, "results", `${result.id}.summary.json`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, JSON.stringify(result, null, 2));
  await rename(`${file}.tmp`, file);
}

export async function readMochaReport(file: string) {
  const value = JSON.parse(await readFile(file, "utf8"));
  if (
    !value.stats ||
    !Array.isArray(value.failures) ||
    !Number.isFinite(value.stats.passes) ||
    !Number.isFinite(value.stats.failures)
  ) {
    throw new Error(`Incomplete Mocha report: ${file}`);
  }
  return {
    counts: {
      passed: value.stats.passes as number,
      failed: value.stats.failures as number,
      pending: Number(value.stats.pending || 0),
    },
    failures: value.failures.map(
      (test: {
        fullTitle?: string;
        title: string;
        file?: string;
        err?: Record<string, unknown>;
      }) => ({
        ...test.err,
        title: test.fullTitle || test.title,
        file: test.file,
      }),
    ) as TestFailure[],
  };
}

function duration(ms: number) {
  return ms < 1000
    ? `${ms}ms`
    : ms < 60000
      ? `${(ms / 1000).toFixed(1)}s`
      : `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
}

export class TestRunReport {
  readonly stages: TestResult[] = [];
  private children: TestResult[] = [];
  private readonly startedAt = Date.now();
  private exitCode: number | null = null;
  private finishedAt: number | null = null;

  private constructor(readonly directory: string) {}

  static async create(
    root = path.resolve("artifacts/test-diagnostics/npm-test"),
  ) {
    const directory = path.join(
      root,
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`,
    );
    await mkdir(path.join(directory, "results"), { recursive: true });
    await mkdir(path.join(directory, "logs"), { recursive: true });
    const latest = path.join(root, `latest-${process.pid}.tmp`);
    await writeFile(latest, JSON.stringify({ directory }, null, 2));
    await rename(latest, path.join(root, "latest.json"));
    const report = new TestRunReport(directory);
    await report.save();
    return report;
  }

  async record(result: TestResult) {
    this.stages.push(result);
    await this.save();
  }

  async finish(exitCode: number) {
    this.exitCode = exitCode;
    this.finishedAt = Date.now();
    try {
      await this.save();
    } catch (error) {
      this.exitCode ||= 1;
      throw error;
    }
  }

  private async save() {
    const names = (await readdir(path.join(this.directory, "results")))
      .filter((name) => name.endsWith(".summary.json"))
      .sort();
    this.children = await Promise.all(
      names.map(
        async (name) =>
          JSON.parse(
            await readFile(path.join(this.directory, "results", name), "utf8"),
          ) as TestResult,
      ),
    );
    const summary = {
      startedAt: new Date(this.startedAt).toISOString(),
      finishedAt: this.finishedAt
        ? new Date(this.finishedAt).toISOString()
        : null,
      exitCode: this.exitCode,
      stages: this.stages,
      children: this.children,
    };
    await writeFile(
      path.join(this.directory, "summary.json.tmp"),
      JSON.stringify(summary, null, 2),
    );
    await rename(
      path.join(this.directory, "summary.json.tmp"),
      path.join(this.directory, "summary.json"),
    );
    const reportPath = path.join(this.directory, "failures.md");
    const file = await open(`${reportPath}.tmp`, "w");
    try {
      await file.write(
        `# npm test 失败详情\n\n开始：${summary.startedAt}\n状态：${this.exitCode === null ? "运行中" : this.exitCode === 0 ? "通过" : "失败或中断"}\n\n`,
      );
      const failed = [...this.stages, ...this.children].filter(
        (result) => result.status !== "passed",
      );
      if (!failed.length)
        await file.write(
          this.exitCode === 0 ? "无失败。\n" : "尚未记录失败；运行尚未完成。\n",
        );
      for (const result of failed) {
        await file.write(
          `## ${result.label}\n\n状态：${result.status}；退出码：${result.exitCode}\n重跑：\`${result.command}\`\n日志：${result.log || "无"}\n\n`,
        );
        for (const failure of result.failures || []) {
          await file.write(
            `### ${failure.title}\n\n文件：${failure.file || "未提供"}\n\n`,
          );
          await file.write(
            `~~~~text\n${failure.stack || failure.message || "未提供错误堆栈"}\n~~~~\n\n`,
          );
          if (failure.expected !== undefined || failure.actual !== undefined)
            await file.write(
              `~~~~json\n${JSON.stringify({ expected: failure.expected, actual: failure.actual }, null, 2)}\n~~~~\n\n`,
            );
        }
        if (!result.failures?.length && result.log) {
          await file.write(
            "原始阶段输出（包括启动、编译或用例失败）：\n\n~~~~text\n",
          );
          for await (const chunk of createReadStream(result.log))
            await file.write(chunk);
          await file.write("\n~~~~\n\n");
        }
      }
    } finally {
      await file.close();
    }
    await rename(`${reportPath}.tmp`, reportPath);
  }

  chart() {
    const color =
      process.stdout.isTTY &&
      !process.env.NO_COLOR &&
      process.env.FORCE_COLOR !== "0";
    const cell = (result: TestResult) => {
      const [symbol, label, ansi] =
        result.status === "passed"
          ? ["✓", "PASS", 32]
          : result.status === "failed"
            ? ["✗", "FAIL", 31]
            : ["!", "INCOMPLETE", 33];
      const status = color
        ? `\x1b[${ansi}m${symbol} ${label}\x1b[0m`
        : `${symbol} ${label}`;
      return `${status}  ${result.label}  ${duration(result.durationMs)}`;
    };
    const lines = [
      `\n测试结果  ${this.exitCode === 0 ? "PASS" : this.exitCode === null ? "RUNNING" : "FAIL"}  · ${duration((this.finishedAt || Date.now()) - this.startedAt)}`,
      `阶段：${this.stages.filter((stage) => stage.status === "passed").length} 通过 · ${this.stages.filter((stage) => stage.status === "failed").length} 失败 · ${this.stages.filter((stage) => stage.status === "incomplete").length} 未完成`,
      "",
      ...this.stages.map(cell),
    ];
    if (this.children.length) {
      lines.push("", "分片 / 子阶段");
      const width = Math.max(40, Math.min(120, process.stdout.columns || 100));
      let row = "";
      for (const result of this.children) {
        const text = cell(result);
        if (
          row &&
          stripVTControlCharacters(row).length +
            stripVTControlCharacters(text).length +
            3 >
            width
        ) {
          lines.push(row);
          row = "";
        }
        row += `${row ? "   " : ""}${text}`;
      }
      if (row) lines.push(row);
    }
    lines.push("", `失败详情 → ${path.join(this.directory, "failures.md")}`);
    return lines.join("\n");
  }
}
