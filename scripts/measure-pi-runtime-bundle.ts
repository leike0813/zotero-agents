import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import pkg from "../package.json";
import {
  ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED,
  ACP_RUNTIME_REPLAY_PROFILER_ENABLED,
  ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED,
  SKILLRUNNER_CONNECTION_AUDIT_ENABLED,
  SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED,
  WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED,
} from "../src/modules/debugMode";
import {
  DEBUG_MODE_ENV,
  PI_RUNTIME_BUILD_ENV,
  PI_RUNTIME_BUILD_IDENTITY_PATH,
  PI_RUNTIME_CAPACITY_ENV,
  PLUGIN_BUILD_DIST_ENV,
  piProviderEnvGuardPlugin,
  piRuntimeBuildDefines,
} from "../zotero-plugin.config";
import { runtimeDiagnosticsSideEffectsPlugin } from "./runtime-diagnostics-esbuild";
import { readZipArchiveEntries } from "./zip-archive";
import {
  PI_RUNTIME_CAPACITY_DEFAULT,
  PI_RUNTIME_CAPACITY_OPTIONS,
} from "../src/modules/piRuntimeLifecycle";
import {
  assertCandidatePiRuntimeBuildIdentity,
  PI_BUNDLE_LIMITS,
  PI_RUNTIME_BUILD_IDENTITY_ENTRY,
  toPiBundleEvidence,
  type PiBundleEvidence,
  type PiRuntimeBuildIdentity,
} from "../src/config/piRuntimeBuild";

export const PI_BUNDLE_SIZE_ROOT = ".scaffold/pi-bundle-size";

export {
  assertCandidatePiRuntimeBuildIdentity,
  PI_BUNDLE_LIMITS,
  toPiBundleEvidence,
};

export type PiRuntimeBuildControl = { enabled: boolean; capacity: number };

export type PiRuntimeBundleVariant = {
  dist: string;
  enabled: boolean;
  capacity: number;
  xpiPath: string;
  xpiBytes: number;
  xpiSha256: string;
  jsPath: string;
  jsBytes: number;
  gzipJsBytes: number;
  identity: PiRuntimeBuildIdentity;
  /** Pi inputs still reachable from the packaged entry graph. */
  piInputs: string[];
  piInputBytes: number;
};

export type PiRuntimeBundleMeasurement = {
  schema: "zotero-agents.pi-runtime-bundle-size.v1";
  sourceCommit: string;
  dirty: boolean;
  sameInputs: boolean;
  browserGuardPassed: boolean;
  /** Pi contribution: enabled build minus the Pi-excluded control build. */
  rawBytes: number;
  gzipBytes: number;
  xpiDeltaBytes: number;
  candidateDigest: string;
  controlDigest: string;
  /** `false` when the control still carries reachable Pi code. */
  excludedFully: boolean;
  withinLimits: boolean;
  exceededLimits: string[];
  candidate: PiRuntimeBundleVariant;
  control: PiRuntimeBundleVariant;
  inputs: {
    sourceCommit: string;
    lockSha256: string;
    settingsSha256: string;
    capacity: number;
    candidateDefines: Record<string, string>;
    controlDefines: Record<string, string>;
  };
};

/** Evidence record the acceptance aggregator consumes for the bundle item. */
export type PiRuntimeBundleRecord = {
  schema: "zotero-agents.pi-runtime-bundle-record.v1";
  /** Acceptance evidence id this record answers. */
  id: "bundle";
  candidate: {
    sourceCommit: string;
    dirty: boolean;
    xpiSha256: string;
    version: string;
    capacity: number;
  };
  status: "passed" | "failed";
  recordedAt: string;
  environment: string;
  artifact: string;
  sourceCommit: string;
  dirty: boolean;
  candidateDigest: string;
  controlDigest: string;
  bundle: PiBundleEvidence;
  discarded: string[];
};

export function toPiRuntimeBundleRecord(
  measurement: PiRuntimeBundleMeasurement,
  options: { artifact: string; environment?: string; recordedAt?: string },
): PiRuntimeBundleRecord {
  const discarded = piBundleDiscardReasons(measurement);
  return {
    schema: "zotero-agents.pi-runtime-bundle-record.v1",
    id: "bundle",
    candidate: {
      sourceCommit: measurement.sourceCommit,
      dirty: measurement.dirty,
      xpiSha256: measurement.candidateDigest,
      version: pkg.version,
      capacity: measurement.inputs.capacity,
    },
    // An incomplete exclusion, unstable inputs or a dirty tree is a failure,
    // never a small-but-passing delta.
    status: discarded.length === 0 ? "passed" : "failed",
    recordedAt: options.recordedAt || new Date().toISOString(),
    environment: options.environment || "local",
    artifact: options.artifact,
    sourceCommit: measurement.sourceCommit,
    dirty: measurement.dirty,
    candidateDigest: measurement.candidateDigest,
    controlDigest: measurement.controlDigest,
    bundle: toPiBundleEvidence(measurement),
    discarded,
  };
}

/** Conditions that make a measurement unusable as bundle acceptance evidence. */
export function piBundleDiscardReasons(
  measurement: PiRuntimeBundleMeasurement,
): string[] {
  return [
    measurement.sameInputs ? "" : "inputs-not-identical",
    measurement.browserGuardPassed ? "" : "browser-guard-failed",
    measurement.excludedFully ? "" : "control-still-contains-pi",
    measurement.dirty ? "dirty-worktree" : "",
  ].filter(Boolean);
}

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const SCAFFOLD_CLI = path.join(
  REPO_ROOT,
  "node_modules/zotero-plugin-scaffold/bin/zotero-plugin.mjs",
);
const TSX_CLI = path.join(REPO_ROOT, "node_modules/tsx/dist/cli.mjs");
const GZIP_LEVEL = 9;

const PI_INPUT_PATTERNS = [
  /(?:^|\/)(?:src\/(?:modules|shared))\/pi[A-Za-z][^/]*\.(?:ts|tsx|js|json)$/,
  /(?:^|\/)src\/modules\/pluginStateStore\/pi[A-Za-z][^/]*\.(?:ts|js)$/,
  /(?:^|\/)src\/modules\/zoteroNativeToolCatalog\.(?:ts|js)$/,
  /(?:^|\/)node_modules\/(?:@earendil-works|@oh-my-pi)\//,
  /pi-provider-env-guard/,
];

export function isPiBundleInput(input: string) {
  const normalized = input.replace(/\\/g, "/");
  return PI_INPUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function normalizePiBundleMeasurement(
  value: unknown,
): PiRuntimeBundleMeasurement {
  const source = value as PiRuntimeBundleMeasurement;
  const metric = (input: unknown, name: string) => {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0) {
      throw new Error(`pi_bundle_measurement_invalid:${name}`);
    }
    return input;
  };
  const digest = (input: unknown, name: string) => {
    const value = String(input || "");
    if (!/^[a-f\d]{64}$/.test(value)) {
      throw new Error(`pi_bundle_measurement_invalid:${name}`);
    }
    return value;
  };
  const sourceCommit = String(source?.sourceCommit || "");
  if (!/^[a-f\d]{40}$/.test(sourceCommit)) {
    throw new Error("pi_bundle_measurement_invalid:sourceCommit");
  }
  return {
    schema: "zotero-agents.pi-runtime-bundle-size.v1",
    sourceCommit,
    dirty: source?.dirty === true,
    sameInputs: source?.sameInputs === true,
    browserGuardPassed: source?.browserGuardPassed === true,
    rawBytes: metric(source?.rawBytes, "rawBytes"),
    gzipBytes: metric(source?.gzipBytes, "gzipBytes"),
    xpiDeltaBytes: metric(source?.xpiDeltaBytes, "xpiDeltaBytes"),
    candidateDigest: digest(source?.candidateDigest, "candidateDigest"),
    controlDigest: digest(source?.controlDigest, "controlDigest"),
    excludedFully: source?.excludedFully === true,
    withinLimits: source?.withinLimits === true,
    exceededLimits: Array.isArray(source?.exceededLimits)
      ? source.exceededLimits.map(String)
      : [],
    candidate: source?.candidate,
    control: source?.control,
    inputs: source?.inputs,
  };
}

/** Reads the build provenance written into a packed XPI. */
export function readPiRuntimeBuildIdentity(
  xpiPath: string,
): PiRuntimeBuildIdentity {
  const archive = readZipArchiveEntries(xpiPath, {
    selectedEntries: new Set([PI_RUNTIME_BUILD_IDENTITY_ENTRY]),
  });
  const raw = archive.selectedEntries.get(PI_RUNTIME_BUILD_IDENTITY_ENTRY);
  if (!raw) {
    throw new Error("pi_runtime_build_identity_missing");
  }
  return JSON.parse(raw.toString("utf8")) as PiRuntimeBuildIdentity;
}

async function analyzeEntryGraph(defines: Record<string, string>) {
  const result = await build({
    absWorkingDir: REPO_ROOT,
    entryPoints: ["src/index.ts"],
    bundle: true,
    minifySyntax: true,
    platform: "browser",
    target: "firefox115",
    format: "iife",
    define: defines,
    plugins: [runtimeDiagnosticsSideEffectsPlugin, piProviderEnvGuardPlugin],
    write: false,
    metafile: true,
    logLevel: "silent",
  });
  const inputs = Object.entries(result.metafile!.inputs).map(
    ([id, entry]) => [id.replace(/\\/g, "/"), entry.bytes] as const,
  );
  // Only inputs that actually contributed bytes to an output count: the
  // metafile also lists modules esbuild tree-shook away entirely.
  const emitted = new Map<string, number>();
  for (const output of Object.values(result.metafile!.outputs)) {
    for (const [id, entry] of Object.entries(output.inputs || {})) {
      const normalized = id.replace(/\\/g, "/");
      emitted.set(
        normalized,
        Math.max(emitted.get(normalized) || 0, entry.bytesInOutput),
      );
    }
  }
  const pi = inputs.filter(
    ([id]) => isPiBundleInput(id) && (emitted.get(id) || 0) > 0,
  );
  return {
    piInputs: pi.map(([id]) => id).sort(),
    piInputBytes: pi.reduce((sum, [, bytes]) => sum + bytes, 0),
  };
}

function entryDefines(control: PiRuntimeBuildControl) {
  return {
    ...piRuntimeBuildDefines(control),
    __env__: '"production"',
    __debug_mode__: "false",
    __acp_runtime_performance_profiler_enabled__: String(
      ACP_RUNTIME_PERFORMANCE_PROFILER_ENABLED,
    ),
    __acp_runtime_semantic_trace_recorder_enabled__: String(
      ACP_RUNTIME_SEMANTIC_TRACE_RECORDER_ENABLED,
    ),
    __acp_runtime_replay_profiler_enabled__: String(
      ACP_RUNTIME_REPLAY_PROFILER_ENABLED,
    ),
    __skillrunner_connection_audit_enabled__: String(
      SKILLRUNNER_CONNECTION_AUDIT_ENABLED,
    ),
    __synthesis_sidecar_diagnostics_enabled__: String(
      SYNTHESIS_SIDECAR_DIAGNOSTICS_ENABLED,
    ),
    __workspace_publication_wire_assert_enabled__: String(
      WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED,
    ),
  };
}

async function runScaffoldBuild(args: {
  dist: string;
  control: PiRuntimeBuildControl;
}) {
  const relativeDist = path.relative(REPO_ROOT, args.dist) || args.dist;
  await execFileAsync(process.execPath, [SCAFFOLD_CLI, "build"], {
    cwd: REPO_ROOT,
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      [PLUGIN_BUILD_DIST_ENV]: relativeDist.replace(/\\/g, "/"),
      [DEBUG_MODE_ENV]: "0",
      [PI_RUNTIME_BUILD_ENV]: args.control.enabled ? "1" : "0",
      [PI_RUNTIME_CAPACITY_ENV]: String(args.control.capacity),
    },
  });
}

async function findXpi(dist: string) {
  const entries = await fs.readdir(dist);
  const xpi = entries.filter((name) => name.endsWith(".xpi"));
  if (xpi.length !== 1) {
    throw new Error(`pi_bundle_xpi_ambiguous:${xpi.join(",") || "none"}`);
  }
  return path.join(dist, xpi[0]!);
}

async function readVariant(args: {
  dist: string;
  control: PiRuntimeBuildControl;
}): Promise<PiRuntimeBundleVariant> {
  const xpiPath = await findXpi(args.dist);
  const xpi = await fs.readFile(xpiPath);
  const jsPath = path.join(
    args.dist,
    "addon/content/scripts",
    `${pkg.config.addonRef}.js`,
  );
  const js = await fs.readFile(jsPath);
  const identity = JSON.parse(
    await fs.readFile(
      path.join(args.dist, PI_RUNTIME_BUILD_IDENTITY_PATH),
      "utf8",
    ),
  ) as PiRuntimeBuildIdentity;
  const packaged = readPiRuntimeBuildIdentity(xpiPath);
  if (
    packaged.enabled !== identity.enabled ||
    packaged.capacity !== identity.capacity
  ) {
    throw new Error("pi_runtime_build_identity_mismatch");
  }
  const analysis = await analyzeEntryGraph(entryDefines(args.control));
  return {
    dist: path.relative(REPO_ROOT, args.dist),
    enabled: identity.enabled,
    capacity: identity.capacity,
    xpiPath: path.relative(REPO_ROOT, xpiPath),
    xpiBytes: xpi.byteLength,
    xpiSha256: sha256(xpi),
    jsPath: path.relative(REPO_ROOT, jsPath),
    jsBytes: js.byteLength,
    gzipJsBytes: gzipSync(js, { level: GZIP_LEVEL }).byteLength,
    identity,
    piInputs: analysis.piInputs,
    piInputBytes: analysis.piInputBytes,
  };
}

async function gitOutput(command: string, cwd: string = REPO_ROOT) {
  const { stdout } = await execFileAsync("git", command.split(" "), {
    cwd,
  });
  return stdout.trim();
}

/**
 * Content hash of every untracked, non-ignored path. A pair build must not be
 * called same-source when an untracked file changes between the two builds;
 * the porcelain status lists only paths, not their bytes.
 */
async function readUntrackedContentHash(cwd: string) {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    { cwd, maxBuffer: 64 * 1024 * 1024 },
  );
  const paths = stdout
    .split("\u0000")
    .filter((entry) => entry.length > 0)
    .sort();
  const digest = createHash("sha256");
  for (const relativePath of paths) {
    digest.update(`${relativePath}\u0000`);
    try {
      digest.update(await fs.readFile(path.join(cwd, relativePath)));
    } catch {
      digest.update("<unreadable>");
    }
    digest.update("\u0000");
  }
  return digest.digest("hex");
}

/**
 * HEAD, the tracked diff, the untracked source content and the lockfile, so a
 * pair build can prove the two variants shared one immutable source state.
 */
export async function readSourceFingerprint(root: string = REPO_ROOT) {
  const head = await gitOutput("rev-parse HEAD", root);
  const { stdout: diff } = await execFileAsync(
    "git",
    ["diff", "HEAD", "--", "."],
    { cwd: root, maxBuffer: 64 * 1024 * 1024 },
  );
  const status = await gitOutput("status --porcelain", root);
  const untrackedSha256 = await readUntrackedContentHash(root);
  const lockSha256 = sha256(
    await fs.readFile(path.join(root, "package-lock.json")),
  );
  return {
    head,
    worktreeSha256: sha256(
      Buffer.from(`${diff}\u0000${status}\u0000${untrackedSha256}`),
    ),
    lockSha256,
  };
}

async function runBrowserGuardCheck() {
  try {
    await execFileAsync(
      process.execPath,
      [TSX_CLI, "scripts/check-pi-mcp-browser-bundle.ts"],
      { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 },
    );
    return true;
  } catch {
    return false;
  }
}

export async function measurePiRuntimeBundle(
  options: { capacity?: number } = {},
): Promise<PiRuntimeBundleMeasurement> {
  const capacity = (PI_RUNTIME_CAPACITY_OPTIONS as readonly number[]).includes(
    Number(options.capacity),
  )
    ? Number(options.capacity)
    : PI_RUNTIME_CAPACITY_DEFAULT;
  const candidateControl: PiRuntimeBuildControl = { enabled: true, capacity };
  const excludedControl: PiRuntimeBuildControl = { enabled: false, capacity };
  const root = path.join(REPO_ROOT, PI_BUNDLE_SIZE_ROOT);
  const sourceCommit = await gitOutput("rev-parse HEAD");
  const dirty = Boolean(await gitOutput("status --porcelain"));
  const before = await readSourceFingerprint();
  const lockSha256 = before.lockSha256;
  const settings = (control: PiRuntimeBuildControl) =>
    sha256(Buffer.from(JSON.stringify(entryDefines(control))));
  const settingsSha256 = settings(candidateControl);

  await runScaffoldBuild({
    dist: path.join(root, "candidate"),
    control: candidateControl,
  });
  const candidate = await readVariant({
    dist: path.join(root, "candidate"),
    control: candidateControl,
  });

  await runScaffoldBuild({
    dist: path.join(root, "control"),
    control: excludedControl,
  });
  const control = await readVariant({
    dist: path.join(root, "control"),
    control: excludedControl,
  });

  const after = await readSourceFingerprint();
  const sameInputs =
    sourceCommit.length === 40 &&
    before.head === after.head &&
    before.worktreeSha256 === after.worktreeSha256 &&
    before.lockSha256 === after.lockSha256 &&
    settingsSha256 === settings(candidateControl) &&
    candidate.identity.source.commit === sourceCommit &&
    control.identity.source.commit === sourceCommit;
  const browserGuardPassed = await runBrowserGuardCheck();
  const rawBytes = candidate.jsBytes - control.jsBytes;
  const gzipBytes = candidate.gzipJsBytes - control.gzipJsBytes;
  const xpiDeltaBytes = candidate.xpiBytes - control.xpiBytes;
  const exceededLimits = Object.entries(PI_BUNDLE_LIMITS)
    .filter(
      ([key, limit]) =>
        ({ rawBytes, gzipBytes, xpiDeltaBytes })[
          key as keyof typeof PI_BUNDLE_LIMITS
        ] > limit,
    )
    .map(([key]) => key);

  return {
    schema: "zotero-agents.pi-runtime-bundle-size.v1",
    sourceCommit,
    dirty,
    sameInputs,
    browserGuardPassed,
    rawBytes,
    gzipBytes,
    xpiDeltaBytes,
    candidateDigest: candidate.xpiSha256,
    controlDigest: control.xpiSha256,
    excludedFully: control.piInputs.length === 0,
    withinLimits: exceededLimits.length === 0,
    exceededLimits,
    candidate,
    control,
    inputs: {
      sourceCommit,
      lockSha256,
      settingsSha256,
      capacity,
      candidateDefines: piRuntimeBuildDefines(candidateControl),
      controlDefines: piRuntimeBuildDefines(excludedControl),
    },
  };
}

export function renderPiBundleSizeMarkdown(m: PiRuntimeBundleMeasurement) {
  return [
    "# Pi runtime bundle size",
    "",
    `Source: ${m.sourceCommit} (dirty: ${m.dirty}); lock: ${m.inputs.lockSha256}`,
    `Capacity: ${m.inputs.capacity}; same inputs: ${m.sameInputs}; browser guard: ${m.browserGuardPassed}`,
    `Control excludes Pi fully: ${m.excludedFully}`,
    "",
    "| Metric | Candidate | Control | Delta | Limit |",
    "| --- | --- | --- | --- | --- |",
    `| Raw JS bytes | ${m.candidate.jsBytes} | ${m.control.jsBytes} | ${m.rawBytes} | ${PI_BUNDLE_LIMITS.rawBytes} |`,
    `| Gzip JS bytes | ${m.candidate.gzipJsBytes} | ${m.control.gzipJsBytes} | ${m.gzipBytes} | ${PI_BUNDLE_LIMITS.gzipBytes} |`,
    `| XPI bytes | ${m.candidate.xpiBytes} | ${m.control.xpiBytes} | ${m.xpiDeltaBytes} | ${PI_BUNDLE_LIMITS.xpiDeltaBytes} |`,
    "",
    `Exceeded review thresholds: ${m.exceededLimits.join(", ") || "none"}`,
    `Candidate XPI sha256: ${m.candidate.xpiSha256}`,
    `Control XPI sha256: ${m.controlDigest}`,
    `Residual Pi inputs in control (${m.control.piInputs.length}): ${m.control.piInputs.slice(0, 20).join(", ") || "none"}`,
    "",
  ].join("\n");
}

async function main(argv: string[]) {
  const option = (name: string) => {
    const index = argv.indexOf(name);
    return index < 0 ? undefined : argv[index + 1];
  };
  const out =
    option("--out") || path.join(PI_BUNDLE_SIZE_ROOT, "pi-runtime-bundle");
  const measurement = await measurePiRuntimeBundle({
    capacity: Number(option("--capacity") || PI_RUNTIME_CAPACITY_DEFAULT),
  });
  const target = path.isAbsolute(out) ? out : path.join(REPO_ROOT, out);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(
    `${target}.json`,
    `${JSON.stringify(measurement, null, 2)}\n`,
  );
  await fs.writeFile(`${target}.md`, renderPiBundleSizeMarkdown(measurement));
  const discarded = piBundleDiscardReasons(measurement);
  for (const reason of discarded) {
    process.stderr.write(`pi-bundle-measurement discarded: ${reason}\n`);
  }
  process.stdout.write(
    `${JSON.stringify({
      rawBytes: measurement.rawBytes,
      gzipBytes: measurement.gzipBytes,
      xpiDeltaBytes: measurement.xpiDeltaBytes,
      sameInputs: measurement.sameInputs,
      browserGuardPassed: measurement.browserGuardPassed,
      excludedFully: measurement.excludedFully,
      exceededLimits: measurement.exceededLimits,
      discarded,
    })}\n`,
  );
  // A discarded measurement cannot serve as bundle acceptance evidence; it is
  // reported as missing rather than as an ordinary (possibly tiny) pass.
  if (discarded.length > 0) process.exitCode = 2;
  const bundleOut = option("--bundle");
  if (bundleOut) {
    const bundleTarget = path.isAbsolute(bundleOut)
      ? bundleOut
      : path.join(REPO_ROOT, bundleOut);
    await fs.mkdir(path.dirname(bundleTarget), { recursive: true });
    const artifact = option("--artifact") || `${out}.json`;
    await fs.writeFile(
      bundleTarget,
      `${JSON.stringify(
        toPiRuntimeBundleRecord(measurement, {
          artifact: path.isAbsolute(artifact)
            ? path.relative(REPO_ROOT, artifact)
            : artifact,
          environment: option("--environment"),
        }),
        null,
        2,
      )}\n`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main(process.argv.slice(2)).catch((error) => {
    console.error(String(error?.message || error));
    process.exitCode = 1;
  });
}
