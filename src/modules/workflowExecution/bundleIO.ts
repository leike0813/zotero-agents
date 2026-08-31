import { joinPath } from "../../utils/path";
import { ZipBundleReader } from "../../workflows/zipBundleReader";
import {
  readRuntimeBytes,
  readRuntimeTextFile,
  removeRuntimePath,
  resolveRuntimeTemporaryDirectory,
  runtimePathExists,
  writeRuntimeBytes,
} from "../runtimePersistence";

export type BundleReader = {
  readText: (entryPath: string) => Promise<string>;
  readBytes?: (entryPath: string) => Promise<Uint8Array>;
  getExtractedDir?: () => Promise<string>;
};

export function buildTempBundlePath(requestId: string) {
  const tempDir = resolveRuntimeTemporaryDirectory();
  const stamp = Date.now().toString(36);
  return joinPath(tempDir, `zotero-skills-${requestId}-${stamp}.zip`);
}

export async function writeBytes(filePath: string, bytes: Uint8Array) {
  await writeRuntimeBytes(filePath, bytes, { overwrite: true });
}

export async function removeFileIfExists(filePath: string) {
  await removeRuntimePath(filePath);
}

export function createUnavailableBundleReader(requestId: string): BundleReader {
  return {
    readText: async (entryPath: string) => {
      throw new Error(
        `Run ${requestId} does not provide bundle content; entry unavailable: ${entryPath}`,
      );
    },
  };
}

function normalizeEntryPath(entryPath: string) {
  return String(entryPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

export function createDirectoryBundleReader(rootDir: string): BundleReader {
  const resolveEntry = async (entryPath: string) => {
    const normalized = normalizeEntryPath(entryPath);
    if (!normalized) {
      throw new Error("bundle entry path is required");
    }
    const filePath = joinPath(rootDir, normalized);
    if (!(await runtimePathExists(filePath))) {
      throw new Error(`bundle entry not found: ${normalized}`);
    }
    return filePath;
  };
  return {
    readText: async (entryPath: string) => {
      return readRuntimeTextFile(await resolveEntry(entryPath));
    },
    readBytes: async (entryPath: string) =>
      readRuntimeBytes(await resolveEntry(entryPath)),
    getExtractedDir: async () => rootDir,
  };
}

export type RunResultBundleSource = {
  bundleBytes?: Uint8Array;
  bundleDir?: string;
};

export type RunResultBundleReaderHandle = {
  bundleReader: BundleReader;
  bundlePath: string;
  dispose: () => Promise<void>;
};

export async function openRunResultBundleReader(args: {
  result: RunResultBundleSource;
  requestId: string;
}): Promise<RunResultBundleReaderHandle> {
  let bundlePath = "";
  let bundleReader: BundleReader = createUnavailableBundleReader(
    args.requestId,
  );
  if (args.result.bundleBytes && args.result.bundleBytes.length > 0) {
    bundlePath = buildTempBundlePath(args.requestId);
    await writeBytes(bundlePath, args.result.bundleBytes);
    bundleReader = new ZipBundleReader(bundlePath);
  } else if (args.result.bundleDir) {
    bundleReader = createDirectoryBundleReader(args.result.bundleDir);
  }

  let disposed = false;
  return {
    bundleReader,
    bundlePath,
    dispose: async () => {
      if (disposed) {
        return;
      }
      disposed = true;
      if (bundlePath) {
        await removeFileIfExists(bundlePath);
      }
    },
  };
}
