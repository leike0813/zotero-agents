import { createHash, randomUUID } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { finished, pipeline } from "node:stream/promises";

export type CompatibilityPlatformId =
  | "linux-x64"
  | "windows-x64"
  | "macos-x64"
  | "macos-arm64";

export type CompatibilityGate = "pull-request" | "main" | "release";
export type CompatibilityMode = "behavior" | "xpi-smoke";
export type CompatibilitySuite = "lite" | "full";

export type CompatibilityPlatform = {
  os: "linux" | "windows" | "macos";
  arch: "x64" | "arm64";
  runner: string;
};

export type CompatibilityTargetPolicy = {
  pullRequestBehavior: boolean;
  mainBehavior: boolean;
  xpiSmoke: boolean;
  blocking: boolean;
};

export type CompatibilityTarget = {
  id: string;
  family: "zotero-7" | "zotero-9" | "zotero-10";
  version: string;
  channel: "release";
  platform: CompatibilityPlatformId;
  downloadUrl: string;
  sha256: string;
  archiveFormat: "tar.bz2" | "tar.xz" | "zip" | "dmg";
  expectedBinary: string;
  mozillaBaseline: "firefox115" | "firefox140";
  policy: CompatibilityTargetPolicy;
};

export type CompatibilityManifest = {
  schemaId: "zotero-agents.zotero-compatibility-matrix.v1";
  extractRecipeVersion: number;
  platforms: Record<CompatibilityPlatformId, CompatibilityPlatform>;
  targets: CompatibilityTarget[];
};

export type CompatibilityPlanCell = {
  id: string;
  targetId: string;
  version: string;
  platform: CompatibilityPlatformId;
  runner: string;
  mode: CompatibilityMode;
  suite?: CompatibilitySuite;
  blocking: boolean;
};

export type ArchiveEntry = {
  path: string;
  type: "file" | "directory" | "symlink" | "hardlink" | "device";
  linkTarget?: string;
};

export type CompatibilityRunLayout = {
  runId: string;
  root: string;
  profile: string;
  data: string;
  runtime: string;
  resource: string;
  diagnostics: string;
  receipt: string;
};

export type OwnedCommandResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  graceful: boolean;
  forced: boolean;
  durationMs: number;
};

export type AcquiredZoteroHost = {
  target: CompatibilityTarget;
  archivePath: string;
  archiveCacheHit: boolean;
  installRoot: string;
  binaryPath: string;
  effectiveUrl: string;
};

export type MaterializedZoteroHost = {
  installRoot: string;
  binaryPath: string;
  observedVersion: string;
};

export type CompatibilityError = {
  code: string;
  phase: string;
  message?: string;
};

export type CompatibilityReceipt = {
  schemaId: "zotero-agents.zotero-compatibility-receipt.v1";
  runId: string;
  source: { commit: string; dirty: boolean };
  plugin: {
    version: string;
    artifactPath: string;
    artifactSha256: string;
    manifestMin: string;
    manifestMax: string;
  };
  host: {
    id: string;
    requestedVersion: string;
    observedVersion: string | null;
    appBuildId: string | null;
    platform: CompatibilityPlatformId;
    archiveSha256: string;
    downloadUrl: string;
    effectiveUrl: string | null;
  };
  execution: {
    mode: CompatibilityMode;
    suite?: CompatibilitySuite;
  };
  status: "running" | "passed" | "failed";
  phases: Array<{
    phase: string;
    status: "passed" | "failed" | "skipped";
    durationMs: number;
  }>;
  errors: CompatibilityError[];
  diagnostics: string[];
  cleanup: {
    graceful: boolean;
    forced: boolean;
    complete: boolean;
  };
  timing: {
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
  };
};

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid compatibility manifest ${field}`);
  }
  return value;
}

function assertSafeRelativePath(value: unknown, field: string): string {
  const raw = requireNonEmptyString(value, field).replace(/\\/g, "/");
  const normalized = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  if (
    raw.startsWith("/") ||
    /^[A-Za-z]:/.test(raw) ||
    !normalized ||
    normalized.split("/").some((segment) => segment === ".." || segment === "")
  ) {
    throw new Error(`Unsafe ${field}: ${String(value)}`);
  }
  return normalized;
}

function expectedOfficialArchiveUrl(target: CompatibilityTarget): string {
  const suffix =
    target.archiveFormat === "dmg"
      ? "dmg"
      : target.archiveFormat === "zip"
        ? "zip"
        : target.archiveFormat === "tar.bz2"
          ? "tar.bz2"
          : "tar.xz";
  const platform = target.platform.startsWith("linux-")
    ? "linux-x86_64"
    : target.platform.startsWith("windows-")
      ? "win-x64"
      : "";
  const filename = platform
    ? `Zotero-${target.version}_${platform}.${suffix}`
    : `Zotero-${target.version}.${suffix}`;
  return `https://download.zotero.org/client/release/${target.version}/${filename}`;
}

export function validateCompatibilityManifest(
  value: CompatibilityManifest,
): CompatibilityManifest {
  if (
    !value ||
    value.schemaId !== "zotero-agents.zotero-compatibility-matrix.v1"
  ) {
    throw new Error("Invalid compatibility manifest schemaId");
  }
  if (
    !Number.isInteger(value.extractRecipeVersion) ||
    value.extractRecipeVersion < 1
  ) {
    throw new Error("Invalid compatibility manifest extractRecipeVersion");
  }
  if (!value.platforms || typeof value.platforms !== "object") {
    throw new Error("Invalid compatibility manifest platforms");
  }
  if (!Array.isArray(value.targets) || value.targets.length === 0) {
    throw new Error("Invalid compatibility manifest targets");
  }

  const ids = new Set<string>();
  for (const target of value.targets) {
    const id = requireNonEmptyString(target.id, "target.id");
    if (ids.has(id)) {
      throw new Error(`Duplicate compatibility target id: ${id}`);
    }
    ids.add(id);
    if (!value.platforms[target.platform]) {
      throw new Error(`Unknown compatibility platform: ${target.platform}`);
    }
    if (!/^\d+\.\d+\.\d+$/.test(target.version)) {
      throw new Error(`Compatibility target ${id} must use an exact version`);
    }
    if (target.channel !== "release") {
      throw new Error(`Compatibility target ${id} must use release channel`);
    }
    const url = new URL(target.downloadUrl);
    if (url.href !== expectedOfficialArchiveUrl(target)) {
      throw new Error(
        `Compatibility target ${id} must use its immutable official release URL`,
      );
    }
    if (!/^[a-f0-9]{64}$/.test(target.sha256)) {
      throw new Error(`Compatibility target ${id} has invalid sha256`);
    }
    assertSafeRelativePath(target.expectedBinary, "expectedBinary");
    if (!target.policy || typeof target.policy.blocking !== "boolean") {
      throw new Error(`Compatibility target ${id} has invalid policy`);
    }
  }
  return value;
}

export async function loadCompatibilityManifest(
  manifestPath: string,
): Promise<CompatibilityManifest> {
  const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  return validateCompatibilityManifest(parsed as CompatibilityManifest);
}

export function resolveCompatibilityTarget(
  manifest: CompatibilityManifest,
  targetId: string,
): CompatibilityTarget {
  const target = manifest.targets.find(
    (candidate) => candidate.id === targetId,
  );
  if (!target) {
    throw new Error(`Compatibility target is not declared: ${targetId}`);
  }
  return target;
}

export function buildCompatibilityPlan(
  manifest: CompatibilityManifest,
  gate: CompatibilityGate,
): CompatibilityPlanCell[] {
  validateCompatibilityManifest(manifest);
  const cells: CompatibilityPlanCell[] = [];
  for (const target of manifest.targets) {
    const platform = manifest.platforms[target.platform];
    const addCell = (mode: CompatibilityMode, suite?: CompatibilitySuite) => {
      cells.push({
        id: `${target.id}-${mode}${suite ? `-${suite}` : ""}`,
        targetId: target.id,
        version: target.version,
        platform: target.platform,
        runner: platform.runner,
        mode,
        ...(suite ? { suite } : {}),
        blocking: target.policy.blocking,
      });
    };

    if (gate === "pull-request" && target.policy.pullRequestBehavior) {
      addCell("behavior", "lite");
      continue;
    }
    if (gate !== "pull-request" && target.policy.mainBehavior) {
      addCell("behavior", "full");
    }
    if (gate !== "pull-request" && target.policy.xpiSmoke) {
      addCell("xpi-smoke");
    }
  }
  return cells;
}

export function validateArchiveEntries(entries: ArchiveEntry[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    const entryPath = assertSafeRelativePath(entry.path, "archive entry");
    if (seen.has(entryPath)) {
      throw new Error(`Unsafe archive duplicate entry: ${entry.path}`);
    }
    seen.add(entryPath);
    if (entry.type !== "file" && entry.type !== "directory") {
      throw new Error(`Unsafe archive ${entry.type} entry: ${entry.path}`);
    }
  }
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const input = createReadStream(filePath);
  input.on("data", (chunk) => hash.update(chunk));
  await finished(input);
  return hash.digest("hex");
}

async function downloadHttpArchive(url: string, destination: string) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Host download failed with HTTP ${response.status}`);
  }
  await pipeline(
    Readable.fromWeb(
      response.body as import("node:stream/web").ReadableStream<Uint8Array>,
    ),
    createWriteStream(destination, { flags: "wx" }),
  );
  return { effectiveUrl: response.url || url };
}

export async function ensureCachedHostArchive(args: {
  cacheRoot: string;
  downloadUrl: string;
  sha256: string;
  download?: (
    url: string,
    destination: string,
  ) => Promise<{ effectiveUrl: string }>;
}): Promise<{
  archivePath: string;
  effectiveUrl: string;
  cacheHit: boolean;
}> {
  if (!/^[a-f0-9]{64}$/.test(args.sha256)) {
    throw new Error("Host archive SHA-256 is invalid");
  }
  const archivesRoot = path.resolve(args.cacheRoot, "archives");
  const archivePath = path.join(archivesRoot, args.sha256);
  await fs.mkdir(archivesRoot, { recursive: true });
  try {
    if ((await sha256File(archivePath)) === args.sha256) {
      return {
        archivePath,
        effectiveUrl: args.downloadUrl,
        cacheHit: true,
      };
    }
    await fs.rm(archivePath, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const temporaryPath = path.join(
    archivesRoot,
    `${args.sha256}.${randomUUID()}.download`,
  );
  let downloadResult: { effectiveUrl: string };
  try {
    downloadResult = await (args.download || downloadHttpArchive)(
      args.downloadUrl,
      temporaryPath,
    );
    const observed = await sha256File(temporaryPath);
    if (observed !== args.sha256) {
      throw new Error(
        `Host archive SHA-256 mismatch: expected ${args.sha256}, observed ${observed}`,
      );
    }
    try {
      await fs.rename(temporaryPath, archivePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if ((await sha256File(archivePath)) !== args.sha256) {
        throw new Error(
          "Concurrent host archive cache publication was invalid",
        );
      }
    }
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
  return {
    archivePath,
    effectiveUrl: downloadResult!.effectiveUrl,
    cacheHit: false,
  };
}

function execFileText(
  file: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        cwd: options.cwd,
        env: options.env,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        timeout: options.timeoutMs ?? 120_000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `${file} failed: ${String(stderr || error.message).trim()}`,
              { cause: error },
            ),
          );
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

function splitCommandLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

async function listTarEntries(archivePath: string): Promise<ArchiveEntry[]> {
  const [namesResult, detailsResult] = await Promise.all([
    execFileText("tar", ["-tf", archivePath]),
    execFileText("tar", ["-tvf", archivePath]),
  ]);
  const names = splitCommandLines(namesResult.stdout);
  const details = splitCommandLines(detailsResult.stdout);
  if (names.length !== details.length) {
    throw new Error("Host tar archive listing was inconsistent");
  }
  return names.map((entryPath, index) => {
    const marker = details[index]?.[0];
    const type: ArchiveEntry["type"] =
      marker === "d"
        ? "directory"
        : marker === "-"
          ? "file"
          : marker === "l"
            ? "symlink"
            : marker === "h"
              ? "hardlink"
              : "device";
    return { path: entryPath, type };
  });
}

function findZipEndRecord(tail: Buffer): number {
  for (let offset = tail.length - 22; offset >= 0; offset -= 1) {
    if (tail.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  return -1;
}

async function listZipEntries(archivePath: string): Promise<ArchiveEntry[]> {
  const file = await fs.open(archivePath, "r");
  try {
    const stat = await file.stat();
    const tailSize = Math.min(stat.size, 65_557);
    const tail = Buffer.alloc(tailSize);
    await file.read(tail, 0, tailSize, stat.size - tailSize);
    const endOffset = findZipEndRecord(tail);
    if (endOffset < 0) {
      throw new Error("Host ZIP archive has no end record");
    }
    const entryCount = tail.readUInt16LE(endOffset + 10);
    const centralSize = tail.readUInt32LE(endOffset + 12);
    const centralOffset = tail.readUInt32LE(endOffset + 16);
    if (
      entryCount === 0xffff ||
      centralSize === 0xffffffff ||
      centralOffset === 0xffffffff
    ) {
      throw new Error("ZIP64 host archives are not supported by this recipe");
    }
    const central = Buffer.alloc(centralSize);
    await file.read(central, 0, centralSize, centralOffset);
    const entries: ArchiveEntry[] = [];
    let offset = 0;
    while (offset < central.length) {
      if (central.readUInt32LE(offset) !== 0x02014b50) {
        throw new Error("Host ZIP central directory is malformed");
      }
      const madeBy = central.readUInt16LE(offset + 4);
      const flags = central.readUInt16LE(offset + 8);
      const externalAttributes = central.readUInt32LE(offset + 38);
      const nameLength = central.readUInt16LE(offset + 28);
      const extraLength = central.readUInt16LE(offset + 30);
      const commentLength = central.readUInt16LE(offset + 32);
      const name = central.subarray(offset + 46, offset + 46 + nameLength);
      const entryPath = name.toString(flags & 0x800 ? "utf8" : "latin1");
      const unixMode = madeBy >> 8 === 3 ? externalAttributes >>> 16 : 0;
      const unixType = unixMode & 0o170000;
      const type: ArchiveEntry["type"] = entryPath.endsWith("/")
        ? "directory"
        : unixType === 0o120000
          ? "symlink"
          : unixType === 0o060000 || unixType === 0o020000
            ? "device"
            : "file";
      entries.push({ path: entryPath, type });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    if (entries.length !== entryCount) {
      throw new Error("Host ZIP entry count did not match its end record");
    }
    return entries;
  } finally {
    await file.close();
  }
}

async function validateExtractedTree(
  root: string,
  allowContainedSymlinks = false,
  treeRoot = path.resolve(root),
): Promise<void> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    const stat = await fs.lstat(entryPath);
    if (stat.isSymbolicLink()) {
      if (!allowContainedSymlinks) {
        throw new Error(`Unsafe extracted symbolic link: ${entryPath}`);
      }
      const linkTarget = await fs.readlink(entryPath);
      const resolvedTarget = path.resolve(path.dirname(entryPath), linkTarget);
      const relative = path.relative(treeRoot, resolvedTarget);
      if (
        path.isAbsolute(linkTarget) ||
        relative.startsWith("..") ||
        path.isAbsolute(relative)
      ) {
        throw new Error(`Unsafe extracted symbolic link: ${entryPath}`);
      }
      continue;
    }
    if (!stat.isDirectory() && !stat.isFile()) {
      throw new Error(`Unsafe extracted special file: ${entryPath}`);
    }
    if (stat.isDirectory()) {
      await validateExtractedTree(entryPath, allowContainedSymlinks, treeRoot);
    }
  }
}

async function extractHostArchive(args: {
  archivePath: string;
  format: CompatibilityTarget["archiveFormat"];
  stagingRoot: string;
}): Promise<void> {
  if (args.format === "tar.bz2" || args.format === "tar.xz") {
    validateArchiveEntries(await listTarEntries(args.archivePath));
    await execFileText("tar", [
      "-xf",
      args.archivePath,
      "-C",
      args.stagingRoot,
      "--no-same-owner",
      "--no-same-permissions",
    ]);
    return;
  }
  if (args.format === "zip") {
    validateArchiveEntries(await listZipEntries(args.archivePath));
    await execFileText("tar", [
      "-xf",
      args.archivePath,
      "-C",
      args.stagingRoot,
    ]);
    return;
  }
  if (process.platform !== "darwin") {
    throw new Error("DMG extraction requires macOS");
  }
  const mountRoot = path.join(args.stagingRoot, ".mount");
  await fs.mkdir(mountRoot, { recursive: true });
  await execFileText("hdiutil", [
    "attach",
    "-readonly",
    "-nobrowse",
    "-mountpoint",
    mountRoot,
    args.archivePath,
  ]);
  try {
    await validateExtractedTree(path.join(mountRoot, "Zotero.app"), true);
    await execFileText("ditto", [
      path.join(mountRoot, "Zotero.app"),
      path.join(args.stagingRoot, "Zotero.app"),
    ]);
  } finally {
    await execFileText("hdiutil", ["detach", mountRoot], {
      timeoutMs: 30_000,
    }).catch(() => undefined);
    await fs.rm(mountRoot, { recursive: true, force: true });
  }
}

function assertCurrentPlatform(target: CompatibilityTarget): void {
  const expectedOs = target.platform.split("-")[0];
  const observedOs =
    process.platform === "win32"
      ? "windows"
      : process.platform === "darwin"
        ? "macos"
        : process.platform;
  const expectedArch = target.platform.endsWith("arm64") ? "arm64" : "x64";
  if (expectedOs !== observedOs || expectedArch !== process.arch) {
    throw new Error(
      `Compatibility target ${target.id} requires ${expectedOs}/${expectedArch}, observed ${observedOs}/${process.arch}`,
    );
  }
}

async function validateExpectedBinary(
  installRoot: string,
  expectedBinary: string,
): Promise<string> {
  const binaryPath = path.resolve(installRoot, expectedBinary);
  const relative = path.relative(path.resolve(installRoot), binaryPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Expected Zotero binary escaped the install root");
  }
  const stat = await fs.stat(binaryPath);
  if (!stat.isFile()) {
    throw new Error("Expected Zotero binary is not a regular file");
  }
  if (process.platform !== "win32" && (stat.mode & 0o111) === 0) {
    throw new Error("Expected Zotero binary is not executable");
  }
  return binaryPath;
}

function installedVersionPath(
  installRoot: string,
  target: CompatibilityTarget,
): string {
  if (target.platform.startsWith("macos-")) {
    return path.join(
      installRoot,
      "Zotero.app",
      "Contents",
      "Resources",
      "application.ini",
    );
  }
  return path.join(
    installRoot,
    path.dirname(target.expectedBinary),
    "app",
    "application.ini",
  );
}

async function validateInstalledVersion(
  installRoot: string,
  target: CompatibilityTarget,
): Promise<string> {
  const source = await fs.readFile(
    installedVersionPath(installRoot, target),
    "utf8",
  );
  const observed = /^Version=(.+)$/m.exec(source)?.[1]?.trim() || "";
  if (observed !== target.version) {
    throw new Error(
      `Installed Zotero version mismatch: expected ${target.version}, observed ${observed || "unknown"}`,
    );
  }
  return observed;
}

export async function acquireZoteroHost(args: {
  manifest: CompatibilityManifest;
  targetId: string;
  cacheRoot: string;
}): Promise<AcquiredZoteroHost> {
  validateCompatibilityManifest(args.manifest);
  const target = resolveCompatibilityTarget(args.manifest, args.targetId);
  assertCurrentPlatform(target);
  const archive = await ensureCachedHostArchive({
    cacheRoot: args.cacheRoot,
    downloadUrl: target.downloadUrl,
    sha256: target.sha256,
  });
  const installRoot = path.resolve(
    args.cacheRoot,
    "hosts",
    target.platform,
    target.version,
    target.sha256,
    `recipe-${args.manifest.extractRecipeVersion}`,
  );
  try {
    const binaryPath = await validateExpectedBinary(
      installRoot,
      target.expectedBinary,
    );
    await validateInstalledVersion(installRoot, target);
    return {
      target,
      archivePath: archive.archivePath,
      archiveCacheHit: archive.cacheHit,
      installRoot,
      binaryPath,
      effectiveUrl: archive.effectiveUrl,
    };
  } catch (error) {
    await fs.rm(installRoot, { recursive: true, force: true });
  }

  await fs.mkdir(path.dirname(installRoot), { recursive: true });
  const stagingRoot = `${installRoot}.${randomUUID()}.staging`;
  await fs.mkdir(stagingRoot, { recursive: true });
  try {
    await extractHostArchive({
      archivePath: archive.archivePath,
      format: target.archiveFormat,
      stagingRoot,
    });
    await validateExtractedTree(stagingRoot, target.archiveFormat === "dmg");
    await validateExpectedBinary(stagingRoot, target.expectedBinary);
    await validateInstalledVersion(stagingRoot, target);
    try {
      await fs.rename(stagingRoot, installRoot);
    } catch (error) {
      if (
        !["EEXIST", "ENOTEMPTY"].includes(
          String((error as NodeJS.ErrnoException).code || ""),
        )
      ) {
        throw error;
      }
    }
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
  }
  return {
    target,
    archivePath: archive.archivePath,
    archiveCacheHit: archive.cacheHit,
    installRoot,
    binaryPath: await validateExpectedBinary(
      installRoot,
      target.expectedBinary,
    ),
    effectiveUrl: archive.effectiveUrl,
  };
}

export async function materializeZoteroHostForRun(
  acquired: AcquiredZoteroHost,
  runRoot: string,
): Promise<MaterializedZoteroHost> {
  const root = path.resolve(runRoot);
  const installRoot = path.join(root, "host");
  if (path.dirname(installRoot) !== root) {
    throw new Error("Run-local Zotero host escaped its run root");
  }
  await fs.cp(acquired.installRoot, installRoot, {
    recursive: true,
    force: false,
    errorOnExist: true,
    preserveTimestamps: true,
    verbatimSymlinks: true,
  });
  return {
    installRoot,
    binaryPath: await validateExpectedBinary(
      installRoot,
      acquired.target.expectedBinary,
    ),
    observedVersion: await validateInstalledVersion(
      installRoot,
      acquired.target,
    ),
  };
}

function waitForChildExit(child: ChildProcess) {
  return new Promise<{
    exitCode: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode, signal) => resolve({ exitCode, signal }));
  });
}

async function requestOwnedTermination(
  child: ChildProcess,
  force: boolean,
): Promise<boolean> {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) {
    return false;
  }
  if (process.platform === "win32") {
    const taskkill = spawn(
      "taskkill.exe",
      ["/pid", String(child.pid), "/t", ...(force ? ["/f"] : [])],
      { windowsHide: true, stdio: "ignore" },
    );
    await waitForChildExit(taskkill).catch(() => undefined);
    return true;
  }
  try {
    process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") {
      return false;
    }
    throw error;
  }
  return true;
}

function waitForDeadline(milliseconds: number): Promise<"timeout"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), milliseconds);
    timer.unref?.();
  });
}

export async function runOwnedCommand(args: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdoutPath: string;
  stderrPath: string;
  timeoutMs: number;
  gracefulTimeoutMs?: number;
}): Promise<OwnedCommandResult> {
  const startedAt = Date.now();
  await Promise.all([
    fs.mkdir(path.dirname(args.stdoutPath), { recursive: true }),
    fs.mkdir(path.dirname(args.stderrPath), { recursive: true }),
  ]);
  const stdout = createWriteStream(args.stdoutPath, { flags: "wx" });
  const stderr = createWriteStream(args.stderrPath, { flags: "wx" });
  const child = spawn(args.command, args.args, {
    cwd: args.cwd,
    env: args.env,
    detached: process.platform !== "win32",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  const exit = waitForChildExit(child);
  let forwardedTermination: Promise<boolean> | null = null;
  const forwardSignal = () => {
    forwardedTermination ||= requestOwnedTermination(child, false);
  };
  process.once("SIGINT", forwardSignal);
  process.once("SIGTERM", forwardSignal);
  let outcome = await Promise.race([exit, waitForDeadline(args.timeoutMs)]);
  let graceful = false;
  let forced = false;
  const timedOut = outcome === "timeout";

  if (outcome === "timeout") {
    graceful = await requestOwnedTermination(child, false);
    outcome = await Promise.race([
      exit,
      waitForDeadline(args.gracefulTimeoutMs ?? 5_000),
    ]);
    if (outcome === "timeout") {
      forced = await requestOwnedTermination(child, true);
      outcome = await exit;
    }
  }

  if (forwardedTermination) {
    graceful ||= await forwardedTermination;
  }
  process.off("SIGINT", forwardSignal);
  process.off("SIGTERM", forwardSignal);
  await Promise.all([finished(stdout), finished(stderr)]);
  return {
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    timedOut,
    graceful,
    forced,
    durationMs: Date.now() - startedAt,
  };
}

function safeRunLabel(label: string): string {
  const normalized = label.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80);
  return normalized || "run";
}

export async function createRunLayout(
  parentRoot: string,
  label: string,
): Promise<CompatibilityRunLayout> {
  const runId = `${safeRunLabel(label)}-${randomUUID()}`;
  const root = path.resolve(parentRoot, runId);
  const resolvedParent = path.resolve(parentRoot);
  if (path.dirname(root) !== resolvedParent) {
    throw new Error("Compatibility run root escaped its parent");
  }
  const layout: CompatibilityRunLayout = {
    runId,
    root,
    profile: path.join(root, ".scaffold", "test", "profile"),
    data: path.join(root, ".scaffold", "test", "data"),
    runtime: path.join(root, "runtime"),
    resource: path.join(root, ".scaffold", "test", "resource"),
    diagnostics: path.join(root, "diagnostics"),
    receipt: path.join(root, "receipt.json"),
  };
  await Promise.all(
    [
      layout.profile,
      layout.data,
      layout.runtime,
      layout.resource,
      layout.diagnostics,
    ].map((directory) => fs.mkdir(directory, { recursive: true })),
  );
  return layout;
}

export async function cleanupRunLayoutState(
  layout: CompatibilityRunLayout,
): Promise<void> {
  const root = path.resolve(layout.root);
  const statePaths = [
    layout.profile,
    layout.data,
    layout.runtime,
    layout.resource,
    path.join(root, ".scaffold", "cache"),
    path.join(root, "compatibility-entries"),
    path.join(root, "host"),
    path.join(root, "node_modules"),
    path.join(root, "test"),
    path.join(root, "workflows_builtin"),
  ];
  for (const statePath of statePaths) {
    const resolved = path.resolve(statePath);
    const relative = path.relative(root, resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Compatibility cleanup target escaped its run root");
    }
    await fs.rm(resolved, { recursive: true, force: true });
  }
}

export async function acquireZoteroMachineRunLock(
  lockRoot: string,
  timeoutMs: number,
): Promise<{ release: () => Promise<void> }> {
  const root = path.resolve(lockRoot);
  const lockPath = path.join(root, "zotero-gui-host.lock");
  const token = randomUUID();
  const startedAt = Date.now();
  await fs.mkdir(root, { recursive: true });

  while (true) {
    try {
      const handle = await fs.open(lockPath, "wx");
      try {
        await handle.writeFile(
          `${JSON.stringify({ token, pid: process.pid, startedAt })}\n`,
          "utf8",
        );
      } finally {
        await handle.close();
      }
      let released = false;
      return {
        async release() {
          if (released) return;
          released = true;
          try {
            const current = JSON.parse(await fs.readFile(lockPath, "utf8"));
            if (current.token === token) {
              await fs.rm(lockPath, { force: true });
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }

    let holderPid = 0;
    try {
      const holder = JSON.parse(await fs.readFile(lockPath, "utf8"));
      holderPid = Number(holder.pid || 0);
    } catch {
      // A partial or abandoned lock is reclaimed below.
    }
    let holderAlive = false;
    if (Number.isSafeInteger(holderPid) && holderPid > 0) {
      try {
        process.kill(holderPid, 0);
        holderAlive = true;
      } catch (error) {
        holderAlive = (error as NodeJS.ErrnoException).code === "EPERM";
      }
    }
    if (!holderAlive) {
      await fs.rm(lockPath, { force: true });
      continue;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(
        `Timed out waiting for Zotero GUI host lock held by process ${holderPid}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export function createCompatibilityReceipt(args: {
  runId: string;
  source: CompatibilityReceipt["source"];
  plugin: CompatibilityReceipt["plugin"];
  host: Omit<
    CompatibilityReceipt["host"],
    "observedVersion" | "appBuildId" | "effectiveUrl"
  >;
  execution: CompatibilityReceipt["execution"];
  startedAt?: string;
}): CompatibilityReceipt {
  return {
    schemaId: "zotero-agents.zotero-compatibility-receipt.v1",
    runId: args.runId,
    source: args.source,
    plugin: args.plugin,
    host: {
      ...args.host,
      observedVersion: null,
      appBuildId: null,
      effectiveUrl: null,
    },
    execution: args.execution,
    status: "running",
    phases: [],
    errors: [],
    diagnostics: [],
    cleanup: { graceful: false, forced: false, complete: false },
    timing: {
      startedAt: args.startedAt || new Date().toISOString(),
      finishedAt: null,
      durationMs: null,
    },
  };
}

export async function writeCompatibilityReceipt(
  receiptPath: string,
  receipt: CompatibilityReceipt,
): Promise<void> {
  await fs.mkdir(path.dirname(receiptPath), { recursive: true });
  const temporaryPath = `${receiptPath}.${randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  await fs.rename(temporaryPath, receiptPath);
}
