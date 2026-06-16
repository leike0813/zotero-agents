import { joinPath } from "../utils/path";
import {
  copyRuntimeDirectory,
  getRuntimePersistencePaths,
  statRuntimePath,
} from "./runtimePersistence";

const BUILTIN_SKILL_ROOT = "skills_builtin";

export type BuiltinSkillSyncResult = {
  ok: boolean;
  sourceRoot: string;
  targetRoot: string;
  error?: string;
};

let latestBuiltinSkillSyncResult: BuiltinSkillSyncResult | null = null;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function getRuntimeCwd() {
  const runtime = globalThis as {
    process?: { cwd?: () => string };
  };
  if (typeof runtime.process?.cwd === "function") {
    return runtime.process.cwd();
  }
  return "";
}

function normalizeFsPathForCompare(value: string) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .toLowerCase();
}

function isSameFsPath(left: string, right: string) {
  const normalizedLeft = normalizeFsPathForCompare(left);
  const normalizedRight = normalizeFsPathForCompare(right);
  return (
    !!normalizedLeft && !!normalizedRight && normalizedLeft === normalizedRight
  );
}

function isNestedFsPath(parent: string, child: string) {
  const normalizedParent = normalizeFsPathForCompare(parent);
  const normalizedChild = normalizeFsPathForCompare(child);
  if (
    !normalizedParent ||
    !normalizedChild ||
    normalizedParent === normalizedChild
  ) {
    return false;
  }
  return normalizedChild.startsWith(`${normalizedParent}/`);
}

function compactError(error: unknown) {
  const text = normalizeString(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error,
  );
  return text || "unknown error";
}

function getPackagedBuiltinSkillSourceDir(devCwd?: string) {
  const cwd = normalizeString(devCwd) || getRuntimeCwd();
  return cwd ? joinPath(cwd, BUILTIN_SKILL_ROOT) : "";
}

export function getBuiltinSkillTargetDir() {
  return joinPath(getRuntimePersistencePaths().dataDir, BUILTIN_SKILL_ROOT);
}

export function getLatestBuiltinSkillSyncResult() {
  return latestBuiltinSkillSyncResult
    ? { ...latestBuiltinSkillSyncResult }
    : null;
}

export function clearLatestBuiltinSkillSyncResultForTests() {
  latestBuiltinSkillSyncResult = null;
}

export async function syncBuiltinSkillsOnStartup(args?: { devCwd?: string }) {
  const sourceRoot = getPackagedBuiltinSkillSourceDir(args?.devCwd);
  const targetRoot = getBuiltinSkillTargetDir();
  const base = { sourceRoot, targetRoot };
  try {
    if (!sourceRoot) {
      throw new Error("builtin skill source root is unavailable");
    }
    if (
      isSameFsPath(sourceRoot, targetRoot) ||
      isNestedFsPath(sourceRoot, targetRoot) ||
      isNestedFsPath(targetRoot, sourceRoot)
    ) {
      throw new Error(
        "refusing to sync builtin skills when source and target are same or nested",
      );
    }
    const stat = await statRuntimePath(sourceRoot);
    if (!stat.exists || !stat.isDir) {
      throw new Error(
        `builtin skill source root does not exist: ${sourceRoot}`,
      );
    }
    await copyRuntimeDirectory({
      sourceDir: sourceRoot,
      targetDir: targetRoot,
    });
    latestBuiltinSkillSyncResult = { ok: true, ...base };
    return latestBuiltinSkillSyncResult;
  } catch (error) {
    latestBuiltinSkillSyncResult = {
      ok: false,
      ...base,
      error: compactError(error),
    };
    throw error;
  }
}
