import { spawnSync } from "node:child_process";
import { chmod, mkdir, readdir, rm, stat } from "node:fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { dirname } from "node:path";
import zlib from "node:zlib";

const PREBUILD_TAG = "host-bridge-cli-prebuilds";
const DOWNLOAD_DIR = path.join(".scaffold", "host-bridge-cli-prebuilds-sync");

const EXPECTED_PLATFORMS: Array<{ platform: string; binary: string }> = [
  { platform: "win32-x64", binary: "zotero-bridge.exe" },
  { platform: "darwin-x64", binary: "zotero-bridge" },
  { platform: "darwin-arm64", binary: "zotero-bridge" },
  { platform: "linux-x86", binary: "zotero-bridge" },
  { platform: "linux-x64", binary: "zotero-bridge" },
  { platform: "linux-arm", binary: "zotero-bridge" },
  { platform: "linux-arm64", binary: "zotero-bridge" },
];

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function packageRepository() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const raw = String(pkg.repository?.url || pkg.repository || "").trim();
  const match =
    raw.match(/github\.com[:/](.+?\/.+?)(?:\.git)?$/) ||
    raw.match(/^git\+https:\/\/github\.com\/(.+?\/.+?)(?:\.git)?$/);
  return match?.[1]?.replace(/\.git$/, "") || "";
}

function requireCommand(command: string) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    throw new Error(`Missing required command: ${command}`);
  }
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

function powershellCommand() {
  for (const command of ["pwsh", "powershell"]) {
    const result = spawnSync(
      command,
      ["-NoProfile", "-Command", "$PSVersionTable.PSVersion"],
      {
        stdio: "ignore",
      },
    );
    if (!result.error && result.status === 0) {
      return command;
    }
  }
  throw new Error("Missing required command: pwsh or powershell");
}

function extractArchive(archive: string) {
  if (process.platform === "win32") {
    run(powershellCommand(), [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${process.cwd()}' -Force`,
    ]);
    return;
  }
  extractZipWithNode(archive, process.cwd());
}

function extractZipWithNode(archive: string, destination: string) {
  // Pure Node.js ZIP extraction using zlib.inflateRawSync for DEFLATE.
  // Reads the central directory to locate each entry's data via local headers.
  const buffer = readFileSync(archive);

  // Find End of Central Directory record (signature 0x06054b50)
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error(`Invalid ZIP archive: ${archive}`);
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let cdPos = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buffer.readUInt32LE(cdPos) !== 0x02014b50) {
      throw new Error(`Invalid central directory entry ${i}`);
    }
    const compressionMethod = buffer.readUInt16LE(cdPos + 10);
    const compressedSize = buffer.readUInt32LE(cdPos + 20);
    const uncompressedSize = buffer.readUInt32LE(cdPos + 24);
    const fileNameLength = buffer.readUInt16LE(cdPos + 28);
    const extraLength = buffer.readUInt16LE(cdPos + 30);
    const commentLength = buffer.readUInt16LE(cdPos + 32);
    const localHeaderOffset = buffer.readUInt32LE(cdPos + 42);
    const fileName = buffer
      .subarray(cdPos + 46, cdPos + 46 + fileNameLength)
      .toString("utf8");
    cdPos += 46 + fileNameLength + extraLength + commentLength;

    // Read local file header to find the start of compressed data
    const localPos = localHeaderOffset;
    const localFileNameLength = buffer.readUInt16LE(localPos + 26);
    const localExtraLength = buffer.readUInt16LE(localPos + 28);
    const dataStart = localPos + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.subarray(
      dataStart,
      dataStart + compressedSize,
    );

    const targetPath = path.join(destination, fileName);
    if (fileName.endsWith("/")) {
      mkdirSync(targetPath, { recursive: true });
      continue;
    }

    mkdirSync(dirname(targetPath), { recursive: true });

    let data: Buffer;
    if (compressionMethod === 8) {
      data = zlib.inflateRawSync(compressedData);
    } else if (compressionMethod === 0) {
      data = compressedData;
    } else {
      throw new Error(
        `Unsupported ZIP compression method ${compressionMethod} for ${fileName}`,
      );
    }

    if (data.length !== uncompressedSize) {
      throw new Error(
        `Size mismatch for ${fileName}: expected ${uncompressedSize}, got ${data.length}`,
      );
    }

    writeFileSync(targetPath, data);
  }
}

async function verifyPrebuilds() {
  const missing: string[] = [];
  for (const { platform, binary } of EXPECTED_PLATFORMS) {
    for (const file of [binary, `${binary}.sha256`]) {
      const target = path.join("addon", "bin", platform, file);
      if (!existsSync(target)) {
        missing.push(target);
      }
    }
    if (!platform.startsWith("win32")) {
      await chmod(path.join("addon", "bin", platform, binary), 0o755);
    }
  }
  if (missing.length) {
    throw new Error(
      `Missing Host Bridge CLI prebuilds:\n${missing.join("\n")}`,
    );
  }
}

async function main() {
  const tag = argValue("tag") || PREBUILD_TAG;
  const repo =
    argValue("repo") || process.env.GITHUB_REPOSITORY || packageRepository();
  if (!repo) {
    throw new Error(
      "Unable to resolve GitHub repository. Pass --repo=owner/name.",
    );
  }

  requireCommand("gh");

  await rm(DOWNLOAD_DIR, { recursive: true, force: true });
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  run("gh", [
    "release",
    "download",
    tag,
    "--repo",
    repo,
    "--pattern",
    "zotero-bridge-*.zip",
    "--dir",
    DOWNLOAD_DIR,
  ]);

  const archives = (await readdir(DOWNLOAD_DIR))
    .filter((name) => /^zotero-bridge-.+\.zip$/.test(name))
    .map((name) => path.join(DOWNLOAD_DIR, name));
  if (!archives.length) {
    throw new Error(`No zotero-bridge-*.zip assets found in ${repo}@${tag}`);
  }

  for (const archive of archives) {
    const archiveStat = await stat(archive);
    if (!archiveStat.isFile()) {
      continue;
    }
    extractArchive(archive);
  }

  await verifyPrebuilds();
  console.log(
    JSON.stringify({
      ok: true,
      repo,
      tag,
      platforms: EXPECTED_PLATFORMS.map((entry) => entry.platform),
      target: "addon/bin",
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
