import { joinPath } from "../utils/path";
import { resolveAddonRef } from "../utils/runtimeBridge";
import { getRuntimePersistencePaths } from "./runtimePersistence";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

const BUILTIN_WORKFLOW_ROOT = "workflows_builtin";
const BUILTIN_MANIFEST_FILE = "manifest.json";

type BuiltinWorkflowManifest = {
  version: number;
  files: string[];
};

export type BuiltinWorkflowResourceFailure = {
  label: string;
  source: string;
  reason: string;
};

export type BuiltinWorkflowResourceDiagnostics = {
  relativePath: string;
  failures: BuiltinWorkflowResourceFailure[];
};

export type BuiltinWorkflowSyncResult = {
  ok: boolean;
  version?: number;
  targetRoot: string;
  files?: number;
  rootURI?: string;
  resourceURI?: string;
  zoteroVersion?: string;
  diagnostics?: BuiltinWorkflowResourceDiagnostics;
  error?: string;
};

type PackagedTextReadResult = {
  text: string;
  source: {
    label: string;
    source: string;
  };
  diagnostics: BuiltinWorkflowResourceDiagnostics;
};

let latestBuiltinWorkflowSyncResult: BuiltinWorkflowSyncResult | null = null;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function detectZoteroRuntime() {
  const runtime = globalThis as {
    IOUtils?: unknown;
    Zotero?: { DataDirectory?: { dir?: string } };
  };
  return (
    typeof runtime.IOUtils !== "undefined" &&
    typeof runtime.Zotero?.DataDirectory?.dir === "string"
  );
}

function compactError(error: unknown) {
  const text = normalizeString(
    error && typeof error === "object" && "message" in error
      ? (error as { message?: unknown }).message
      : error,
  );
  return text || "unknown error";
}

function ensureTrailingSlash(value: string) {
  if (!value) {
    return value;
  }
  return value.endsWith("/") ? value : `${value}/`;
}

function toPosixRelativePath(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
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
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return normalizedLeft === normalizedRight;
}

function isNestedFsPath(parent: string, child: string) {
  const normalizedParent = normalizeFsPathForCompare(parent);
  const normalizedChild = normalizeFsPathForCompare(child);
  if (!normalizedParent || !normalizedChild) {
    return false;
  }
  if (normalizedParent === normalizedChild) {
    return false;
  }
  return normalizedChild.startsWith(`${normalizedParent}/`);
}

function getPackagedBuiltinSourceDir(devCwd?: string) {
  const cwd = normalizeString(devCwd) || getRuntimeCwd();
  if (!cwd) {
    return "";
  }
  return joinPath(cwd, BUILTIN_WORKFLOW_ROOT);
}

function getZoteroVersion() {
  const runtime = globalThis as {
    Zotero?: { version?: unknown };
  };
  return normalizeString(runtime.Zotero?.version);
}

export function getLatestBuiltinWorkflowSyncResult() {
  return latestBuiltinWorkflowSyncResult
    ? {
        ...latestBuiltinWorkflowSyncResult,
        diagnostics: latestBuiltinWorkflowSyncResult.diagnostics
          ? {
              ...latestBuiltinWorkflowSyncResult.diagnostics,
              failures: [
                ...latestBuiltinWorkflowSyncResult.diagnostics.failures,
              ],
            }
          : undefined,
      }
    : null;
}

export function clearLatestBuiltinWorkflowSyncResultForTests() {
  latestBuiltinWorkflowSyncResult = null;
}

export function getBuiltinWorkflowTargetDir() {
  return joinPath(getRuntimePersistencePaths().dataDir, BUILTIN_WORKFLOW_ROOT);
}

async function readTextFileNode(filePath: string) {
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath, "utf8") as Promise<string>;
}

async function writeTextFileNode(filePath: string, content: string) {
  const fs = await dynamicImport("fs/promises");
  const path = await dynamicImport("path");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function removeDirectoryNode(targetDir: string) {
  const fs = await dynamicImport("fs/promises");
  await fs.rm(targetDir, { recursive: true, force: true });
}

async function removeDirectoryZotero(targetDir: string) {
  const runtime = globalThis as {
    IOUtils?: {
      remove?: (
        path: string,
        options?: { recursive?: boolean; ignoreAbsent?: boolean },
      ) => Promise<void>;
      makeDirectory?: (
        path: string,
        options?: { createAncestors?: boolean },
      ) => Promise<void>;
    };
  };
  const remove = runtime.IOUtils?.remove;
  if (typeof remove === "function") {
    await remove(targetDir, { recursive: true, ignoreAbsent: true });
  }
}

async function removeDirectory(targetDir: string) {
  if (detectZoteroRuntime()) {
    await removeDirectoryZotero(targetDir);
    return;
  }
  await removeDirectoryNode(targetDir);
}

async function makeDirectoryZotero(targetDir: string) {
  const runtime = globalThis as {
    IOUtils?: {
      makeDirectory?: (
        path: string,
        options?: { createAncestors?: boolean },
      ) => Promise<void>;
    };
  };
  const makeDirectory = runtime.IOUtils?.makeDirectory;
  if (typeof makeDirectory === "function") {
    await makeDirectory(targetDir, { createAncestors: true });
  }
}

async function pathExistsNode(targetPath: string) {
  const fs = await dynamicImport("fs/promises");
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function pathExistsZotero(targetPath: string) {
  const runtime = globalThis as {
    IOUtils?: { exists?: (path: string) => Promise<boolean> };
  };
  if (typeof runtime.IOUtils?.exists === "function") {
    try {
      return runtime.IOUtils.exists(targetPath);
    } catch {
      return false;
    }
  }
  return false;
}

async function pathExists(targetPath: string) {
  if (detectZoteroRuntime()) {
    return pathExistsZotero(targetPath);
  }
  return pathExistsNode(targetPath);
}

async function movePathNode(sourcePath: string, targetPath: string) {
  const fs = await dynamicImport("fs/promises");
  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    await fs.rm(targetPath, { recursive: true, force: true });
    await fs.cp(sourcePath, targetPath, { recursive: true, force: true });
    await fs.rm(sourcePath, { recursive: true, force: true });
  }
}

async function movePathZotero(sourcePath: string, targetPath: string) {
  const runtime = globalThis as {
    IOUtils?: {
      move?: (sourcePath: string, targetPath: string) => Promise<void>;
    };
  };
  if (typeof runtime.IOUtils?.move !== "function") {
    throw new Error("IOUtils.move is unavailable");
  }
  await runtime.IOUtils.move(sourcePath, targetPath);
}

async function movePath(sourcePath: string, targetPath: string) {
  if (detectZoteroRuntime()) {
    return movePathZotero(sourcePath, targetPath);
  }
  return movePathNode(sourcePath, targetPath);
}

async function writeTextFileZotero(filePath: string, content: string) {
  const runtime = globalThis as unknown as {
    IOUtils?: {
      writeUTF8?: (path: string, data: string) => Promise<unknown>;
    };
  };
  const writeUTF8 = runtime.IOUtils?.writeUTF8;
  if (typeof writeUTF8 !== "function") {
    throw new Error("IOUtils.writeUTF8 is unavailable");
  }
  await writeUTF8(filePath, content);
}

async function readPackagedTextFromNode(relativePath: string, cwdRaw?: string) {
  const cwd = normalizeString(cwdRaw) || getRuntimeCwd() || ".";
  const sourcePath = joinPath(cwd, BUILTIN_WORKFLOW_ROOT, relativePath);
  return readTextFileNode(sourcePath);
}

function buildPackagedResourceUri(baseURI: string, relativePath: string) {
  const rootURI = ensureTrailingSlash(baseURI);
  const posixRelative = toPosixRelativePath(relativePath);
  return `${rootURI}${BUILTIN_WORKFLOW_ROOT}/${posixRelative}`;
}

async function readPackagedTextFromFetch(uri: string) {
  const runtime = globalThis as {
    fetch?: (
      input: string,
    ) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
  };
  if (typeof runtime.fetch !== "function") {
    throw new Error("fetch is unavailable in current runtime");
  }
  const response = await runtime.fetch(uri);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

async function readPackagedTextFromPrivilegedRequest(uri: string) {
  const runtime = globalThis as {
    XMLHttpRequest?: new () => {
      open: (method: string, url: string, async: boolean) => void;
      overrideMimeType?: (mimeType: string) => void;
      send: () => void;
      status: number;
      responseText: string;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      ontimeout?: (() => void) | null;
    };
  };
  const Xhr = runtime.XMLHttpRequest;
  if (typeof Xhr !== "function") {
    throw new Error("XMLHttpRequest is unavailable in current runtime");
  }
  return new Promise<string>((resolve, reject) => {
    const request = new Xhr();
    request.open("GET", uri, true);
    request.overrideMimeType?.("text/plain; charset=utf-8");
    request.onload = () => {
      if (
        request.status === 0 ||
        (request.status >= 200 && request.status < 300)
      ) {
        resolve(request.responseText);
        return;
      }
      reject(new Error(`HTTP ${request.status}`));
    };
    request.onerror = () => reject(new Error("request failed"));
    if ("ontimeout" in request) {
      request.ontimeout = () => reject(new Error("request timed out"));
    }
    request.send();
  });
}

function resolveDefaultRootURI(rootURI?: string) {
  const addonRef = resolveAddonRef("zotero-skills");
  return normalizeString(rootURI) || `chrome://${addonRef}/`;
}

function getZoteroCurrentWorkingDir() {
  const runtime = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (key: string, iface: unknown) => { path?: string };
      };
    };
    Ci?: { nsIFile?: unknown };
  };
  try {
    if (runtime.Services?.dirsvc?.get && runtime.Ci?.nsIFile) {
      const file = runtime.Services.dirsvc.get("CurWorkD", runtime.Ci.nsIFile);
      const path = normalizeString(file?.path);
      if (path) {
        return path;
      }
    }
  } catch {
    // noop
  }
  return "";
}

async function readPackagedTextFromZoteroWorkingDir(relativePath: string) {
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: (path: string) => Promise<string> };
  };
  const readUTF8 = runtime.IOUtils?.readUTF8;
  const cwd = getZoteroCurrentWorkingDir();
  if (typeof readUTF8 !== "function" || !cwd) {
    throw new Error("zotero working directory fallback is unavailable");
  }
  const sourcePath = joinPath(cwd, BUILTIN_WORKFLOW_ROOT, relativePath);
  return readUTF8(sourcePath);
}

async function readPackagedTextWithDiagnostics(args: {
  rootURI?: string;
  resourceURI?: string;
  relativePath: string;
  devCwd?: string;
}): Promise<PackagedTextReadResult> {
  const relativePath = toPosixRelativePath(args.relativePath);
  const diagnostics: BuiltinWorkflowResourceDiagnostics = {
    relativePath,
    failures: [],
  };
  const recordFailure = (label: string, source: string, error: unknown) => {
    diagnostics.failures.push({
      label,
      source,
      reason: compactError(error),
    });
  };
  const tryCandidate = async (
    label: string,
    source: string,
    reader: () => Promise<string>,
  ) => {
    try {
      const text = await reader();
      return {
        text,
        source: { label, source },
        diagnostics,
      };
    } catch (error) {
      recordFailure(label, source, error);
      return null;
    }
  };

  const shouldTryRuntimeUris =
    detectZoteroRuntime() ||
    normalizeString(args.rootURI) ||
    normalizeString(args.resourceURI);
  if (shouldTryRuntimeUris) {
    const rootURI = resolveDefaultRootURI(args.rootURI);
    const rootFetchUri = buildPackagedResourceUri(rootURI, relativePath);
    const rootFetch = await tryCandidate("rootURI-fetch", rootFetchUri, () =>
      readPackagedTextFromFetch(rootFetchUri),
    );
    if (rootFetch) {
      return rootFetch;
    }

    const resourceURI = normalizeString(args.resourceURI);
    if (resourceURI && resourceURI !== rootURI) {
      const resourceFetchUri = buildPackagedResourceUri(
        resourceURI,
        relativePath,
      );
      const resourceFetch = await tryCandidate(
        "resourceURI-fetch",
        resourceFetchUri,
        () => readPackagedTextFromFetch(resourceFetchUri),
      );
      if (resourceFetch) {
        return resourceFetch;
      }
    }

    for (const [label, baseURI] of [
      ["rootURI-xhr", rootURI],
      ["resourceURI-xhr", resourceURI],
    ] as const) {
      if (!baseURI) {
        continue;
      }
      const requestUri = buildPackagedResourceUri(baseURI, relativePath);
      const requestResult = await tryCandidate(label, requestUri, () =>
        readPackagedTextFromPrivilegedRequest(requestUri),
      );
      if (requestResult) {
        return requestResult;
      }
    }
  }

  if (detectZoteroRuntime()) {
    const cwd = getZoteroCurrentWorkingDir();
    const sourcePath = cwd
      ? joinPath(cwd, BUILTIN_WORKFLOW_ROOT, relativePath)
      : "(zotero working directory unavailable)";
    const workingDirResult = await tryCandidate(
      "zotero-working-directory",
      sourcePath,
      () => readPackagedTextFromZoteroWorkingDir(relativePath),
    );
    if (workingDirResult) {
      return workingDirResult;
    }
  }

  const devCwd = normalizeString(args.devCwd) || getRuntimeCwd() || ".";
  const devPath = joinPath(devCwd, BUILTIN_WORKFLOW_ROOT, relativePath);
  const devResult = await tryCandidate("dev-cwd", devPath, () =>
    readPackagedTextFromNode(relativePath, devCwd),
  );
  if (devResult) {
    return devResult;
  }

  const detail = diagnostics.failures
    .map((failure) => `${failure.label}=${failure.reason}`)
    .join("; ");
  const error = new Error(
    `failed to read packaged builtin workflow resource: ${relativePath}; ${detail}`,
  );
  (error as { diagnostics?: BuiltinWorkflowResourceDiagnostics }).diagnostics =
    diagnostics;
  throw error;
}

async function readPackagedText(args: {
  rootURI?: string;
  resourceURI?: string;
  relativePath: string;
  devCwd?: string;
}) {
  return (await readPackagedTextWithDiagnostics(args)).text;
}

function parseBuiltinManifest(rawText: string): BuiltinWorkflowManifest {
  const parsed = JSON.parse(rawText) as {
    version?: unknown;
    files?: unknown;
  };
  const version =
    typeof parsed.version === "number" && Number.isFinite(parsed.version)
      ? Math.floor(parsed.version)
      : 0;
  const files = Array.isArray(parsed.files)
    ? parsed.files
        .map((entry) => toPosixRelativePath(String(entry || "")))
        .filter(Boolean)
    : [];
  if (version <= 0) {
    throw new Error("builtin workflow manifest version is invalid");
  }
  if (files.length === 0) {
    throw new Error("builtin workflow manifest files is empty");
  }
  return {
    version,
    files,
  };
}

function toLocalPath(rootDir: string, posixRelativePath: string) {
  const segments = toPosixRelativePath(posixRelativePath).split("/");
  return joinPath(rootDir, ...segments);
}

async function clearAndPrepareTargetDirectory(targetDir: string) {
  await removeDirectory(targetDir);
  if (detectZoteroRuntime()) {
    await makeDirectoryZotero(targetDir);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(targetDir, { recursive: true });
}

async function replaceTargetDirectory(args: {
  targetRoot: string;
  stagingRoot: string;
}) {
  const backupRoot = `${args.targetRoot}.backup`;
  await removeDirectory(backupRoot);
  const hadTarget = await pathExists(args.targetRoot);
  if (hadTarget) {
    await movePath(args.targetRoot, backupRoot);
  }
  try {
    await movePath(args.stagingRoot, args.targetRoot);
    await removeDirectory(backupRoot);
  } catch (error) {
    try {
      if (hadTarget && (await pathExists(backupRoot))) {
        await movePath(backupRoot, args.targetRoot);
      }
    } catch {
      // noop: keep original error
    }
    throw error;
  }
}

async function writeTargetFile(args: {
  targetRoot: string;
  targetPath: string;
  relativePath: string;
  rootURI?: string;
  resourceURI?: string;
  devCwd?: string;
}) {
  const content = await readPackagedText({
    rootURI: args.rootURI,
    resourceURI: args.resourceURI,
    relativePath: args.relativePath,
    devCwd: args.devCwd,
  });
  if (detectZoteroRuntime()) {
    const relativeDir = toPosixRelativePath(args.relativePath)
      .split("/")
      .slice(0, -1)
      .join("/");
    const targetDir = relativeDir
      ? toLocalPath(args.targetRoot, relativeDir)
      : args.targetRoot;
    await makeDirectoryZotero(targetDir);
    await writeTextFileZotero(args.targetPath, content);
    return;
  }
  await writeTextFileNode(args.targetPath, content);
}

export async function syncBuiltinWorkflowsOnStartup(args?: {
  rootURI?: string;
  resourceURI?: string;
  devCwd?: string;
}) {
  const targetRoot = getBuiltinWorkflowTargetDir();
  const sourceRoot = getPackagedBuiltinSourceDir(args?.devCwd);
  const stagingRoot = `${targetRoot}.staging`;
  const syncBase = {
    targetRoot,
    rootURI: normalizeString(args?.rootURI),
    resourceURI: normalizeString(args?.resourceURI),
    zoteroVersion: getZoteroVersion(),
  };

  let manifest: BuiltinWorkflowManifest;
  try {
    const manifestRead = await readPackagedTextWithDiagnostics({
      rootURI: args?.rootURI,
      resourceURI: args?.resourceURI,
      relativePath: BUILTIN_MANIFEST_FILE,
      devCwd: args?.devCwd,
    });
    manifest = parseBuiltinManifest(manifestRead.text);
  } catch (error) {
    latestBuiltinWorkflowSyncResult = {
      ok: false,
      ...syncBase,
      error: compactError(error),
      diagnostics:
        error && typeof error === "object" && "diagnostics" in error
          ? (error as { diagnostics?: BuiltinWorkflowResourceDiagnostics })
              .diagnostics
          : undefined,
    };
    throw error;
  }

  if (
    sourceRoot &&
    (isSameFsPath(targetRoot, sourceRoot) ||
      isNestedFsPath(sourceRoot, targetRoot) ||
      isNestedFsPath(targetRoot, sourceRoot))
  ) {
    const error = new Error(
      "refusing to sync builtin workflows when source and target are same or nested",
    );
    latestBuiltinWorkflowSyncResult = {
      ok: false,
      ...syncBase,
      error: error.message,
    };
    throw error;
  }

  await clearAndPrepareTargetDirectory(stagingRoot);

  try {
    for (const relativePath of manifest.files) {
      const targetPath = toLocalPath(stagingRoot, relativePath);
      await writeTargetFile({
        targetRoot: stagingRoot,
        targetPath,
        relativePath,
        rootURI: args?.rootURI,
        resourceURI: args?.resourceURI,
        devCwd: args?.devCwd,
      });
    }
    await replaceTargetDirectory({
      targetRoot,
      stagingRoot,
    });
  } catch (error) {
    await removeDirectory(stagingRoot);
    latestBuiltinWorkflowSyncResult = {
      ok: false,
      ...syncBase,
      version: manifest.version,
      error: compactError(error),
      diagnostics:
        error && typeof error === "object" && "diagnostics" in error
          ? (error as { diagnostics?: BuiltinWorkflowResourceDiagnostics })
              .diagnostics
          : undefined,
    };
    throw error;
  }

  latestBuiltinWorkflowSyncResult = {
    ok: true,
    ...syncBase,
    version: manifest.version,
    targetRoot,
    files: manifest.files.length,
  };
  return latestBuiltinWorkflowSyncResult;
}

export const __builtinWorkflowSyncTestOnly = {
  readPackagedTextForTests: readPackagedTextWithDiagnostics,
};
