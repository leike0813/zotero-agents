import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { syncHostBridgeCliPrebuildInternalsForTests } from "./sync-host-bridge-cli-prebuilds";

const FIXED_ARCHIVE_TIME = new Date("2000-01-01T00:00:00.000Z");

function argValue(name: string) {
  const inline = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  const index = process.argv.indexOf(`--${name}`);
  return (
    inline?.slice(name.length + 3) ||
    (index >= 0 ? process.argv[index + 1] : "")
  ).trim();
}

function run(command: string, args: string[], cwd?: string) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

async function sha256File(file: string) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

export async function stageHostBridgeCliPrebuildSet(args: {
  outputRoot: string;
  sourceRoot?: string;
  releaseManifest?: string;
}) {
  const sourceRoot = args.sourceRoot || path.join("addon", "bin");
  const release = JSON.parse(
    readFileSync(
      args.releaseManifest || "cli/zotero-bridge/release.json",
      "utf8",
    ),
  );
  const aggregate = String(release.binaryAggregateSha256 || "");
  if (!/^[a-f0-9]{64}$/.test(aggregate)) {
    throw new Error("CLI release manifest is missing binaryAggregateSha256");
  }
  const setDirectory = path.join(args.outputRoot, "sets", aggregate);
  if (existsSync(path.join(setDirectory, "manifest.json"))) {
    await syncHostBridgeCliPrebuildInternalsForTests.verifyArchiveSet(
      setDirectory,
      aggregate,
      {
        cliVersion: String(release.version || ""),
        buildFingerprint: String(release.buildFingerprint || ""),
      },
    );
    return { aggregate, setDirectory, reused: true };
  }

  const staging = `${setDirectory}.staging`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  const archives: Array<{
    platform: string;
    binary: string;
    file: string;
    sha256: string;
  }> = [];
  for (const {
    platform,
    binary,
  } of syncHostBridgeCliPrebuildInternalsForTests.expectedPlatforms) {
    const platformRoot = path.join(staging, "input", platform);
    await mkdir(platformRoot, { recursive: true });
    for (const file of [binary, `${binary}.sha256`]) {
      const source = path.join(sourceRoot, platform, file);
      if (!(await stat(source)).isFile()) {
        throw new Error(`Missing Host Bridge CLI prebuild: ${source}`);
      }
      const target = path.join(platformRoot, file);
      await cp(source, target);
      await utimes(target, FIXED_ARCHIVE_TIME, FIXED_ARCHIVE_TIME);
    }
    const archiveName = `zotero-bridge-${platform}.zip`;
    const archive = path.join(staging, archiveName);
    run(
      "zip",
      [
        "-X",
        "-D",
        "-q",
        path.resolve(archive),
        `${platform}/${binary}`,
        `${platform}/${binary}.sha256`,
      ],
      path.join(staging, "input"),
    );
    archives.push({
      platform,
      binary,
      file: archiveName,
      sha256: await sha256File(archive),
    });
  }
  await rm(path.join(staging, "input"), { recursive: true, force: true });
  await writeFile(
    path.join(staging, "manifest.json"),
    `${JSON.stringify(
      {
        schema: "host-bridge.cli-prebuild-set.v1",
        binaryAggregateSha256: aggregate,
        cliVersion: release.version,
        buildFingerprint: release.buildFingerprint,
        archives,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await mkdir(path.dirname(setDirectory), { recursive: true });
  await cp(staging, setDirectory, { recursive: true });
  await rm(staging, { recursive: true, force: true });
  await syncHostBridgeCliPrebuildInternalsForTests.verifyArchiveSet(
    setDirectory,
    aggregate,
    {
      cliVersion: String(release.version || ""),
      buildFingerprint: String(release.buildFingerprint || ""),
    },
  );
  return { aggregate, setDirectory, reused: false };
}

async function main() {
  const outputRoot = argValue("output-root");
  if (!outputRoot) throw new Error("--output-root is required");
  console.log(
    JSON.stringify(await stageHostBridgeCliPrebuildSet({ outputRoot })),
  );
}

if (
  import.meta.url ===
  (process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "")
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
