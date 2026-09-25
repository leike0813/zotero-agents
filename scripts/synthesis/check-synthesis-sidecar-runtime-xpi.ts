import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { synthesisSidecarRuntimeTargetBundlePath } from "../../packages/synthesis-contracts/src/sidecarRuntimeBundle";
import { SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX } from "./synthesis-sidecar-runtime-release-governance";
import { readCandidateXpi } from "../system-e2e/acceptance";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

async function findXpi(root: string) {
  const explicit = argument("xpi");
  if (explicit) {
    return path.resolve(explicit);
  }
  const buildRoot = path.join(root, ".scaffold", "build");
  const entries = await fs.readdir(buildRoot, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".xpi"))
    .map((entry) => path.join(buildRoot, entry.name));
  if (candidates.length !== 1) {
    throw new Error(
      `Expected one built XPI in ${buildRoot}, found ${candidates.length}`,
    );
  }
  return candidates[0]!;
}

export async function checkSynthesisSidecarRuntimeXpi(root = process.cwd()) {
  const xpi = await findXpi(root);
  const candidate = readCandidateXpi(xpi);
  const entries = new Set(candidate.entryNames);
  const missing: string[] = [];
  const forbidden = Array.from(entries).filter((entry) =>
    entry.startsWith("bin/synthesis-sidecar/"),
  );
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX) {
    const prefix = `bin/${synthesisSidecarRuntimeTargetBundlePath(target)}`;
    for (const required of [
      `${prefix}/manifest.json`,
      `${prefix}/${
        target === "win32-x64" ? "synthesis-sidecar.exe" : "synthesis-sidecar"
      }`,
      `${prefix}/provenance.json`,
      `${prefix}/licenses.json`,
      `${prefix}/LICENSE-AGPL-3.0.txt`,
    ]) {
      if (!entries.has(required)) {
        missing.push(required);
      }
    }
    for (const entry of entries) {
      if (
        entry.startsWith(`${prefix}/`) &&
        (/(^|\/)node(?:\.exe)?$/i.test(entry) ||
          entry.includes("/service/") ||
          entry.endsWith(".js") ||
          entry.includes("/node_modules/") ||
          entry.toLowerCase().includes("d3-force"))
      ) {
        forbidden.push(entry);
      }
    }
  }
  return {
    ok: missing.length === 0 && forbidden.length === 0,
    xpi,
    xpiDigest: candidate.xpiDigest,
    targets: [...SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX],
    missing,
    forbidden,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkSynthesisSidecarRuntimeXpi()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (!result.ok) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
