import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYNTHESIS_SIDECAR_RUNTIME_TARGETS } from "../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import {
  SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
  assertSynthesisSidecarRuntimePrebuildResultIdentity,
  assertSynthesisSidecarRuntimePrebuildResultSet,
  rebuildSynthesisSidecarRuntimePrebuildResult,
  rebuildSynthesisSidecarRuntimePrebuildSet,
} from "../packages/synthesis-contracts/src/sidecarRuntimeRelease";
import {
  SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT,
  assertSynthesisSidecarRuntimeArchiveLayout,
  sha256File,
  synthesisSidecarRuntimeAddonBundleRoot,
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

async function remoteStore(args: { repo: string; commit: string }) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "synthesis-sidecar-prebuilds-"),
  );
  run("git", ["-C", root, "init"]);
  run("git", [
    "-C",
    root,
    "remote",
    "add",
    "origin",
    `https://github.com/${args.repo}.git`,
  ]);
  run("git", ["-C", root, "fetch", "--depth=1", "origin", args.commit]);
  run("git", ["-C", root, "checkout", "--detach", "FETCH_HEAD"]);
  const actual = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  if (actual.status !== 0 || actual.stdout.trim() !== args.commit) {
    throw new Error("Fetched prebuild commit does not match result");
  }
  return root;
}

export async function syncSynthesisSidecarRuntimePrebuilds(args: {
  aggregate: string;
  storeRoot: string;
  addonRoot?: string;
  result: unknown;
  expected?: Record<string, unknown>;
}) {
  const addonRoot = args.addonRoot || SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT;
  const setRoot = path.join(args.storeRoot, "sets", args.aggregate);
  const manifest = rebuildSynthesisSidecarRuntimePrebuildSet(
    JSON.parse(await fs.readFile(path.join(setRoot, "manifest.json"), "utf8")),
  );
  if (manifest.aggregate !== args.aggregate)
    throw new Error("Prebuild aggregate mismatch");
  const result = rebuildSynthesisSidecarRuntimePrebuildResult(args.result);
  assertSynthesisSidecarRuntimePrebuildResultIdentity(result, {
    aggregate: args.aggregate,
    prebuildBranch: SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_BRANCH,
    ...(args.expected || {}),
  });
  assertSynthesisSidecarRuntimePrebuildResultSet(result, manifest);
  const staging = `${addonRoot}.staging-${process.pid}`;
  const bundleStaging = `${addonRoot}.bundle-staging-${process.pid}`;
  const backup = `${addonRoot}.backup-${process.pid}`;
  await fs.rm(staging, { recursive: true, force: true });
  await fs.rm(bundleStaging, { recursive: true, force: true });
  await fs.mkdir(bundleStaging, { recursive: true });
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
      run("tar", ["-xzf", archivePath, "-C", bundleStaging]);
      const verification = await verifySynthesisSidecarRuntimeBundleDirectory({
        root: path.join(bundleStaging, archive.target),
        target: archive.target,
        expectedBuildFingerprint: manifest.buildFingerprint,
        expectedSourceFingerprint: manifest.sourceFingerprint,
      });
      if (!verification.ok)
        throw new Error(
          `Invalid archive ${archive.file}: ${JSON.stringify(verification.diagnostics)}`,
        );
    }
    const entries = await fs.readdir(bundleStaging);
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
    const hadAddon = await fs
      .stat(addonRoot)
      .then(() => true)
      .catch(() => false);
    if (hadAddon) {
      await fs.cp(addonRoot, staging, { recursive: true });
    } else {
      await fs.mkdir(staging, { recursive: true });
    }
    await fs.rm(path.join(staging, "synthesis-sidecar"), {
      recursive: true,
      force: true,
    });
    for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGETS) {
      const targetRoot = synthesisSidecarRuntimeAddonBundleRoot(
        staging,
        target,
      );
      await fs.mkdir(path.dirname(targetRoot), { recursive: true });
      await fs.rm(targetRoot, { recursive: true, force: true });
      await fs.rename(path.join(bundleStaging, target), targetRoot);
    }
    await fs.rm(backup, { recursive: true, force: true });
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
  } finally {
    await fs.rm(bundleStaging, { recursive: true, force: true });
  }
  return {
    ok: true,
    aggregate: manifest.aggregate,
    addonRoot,
    targets: [...SYNTHESIS_SIDECAR_RUNTIME_TARGETS],
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "Usage: tsx scripts/sync-synthesis-sidecar-runtime-prebuilds.ts --aggregate=<sha256> --result=<path> [--store-root=<path> | --repo=<owner/name>] [--addon-root=<path>]\n",
    );
    return;
  }
  const aggregate = required("aggregate");
  const resultPath = required("result");
  const resultDocument = JSON.parse(
    await fs.readFile(path.resolve(resultPath), "utf8"),
  );
  const parsedResult =
    rebuildSynthesisSidecarRuntimePrebuildResult(resultDocument);
  const storeRoot =
    argument("store-root") ||
    (await remoteStore({
      repo: required("repo"),
      commit: parsedResult.prebuildCommit,
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
    result: resultDocument,
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
