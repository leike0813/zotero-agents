import { joinPath } from "../utils/path";
import { recordLeakProbeTempArtifactForTests } from "../modules/testLeakProbeTempArtifacts";
import {
  ensureRuntimeDirectoryStrict,
  readRuntimeTextFileStrict,
  resolveRuntimeTemporaryDirectory,
} from "../modules/runtimePersistence";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

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
      zipReader.open(runtime.Zotero.File.pathToFile(this.bundlePath));
      try {
        const entries = zipReader.findEntries(null);
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
        const childProcess = await dynamicImport("child_process");
        const util = await dynamicImport("util");
        const execFileAsync = util.promisify(childProcess.execFile);
        const processObj = globalThis as {
          process?: { platform?: string };
        };

        if (processObj.process?.platform === "win32") {
          const command = [
            "Expand-Archive",
            `-LiteralPath '${this.bundlePath.replace(/'/g, "''")}'`,
            `-DestinationPath '${tmpDir.replace(/'/g, "''")}'`,
            "-Force",
          ].join(" ");
          await execFileAsync("powershell", [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            command,
          ]);
          return tmpDir;
        }

        await execFileAsync("unzip", ["-q", this.bundlePath, "-d", tmpDir]);
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
