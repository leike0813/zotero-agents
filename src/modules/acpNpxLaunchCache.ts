import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  moveRuntimePath,
  readRuntimeTextFile,
  removeRuntimePath,
  writeRuntimeTextFile,
} from "./runtimePersistence";

const NPM_CACHE_ENV_KEY = "npm_config_cache";
const ACTIVE_GENERATION_FILE = "active-generation.json";
const MAX_GENERATION = 1_000_000_000;

type AcpNpxLaunchInput = {
  command?: string;
  args?: string[];
};

export type AcpNpxLaunchSpec = {
  executable: string;
  packageSpec: string;
};

export type AcpNpxLaunchCacheLease = {
  readonly cacheKey: string;
  readonly generation: number;
  readonly cachePath: string;
  readonly environment: Record<string, string>;
  rotate: () => Promise<void>;
  release: () => void;
};

export type AcpNpxCacheRenameConflictCode = "ENOTEMPTY" | "EEXIST";

type LeaseTail = {
  promise: Promise<void>;
};

const leaseTails = new Map<string, LeaseTail>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function executableBaseName(value: unknown) {
  const normalized = normalizeString(value).replace(/\\/g, "/");
  const baseName = normalized.slice(normalized.lastIndexOf("/") + 1);
  return baseName.replace(/\.(?:cmd|bat|exe|ps1)$/i, "").toLowerCase();
}

function findPackageSpec(args: string[]) {
  const optionsWithValue = new Set([
    "--cache",
    "--call",
    "--node-options",
    "--npm",
    "--registry",
    "--userconfig",
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const current = normalizeString(args[index]);
    if (!current) {
      continue;
    }
    if (current === "--package" || current === "-p") {
      return normalizeString(args[index + 1]) || "";
    }
    if (current.startsWith("--package=")) {
      return normalizeString(current.slice("--package=".length));
    }
    if (optionsWithValue.has(current)) {
      index += 1;
      continue;
    }
    if (current.startsWith("-")) {
      continue;
    }
    return current;
  }
  return "";
}

export function resolveAcpNpxLaunchSpec(
  input: AcpNpxLaunchInput,
): AcpNpxLaunchSpec | null {
  const command = normalizeString(input.command);
  const args = Array.isArray(input.args)
    ? input.args.map((entry) => String(entry || ""))
    : [];
  let executable = command;
  let npxArgs = args;
  if (executableBaseName(command) === "uv") {
    const separatorIndex = args.indexOf("--");
    if (separatorIndex < 0) {
      return null;
    }
    executable = normalizeString(args[separatorIndex + 1]);
    npxArgs = args.slice(separatorIndex + 2);
  }
  if (executableBaseName(executable) !== "npx") {
    return null;
  }
  const packageSpec = findPackageSpec(npxArgs);
  return packageSpec ? { executable, packageSpec } : null;
}

function fnv1a32(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildAcpNpxLaunchCacheKey(args: {
  backendId: string;
  executable: string;
  packageSpec: string;
}) {
  const identity = [
    normalizeString(args.backendId).toLowerCase(),
    normalizeString(args.executable).replace(/\\/g, "/").toLowerCase(),
    normalizeString(args.packageSpec).toLowerCase(),
  ].join("\n");
  return `npx-${fnv1a32(identity, 0x811c9dc5)}${fnv1a32(identity, 0x9e3779b9)}`;
}

function hasExplicitNpmCache(env: Record<string, string> | undefined) {
  return Object.keys(env || {}).some(
    (key) => key.toLowerCase() === NPM_CACHE_ENV_KEY,
  );
}

function generationDirectoryName(generation: number) {
  return `generation-${generation}`;
}

function parseActiveGeneration(value: string) {
  try {
    const parsed = JSON.parse(value) as { generation?: unknown };
    const generation = Number(parsed.generation);
    return Number.isSafeInteger(generation) &&
      generation >= 0 &&
      generation <= MAX_GENERATION
      ? generation
      : 0;
  } catch {
    return 0;
  }
}

async function persistActiveGeneration(root: string, generation: number) {
  const activePath = joinPath(root, ACTIVE_GENERATION_FILE);
  const temporaryPath = `${activePath}.tmp`;
  const content = `${JSON.stringify({ generation })}\n`;
  await writeRuntimeTextFile(temporaryPath, content);
  try {
    await moveRuntimePath({
      sourcePath: temporaryPath,
      targetPath: activePath,
      overwrite: true,
    });
  } catch {
    await writeRuntimeTextFile(activePath, content);
    await removeRuntimePath(temporaryPath).catch(() => undefined);
  }
}

async function readActiveGeneration(root: string) {
  return parseActiveGeneration(
    await readRuntimeTextFile(joinPath(root, ACTIVE_GENERATION_FILE)),
  );
}

async function acquireKeyedLease(cacheKey: string) {
  const prior = leaseTails.get(cacheKey)?.promise || Promise.resolve();
  let releaseGate!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  const tail = prior.catch(() => undefined).then(() => gate);
  const tailEntry = { promise: tail };
  leaseTails.set(cacheKey, tailEntry);
  await prior.catch(() => undefined);
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    releaseGate();
    if (leaseTails.get(cacheKey) === tailEntry) {
      leaseTails.delete(cacheKey);
    }
  };
}

export async function acquireAcpNpxLaunchCacheLease(args: {
  backendId: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cacheRoot?: string;
}): Promise<AcpNpxLaunchCacheLease | null> {
  const launch = resolveAcpNpxLaunchSpec(args);
  if (!launch || hasExplicitNpmCache(args.env)) {
    return null;
  }
  const cacheKey = buildAcpNpxLaunchCacheKey({
    backendId: args.backendId,
    executable: launch.executable,
    packageSpec: launch.packageSpec,
  });
  const release = await acquireKeyedLease(cacheKey);
  const cacheRoot =
    normalizeString(args.cacheRoot) || getRuntimePersistencePaths().cacheDir;
  const identityRoot = joinPath(cacheRoot, "acp-npx", cacheKey);
  try {
    await ensureRuntimeDirectory(identityRoot);
    let generation = await readActiveGeneration(identityRoot);
    let cachePath = joinPath(identityRoot, generationDirectoryName(generation));
    await ensureRuntimeDirectory(cachePath);
    const environment = {
      ...(args.env || {}),
      [NPM_CACHE_ENV_KEY]: cachePath,
    };
    const lease: AcpNpxLaunchCacheLease = {
      cacheKey,
      get generation() {
        return generation;
      },
      get cachePath() {
        return cachePath;
      },
      get environment() {
        return { ...environment, [NPM_CACHE_ENV_KEY]: cachePath };
      },
      async rotate() {
        generation = generation >= MAX_GENERATION ? 0 : generation + 1;
        cachePath = joinPath(identityRoot, generationDirectoryName(generation));
        await ensureRuntimeDirectory(cachePath);
        await persistActiveGeneration(identityRoot, generation);
      },
      release,
    };
    return lease;
  } catch (error) {
    release();
    throw error;
  }
}

function diagnosticText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    const record = value as Error & {
      code?: unknown;
      stderrText?: unknown;
      transportSnapshot?: { stderrText?: unknown };
    };
    return [
      record.name,
      record.message,
      record.code,
      record.stderrText,
      record.transportSnapshot?.stderrText,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (value && typeof value === "object") {
    const record = value as {
      code?: unknown;
      message?: unknown;
      stderrText?: unknown;
      transportSnapshot?: { stderrText?: unknown };
    };
    return [
      record.code,
      record.message,
      record.stderrText,
      record.transportSnapshot?.stderrText,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return normalizeString(value);
}

export function classifyAcpNpxCacheRenameConflict(
  value: unknown,
): AcpNpxCacheRenameConflictCode | null {
  const text = diagnosticText(value).slice(-128 * 1024);
  if (!/_npx/i.test(text) || !/\brename\b/i.test(text)) {
    return null;
  }
  if (/\bENOTEMPTY\b/i.test(text)) {
    return "ENOTEMPTY";
  }
  if (/\bEEXIST\b/i.test(text)) {
    return "EEXIST";
  }
  return null;
}

export function resetAcpNpxLaunchCacheForTests() {
  leaseTails.clear();
}
