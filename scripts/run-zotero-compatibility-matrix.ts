import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acquireZoteroHost,
  acquireZoteroMachineRunLock,
  assertCompatibilityArtifactIdentity,
  buildCompatibilityPlan,
  cleanupRunLayoutState,
  createE2EExecutionCell,
  createCompatibilityReceipt,
  createRunLayout,
  loadCompatibilityManifest,
  materializeZoteroHostForRun,
  resolveCompatibilityTarget,
  runOwnedCommand,
  sha256File,
  writeCompatibilityReceipt,
  type CompatibilityDomain,
  type CompatibilityArtifactIdentity,
  type CompatibilityE2ELane,
  type CompatibilityFixtureScale,
  type CompatibilityMode,
  type CompatibilityReceipt,
  type CompatibilityScenarioFamily,
  type CompatibilitySuite,
} from "./zotero-compatibility-fixture";
import {
  inspectDirectSynthesisBundle,
  stageDirectSynthesisBundle,
} from "./run-zotero-direct";
import { resolvePhase1FamilySelection } from "./system-e2e/familyLifecycle";
import { runWeeklyRetryPolicy } from "./system-e2e/weeklyRetry";
import {
  RUN_MANIFEST_REFERENCE_PREFIX,
  type RunManifest,
} from "./system-e2e/manifest";
import { collectCellRuntimeEvidence } from "./system-e2e/runtimeEvidence";

const PROJECT_ROOT = process.cwd();
const DEFAULT_MANIFEST = path.join(
  PROJECT_ROOT,
  "tests/zotero/compatibility-matrix.json",
);

type CliOptions = {
  command:
    | "plan"
    | "prepare"
    | "acquire"
    | "run"
    | "weekly-run"
    | "matrix"
    | "help";
  gate: CompatibilityE2ELane;
  targetId: string;
  mode: CompatibilityMode;
  suite: CompatibilitySuite;
  domain: CompatibilityDomain;
  families: CompatibilityScenarioFamily[];
  manifestPath: string;
  cacheRoot: string;
  runsRoot: string;
  buildRoot: string;
  timeoutMs: number;
  fixtureScale: CompatibilityFixtureScale;
  blocking: boolean;
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
  if (
    ![
      "plan",
      "prepare",
      "acquire",
      "run",
      "weekly-run",
      "matrix",
      "help",
    ].includes(command)
  ) {
    throw new Error(`Unknown compatibility command: ${command}`);
  }
  const options: CliOptions = {
    command,
    gate: (process.env.ZOTERO_COMPAT_LANE ||
      "pull-request") as CompatibilityE2ELane,
    targetId: "",
    mode: "behavior",
    suite: "lite",
    domain: "all",
    families: resolvePhase1FamilySelection(process.env.ZOTERO_COMPAT_FAMILIES),
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
    fixtureScale: (process.env.ZOTERO_COMPAT_FIXTURE_SCALE ||
      "committed-seed") as CompatibilityFixtureScale,
    blocking: process.env.ZOTERO_COMPAT_BLOCKING === "true",
    dryRun: false,
    json: false,
  };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else if (arg.startsWith("--gate="))
      options.gate = arg.slice(7) as CompatibilityE2ELane;
    else if (arg === "--gate")
      options.gate = valueAfter(args, index++, arg) as CompatibilityE2ELane;
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
    else if (arg.startsWith("--families="))
      options.families = resolvePhase1FamilySelection(arg.slice(11));
    else if (arg === "--families")
      options.families = resolvePhase1FamilySelection(
        valueAfter(args, index++, arg),
      );
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
    else if (arg.startsWith("--fixture-scale="))
      options.fixtureScale = arg.slice(16) as CompatibilityFixtureScale;
    else if (arg === "--fixture-scale")
      options.fixtureScale = valueAfter(
        args,
        index++,
        arg,
      ) as CompatibilityFixtureScale;
    else if (arg.startsWith("--blocking="))
      options.blocking = arg.slice(11) === "true";
    else throw new Error(`Unknown compatibility option: ${arg}`);
  }
  if (
    ![
      "pull-request",
      "main",
      "release",
      "weekly",
      "stress",
      "manual-gold",
    ].includes(options.gate)
  ) {
    throw new Error(`Unsupported compatibility gate: ${options.gate}`);
  }
  if (!["behavior", "xpi-smoke"].includes(options.mode)) {
    throw new Error(`Unsupported compatibility mode: ${options.mode}`);
  }
  if (!["lite", "full"].includes(options.suite)) {
    throw new Error(`Unsupported compatibility suite: ${options.suite}`);
  }
  if (!["all", "core", "ui", "workflow", "e2e"].includes(options.domain)) {
    throw new Error(`Unsupported compatibility domain: ${options.domain}`);
  }
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error("Compatibility timeout must be at least 1000 ms");
  }
  if (
    !["committed-seed", "stress", "large-gold"].includes(options.fixtureScale)
  ) {
    throw new Error(`Unsupported compatibility fixture scale`);
  }
  return options;
}

export function parseCompatibilityRunManifestReference(
  stdout: string,
  projectRoot = PROJECT_ROOT,
) {
  const prefix = RUN_MANIFEST_REFERENCE_PREFIX;
  const line = stdout
    .split(/\r?\n/)
    .filter((entry) => entry.startsWith(prefix))
    .at(-1);
  if (!line) throw new Error("run_manifest_reference_missing");
  const relative = path
    .relative(projectRoot, path.resolve(line.slice(prefix.length).trim()))
    .replaceAll("\\", "/");
  if (!relative || relative === ".." || relative.startsWith("../")) {
    throw new Error("run_manifest_reference_invalid");
  }
  return relative;
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
  const ref =
    String(process.env.GITHUB_REF || "").trim() ||
    (await execFileOutput("git", ["symbolic-ref", "-q", "HEAD"]).catch(() =>
      execFileOutput("git", ["describe", "--exact-match", "--tags"]).then(
        (tag) => `refs/tags/${tag}`,
      ),
    ));
  return { commit, dirty, ref };
}

async function pluginIdentity(buildRoot: string) {
  const xpiNames = (await fs.readdir(buildRoot)).filter((name) =>
    name.endsWith(".xpi"),
  );
  if (xpiNames.length !== 1) {
    throw new Error(
      `Expected one canonical plugin XPI in ${buildRoot}, found ${xpiNames.length}`,
    );
  }
  const xpiPath = path.join(buildRoot, xpiNames[0]!);
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

const artifactIdentityPath = (buildRoot: string) =>
  path.join(buildRoot, "compatibility-artifact-identity.json");

async function readPreparedArtifactIdentity(
  buildRoot: string,
): Promise<Required<CompatibilityArtifactIdentity>> {
  const value = JSON.parse(
    await fs.readFile(artifactIdentityPath(buildRoot), "utf8"),
  ) as Partial<CompatibilityArtifactIdentity>;
  for (const field of [
    "lane",
    "sourceCommit",
    "sourceRef",
    "pluginDigest",
    "sidecarFingerprint",
    "sidecarTarget",
  ] as const) {
    if (typeof value[field] !== "string" || !value[field]?.trim()) {
      throw new Error(`Compatibility artifact identity is missing ${field}`);
    }
  }
  return value as Required<CompatibilityArtifactIdentity>;
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
    command: process.platform === "win32" ? "cmd.exe" : "npm",
    args: [
      ...(process.platform === "win32" ? ["/d", "/s", "/c", "npm"] : []),
      "run",
      "test:zotero:compatibility:with-mock",
    ],
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      ZOTERO_PLUGIN_ZOTERO_BIN_PATH: args.binaryPath,
      ZOTERO_COMPAT_PROJECT_ROOT: PROJECT_ROOT,
      ZOTERO_COMPAT_RUN_ROOT: args.layout.root,
      ZOTERO_COMPAT_BUILD_ROOT: args.options.buildRoot,
      ZOTERO_COMPAT_XPI_PATH: args.xpiPath,
      ZOTERO_COMPAT_MODE: args.options.mode,
      ZOTERO_COMPAT_PREBUILT_ARTIFACTS: "1",
      ZOTERO_TEST_MODE: args.options.suite,
      ZOTERO_TEST_DOMAIN: args.domain,
      ZOTERO_SYSTEM_E2E_FAMILIES: args.options.families.join(","),
      ZOTERO_E2E_TRIGGER_LANE: args.options.gate,
      ZOTERO_SYNTHESIS_SIDECAR_BUILD_IDENTITY:
        args.domain === "e2e"
          ? inspectDirectSynthesisBundle(
              path.join(args.options.buildRoot, "addon"),
            ).buildFingerprint
          : process.env.ZOTERO_SYNTHESIS_SIDECAR_BUILD_IDENTITY,
      ...(args.options.fixtureScale === "stress"
        ? {
            ZOTERO_TEST_ENTRY:
              "tests/zotero/ui/full/276-dashboard-synthesis-close.zotero.test.ts",
            ZOTERO_SYNTHESIS_CLOSE_CYCLES:
              process.env.ZOTERO_SYNTHESIS_CLOSE_CYCLES || "100",
          }
        : {}),
      ...(args.options.fixtureScale === "large-gold"
        ? { ZOTERO_E2E_FIXTURE: "gold" }
        : {}),
      ZOTERO_TEST_DATA_DIR: args.layout.data,
      // The persistence layer appends its own `runtime` level, so the plugin's
      // data root is the run root and not the layout's `runtime` directory.
      ZOTERO_SKILLS_RUNTIME_ROOT: args.layout.root,
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
  // Mode and suite stay out of the directory name: the receipt and the uploaded
  // artifact name carry both, and the run path has a Windows length budget.
  const layout = await createRunLayout(options.runsRoot, target.id);
  const source = await sourceIdentity().catch(() => ({
    commit: "unknown",
    dirty: true,
    ref: "unknown",
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
      ...(options.mode === "behavior"
        ? { suite: options.suite, domain: options.domain }
        : {}),
    },
  });
  await writeCompatibilityReceipt(layout.receipt, receipt);
  let expectedArtifactIdentity: Required<CompatibilityArtifactIdentity> | null =
    null;
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
    if (options.mode === "behavior" && options.domain === "e2e") {
      const sidecar = inspectDirectSynthesisBundle(
        path.join(options.buildRoot, "addon"),
      );
      expectedArtifactIdentity = await readPreparedArtifactIdentity(
        options.buildRoot,
      );
      assertCompatibilityArtifactIdentity(expectedArtifactIdentity, {
        lane: options.gate,
        sourceCommit: source.commit,
        sourceRef: source.ref,
        pluginDigest: plugin.artifactSha256,
        sidecarFingerprint: sidecar.buildFingerprint,
        sidecarTarget: sidecar.target,
      });
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
      if (options.mode === "behavior" && options.domain === "e2e") {
        receipt.diagnostics.push(
          ...(await collectCellRuntimeEvidence({
            runtimeRootOverride: segment.root,
            diagnosticsDir: segment.diagnostics,
          })),
        );
      }
      if (expectedArtifactIdentity) {
        assertCompatibilityArtifactIdentity(expectedArtifactIdentity, {
          lane: options.gate,
          sourceCommit: source.commit,
          sourceRef: source.ref,
          pluginDigest: (await pluginIdentity(options.buildRoot))
            .artifactSha256,
          ...(() => {
            const sidecar = inspectDirectSynthesisBundle(
              path.join(options.buildRoot, "addon"),
            );
            return {
              sidecarFingerprint: sidecar.buildFingerprint,
              sidecarTarget: sidecar.target,
            };
          })(),
        });
        receipt.execution.cell = createE2EExecutionCell({
          id: `${options.gate}-${target.id}-e2e${
            options.families.length
              ? `-${options.families.join("-").toLowerCase()}`
              : ""
          }`,
          lane: options.gate,
          target,
          families: options.families,
          runnerEnvironment: {
            os: manifest.platforms[target.platform].os,
            image: manifest.platforms[target.platform].runner,
          },
          fixtureScale: options.fixtureScale,
          blocking: options.blocking,
          pluginDigest: expectedArtifactIdentity.pluginDigest,
          sidecarFingerprint: expectedArtifactIdentity.sidecarFingerprint,
          runManifestReference: parseCompatibilityRunManifestReference(
            await fs.readFile(worker.stdoutPath, "utf8"),
          ),
        });
      }
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

async function readWeeklyAttempt(receiptPath: string) {
  const receipt = JSON.parse(
    await fs.readFile(receiptPath, "utf8"),
  ) as CompatibilityReceipt;
  const manifestReference =
    receipt.execution.cell?.runManifestReference ||
    path.relative(PROJECT_ROOT, receiptPath).replaceAll("\\", "/");
  let runId = receipt.runId;
  let verdict:
    | "passed"
    | "failed"
    | "aborted"
    | "incomplete"
    | "indeterminate" =
    receipt.status === "passed" ? "passed" : "indeterminate";
  if (receipt.execution.cell?.runManifestReference) {
    const manifest = JSON.parse(
      await fs.readFile(path.resolve(PROJECT_ROOT, manifestReference), "utf8"),
    ) as RunManifest;
    runId = manifest.runId;
    verdict =
      manifest.terminalState === "complete"
        ? manifest.families.every((family) => family.result === "passed")
          ? "passed"
          : "failed"
        : manifest.terminalState;
  }
  if (receipt.status !== "passed" && verdict === "passed") verdict = "failed";
  return {
    verdict,
    runId,
    profileIdentity: receipt.runId,
    manifestReference,
  };
}

function printHelp() {
  process.stdout.write(`Zotero compatibility fixture\n\n`);
  process.stdout.write(
    `  plan --gate pull-request|main|release|weekly|stress|manual-gold --json\n`,
  );
  process.stdout.write(`  prepare --build-root <canonical-build-root>\n`);
  process.stdout.write(`  acquire --target <target-id>\n`);
  process.stdout.write(
    `  run|weekly-run --target <target-id> --mode behavior|xpi-smoke --suite lite|full --domain all|core|ui|workflow|e2e [--families SL,RH,PA,PM,CG,HB]\n`,
  );
  process.stdout.write(`  matrix --gate pull-request|main|release\n`);
}

async function main() {
  const options = parseCompatibilityCliArgs(process.argv.slice(2));
  if (options.command === "help") return printHelp();
  if (options.command === "prepare") {
    stageDirectSynthesisBundle(path.join(options.buildRoot, "addon"));
    const plugin = await pluginIdentity(options.buildRoot);
    const sidecar = inspectDirectSynthesisBundle(
      path.join(options.buildRoot, "addon"),
    );
    const source = await sourceIdentity();
    const identity: Required<CompatibilityArtifactIdentity> = {
      lane: options.gate,
      sourceCommit: source.commit,
      sourceRef: source.ref,
      pluginDigest: plugin.artifactSha256,
      sidecarFingerprint: sidecar.buildFingerprint,
      sidecarTarget: sidecar.target,
    };
    await fs.writeFile(
      artifactIdentityPath(options.buildRoot),
      `${JSON.stringify(identity, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(`${JSON.stringify(identity, null, 2)}\n`);
    return;
  }
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
  if (options.command === "weekly-run") {
    if (options.gate !== "weekly") {
      throw new Error("weekly-run requires --gate weekly");
    }
    const result = await runWeeklyRetryPolicy(
      options.gate,
      async ({ predecessorRunId }) => {
        if (predecessorRunId) {
          process.env.ZOTERO_E2E_PREDECESSOR_RUN_ID = predecessorRunId;
        }
        return readWeeklyAttempt(await runCell(options));
      },
    );
    await fs.mkdir(options.runsRoot, { recursive: true });
    const summaryPath = path.join(
      options.runsRoot,
      `weekly-rerun-${options.targetId}.json`,
    );
    await fs.writeFile(summaryPath, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`[weekly-rerun] ${summaryPath}\n`);
    process.exitCode = result.workflowPassed ? 0 : 1;
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
      domain: cell.domain || "all",
      families: cell.families || options.families,
    });
    if (process.exitCode) break;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
