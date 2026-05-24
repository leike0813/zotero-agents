import { joinPath } from "../utils/path";
import {
  readRuntimeBytes,
  runtimePathExists,
  writeRuntimeBytes,
} from "./runtimePersistence";

export type PackagedAssetSource = {
  label: string;
  source: string;
  uri?: string;
  path?: string;
};

export type PackagedAssetReadFailure = {
  label: string;
  source: string;
  message: string;
};

export type PackagedAssetDiagnostics = {
  rootURI: string;
  resourceURI: string;
  rootPath: string;
  cwd: string;
  checkedUris: string[];
  checkedPaths: string[];
  failures: PackagedAssetReadFailure[];
};

export type PackagedBinaryAssetReadResult =
  | {
      ok: true;
      bytes: Uint8Array;
      source: PackagedAssetSource;
      diagnostics: PackagedAssetDiagnostics;
    }
  | {
      ok: false;
      diagnostics: PackagedAssetDiagnostics;
    };

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeRelativePath(value: unknown) {
  return normalizeString(value).replace(/\\/g, "/").replace(/^\/+/g, "");
}

function ensureTrailingSlash(value: unknown) {
  const text = normalizeString(value);
  return text && !text.endsWith("/") ? `${text}/` : text;
}

function dirname(pathRaw: string) {
  const path = normalizeString(pathRaw);
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : "";
}

function parentPath(pathRaw: string) {
  const path = normalizeString(pathRaw).replace(/[\\/]+$/, "");
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index > 0 ? path.slice(0, index) : "";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(normalizeString).filter(Boolean)));
}

export function resolveRuntimeRootURI() {
  try {
    if (typeof rootURI === "string") {
      return normalizeString(rootURI);
    }
  } catch {
    // Fall back to object property lookup below.
  }
  const runtime = globalThis as { rootURI?: string };
  return normalizeString(runtime.rootURI);
}

export function resolveRuntimeResourceURI() {
  try {
    if (typeof resourceURI === "string") {
      return normalizeString(resourceURI);
    }
  } catch {
    // Fall back to object property lookup below.
  }
  const runtime = globalThis as { resourceURI?: string };
  return normalizeString(runtime.resourceURI);
}

export function resolveRuntimeRootPath() {
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

export function resolveRuntimeCwd() {
  const runtime = globalThis as { process?: { cwd?: () => string } };
  return normalizeString(runtime.process?.cwd?.()) || ".";
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

export function buildPackagedAssetCandidates(relativePathRaw: string) {
  const relativePath = normalizeRelativePath(relativePathRaw);
  const rootURI = resolveRuntimeRootURI();
  const resourceURI = resolveRuntimeResourceURI();
  const rootPath = resolveRuntimeRootPath();
  const cwd = resolveRuntimeCwd();
  const checkedUris = uniqueStrings(
    [rootURI, resourceURI]
      .map(ensureTrailingSlash)
      .filter(Boolean)
      .map((base) => `${base}${relativePath}`),
  );
  const checkedPaths = uniqueStrings(
    candidateRoots(rootPath, cwd).flatMap((root) => [
      joinPath(root, relativePath),
      joinPath(root, "addon", relativePath),
    ]),
  );
  return {
    rootURI,
    resourceURI,
    rootPath,
    cwd,
    checkedUris,
    checkedPaths,
  };
}

function createDiagnostics(
  candidates: ReturnType<typeof buildPackagedAssetCandidates>,
): PackagedAssetDiagnostics {
  return {
    rootURI: candidates.rootURI,
    resourceURI: candidates.resourceURI,
    rootPath: candidates.rootPath,
    cwd: candidates.cwd,
    checkedUris: candidates.checkedUris,
    checkedPaths: candidates.checkedPaths,
    failures: [],
  };
}

function recordFailure(
  diagnostics: PackagedAssetDiagnostics,
  label: string,
  source: string,
  error: unknown,
) {
  diagnostics.failures.push({
    label,
    source,
    message: error instanceof Error ? error.message : String(error || ""),
  });
}

async function readUriBinaryWithFetch(uri: string) {
  const runtime = globalThis as {
    fetch?: (input: string) => Promise<{
      ok: boolean;
      status: number;
      arrayBuffer: () => Promise<ArrayBuffer>;
    }>;
  };
  if (typeof runtime.fetch !== "function") {
    throw new Error("fetch is unavailable");
  }
  const response = await runtime.fetch(uri);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function readUriBinaryWithXhr(uri: string) {
  const runtime = globalThis as {
    XMLHttpRequest?: new () => {
      open: (method: string, url: string, async: boolean) => void;
      responseType: string;
      status: number;
      response: ArrayBuffer;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      send: () => void;
    };
  };
  const Xhr = runtime.XMLHttpRequest;
  if (typeof Xhr !== "function") {
    throw new Error("XMLHttpRequest is unavailable");
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const request = new Xhr();
    request.open("GET", uri, true);
    request.responseType = "arraybuffer";
    request.onload = () => {
      if (
        request.status === 0 ||
        (request.status >= 200 && request.status < 300)
      ) {
        resolve(new Uint8Array(request.response));
        return;
      }
      reject(new Error(`HTTP ${request.status}`));
    };
    request.onerror = () => reject(new Error("request failed"));
    request.send();
  });
}

async function readPathBinary(path: string) {
  if (!(await runtimePathExists(path))) {
    throw new Error("path does not exist");
  }
  return readRuntimeBytes(path);
}

export async function writeBinaryFile(targetPath: string, bytes: Uint8Array) {
  await writeRuntimeBytes(targetPath, bytes);
}

export async function readPackagedBinaryAsset(
  relativePath: string,
): Promise<PackagedBinaryAssetReadResult> {
  const candidates = buildPackagedAssetCandidates(relativePath);
  const diagnostics = createDiagnostics(candidates);

  for (const uri of candidates.checkedUris) {
    try {
      return {
        ok: true,
        bytes: await readUriBinaryWithFetch(uri),
        source: { label: "root-or-resource-uri-fetch", source: uri, uri },
        diagnostics,
      };
    } catch (error) {
      recordFailure(diagnostics, "uri-fetch", uri, error);
    }
    try {
      return {
        ok: true,
        bytes: await readUriBinaryWithXhr(uri),
        source: { label: "root-or-resource-uri-xhr", source: uri, uri },
        diagnostics,
      };
    } catch (error) {
      recordFailure(diagnostics, "uri-xhr", uri, error);
    }
  }

  for (const path of candidates.checkedPaths) {
    try {
      return {
        ok: true,
        bytes: await readPathBinary(path),
        source: { label: "runtime-path", source: path, path },
        diagnostics,
      };
    } catch (error) {
      recordFailure(diagnostics, "runtime-path", path, error);
    }
  }

  return { ok: false, diagnostics };
}

export async function copyPackagedBinaryAsset(args: {
  relativePath: string;
  targetPath: string;
}) {
  const read = await readPackagedBinaryAsset(args.relativePath);
  if (!read.ok) {
    return read;
  }
  await writeBinaryFile(args.targetPath, read.bytes);
  return {
    ok: true as const,
    source: read.source,
    diagnostics: read.diagnostics,
  };
}

export const packagedAssetResolverInternalsForTests = {
  dirname,
  parentPath,
  candidateRoots,
  normalizeRelativePath,
  buildPackagedAssetCandidates,
};
