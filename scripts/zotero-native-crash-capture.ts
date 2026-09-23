import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const ZOTERO_NATIVE_CRASH_SUMMARY_SCHEMA =
  "zotero-native-crash-summary.v1" as const;

export type WindowsZoteroProcess = {
  processId: number;
  executablePath: string;
  commandLine: string;
};

export type CdbCrashFrame = {
  module: string;
  symbol: string;
  offset?: string;
};

export type CdbCrashThread = {
  index: number;
  faulting: boolean;
  frames: CdbCrashFrame[];
};

export type CdbCrashEvidence = {
  processType: string;
  productName?: string;
  version?: string;
  buildId?: string;
  exceptionCode?: string;
  faultingModule?: string;
  failureBucket?: string;
  faultingStack: CdbCrashFrame[];
  threads: CdbCrashThread[];
  evidenceGaps: string[];
};

export type ZoteroNativeCrashSummary = {
  schema: typeof ZOTERO_NATIVE_CRASH_SUMMARY_SCHEMA;
  status: "no_crash_observed" | "crash_captured" | "capture_incomplete";
  host: {
    platform: "windows";
    architecture: string;
    productName?: string;
    version?: string;
    buildId?: string;
    platformBuildId?: string;
    sourceStamp?: string;
  };
  dumpCount: number;
  crashes: CdbCrashEvidence[];
  evidenceGaps: string[];
};

type CdbRunResult = { exitCode: number; output: string };

export type ZoteroNativeCrashCapture = {
  env: NodeJS.ProcessEnv;
  finish: () => Promise<ZoteroNativeCrashSummary>;
};

function pathApiFor(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value) ? path.win32 : path;
}

function isUnderDirectory(child: string, parent: string) {
  const api = pathApiFor(parent);
  const relative = api.relative(api.resolve(parent), api.resolve(child));
  return (
    Boolean(relative) && !relative.startsWith("..") && !api.isAbsolute(relative)
  );
}

export function resolveNativeCrashPrivateRoot(
  env: NodeJS.ProcessEnv = process.env,
) {
  const explicit = String(env.ZOTERO_NATIVE_CRASH_PRIVATE_DIR || "").trim();
  if (explicit) return pathApiFor(explicit).resolve(explicit);
  const base = String(
    (env.CI ? env.RUNNER_TEMP : "") || env.LOCALAPPDATA || os.tmpdir(),
  ).trim();
  const api = pathApiFor(base);
  return api.join(base, "Zotero Agents", "crash-captures");
}

export function buildZoteroNativeCrashEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const captured = {
    ...env,
    MOZ_CRASHREPORTER: "1",
    MOZ_CRASHREPORTER_NO_REPORT: "1",
    MOZ_CRASHREPORTER_FULLDUMP: "1",
  };
  delete captured.MOZ_CRASHREPORTER_DISABLE;
  return captured;
}

export function selectNewCrashArtifactNames(
  baseline: ReadonlySet<string>,
  current: readonly string[],
) {
  return current
    .filter(
      (name) =>
        !baseline.has(name) && /\.(?:dmp|extra)$/i.test(path.basename(name)),
    )
    .sort();
}

function normalizedWindowsPath(value: string) {
  return path.win32.resolve(value).replaceAll("/", "\\").toLowerCase();
}

export function selectWindowsZoteroHostProcess(
  processes: readonly WindowsZoteroProcess[],
  expected: { installRoot: string; profileDir: string },
) {
  const installRoot = normalizedWindowsPath(expected.installRoot);
  const profileDir = normalizedWindowsPath(expected.profileDir);
  const matches = processes.filter((process) => {
    if (!process.processId || !process.executablePath || !process.commandLine) {
      return false;
    }
    const executable = normalizedWindowsPath(process.executablePath);
    const relative = path.win32.relative(installRoot, executable);
    if (
      !relative ||
      relative.startsWith("..") ||
      path.win32.isAbsolute(relative)
    ) {
      return false;
    }
    return process.commandLine
      .replaceAll("/", "\\")
      .toLowerCase()
      .includes(profileDir);
  });
  return matches.length === 1 ? matches[0] : null;
}

function runPowerShellJson(command: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error("zotero_native_crash_process_query_failed"));
        return;
      }
      const raw = Buffer.concat(stdout).toString("utf8").trim();
      if (!raw) {
        resolve([]);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        void stderr;
        reject(new Error("zotero_native_crash_process_query_invalid"));
      }
    });
  });
}

async function queryWindowsZoteroProcesses(): Promise<WindowsZoteroProcess[]> {
  const parsed = await runPowerShellJson(
    "Get-CimInstance Win32_Process -Filter \"Name = 'zotero.exe'\" | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress",
  );
  const rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const processId = Number(record.ProcessId);
    const executablePath = String(record.ExecutablePath || "").trim();
    const commandLine = String(record.CommandLine || "").trim();
    return Number.isInteger(processId) && processId > 0
      ? [{ processId, executablePath, commandLine }]
      : [];
  });
}

export async function waitForWindowsZoteroHostProcess(args: {
  installRoot: string;
  profileDir: string;
  timeoutMs?: number;
}) {
  const deadline = Date.now() + (args.timeoutMs || 60_000);
  while (Date.now() < deadline) {
    const selected = selectWindowsZoteroHostProcess(
      await queryWindowsZoteroProcesses(),
      args,
    );
    if (selected) return selected;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("zotero_native_crash_host_process_not_found");
}

export async function waitForWindowsZoteroHostExit(
  processId: number,
  timeoutMs = 24 * 60 * 60 * 1000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const alive = (await queryWindowsZoteroProcesses()).some(
      (process) => process.processId === processId,
    );
    if (!alive) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("zotero_native_crash_host_process_exit_timeout");
}

export function terminateWindowsZoteroHostProcess(processId: number) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      "taskkill.exe",
      ["/PID", String(processId), "/T", "/F"],
      { stdio: "ignore", windowsHide: true },
    );
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error("zotero_native_crash_host_termination_failed"));
    });
  });
}

export async function stagePrivateZoteroCrashFixture(args: {
  profileSource: string;
  dataSource: string;
  privateRoot?: string;
  workspaceRoot?: string;
  env?: NodeJS.ProcessEnv;
}) {
  const privateRoot = path.resolve(
    args.privateRoot || resolveNativeCrashPrivateRoot(args.env),
  );
  const workspaceRoot = path.resolve(args.workspaceRoot || process.cwd());
  if (
    privateRoot === workspaceRoot ||
    isUnderDirectory(privateRoot, workspaceRoot)
  ) {
    throw new Error("zotero_native_crash_private_root_inside_workspace");
  }
  await Promise.all([access(args.profileSource), access(args.dataSource)]);
  const root = path.join(
    privateRoot,
    `manual-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
  );
  const profileDir = path.join(root, "profile");
  const dataDir = path.join(root, "data");
  await mkdir(root, { recursive: true });
  await Promise.all([
    cp(args.profileSource, profileDir, { recursive: true, force: true }),
    cp(args.dataSource, dataDir, { recursive: true, force: true }),
  ]);
  await Promise.all(
    ["parent.lock", ".parentlock", "lock"].map((name) =>
      rm(path.join(profileDir, name), { force: true }),
    ),
  );
  return {
    root,
    profileDir,
    dataDir,
    cleanup: () =>
      Promise.all([
        rm(profileDir, { recursive: true, force: true }),
        rm(dataDir, { recursive: true, force: true }),
      ]).then(() => undefined),
  };
}

function safeToken(value: unknown) {
  const text = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,128}$/.test(text) ? text : undefined;
}

function safeBuildId(value: unknown) {
  const text = String(value || "").trim();
  return /^[A-Fa-f0-9]{8,64}$/.test(text) ? text : undefined;
}

function safeFailureBucket(value: string) {
  const text = value.trim();
  return /^[A-Za-z0-9_.$!+<>?@:-]{1,512}$/.test(text) ? text : undefined;
}

function parseFrame(line: string): CdbCrashFrame | undefined {
  const match = line.match(
    /^\s*[0-9a-f]{1,3}\s+[0-9a-f`]+\s+[0-9a-f`]+\s+([A-Za-z0-9_.-]+)!([^\s+\\/]+)(?:\+0x([0-9a-f]+))?/i,
  );
  if (!match) return undefined;
  const module = safeToken(match[1]);
  const symbol = match[2] && !match[2].includes("://") ? match[2] : undefined;
  if (!module || !symbol) return undefined;
  return {
    module,
    symbol,
    ...(match[3] ? { offset: `0x${match[3].toLowerCase()}` } : {}),
  };
}

export function parseCdbCrashEvidence(
  output: string,
  extra: Record<string, unknown> = {},
): CdbCrashEvidence {
  const lines = output.split(/\r?\n/);
  const exceptionMatch = output.match(
    /(?:EXCEPTION_CODE:[^\r\n]*?|ExceptionCode:\s*)(0x)?([0-9a-f]{8})\b/i,
  );
  const imageMatch = output.match(/^IMAGE_NAME:\s*([^\s]+)\s*$/im);
  const moduleMatch = output.match(/^MODULE_NAME:\s*([^\s]+)\s*$/im);
  const bucketMatch = output.match(/^FAILURE_BUCKET_ID:\s*(.+)$/im);
  const faultingStack: CdbCrashFrame[] = [];
  const threads: CdbCrashThread[] = [];
  let section: "other" | "faulting" | "threads" = "other";
  let currentThread: CdbCrashThread | undefined;
  for (const line of lines) {
    if (line.includes("===FAULTING_STACK===")) {
      section = "faulting";
      continue;
    }
    if (line.includes("===ALL_THREADS===")) {
      section = "threads";
      continue;
    }
    if (line.includes("===MODULES===")) {
      section = "other";
      continue;
    }
    if (section === "threads") {
      const thread = line.match(/^\s*(\.)?\s*([0-9a-f]+)\s+Id:/i);
      if (thread) {
        currentThread = {
          index: Number.parseInt(thread[2], 16),
          faulting: Boolean(thread[1]),
          frames: [],
        };
        threads.push(currentThread);
        continue;
      }
    }
    const frame = parseFrame(line);
    if (!frame) continue;
    if (section === "faulting") faultingStack.push(frame);
    else if (section === "threads" && currentThread) {
      currentThread.frames.push(frame);
    }
  }
  const processType = safeToken(extra.ProcessType) || "main";
  const productName = safeToken(extra.ProductName);
  const version = safeToken(extra.Version);
  const buildId = safeBuildId(extra.BuildID);
  const faultingModule =
    safeToken(imageMatch?.[1]) || safeToken(moduleMatch?.[1]);
  const evidenceGaps: string[] = [];
  if (!exceptionMatch) evidenceGaps.push("exception_code_missing");
  if (!faultingModule) evidenceGaps.push("faulting_module_missing");
  if (faultingStack.length === 0) evidenceGaps.push("faulting_stack_missing");
  if (threads.length === 0) evidenceGaps.push("thread_stacks_missing");
  return {
    processType,
    ...(productName ? { productName } : {}),
    ...(version ? { version } : {}),
    ...(buildId ? { buildId } : {}),
    ...(exceptionMatch
      ? { exceptionCode: `0x${exceptionMatch[2].toLowerCase()}` }
      : {}),
    ...(faultingModule ? { faultingModule } : {}),
    ...(() => {
      const failureBucket = bucketMatch
        ? safeFailureBucket(bucketMatch[1])
        : undefined;
      return failureBucket ? { failureBucket } : {};
    })(),
    faultingStack,
    threads,
    evidenceGaps,
  };
}

async function listCrashArtifacts(minidumpsDir: string) {
  try {
    return await readdir(minidumpsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findCdb(
  env: NodeJS.ProcessEnv,
  explicitPath?: string,
): Promise<string | undefined> {
  const explicit = String(
    explicitPath || env.ZOTERO_NATIVE_CRASH_CDB_PATH || "",
  ).trim();
  if (explicit) return (await fileExists(explicit)) ? explicit : undefined;
  for (const directory of String(env.PATH || "").split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, "cdb.exe");
    if (await fileExists(candidate)) return candidate;
  }
  for (const base of [env["ProgramFiles(x86)"], env.ProgramFiles]) {
    if (!base) continue;
    const candidate = path.join(
      base,
      "Windows Kits",
      "10",
      "Debuggers",
      "x64",
      "cdb.exe",
    );
    if (await fileExists(candidate)) return candidate;
  }
  return undefined;
}

function runCdbProcess(args: {
  cdbPath: string;
  dumpPath: string;
  symbolCache: string;
}): Promise<CdbRunResult> {
  const commands = [
    ".reload",
    ".echo ===ANALYZE===",
    "!analyze -v",
    ".echo ===CONTEXT===",
    ".ecxr",
    ".echo ===FAULTING_STACK===",
    "kn",
    ".echo ===ALL_THREADS===",
    "~* kn",
    ".echo ===MODULES===",
    "lm",
    "q",
  ].join("; ");
  return new Promise((resolve, reject) => {
    const child = spawn(
      args.cdbPath,
      [
        "-z",
        args.dumpPath,
        "-y",
        `srv*${args.symbolCache}*https://msdl.microsoft.com/download/symbols`,
        "-c",
        commands,
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => child.kill(), 300_000);
    child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: typeof code === "number" ? code : 1,
        output: Buffer.concat(chunks).toString("utf8"),
      });
    });
  });
}

async function moveFile(source: string, target: string) {
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await rename(source, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
    await cp(source, target, { force: true });
    await rm(source, { force: true });
  }
}

async function readExtra(extraPath: string) {
  try {
    const parsed = JSON.parse(await readFile(extraPath, "utf8"));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function readPlatformIdentity(binaryPath: string) {
  try {
    const raw = await readFile(
      path.join(path.dirname(binaryPath), "platform.ini"),
      "utf8",
    );
    const fields = Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.match(/^(BuildID|SourceStamp)=(.+)$/))
        .filter(Boolean)
        .map((match) => [match![1], match![2].trim()]),
    );
    return {
      platformBuildId: safeBuildId(fields.BuildID),
      sourceStamp: safeBuildId(fields.SourceStamp),
    };
  } catch {
    return {};
  }
}

async function persistSummary(
  summaryPath: string,
  summary: ZoteroNativeCrashSummary,
) {
  await mkdir(path.dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

export async function startZoteroNativeCrashCapture(args: {
  profileDir: string;
  privateRoot?: string;
  publicSummaryPath: string;
  zoteroBinaryPath: string;
  workspaceRoot?: string;
  env?: NodeJS.ProcessEnv;
  cdbPath?: string;
  runCdb?: (args: {
    cdbPath: string;
    dumpPath: string;
    symbolCache: string;
  }) => Promise<CdbRunResult>;
  settleMs?: number;
}): Promise<ZoteroNativeCrashCapture> {
  const env = args.env || process.env;
  const privateRoot = path.resolve(
    args.privateRoot || resolveNativeCrashPrivateRoot(env),
  );
  const workspaceRoot = path.resolve(args.workspaceRoot || process.cwd());
  if (
    privateRoot === workspaceRoot ||
    isUnderDirectory(privateRoot, workspaceRoot)
  ) {
    throw new Error("zotero_native_crash_private_root_inside_workspace");
  }
  const host = {
    platform: "windows" as const,
    architecture: process.arch,
    ...(await readPlatformIdentity(args.zoteroBinaryPath)),
  };
  const cdbPath = await findCdb(env, args.cdbPath);
  if (!cdbPath) {
    const summary: ZoteroNativeCrashSummary = {
      schema: ZOTERO_NATIVE_CRASH_SUMMARY_SCHEMA,
      status: "capture_incomplete",
      host,
      dumpCount: 0,
      crashes: [],
      evidenceGaps: ["cdb_unavailable"],
    };
    await persistSummary(args.publicSummaryPath, summary);
    throw new Error("zotero_native_crash_cdb_unavailable");
  }
  const minidumpsDir = path.join(args.profileDir, "minidumps");
  const baseline = new Set(await listCrashArtifacts(minidumpsDir));
  const sessionRoot = path.join(
    privateRoot,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
  );
  const rawRoot = path.join(sessionRoot, "raw");
  const symbolCache = path.join(privateRoot, "symbols");
  await mkdir(rawRoot, { recursive: true });
  let finished: Promise<ZoteroNativeCrashSummary> | undefined;
  return {
    env: buildZoteroNativeCrashEnvironment(env),
    finish: () => {
      if (finished) return finished;
      finished = (async () => {
        const settleMs = args.settleMs ?? 1_000;
        if (settleMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, settleMs));
        }
        const names = selectNewCrashArtifactNames(
          baseline,
          await listCrashArtifacts(minidumpsDir),
        );
        const dumpNames = names.filter((name) =>
          name.toLowerCase().endsWith(".dmp"),
        );
        if (dumpNames.length === 0) {
          const summary: ZoteroNativeCrashSummary = {
            schema: ZOTERO_NATIVE_CRASH_SUMMARY_SCHEMA,
            status: "no_crash_observed",
            host,
            dumpCount: 0,
            crashes: [],
            evidenceGaps: [],
          };
          await persistSummary(args.publicSummaryPath, summary);
          await rm(sessionRoot, { recursive: true, force: true });
          return summary;
        }
        const crashes: CdbCrashEvidence[] = [];
        const evidenceGaps: string[] = [];
        for (const [index, dumpName] of dumpNames.entries()) {
          const stem = dumpName.slice(0, -4);
          const privateDump = path.join(rawRoot, dumpName);
          try {
            await moveFile(path.join(minidumpsDir, dumpName), privateDump);
            const extraName = names.find(
              (name) => name.toLowerCase() === `${stem.toLowerCase()}.extra`,
            );
            let extra: Record<string, unknown> = {};
            if (extraName) {
              const privateExtra = path.join(rawRoot, extraName);
              await moveFile(path.join(minidumpsDir, extraName), privateExtra);
              extra = await readExtra(privateExtra);
            } else {
              evidenceGaps.push(`dump_${index + 1}_extra_missing`);
            }
            const result = await (args.runCdb || runCdbProcess)({
              cdbPath,
              dumpPath: privateDump,
              symbolCache,
            });
            await writeFile(
              path.join(rawRoot, `${stem}.cdb.log`),
              result.output,
              "utf8",
            );
            if (result.exitCode !== 0) {
              evidenceGaps.push(`dump_${index + 1}_cdb_failed`);
              continue;
            }
            crashes.push(parseCdbCrashEvidence(result.output, extra));
          } catch {
            evidenceGaps.push(`dump_${index + 1}_analysis_failed`);
          }
        }
        const first = crashes[0];
        const summary: ZoteroNativeCrashSummary = {
          schema: ZOTERO_NATIVE_CRASH_SUMMARY_SCHEMA,
          status:
            crashes.length === dumpNames.length
              ? "crash_captured"
              : "capture_incomplete",
          host: {
            ...host,
            ...(first?.productName ? { productName: first.productName } : {}),
            ...(first?.version ? { version: first.version } : {}),
            ...(first?.buildId ? { buildId: first.buildId } : {}),
          },
          dumpCount: dumpNames.length,
          crashes,
          evidenceGaps,
        };
        await persistSummary(args.publicSummaryPath, summary);
        return summary;
      })();
      return finished;
    },
  };
}
