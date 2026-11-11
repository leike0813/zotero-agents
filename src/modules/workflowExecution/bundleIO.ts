import { joinPath } from "../../utils/path";
import { ZipBundleReader } from "../../workflows/zipBundleReader";
import {
  readRuntimeBytes,
  readRuntimeTextFile,
  reserveRuntimeTemporaryDirectory,
  runtimePathExists,
  writeRuntimeBytes,
  type RuntimeTemporaryDirectory,
} from "../runtimePersistence";

export type BundleReader = {
  readText: (entryPath: string) => Promise<string>;
  readBytes?: (entryPath: string) => Promise<Uint8Array>;
  getExtractedDir?: () => Promise<string>;
  dispose?: () => Promise<void>;
};

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
  let scope: RuntimeTemporaryDirectory | undefined;
  let bundleReader: BundleReader = createUnavailableBundleReader(
    args.requestId,
  );
  if (args.result.bundleBytes && args.result.bundleBytes.length > 0) {
    scope = await reserveRuntimeTemporaryDirectory({
      category: "workflow-result-bundle",
      relativePaths: [{ path: "bundle.zip" }],
    });
    bundlePath = joinPath(scope.path, "bundle.zip");
    try {
      await writeRuntimeBytes(bundlePath, args.result.bundleBytes);
    } catch (error) {
      await scope.cleanup().catch(() => undefined);
      throw error;
    }
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
      try {
        await bundleReader.dispose?.();
      } finally {
        await scope?.cleanup();
      }
    },
  };
}
