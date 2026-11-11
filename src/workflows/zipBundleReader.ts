import { joinPath } from "../utils/path";
import { recordLeakProbeTempArtifactForTests } from "../modules/testLeakProbeTempArtifacts";
import { executeOneShotSubprocess } from "../platform/subprocess";
import {
  ensureRuntimeDirectoryStrict,
  readRuntimeTextFileStrict,
  reserveRuntimeTemporaryDirectory,
  toRuntimeNativeFsPath,
  type RuntimeTemporaryDirectory,
} from "../modules/runtimePersistence";
import { normalizeNativeLocalPath } from "../utils/path";
import {
  readWorkflowZipEntryNames,
  withCompatibleWorkflowZipSource,
  WORKFLOW_ARCHIVE_LIMITS,
} from "./archive";

function hasZoteroZipRuntime() {
  const runtime = globalThis as {
    Cc?: Record<string, { createInstance: (iface: unknown) => any }>;
    Ci?: Record<string, unknown> & {
      nsIZipReader?: unknown;
      nsIConverterInputStream?: { DEFAULT_REPLACEMENT_CHARACTER: number };
    };
    Zotero?: { File?: { pathToFile: (targetPath: string) => unknown } };
  };
  return (
    !!runtime.Cc &&
    !!runtime.Ci?.nsIZipReader &&
    typeof runtime.Zotero?.File?.pathToFile === "function"
  );
}

function safeZipEntrySegments(entryPath: string) {
  const normalized = String(entryPath || "").replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized)
  ) {
    throw new Error(`Unsafe zip entry path: ${entryPath}`);
  }
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe zip entry path: ${entryPath}`);
  }
  return segments;
}

function extractionRelativePaths(entryNames: string[]) {
  return entryNames.map((entryName) => ({
    path: safeZipEntrySegments(entryName).join("/"),
    kind: entryName.endsWith("/") ? ("directory" as const) : ("file" as const),
  }));
}

function absoluteOrdinaryPath(pathRaw: string) {
  const path = normalizeNativeLocalPath(pathRaw);
  if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(path)) return path;
  const cwd = (
    globalThis as { process?: { cwd?: () => string } }
  ).process?.cwd?.();
  if (!cwd)
    throw new Error(
      "A runtime working directory is required to extract a bundle",
    );
  return joinPath(cwd, path);
}

export class ZipBundleReader {
  private extractedDirPromise: Promise<string> | null = null;
  private extractedDirScope: RuntimeTemporaryDirectory | null = null;
  private disposed = false;
  private disposePromise: Promise<void> | null = null;

  constructor(private readonly bundlePath: string) {}

  private async reserveExtractionDirectory(entryNames: string[]) {
    const scope = await reserveRuntimeTemporaryDirectory({
      category: "workflow-bundle-extract",
      relativePaths: extractionRelativePaths(entryNames),
    });
    if (this.disposed) {
      await scope.cleanup();
      throw new Error("Zip bundle reader is disposed");
    }
    scope.path = absoluteOrdinaryPath(scope.path);
    return scope;
  }

  private async ensureExtractedDirInZotero() {
    if (this.extractedDirPromise) {
      return this.extractedDirPromise;
    }
    if (this.disposed) throw new Error("Zip bundle reader is disposed");
    const runtime = globalThis as unknown as {
      Cc: Record<string, { createInstance: (iface: unknown) => any }>;
      Ci: Record<string, unknown> & {
        nsIZipReader: unknown;
      };
      Zotero: { File: { pathToFile: (targetPath: string) => unknown } };
    };
    this.extractedDirPromise = withCompatibleWorkflowZipSource(
      this.bundlePath,
      undefined,
      async (sourcePath) => {
        const zipReader = runtime.Cc[
          "@mozilla.org/libjar/zip-reader;1"
        ].createInstance(runtime.Ci.nsIZipReader);
        let scope: RuntimeTemporaryDirectory | null = null;
        try {
          zipReader.open(
            runtime.Zotero.File.pathToFile(toRuntimeNativeFsPath(sourcePath)),
          );
          const entries = zipReader.findEntries(null);
          const entryNames: string[] = [];
          let totalBytes = 0;
          while (entries.hasMore()) {
            const rawEntryName = entries.getNext();
            const entryName = String(
              typeof rawEntryName === "string"
                ? rawEntryName
                : (rawEntryName as { data?: string })?.data || rawEntryName,
            );
            if (!entryName) {
              continue;
            }
            const segments = safeZipEntrySegments(entryName);
            entryNames.push(entryName);
            if (entryNames.length > WORKFLOW_ARCHIVE_LIMITS.entries) {
              throw new Error("Workflow bundle contains too many entries");
            }
            if (
              entryName.length > WORKFLOW_ARCHIVE_LIMITS.entryNameLength ||
              segments.length > WORKFLOW_ARCHIVE_LIMITS.depth
            ) {
              throw new Error(
                `Workflow bundle entry path exceeds limits: ${entryName}`,
              );
            }
            if (!entryName.endsWith("/")) {
              const entryBytes = Number(
                zipReader.getEntry(entryName)?.realSize,
              );
              if (
                !Number.isSafeInteger(entryBytes) ||
                entryBytes < 0 ||
                entryBytes > WORKFLOW_ARCHIVE_LIMITS.entryBytes
              ) {
                throw new Error(
                  `Workflow bundle entry size exceeds limits: ${entryName}`,
                );
              }
              totalBytes += entryBytes;
              if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
                throw new Error("Workflow bundle total size exceeds limits");
              }
            }
          }

          scope = await this.reserveExtractionDirectory(entryNames);
          const extractedDir = scope.path;
          recordLeakProbeTempArtifactForTests({
            kind: "zip-extracted-dir",
            path: extractedDir,
          });
          for (const entryName of entryNames) {
            const segments = safeZipEntrySegments(entryName);
            const targetPath = joinPath(extractedDir, ...segments);
            if (entryName.endsWith("/")) {
              await ensureRuntimeDirectoryStrict(targetPath);
              continue;
            }
            const parentSegments = segments.slice(0, -1);
            if (parentSegments.length > 0) {
              await ensureRuntimeDirectoryStrict(
                joinPath(extractedDir, ...parentSegments),
              );
            }
            zipReader.extract(
              entryName,
              runtime.Zotero.File.pathToFile(toRuntimeNativeFsPath(targetPath)),
            );
          }
          this.extractedDirScope = scope;
          scope = null;
          return extractedDir;
        } catch (error) {
          if (scope) await scope.cleanup().catch(() => false);
          throw error;
        } finally {
          zipReader.close();
        }
      },
    );
    return this.extractedDirPromise;
  }

  private async ensureExtractedDirInNode() {
    if (!this.extractedDirPromise) {
      if (this.disposed) throw new Error("Zip bundle reader is disposed");
      this.extractedDirPromise = withCompatibleWorkflowZipSource(
        this.bundlePath,
        undefined,
        async (sourcePath) => {
          let scope: RuntimeTemporaryDirectory | null = null;
          try {
            const entries = await readWorkflowZipEntryNames(sourcePath);
            scope = await this.reserveExtractionDirectory(entries);
            const tmpDir = scope.path;
            recordLeakProbeTempArtifactForTests({
              kind: "zip-extracted-dir",
              path: tmpDir,
            });
            const processObj = globalThis as {
              process?: { platform?: string };
            };
            const request =
              processObj.process?.platform === "win32"
                ? {
                    command: "powershell",
                    args: [
                      "-NoProfile",
                      "-NonInteractive",
                      "-Command",
                      [
                        "$ErrorActionPreference = 'Stop'",
                        "Add-Type -AssemblyName System.IO.Compression.FileSystem",
                        `[System.IO.Compression.ZipFile]::ExtractToDirectory('${absoluteOrdinaryPath(sourcePath).replace(/'/g, "''")}', '${tmpDir.replace(/'/g, "''")}')`,
                      ].join("; "),
                    ],
                    hidden: true,
                  }
                : {
                    command: "unzip",
                    args: [
                      "-q",
                      absoluteOrdinaryPath(sourcePath),
                      "-d",
                      tmpDir,
                    ],
                  };
            const result = await executeOneShotSubprocess(request);
            if (result.outcome !== "exited" || result.exitCode !== 0) {
              throw new Error(
                `Failed to extract workflow bundle: ${result.stderr || result.outcome}`,
              );
            }
            this.extractedDirScope = scope;
            scope = null;
            return tmpDir;
          } catch (error) {
            if (scope) await scope.cleanup().catch(() => false);
            throw error;
          }
        },
      );
    }
    return this.extractedDirPromise;
  }

  async getExtractedDir() {
    if (this.disposed) throw new Error("Zip bundle reader is disposed");
    if (hasZoteroZipRuntime()) {
      return this.ensureExtractedDirInZotero();
    }
    return this.ensureExtractedDirInNode();
  }

  async readText(entryPath: string) {
    const extractedDir = await this.getExtractedDir();
    const targetPath = joinPath(
      extractedDir,
      ...safeZipEntrySegments(entryPath),
    );
    return readRuntimeTextFileStrict(targetPath);
  }

  dispose(): Promise<void> {
    if (!this.disposePromise) {
      this.disposePromise = (async () => {
        this.disposed = true;
        if (this.extractedDirPromise) {
          await this.extractedDirPromise.catch(() => undefined);
        }
        const scope = this.extractedDirScope;
        this.extractedDirScope = null;
        if (scope) await scope.cleanup();
      })();
    }
    return this.disposePromise;
  }
}
