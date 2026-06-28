import { spawnSync } from "node:child_process";
import { chmod, mkdir, readdir, rm, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      archive,
      process.cwd(),
    ]);
    return;
  }
  run("unzip", ["-o", archive, "-d", process.cwd()]);
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
  if (process.platform !== "win32") {
    requireCommand("unzip");
  }

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
