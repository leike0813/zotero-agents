import { joinPath } from "../utils/path";
import { runtimePathExists } from "./runtimePersistence";

export type HostBridgeCliResolution =
  | {
      available: true;
      binaryPath: string;
      cliDir: string;
      source: "env" | "bundled" | "path";
    }
  | {
      available: false;
      code: "cli_binary_unavailable";
      message: string;
      checkedPaths: string[];
    };

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function dirname(pathRaw: string) {
  const path = normalizeString(pathRaw);
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : "";
}

function resolveRuntimeEnv(name: string) {
  const runtime = globalThis as {
    process?: { env?: Record<string, string | undefined>; platform?: string };
    Services?: { env?: { get?: (name: string) => string } };
    Zotero?: { isWin?: boolean; isMac?: boolean; isLinux?: boolean };
  };
  const processValue = normalizeString(runtime.process?.env?.[name]);
  if (processValue) {
    return processValue;
  }
  try {
    return normalizeString(runtime.Services?.env?.get?.(name));
  } catch {
    return "";
  }
}

function resolveRuntimePathEnv() {
  return (
    resolveRuntimeEnv("PATH") ||
    resolveRuntimeEnv("Path") ||
    resolveRuntimeEnv("path")
  );
}

function pathDelimiter() {
  const runtime = globalThis as {
    process?: { platform?: string };
    Zotero?: { isWin?: boolean };
  };
  return runtime.Zotero?.isWin || runtime.process?.platform === "win32"
    ? ";"
    : ":";
}

function buildPathCandidates(args: { pathValue: string; binary: string }) {
  return uniqueStrings(
    normalizeString(args.pathValue)
      .split(pathDelimiter())
      .map((entry) => normalizeString(entry))
      .filter(Boolean)
      .map((entry) => joinPath(entry, args.binary)),
  );
}

function resolveRuntimePlatform() {
  const runtime = globalThis as {
    process?: { platform?: string; arch?: string };
    Zotero?: { isWin?: boolean; isMac?: boolean; isLinux?: boolean };
  };
  return resolveHostBridgeCliPlatform({
    platform: runtime.Zotero?.isWin
      ? "win32"
      : runtime.Zotero?.isMac
        ? "darwin"
        : runtime.Zotero?.isLinux
          ? "linux"
          : runtime.process?.platform,
    arch: runtime.process?.arch,
  });
}

export function resolveHostBridgeCliPlatform(args: {
  platform?: unknown;
  arch?: unknown;
}) {
  const platform = normalizeString(args.platform).toLowerCase();
  const arch = normalizeString(args.arch).toLowerCase();
  if (platform === "win32") {
    return { dir: "win32-x64", binary: "zotero-bridge.exe" };
  }
  if (platform === "darwin") {
    return {
      dir: arch === "arm64" ? "darwin-arm64" : "darwin-x64",
      binary: "zotero-bridge",
    };
  }
  if (platform === "linux") {
    const dir =
      arch === "ia32" || arch === "x86" || arch === "x32"
        ? "linux-x86"
        : arch === "arm"
          ? "linux-arm"
          : arch === "arm64" || arch === "aarch64"
            ? "linux-arm64"
            : "linux-x64";
    return { dir, binary: "zotero-bridge" };
  }
  return { dir: "unknown", binary: "zotero-bridge" };
}

function resolveRuntimeCwd() {
  const runtime = globalThis as { process?: { cwd?: () => string } };
  return normalizeString(runtime.process?.cwd?.()) || ".";
}

function resolveRuntimeRootPath() {
  try {
    if (typeof rootPath === "string") {
      return normalizeString(rootPath);
    }
  } catch {
    // Fall back to object property lookup below.
  }
  const runtime = globalThis as { rootPath?: string };
  return normalizeString(runtime.rootPath);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(normalizeString).filter(Boolean)));
}

function parentPath(pathRaw: string) {
  const path = normalizeString(pathRaw).replace(/[\\/]+$/, "");
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : "";
}

function candidateRoots(...roots: string[]) {
  const candidates: string[] = [];
  for (const root of roots.map(normalizeString).filter(Boolean)) {
    let current = root;
    for (let depth = 0; current && depth < 4; depth += 1) {
      candidates.push(current);
      const parent = parentPath(current);
      if (!parent || parent === current) {
        break;
      }
      current = parent;
    }
  }
  return uniqueStrings(candidates);
}

function buildBundledCandidates(args: {
  roots: string[];
  platformDir: string;
  binary: string;
}) {
  const candidates: string[] = [];
  for (const root of candidateRoots(...args.roots)) {
    candidates.push(joinPath(root, "bin", args.platformDir, args.binary));
    candidates.push(
      joinPath(root, "addon", "bin", args.platformDir, args.binary),
    );
  }
  return uniqueStrings(candidates);
}

export async function resolveHostBridgeCliBinary(): Promise<HostBridgeCliResolution> {
  const envOverride = resolveRuntimeEnv("ZOTERO_BRIDGE_CLI");
  const checkedPaths: string[] = [];
  if (envOverride) {
    checkedPaths.push(envOverride);
    if (await runtimePathExists(envOverride)) {
      return {
        available: true,
        binaryPath: envOverride,
        cliDir: dirname(envOverride),
        source: "env",
      };
    }
  }

  const platform = resolveRuntimePlatform();
  const runtimeRoot = resolveRuntimeRootPath();
  const runtimeCwd = resolveRuntimeCwd();
  const bundledCandidates = buildBundledCandidates({
    roots: [runtimeRoot, runtimeCwd],
    platformDir: platform.dir,
    binary: platform.binary,
  });
  for (const bundled of bundledCandidates) {
    checkedPaths.push(bundled);
    if (await runtimePathExists(bundled)) {
      return {
        available: true,
        binaryPath: bundled,
        cliDir: dirname(bundled),
        source: "bundled",
      };
    }
  }

  const pathCandidates = buildPathCandidates({
    pathValue: resolveRuntimePathEnv(),
    binary: platform.binary,
  });
  for (const pathCandidate of pathCandidates) {
    checkedPaths.push(pathCandidate);
    if (await runtimePathExists(pathCandidate)) {
      return {
        available: true,
        binaryPath: pathCandidate,
        cliDir: dirname(pathCandidate),
        source: "path",
      };
    }
  }

  return {
    available: false,
    code: "cli_binary_unavailable",
    message:
      "No Host Bridge CLI binary is available for this platform. Set ZOTERO_BRIDGE_CLI for development or package platform binaries in a later phase.",
    checkedPaths,
  };
}

export const hostBridgeCliResolverInternalsForTests = {
  dirname,
  parentPath,
  candidateRoots,
  buildBundledCandidates,
  buildPathCandidates,
  resolveRuntimePathEnv,
  resolveRuntimePlatform,
  resolveRuntimeRootPath,
  resolveHostBridgeCliPlatform,
};
