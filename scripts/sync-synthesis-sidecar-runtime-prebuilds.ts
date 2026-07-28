import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYNTHESIS_SIDECAR_RUNTIME_TARGETS } from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
  assertSynthesisSidecarRuntimePrebuildResultIdentity,
  rebuildSynthesisSidecarRuntimePrebuildResult,
  rebuildSynthesisSidecarRuntimePrebuildSet,
} from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import {
  SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT,
  assertSynthesisSidecarRuntimeArchiveLayout,
  sha256File,
  verifySynthesisSidecarRuntimeBundleDirectory,
} from "./synthesis-sidecar-runtime-release-governance";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function required(name: string) {
  const value = String(argument(name) || "").trim();
  if (!value) throw new Error(`Missing required --${name}=...`);
  return value;
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error || result.status !== 0)
    throw result.error || new Error(`${command} exited ${result.status}`);
}

async function remoteStore(args: { repo: string; branch: string }) {
  const root = path.join(
    ".scaffold",
    `synthesis-sidecar-prebuilds-${process.pid}`,
  );
  await fs.rm(root, { recursive: true, force: true });
  run("git", [
    "clone",
    "--depth=1",
    "--branch",
    args.branch,
    `https://github.com/${args.repo}.git`,
    root,
  ]);
  return root;
}

export async function syncSynthesisSidecarRuntimePrebuilds(args: {
  aggregate: string;
  storeRoot: string;
  addonRoot?: string;
  result?: unknown;
  expected?: Record<string, unknown>;
}) {
  const addonRoot = args.addonRoot || SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT;
  const setRoot = path.join(args.storeRoot, "sets", args.aggregate);
  const manifest = rebuildSynthesisSidecarRuntimePrebuildSet(
    JSON.parse(await fs.readFile(path.join(setRoot, "manifest.json"), "utf8")),
  );
  if (manifest.aggregate !== args.aggregate)
    throw new Error("Prebuild aggregate mismatch");
  if (args.result) {
    const result = rebuildSynthesisSidecarRuntimePrebuildResult(args.result);
    assertSynthesisSidecarRuntimePrebuildResultIdentity(result, {
      aggregate: args.aggregate,
      prebuildBranch: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
      ...(args.expected || {}),
    });
  }
  const staging = `${addonRoot}.staging-${process.pid}`;
  const backup = `${addonRoot}.backup-${process.pid}`;
  await fs.rm(staging, { recursive: true, force: true });
  await fs.mkdir(staging, { recursive: true });
  try {
    for (const archive of manifest.archives) {
      const archivePath = path.join(setRoot, archive.file);
      if ((await sha256File(archivePath)) !== archive.sha256) {
        throw new Error(`Archive digest mismatch: ${archive.file}`);
      }
      assertSynthesisSidecarRuntimeArchiveLayout({
        archivePath,
        target: archive.target,
      });
      run("tar", ["-xzf", archivePath, "-C", staging]);
      const verification = await verifySynthesisSidecarRuntimeBundleDirectory({
        root: path.join(staging, archive.target),
        target: archive.target,
        expectedBuildFingerprint: manifest.buildFingerprint,
        expectedSourceFingerprint: manifest.sourceFingerprint,
      });
      if (!verification.ok)
        throw new Error(
          `Invalid archive ${archive.file}: ${JSON.stringify(verification.diagnostics)}`,
        );
    }
    const entries = await fs.readdir(staging);
    if (
      entries.length !== SYNTHESIS_SIDECAR_RUNTIME_TARGETS.length ||
      entries.some(
        (entry) =>
          !SYNTHESIS_SIDECAR_RUNTIME_TARGETS.includes(
            entry as (typeof SYNTHESIS_SIDECAR_RUNTIME_TARGETS)[number],
          ),
      )
    ) {
      throw new Error(
        "Prebuild set has missing or unexpected target directories",
      );
    }
    await fs.rm(backup, { recursive: true, force: true });
    const hadAddon = await fs
      .stat(addonRoot)
      .then(() => true)
      .catch(() => false);
    if (hadAddon) await fs.rename(addonRoot, backup);
    try {
      await fs.mkdir(path.dirname(addonRoot), { recursive: true });
      await fs.rename(staging, addonRoot);
      await fs.rm(backup, { recursive: true, force: true });
    } catch (error) {
      await fs.rm(addonRoot, { recursive: true, force: true });
      if (hadAddon) await fs.rename(backup, addonRoot);
      throw error;
    }
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    throw error;
  }
  return {
    ok: true,
    aggregate: manifest.aggregate,
    addonRoot,
    targets: [...SYNTHESIS_SIDECAR_RUNTIME_TARGETS],
  };
}

async function main() {
  const aggregate = required("aggregate");
  const resultPath = argument("result");
  const storeRoot =
    argument("store-root") ||
    (await remoteStore({
      repo: required("repo"),
      branch: argument("branch") || SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
    }));
  const expected: Record<string, unknown> = {};
  for (const [argumentName, field] of [
    ["request-id", "requestId"],
    ["source-sha", "sourceSha"],
    ["run-id", "runId"],
    ["repo", "repository"],
  ] as const) {
    const value = argument(argumentName);
    if (value)
      expected[field] = argumentName === "run-id" ? Number(value) : value;
  }
  const result = await syncSynthesisSidecarRuntimePrebuilds({
    aggregate,
    storeRoot: path.resolve(storeRoot),
    addonRoot: argument("addon-root")
      ? path.resolve(argument("addon-root")!)
      : undefined,
    result: resultPath
      ? JSON.parse(await fs.readFile(path.resolve(resultPath), "utf8"))
      : undefined,
    expected,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
