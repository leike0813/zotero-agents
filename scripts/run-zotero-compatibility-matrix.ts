import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  acquireZoteroHost,
  acquireZoteroMachineRunLock,
  buildCompatibilityPlan,
  cleanupRunLayoutState,
  createCompatibilityReceipt,
  createRunLayout,
  loadCompatibilityManifest,
  materializeZoteroHostForRun,
  resolveCompatibilityTarget,
  runOwnedCommand,
  sha256File,
  writeCompatibilityReceipt,
  type CompatibilityGate,
  type CompatibilityMode,
  type CompatibilityReceipt,
  type CompatibilitySuite,
} from "./zotero-compatibility-fixture";

const PROJECT_ROOT = process.cwd();
const DEFAULT_MANIFEST = path.join(
  PROJECT_ROOT,
  "test/zotero/compatibility-matrix.json",
);

type CliOptions = {
  command: "plan" | "acquire" | "run" | "matrix" | "help";
  gate: CompatibilityGate;
  targetId: string;
  mode: CompatibilityMode;
  suite: CompatibilitySuite;
  domain: "all" | "core" | "ui" | "workflow";
  manifestPath: string;
  cacheRoot: string;
  runsRoot: string;
  buildRoot: string;
  timeoutMs: number;
  dryRun: boolean;
  json: boolean;
};

function valueAfter(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

export function parseCompatibilityCliArgs(args: string[]): CliOptions {
  const command = (args[0] || "help") as CliOptions["command"];
  if (!["plan", "acquire", "run", "matrix", "help"].includes(command)) {
    throw new Error(`Unknown compatibility command: ${command}`);
  }
  const options: CliOptions = {
    command,
    gate: "pull-request",
    targetId: "",
    mode: "behavior",
    suite: "lite",
    domain: "all",
    manifestPath: DEFAULT_MANIFEST,
    cacheRoot: path.join(
      os.homedir(),
      ".cache",
      "zotero-agents",
      "zotero-hosts",
    ),
    runsRoot: path.join(os.tmpdir(), "zotero-agents-compat"),
    buildRoot: path.join(PROJECT_ROOT, ".scaffold", "build"),
    timeoutMs: 30 * 60_000,
    dryRun: false,
    json: false,
  };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else if (arg.startsWith("--gate="))
      options.gate = arg.slice(7) as CompatibilityGate;
    else if (arg === "--gate")
      options.gate = valueAfter(args, index++, arg) as CompatibilityGate;
    else if (arg.startsWith("--target=")) options.targetId = arg.slice(9);
    else if (arg === "--target")
      options.targetId = valueAfter(args, index++, arg);
    else if (arg.startsWith("--mode="))
      options.mode = arg.slice(7) as CompatibilityMode;
    else if (arg === "--mode")
      options.mode = valueAfter(args, index++, arg) as CompatibilityMode;
    else if (arg.startsWith("--suite="))
      options.suite = arg.slice(8) as CompatibilitySuite;
    else if (arg === "--suite")
      options.suite = valueAfter(args, index++, arg) as CompatibilitySuite;
    else if (arg.startsWith("--domain="))
      options.domain = arg.slice(9) as CliOptions["domain"];
    else if (arg === "--domain")
      options.domain = valueAfter(args, index++, arg) as CliOptions["domain"];
    else if (arg.startsWith("--manifest="))
      options.manifestPath = path.resolve(arg.slice(11));
    else if (arg === "--manifest")
      options.manifestPath = path.resolve(valueAfter(args, index++, arg));
    else if (arg.startsWith("--cache-root="))
      options.cacheRoot = path.resolve(arg.slice(13));
    else if (arg === "--cache-root")
      options.cacheRoot = path.resolve(valueAfter(args, index++, arg));
    else if (arg.startsWith("--runs-root="))
      options.runsRoot = path.resolve(arg.slice(12));
    else if (arg === "--runs-root")
      options.runsRoot = path.resolve(valueAfter(args, index++, arg));
    else if (arg.startsWith("--build-root="))
      options.buildRoot = path.resolve(arg.slice(13));
    else if (arg === "--build-root")
      options.buildRoot = path.resolve(valueAfter(args, index++, arg));
    else if (arg.startsWith("--timeout-ms="))
      options.timeoutMs = Number(arg.slice(13));
    else if (arg === "--timeout-ms")
      options.timeoutMs = Number(valueAfter(args, index++, arg));
    else throw new Error(`Unknown compatibility option: ${arg}`);
  }
  if (!["pull-request", "main", "release"].includes(options.gate)) {
    throw new Error(`Unsupported compatibility gate: ${options.gate}`);
  }
  if (!["behavior", "xpi-smoke"].includes(options.mode)) {
    throw new Error(`Unsupported compatibility mode: ${options.mode}`);
  }
  if (!["lite", "full"].includes(options.suite)) {
    throw new Error(`Unsupported compatibility suite: ${options.suite}`);
  }
  if (!["all", "core", "ui", "workflow"].includes(options.domain)) {
    throw new Error(`Unsupported compatibility domain: ${options.domain}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error("Compatibility timeout must be at least 1000 ms");
  }
  return options;
}

function execFileOutput(file: string, args: string[]) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      file,
      args,
      { cwd: PROJECT_ROOT, encoding: "utf8" },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(String(stdout).trim());
      },
    );
  });
}

async function sourceIdentity() {
  const commit =
    String(process.env.GITHUB_SHA || "").trim() ||
    (await execFileOutput("git", ["rev-parse", "HEAD"]));
  const dirty = Boolean(await execFileOutput("git", ["status", "--porcelain"]));
  return { commit, dirty };
}

async function pluginIdentity(buildRoot: string) {
  const xpiPath = path.join(buildRoot, "zotero-agents.xpi");
  const manifestPath = path.join(buildRoot, "addon", "manifest.json");
  const [manifestText, artifactSha256] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    sha256File(xpiPath),
  ]);
  const manifest = JSON.parse(manifestText);
  return {
    version: String(manifest.version || "unknown"),
    artifactPath: xpiPath,
    artifactSha256,
    manifestMin: String(
      manifest.applications?.zotero?.strict_min_version || "",
    ),
    manifestMax: String(
      manifest.applications?.zotero?.strict_max_version || "",
    ),
  };
}

async function unavailablePluginIdentity(buildRoot: string) {
  let manifest: any = {};
  try {
    manifest = JSON.parse(
      await fs.readFile(
        path.join(PROJECT_ROOT, "addon", "manifest.json"),
        "utf8",
      ),
    );
  } catch {
    // The structured build error remains the authoritative failure.
  }
  return {
    version: String(manifest.version || "unknown"),
    artifactPath: path.join(buildRoot, "zotero-agents.xpi"),
    artifactSha256: "",
    manifestMin: String(
      manifest.applications?.zotero?.strict_min_version || "",
    ),
    manifestMax: String(
      manifest.applications?.zotero?.strict_max_version || "",
    ),
  };
}

async function finishReceipt(
  receiptPath: string,
  receipt: CompatibilityReceipt,
) {
  receipt.timing.finishedAt = new Date().toISOString();
  receipt.timing.durationMs =
    Date.parse(receipt.timing.finishedAt) -
    Date.parse(receipt.timing.startedAt);
  await writeCompatibilityReceipt(receiptPath, receipt);
}

function npmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function runWorker(args: {
  options: CliOptions;
  binaryPath: string;
  xpiPath: string;
  layout: Awaited<ReturnType<typeof createRunLayout>>;
  domain: CliOptions["domain"];
}) {
  const stdoutPath = path.join(args.layout.diagnostics, "runner.stdout.log");
  const stderrPath = path.join(args.layout.diagnostics, "runner.stderr.log");
  const result = await runOwnedCommand({
    command: npmExecutable(),
    args: ["run", "test:zotero:compatibility:with-mock"],
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      ZOTERO_PLUGIN_ZOTERO_BIN_PATH: args.binaryPath,
      ZOTERO_COMPAT_PROJECT_ROOT: PROJECT_ROOT,
      ZOTERO_COMPAT_RUN_ROOT: args.layout.root,
      ZOTERO_COMPAT_BUILD_ROOT: args.options.buildRoot,
      ZOTERO_COMPAT_XPI_PATH: args.xpiPath,
      ZOTERO_COMPAT_MODE: args.options.mode,
      ZOTERO_TEST_MODE: args.options.suite,
      ZOTERO_TEST_DOMAIN: args.domain,
      ZOTERO_TEST_DATA_DIR: args.layout.data,
      ZOTERO_SKILLS_RUNTIME_ROOT: args.layout.runtime,
      CI: "true",
    },
    stdoutPath,
    stderrPath,
    timeoutMs: args.options.timeoutMs,
  });
  return { result, stdoutPath, stderrPath };
}

async function runCell(options: CliOptions): Promise<string> {
  if (!options.targetId) throw new Error("run requires --target");
  const manifest = await loadCompatibilityManifest(options.manifestPath);
  const target = resolveCompatibilityTarget(manifest, options.targetId);
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify({ target, options }, null, 2)}\n`);
    return "";
  }
  const layout = await createRunLayout(
    options.runsRoot,
    `${target.id}-${options.mode}-${options.suite}`,
  );
  const source = await sourceIdentity().catch(() => ({
    commit: "unknown",
    dirty: true,
  }));
  let pluginError: unknown;
  const plugin = await pluginIdentity(options.buildRoot).catch(
    async (error) => {
      pluginError = error;
      return unavailablePluginIdentity(options.buildRoot);
    },
  );
  const receipt = createCompatibilityReceipt({
    runId: layout.runId,
    source,
    plugin,
    host: {
      id: target.id,
      requestedVersion: target.version,
      platform: target.platform,
      archiveSha256: target.sha256,
      downloadUrl: target.downloadUrl,
    },
    execution: {
      mode: options.mode,
      ...(options.mode === "behavior" ? { suite: options.suite } : {}),
    },
  });
  await writeCompatibilityReceipt(layout.receipt, receipt);
  const segmentLayouts: Awaited<ReturnType<typeof createRunLayout>>[] = [];
  let machineLock: Awaited<
    ReturnType<typeof acquireZoteroMachineRunLock>
  > | null = null;
  let activePhase = "setup";

  try {
    if (pluginError) {
      throw new Error(
        `Canonical plugin artifact is unavailable: ${
          pluginError instanceof Error
            ? pluginError.message
            : String(pluginError)
        }`,
      );
    }
    machineLock = await acquireZoteroMachineRunLock(
      path.join(os.tmpdir(), "zotero-agents-compat-host"),
      options.timeoutMs,
    );
    activePhase = "acquire";
    const acquisitionStartedAt = Date.now();
    const host = await acquireZoteroHost({
      manifest,
      targetId: target.id,
      cacheRoot: options.cacheRoot,
    });
    receipt.host.effectiveUrl = host.effectiveUrl;
    receipt.phases.push({
      phase: "acquire",
      status: "passed",
      durationMs: Date.now() - acquisitionStartedAt,
    });
    activePhase = "execution";
    const domains: CliOptions["domain"][] =
      options.mode === "behavior" &&
      options.suite === "full" &&
      options.domain === "all"
        ? ["core", "ui", "workflow"]
        : [options.domain];
    for (const domain of domains) {
      const segment = await createRunLayout(layout.root, domain);
      segmentLayouts.push(segment);
      const runHost = await materializeZoteroHostForRun(host, segment.root);
      const worker = await runWorker({
        options,
        binaryPath: runHost.binaryPath,
        xpiPath: plugin.artifactPath,
        layout: segment,
        domain,
      });
      receipt.diagnostics.push(worker.stdoutPath, worker.stderrPath);
      receipt.phases.push({
        phase: options.mode === "xpi-smoke" ? "xpi-smoke" : `test-${domain}`,
        status:
          worker.result.exitCode === 0 && !worker.result.timedOut
            ? "passed"
            : "failed",
        durationMs: worker.result.durationMs,
      });
      receipt.cleanup.graceful ||= worker.result.graceful;
      receipt.cleanup.forced ||= worker.result.forced;
      const hostFactsPath = path.join(segment.diagnostics, "host-facts.json");
      try {
        const facts = JSON.parse(await fs.readFile(hostFactsPath, "utf8"));
        receipt.host.observedVersion =
          String(facts.version || "").trim() || null;
        receipt.host.appBuildId = String(facts.appBuildId || "").trim() || null;
      } catch {
        receipt.errors.push({
          code: "host_facts_missing",
          phase: options.mode === "xpi-smoke" ? "xpi-smoke" : `test-${domain}`,
        });
      }
      if (worker.result.timedOut) {
        receipt.errors.push({
          code: "test_settlement_timeout",
          phase: `test-${domain}`,
        });
      } else if (worker.result.exitCode !== 0) {
        receipt.errors.push({ code: "test_failed", phase: `test-${domain}` });
      }
      if (receipt.errors.length > 0) break;
    }
    if (
      receipt.host.observedVersion &&
      receipt.host.observedVersion !== target.version
    ) {
      receipt.errors.push({
        code: "host_version_mismatch",
        phase: "identity",
        message: `requested ${target.version}, observed ${receipt.host.observedVersion}`,
      });
    }
    receipt.status = receipt.errors.length === 0 ? "passed" : "failed";
  } catch (error) {
    receipt.status = "failed";
    const errorCode =
      activePhase === "setup"
        ? "plugin_artifact_unavailable"
        : activePhase === "acquire"
          ? "host_acquisition_failed"
          : "fixture_failed";
    receipt.errors.push({
      code: errorCode,
      phase: activePhase,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    try {
      await machineLock?.release();
      for (const segment of segmentLayouts) {
        await cleanupRunLayoutState(segment);
      }
      await cleanupRunLayoutState(layout);
      receipt.cleanup.complete = true;
    } catch (error) {
      receipt.status = "failed";
      receipt.errors.push({
        code: "cleanup_failed",
        phase: "cleanup",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    await finishReceipt(layout.receipt, receipt);
  }
  process.stdout.write(`${layout.receipt}\n`);
  if (receipt.status !== "passed") process.exitCode = 1;
  return layout.receipt;
}

function printHelp() {
  process.stdout.write(`Zotero compatibility fixture\n\n`);
  process.stdout.write(`  plan --gate pull-request|main|release --json\n`);
  process.stdout.write(`  acquire --target <target-id>\n`);
  process.stdout.write(
    `  run --target <target-id> --mode behavior|xpi-smoke --suite lite|full\n`,
  );
  process.stdout.write(`  matrix --gate pull-request|main|release\n`);
}

async function main() {
  const options = parseCompatibilityCliArgs(process.argv.slice(2));
  if (options.command === "help") return printHelp();
  const manifest = await loadCompatibilityManifest(options.manifestPath);
  if (options.command === "plan") {
    const include = buildCompatibilityPlan(manifest, options.gate);
    process.stdout.write(
      `${JSON.stringify(options.json ? { include } : include, null, 2)}\n`,
    );
    return;
  }
  if (options.command === "acquire") {
    if (!options.targetId) throw new Error("acquire requires --target");
    const target = resolveCompatibilityTarget(manifest, options.targetId);
    if (options.dryRun) {
      process.stdout.write(`${JSON.stringify(target, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      `${JSON.stringify(await acquireZoteroHost({ manifest, targetId: target.id, cacheRoot: options.cacheRoot }), null, 2)}\n`,
    );
    return;
  }
  if (options.command === "run") {
    await runCell(options);
    return;
  }
  const cells = buildCompatibilityPlan(manifest, options.gate).filter((cell) =>
    cell.platform.startsWith(
      process.platform === "win32"
        ? "windows"
        : process.platform === "darwin"
          ? "macos"
          : "linux",
    ),
  );
  for (const cell of cells) {
    await runCell({
      ...options,
      targetId: cell.targetId,
      mode: cell.mode,
      suite: cell.suite || "lite",
    });
    if (process.exitCode) break;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
