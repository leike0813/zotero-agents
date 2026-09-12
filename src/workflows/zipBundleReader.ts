import { joinPath } from "../utils/path";
import { recordLeakProbeTempArtifactForTests } from "../modules/testLeakProbeTempArtifacts";
import { executeOneShotSubprocess } from "../platform/subprocess";
import {
  ensureRuntimeDirectoryStrict,
  readRuntimeTextFileStrict,
  removeRuntimePath,
  resolveRuntimeTemporaryDirectory,
} from "../modules/runtimePersistence";
import { WORKFLOW_ARCHIVE_LIMITS } from "./archive";

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

async function mkTempDir(prefix: string) {
  const dir = joinPath(
    resolveRuntimeTemporaryDirectory(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );
  await ensureRuntimeDirectoryStrict(dir);
  return dir;
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

export class ZipBundleReader {
  private extractedDirPromise: Promise<string> | null = null;

  constructor(private readonly bundlePath: string) {}

  private async ensureExtractedDirInZotero() {
    if (this.extractedDirPromise) {
      return this.extractedDirPromise;
    }
    const runtime = globalThis as unknown as {
      Cc: Record<string, { createInstance: (iface: unknown) => any }>;
      Ci: Record<string, unknown> & {
        nsIZipReader: unknown;
      };
      Zotero: { File: { pathToFile: (targetPath: string) => unknown } };
    };
    this.extractedDirPromise = (async () => {
      const extractedDir = await mkTempDir("zotero-skills-bundle");
      recordLeakProbeTempArtifactForTests({
        kind: "zip-extracted-dir",
        path: extractedDir,
      });
      const zipReader = runtime.Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
        runtime.Ci.nsIZipReader,
      );
      try {
        zipReader.open(runtime.Zotero.File.pathToFile(this.bundlePath));
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
            throw new Error(`Workflow bundle entry path exceeds limits: ${entryName}`);
          }
          if (!entryName.endsWith("/")) {
            const entryBytes = Number(zipReader.getEntry(entryName)?.realSize);
            if (
              !Number.isSafeInteger(entryBytes) ||
              entryBytes < 0 ||
              entryBytes > WORKFLOW_ARCHIVE_LIMITS.entryBytes
            ) {
              throw new Error(`Workflow bundle entry size exceeds limits: ${entryName}`);
            }
            totalBytes += entryBytes;
            if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
              throw new Error("Workflow bundle total size exceeds limits");
            }
          }
        }
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
          zipReader.extract(entryName, runtime.Zotero.File.pathToFile(targetPath));
        }
      } catch (error) {
        await removeRuntimePath(extractedDir);
        throw error;
      } finally {
        zipReader.close();
      }
      return extractedDir;
    })();
    return this.extractedDirPromise;
  }

  private async ensureExtractedDirInNode() {
    if (!this.extractedDirPromise) {
      this.extractedDirPromise = (async () => {
        const tmpDir = await mkTempDir("zotero-skills-bundle");
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
                    "Expand-Archive",
                    `-LiteralPath '${this.bundlePath.replace(/'/g, "''")}'`,
                    `-DestinationPath '${tmpDir.replace(/'/g, "''")}'`,
                    "-Force",
                  ].join(" "),
                ],
                hidden: true,
              }
            : {
                command: "unzip",
                args: ["-q", this.bundlePath, "-d", tmpDir],
              };
        const result = await executeOneShotSubprocess(request);
        if (result.outcome !== "exited" || result.exitCode !== 0) {
          throw new Error(
            `Failed to extract workflow bundle: ${result.stderr || result.outcome}`,
          );
        }
        return tmpDir;
      })();
    }
    return this.extractedDirPromise;
  }

  async getExtractedDir() {
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
}
