import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import pkg from "../package.json" with { type: "json" };
import { createZipFromNamedFiles } from "../src/providers/skillrunner/zipTransport";
import { CONTENT_API_VERSION } from "../src/modules/contentPackageSubscription";

type Channel = "stable" | "beta" | "dev";

type NamedBytes = {
  name: string;
  data: Uint8Array;
};

const execFileAsync = promisify(execFile);
const DEFAULT_CHANNELS: Channel[] = ["stable", "dev"];
const DEBUG_CHANNELS = new Set<Channel>(["dev"]);
const CONTENT_VERSION_FILE = "content-package.version.json";
const DEFAULT_RELEASE_REPO = "leike0813/zotero-agents-workflows";
let trackedContentSourceFiles: Promise<Set<string> | null> | undefined;

function argValue(name: string) {
  const prefix = `${name}=`;
  const inline = process.argv.find((entry) => entry.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function normalizeChannel(value: string): Channel | "" {
  const normalized = value.trim().toLowerCase();
  return normalized === "stable" ||
    normalized === "beta" ||
    normalized === "dev"
    ? normalized
    : "";
}

function resolveChannels() {
  const raw = argValue("--channels");
  if (!raw) {
    return DEFAULT_CHANNELS;
  }
  const channels = raw
    .split(",")
    .map(normalizeChannel)
    .filter((entry): entry is Channel => !!entry);
  if (channels.length === 0) {
    throw new Error("--channels must include at least one of stable,beta,dev");
  }
  return Array.from(new Set(channels));
}

function normalizeZipPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/g, "");
}

export function normalizeRepoRelativePath(
  value: string,
  repoRoot = process.cwd(),
) {
  return normalizeZipPath(path.relative(repoRoot, value));
}

export function isTrackedContentSourceFile(args: {
  filePath: string;
  trackedFiles: Set<string> | null;
  repoRoot?: string;
}) {
  if (!args.trackedFiles) {
    return true;
  }
  return args.trackedFiles.has(
    normalizeRepoRelativePath(args.filePath, args.repoRoot),
  );
}

async function pathExists(targetPath: string) {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as Record<
    string,
    unknown
  >;
}

async function readGitRevision() {
  const contentPackageRevision = String(
    process.env.CONTENT_PACKAGE_REVISION || "",
  ).trim();
  if (contentPackageRevision) {
    return contentPackageRevision;
  }
  const fromEnv = String(process.env.GITHUB_SHA || "").trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const result = await execFileAsync("git", ["rev-parse", "HEAD"]);
    return result.stdout.trim();
  } catch {
    return "unknown";
  }
}

async function readTrackedContentSourceFiles() {
  try {
    const result = await execFileAsync("git", [
      "ls-files",
      "--recurse-submodules",
      "--",
      "workflows_builtin",
      "skills_builtin",
    ]);
    return new Set(
      result.stdout
        .split(/\r?\n/g)
        .map((entry) => normalizeZipPath(entry.trim()))
        .filter(Boolean),
    );
  } catch {
    console.warn(
      "[content-package] unable to read tracked source files; using filesystem contents",
    );
    return null;
  }
}

function getTrackedContentSourceFiles() {
  trackedContentSourceFiles ||= readTrackedContentSourceFiles();
  return trackedContentSourceFiles;
}

async function readContentVersionDescriptor() {
  const fallback = {
    id: "zotero-agents-official-workflows",
    version: pkg.version,
    content_api: CONTENT_API_VERSION,
    requires: {
      plugin: `>=${pkg.version}`,
      content_api: `^${CONTENT_API_VERSION}`,
      zotero: ">=7 <10",
    },
  };
  if (!(await pathExists(CONTENT_VERSION_FILE))) {
    return fallback;
  }
  const descriptor = await readJsonFile(CONTENT_VERSION_FILE);
  const requires = descriptor.requires as
    | {
        plugin?: unknown;
        content_api?: unknown;
        zotero?: unknown;
      }
    | undefined;
  return {
    id: String(descriptor.id || fallback.id).trim() || fallback.id,
    version:
      String(process.env.CONTENT_PACKAGE_VERSION || "").trim() ||
      String(descriptor.version || fallback.version).trim() ||
      fallback.version,
    content_api:
      String(descriptor.content_api || fallback.content_api).trim() ||
      fallback.content_api,
    requires: {
      plugin:
        String(requires?.plugin || fallback.requires.plugin).trim() ||
        fallback.requires.plugin,
      content_api:
        String(requires?.content_api || fallback.requires.content_api).trim() ||
        fallback.requires.content_api,
      zotero:
        String(requires?.zotero || fallback.requires.zotero).trim() ||
        fallback.requires.zotero,
    },
  };
}

function releaseTagForVersion(version: string) {
  return `official-workflows-v${version}`;
}

function releaseBaseUrl(version: string) {
  const override = String(process.env.CONTENT_PACKAGE_RELEASE_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  if (override) {
    return override;
  }
  return `https://github.com/${DEFAULT_RELEASE_REPO}/releases/download/${releaseTagForVersion(version)}`;
}

function releaseMirrorBaseUrl(version: string) {
  return `https://gitee.com/${DEFAULT_RELEASE_REPO}/releases/download/${releaseTagForVersion(version)}`;
}

async function collectFiles(root: string): Promise<string[]> {
  const trackedFiles = await getTrackedContentSourceFiles();
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(child)));
    } else if (entry.isFile()) {
      if (!isTrackedContentSourceFile({ filePath: child, trackedFiles })) {
        continue;
      }
      files.push(child);
    }
  }
  return files.sort((left, right) =>
    normalizeZipPath(path.relative(root, left)).localeCompare(
      normalizeZipPath(path.relative(root, right)),
    ),
  );
}

async function readWorkflowDebugOnly(workflowJsonPath: string) {
  if (!(await pathExists(workflowJsonPath))) {
    return false;
  }
  const manifest = await readJsonFile(workflowJsonPath);
  return manifest.debug_only === true;
}

async function collectWorkflowPackageEntries(args: {
  sourceRoot: string;
  packageDir: string;
  includeDebug: boolean;
}) {
  const packageRoot = path.join(args.sourceRoot, args.packageDir);
  const packageManifestPath = path.join(packageRoot, "workflow-package.json");
  const packageManifest = (await readJsonFile(packageManifestPath)) as {
    workflows?: unknown;
  };
  const declaredWorkflows = Array.isArray(packageManifest.workflows)
    ? packageManifest.workflows
        .map((entry) =>
          String(entry || "")
            .trim()
            .replace(/\\/g, "/"),
        )
        .filter(Boolean)
    : [];
  const keptWorkflows: string[] = [];
  const skippedWorkflowDirs = new Set<string>();
  for (const relativeWorkflowPath of declaredWorkflows) {
    const workflowJsonPath = path.join(
      packageRoot,
      ...relativeWorkflowPath.split("/"),
    );
    const debugOnly = await readWorkflowDebugOnly(workflowJsonPath);
    if (debugOnly && !args.includeDebug) {
      skippedWorkflowDirs.add(relativeWorkflowPath.split("/")[0] || "");
      continue;
    }
    keptWorkflows.push(relativeWorkflowPath);
  }
  if (keptWorkflows.length === 0) {
    return [] as NamedBytes[];
  }

  const entries: NamedBytes[] = [];
  const rewrittenPackageManifest = {
    ...packageManifest,
    workflows: keptWorkflows,
  };
  for (const filePath of await collectFiles(packageRoot)) {
    const relativePath = normalizeZipPath(path.relative(packageRoot, filePath));
    const topSegment = relativePath.split("/")[0] || "";
    if (skippedWorkflowDirs.has(topSegment)) {
      continue;
    }
    entries.push({
      name: `workflows/${args.packageDir}/${relativePath}`,
      data:
        relativePath === "workflow-package.json"
          ? new TextEncoder().encode(
              `${JSON.stringify(rewrittenPackageManifest, null, 2)}\n`,
            )
          : new Uint8Array(await fs.readFile(filePath)),
    });
  }
  return entries;
}

async function collectSingleWorkflowEntries(args: {
  sourceRoot: string;
  workflowDir: string;
  includeDebug: boolean;
}) {
  const workflowRoot = path.join(args.sourceRoot, args.workflowDir);
  const workflowJsonPath = path.join(workflowRoot, "workflow.json");
  const debugOnly = await readWorkflowDebugOnly(workflowJsonPath);
  if (debugOnly && !args.includeDebug) {
    return [] as NamedBytes[];
  }
  const entries: NamedBytes[] = [];
  for (const filePath of await collectFiles(workflowRoot)) {
    const relativePath = normalizeZipPath(
      path.relative(workflowRoot, filePath),
    );
    entries.push({
      name: `workflows/${args.workflowDir}/${relativePath}`,
      data: new Uint8Array(await fs.readFile(filePath)),
    });
  }
  return entries;
}

async function collectWorkflowEntries(args: {
  root: string;
  includeDebug: boolean;
}) {
  const entries: NamedBytes[] = [];
  for (const entry of await fs.readdir(args.root, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (
      await pathExists(
        path.join(args.root, entry.name, "workflow-package.json"),
      )
    ) {
      entries.push(
        ...(await collectWorkflowPackageEntries({
          sourceRoot: args.root,
          packageDir: entry.name,
          includeDebug: args.includeDebug,
        })),
      );
      continue;
    }
    if (await pathExists(path.join(args.root, entry.name, "workflow.json"))) {
      entries.push(
        ...(await collectSingleWorkflowEntries({
          sourceRoot: args.root,
          workflowDir: entry.name,
          includeDebug: args.includeDebug,
        })),
      );
    }
  }
  return entries;
}

async function collectSkillEntries(args: {
  root: string;
  includeDebug: boolean;
}) {
  const entries: NamedBytes[] = [];
  for (const entry of await fs.readdir(args.root, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillRoot = path.join(args.root, entry.name);
    const runnerPath = path.join(skillRoot, "assets", "runner.json");
    if (!(await pathExists(runnerPath))) {
      continue;
    }
    const runner = await readJsonFile(runnerPath);
    if (runner.debug_only === true && !args.includeDebug) {
      continue;
    }
    for (const filePath of await collectFiles(skillRoot)) {
      const relativePath = normalizeZipPath(path.relative(skillRoot, filePath));
      entries.push({
        name: `skills/${entry.name}/${relativePath}`,
        data: new Uint8Array(await fs.readFile(filePath)),
      });
    }
  }
  return entries;
}

function sha256(bytes: Uint8Array) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function writeChannel(args: {
  outRoot: string;
  channel: Channel;
  revision: string;
  generatedAt: string;
  descriptor: Awaited<ReturnType<typeof readContentVersionDescriptor>>;
}) {
  const includeDebug = DEBUG_CHANNELS.has(args.channel);
  const contentPackage = {
    schema: "zotero-agents.content-package.v1",
    id: args.descriptor.id,
    version: args.descriptor.version,
    channel: args.channel,
    debug_content: includeDebug,
    content_api: args.descriptor.content_api,
    requires: args.descriptor.requires,
    generated_at: args.generatedAt,
    revision: args.revision,
  };
  const encoder = new TextEncoder();
  const zipEntries: NamedBytes[] = [
    {
      name: "content-package.json",
      data: encoder.encode(`${JSON.stringify(contentPackage, null, 2)}\n`),
    },
    ...(await collectWorkflowEntries({
      root: "workflows_builtin",
      includeDebug,
    })),
    ...(await collectSkillEntries({
      root: "skills_builtin",
      includeDebug,
    })),
  ].sort((left, right) => left.name.localeCompare(right.name));
  const zipBytes = createZipFromNamedFiles(zipEntries);
  const channelDir = path.join(args.outRoot, args.channel);
  const packageFileName = `${contentPackage.id}-${contentPackage.version}-${args.channel}.zip`;
  const packagePath = path.join(channelDir, "packages", packageFileName);
  await fs.mkdir(path.dirname(packagePath), { recursive: true });
  await fs.writeFile(packagePath, zipBytes);

  const digest = sha256(zipBytes);
  await fs.writeFile(
    `${packagePath}.sha256`,
    `${digest}  ${packageFileName}\n`,
  );
  const feed = {
    schema: "zotero-agents.content-feed.v1",
    feed_id: `zotero-agents-official-${args.channel}`,
    channel: args.channel,
    debug_content: includeDebug,
    revision: args.revision,
    updated_at: contentPackage.generated_at,
    packages: [
      {
        id: contentPackage.id,
        version: contentPackage.version,
        channel: args.channel,
        debug_content: includeDebug,
        content_api: contentPackage.content_api,
        requires: contentPackage.requires,
        artifact: {
          path: `packages/${packageFileName}`,
          url: `${releaseBaseUrl(contentPackage.version)}/${packageFileName}`,
          mirrors: [
            `${releaseMirrorBaseUrl(contentPackage.version)}/${packageFileName}`,
          ],
          sha256: digest,
          size: zipBytes.byteLength,
        },
      },
    ],
  };
  await fs.writeFile(
    path.join(channelDir, "feed.json"),
    `${JSON.stringify(feed, null, 2)}\n`,
  );
  console.log(
    `[content-package] ${args.channel}: files=${zipEntries.length} bytes=${zipBytes.byteLength} sha256=${digest}`,
  );
}

async function main() {
  const outRoot = argValue("--out") || "artifact/content-packages";
  const revision = await readGitRevision();
  const generatedAt =
    String(process.env.CONTENT_PACKAGE_GENERATED_AT || "").trim() ||
    new Date().toISOString();
  const descriptor = await readContentVersionDescriptor();
  await fs.rm(outRoot, { recursive: true, force: true });
  for (const channel of resolveChannels()) {
    await writeChannel({ outRoot, channel, revision, generatedAt, descriptor });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : error,
    );
    process.exit(1);
  });
}
