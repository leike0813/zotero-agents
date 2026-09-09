import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Options = {
  repo: string;
  tag: string;
  title: string;
  notes: string;
  files: string[];
};

function readValue(argv: string[], index: number, option: string) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseGithubContentPublicationArgs(argv: string[]): Options {
  const options: Options = {
    repo: "",
    tag: "",
    title: "",
    notes: "",
    files: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index] || "";
    if (["--repo", "--tag", "--title", "--notes"].includes(entry)) {
      const value = readValue(argv, index, entry);
      index += 1;
      if (entry === "--repo") options.repo = value;
      if (entry === "--tag") options.tag = value;
      if (entry === "--title") options.title = value;
      if (entry === "--notes") options.notes = value;
      continue;
    }
    if (entry.startsWith("--")) throw new Error(`Unknown option: ${entry}`);
    options.files.push(entry);
  }
  if (!options.repo || !options.tag || options.files.length === 0) {
    throw new Error("--repo, --tag, and release asset files are required");
  }
  options.title ||= options.tag;
  return options;
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited ${result.status}`);
  }
}

function releaseAssets(options: Options) {
  const result = spawnSync(
    "gh",
    [
      "release",
      "view",
      options.tag,
      "--repo",
      options.repo,
      "--json",
      "assets",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  if (result.status !== 0) return null;
  const parsed = JSON.parse(String(result.stdout || "{}")) as {
    assets?: Array<{ name?: string }>;
  };
  return new Set(
    (parsed.assets || []).map((asset) => String(asset.name || "")),
  );
}

async function sha256(filePath: string) {
  return createHash("sha256")
    .update(await fs.readFile(filePath))
    .digest("hex");
}

export async function publishContentPackageToGithub(options: Options) {
  const uniqueNames = new Set(options.files.map((file) => path.basename(file)));
  if (uniqueNames.size !== options.files.length) {
    throw new Error("Release asset names must be unique");
  }
  for (const file of options.files) {
    const stat = await fs.stat(file).catch(() => null);
    if (!stat?.isFile())
      throw new Error(`Release asset is not a file: ${file}`);
  }

  let remoteAssets = releaseAssets(options);
  if (!remoteAssets) {
    run("gh", [
      "release",
      "create",
      options.tag,
      "--repo",
      options.repo,
      "--title",
      options.title,
      "--notes",
      options.notes,
    ]);
    remoteAssets = new Set();
  }

  const checkDir = path.join(
    ".scaffold",
    "content-github-release-check",
    options.tag,
  );
  await fs.rm(checkDir, { recursive: true, force: true });
  await fs.mkdir(checkDir, { recursive: true });
  for (const file of options.files) {
    const name = path.basename(file);
    if (remoteAssets.has(name)) {
      run("gh", [
        "release",
        "download",
        options.tag,
        "--repo",
        options.repo,
        "--pattern",
        name,
        "--dir",
        checkDir,
      ]);
      const remotePath = path.join(checkDir, name);
      if ((await sha256(file)) !== (await sha256(remotePath))) {
        throw new Error(
          `Refusing to replace immutable GitHub asset ${options.tag}/${name}; bump the content package version`,
        );
      }
      console.log(`[content-package] reused GitHub asset ${name}`);
      continue;
    }
    run("gh", ["release", "upload", options.tag, file, "--repo", options.repo]);
    console.log(`[content-package] uploaded GitHub asset ${name}`);
  }
}

async function main() {
  await publishContentPackageToGithub(
    parseGithubContentPublicationArgs(process.argv.slice(2)),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exitCode = 1;
  });
}
