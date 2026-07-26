import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT,
  SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_TAG,
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX,
  verifySynthesisSidecarRuntimeBundleDirectory,
} from "./synthesis-sidecar-runtime-release-governance";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function packageRepository() {
  return fs.readFile("package.json", "utf8").then((source) => {
    const pkg = JSON.parse(source) as {
      repository?: string | { url?: string };
    };
    const raw = String(
      typeof pkg.repository === "string"
        ? pkg.repository
        : pkg.repository?.url || "",
    );
    return raw.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/)?.[1] || "";
  });
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`${command} exited ${result.status}`);
  }
}

async function main() {
  const repo =
    argument("repo") ||
    process.env.GITHUB_REPOSITORY ||
    (await packageRepository());
  if (!repo) {
    throw new Error("Unable to resolve GitHub repository");
  }
  const tag = argument("tag") || SYNTHESIS_SIDECAR_RUNTIME_PREBUILD_TAG;
  const downloadRoot = path.join(
    ".scaffold",
    "synthesis-sidecar-runtime-prebuilds-sync",
  );
  await fs.rm(downloadRoot, { recursive: true, force: true });
  await fs.mkdir(downloadRoot, { recursive: true });
  run("gh", [
    "release",
    "download",
    tag,
    "--repo",
    repo,
    "--pattern",
    "synthesis-sidecar-runtime-*.tar.gz",
    "--dir",
    downloadRoot,
  ]);
  const extractedRoot = path.join(downloadRoot, "extracted");
  await fs.mkdir(extractedRoot, { recursive: true });
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX) {
    const archive = path.join(
      downloadRoot,
      `synthesis-sidecar-runtime-${target}.tar.gz`,
    );
    await fs.access(archive);
    run("tar", ["-xzf", archive, "-C", extractedRoot]);
    const verification = await verifySynthesisSidecarRuntimeBundleDirectory({
      root: path.join(extractedRoot, target),
      target,
      policy: "production",
    });
    if (!verification.ok) {
      throw new Error(
        `Synthesis runtime prebuild ${target} is invalid: ${JSON.stringify(
          verification.diagnostics,
        )}`,
      );
    }
  }
  await fs.rm(SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT, {
    recursive: true,
    force: true,
  });
  await fs.mkdir(path.dirname(SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT), {
    recursive: true,
  });
  await fs.rename(extractedRoot, SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT);
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      repo,
      tag,
      targets: [...SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX],
      targetRoot: SYNTHESIS_SIDECAR_RUNTIME_ADDON_ROOT,
    })}\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
