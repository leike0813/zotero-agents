import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX } from "./synthesis-sidecar-runtime-release-governance";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function listZipEntries(buffer: Buffer) {
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error("Invalid XPI: central directory footer is missing");
  }
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid XPI central directory entry ${index}`);
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    entries.add(
      buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
    );
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
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
  const entries = listZipEntries(await fs.readFile(xpi));
  const missing: string[] = [];
  for (const target of SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX) {
    const prefix = `bin/synthesis-sidecar/${target}`;
    for (const required of [
      `${prefix}/manifest.json`,
      `${prefix}/${target === "win32-x64" ? "node.exe" : "node"}`,
      `${prefix}/LICENSE-node.txt`,
      `${prefix}/service/apps/synthesis-service/src/entrypoint.js`,
      `${prefix}/service/apps/synthesis-service/src/computeWorker.js`,
      `${prefix}/service/apps/synthesis-service/src/computeWorkerPool.js`,
      `${prefix}/service/apps/synthesis-service/src/citationGraphTransferOwner.js`,
      `${prefix}/service/apps/synthesis-service/src/citationGraphBuildTransferExecutor.js`,
      `${prefix}/service/apps/synthesis-service/src/isolatedRepository.js`,
      `${prefix}/service/apps/synthesis-service/src/repositoryNodeSqlite.js`,
      `${prefix}/service/apps/synthesis-service/src/topicCanonicalStoreNode.js`,
      `${prefix}/service/apps/synthesis-service/src/topicApplicationNode.js`,
      `${prefix}/service/apps/synthesis-service/src/citationGraphApplicationNode.js`,
      `${prefix}/service/apps/synthesis-service/src/referenceRefreshApplicationNode.js`,
      `${prefix}/service/packages/synthesis-engine/src/index.js`,
      `${prefix}/service/packages/synthesis-engine/src/citationGraphBuild.js`,
      `${prefix}/service/packages/synthesis-engine/src/citationGraphBuildTransfer.js`,
      `${prefix}/service/packages/synthesis-engine/src/citationGraphBuildPacked.js`,
      `${prefix}/service/packages/synthesis-contracts/src/sidecarTransfer.js`,
      `${prefix}/service/packages/synthesis-contracts/src/sidecarCanonicalStore.js`,
      `${prefix}/service/packages/synthesis-contracts/src/topicApplication.js`,
      `${prefix}/service/packages/synthesis-contracts/src/citationGraphApplication.js`,
      `${prefix}/service/packages/synthesis-contracts/src/hostRead.js`,
      `${prefix}/service/packages/synthesis-contracts/src/referenceRefreshApplication.js`,
      `${prefix}/service/packages/synthesis-contracts/src/workbench.js`,
      `${prefix}/service/packages/synthesis-application/src/index.js`,
      `${prefix}/service/packages/synthesis-application/src/topicCanonical.js`,
      `${prefix}/service/packages/synthesis-application/src/topicApplyDecision.js`,
      `${prefix}/service/packages/synthesis-application/src/topicApplication.js`,
      `${prefix}/service/packages/synthesis-application/src/citationGraphApplication.js`,
      `${prefix}/service/packages/synthesis-application/src/citationGraphProjection.js`,
      `${prefix}/service/packages/synthesis-application/src/referenceProjection.js`,
      `${prefix}/service/packages/synthesis-application/src/referenceRefreshApplication.js`,
      `${prefix}/service/packages/synthesis-repository/src/index.js`,
      `${prefix}/service/packages/synthesis-repository/src/citationGraph.js`,
      `${prefix}/service/packages/synthesis-repository/src/referenceRefresh.js`,
      `${prefix}/service/node_modules/d3-force/LICENSE`,
      `${prefix}/service/node_modules/d3-force/src/index.js`,
      `${prefix}/service/node_modules/d3-dispatch/LICENSE`,
      `${prefix}/service/node_modules/d3-quadtree/LICENSE`,
      `${prefix}/service/node_modules/d3-timer/LICENSE`,
    ]) {
      if (!entries.has(required)) {
        missing.push(required);
      }
    }
  }
  return {
    ok: missing.length === 0,
    xpi,
    targets: [...SYNTHESIS_SIDECAR_RUNTIME_TARGET_MATRIX],
    missing,
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
