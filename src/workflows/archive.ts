import { createStoreZipBytes } from "../modules/zipStore";
import {
  ensureRuntimeDirectory,
  moveRuntimePath,
  readRuntimeBytes,
  removeRuntimePath,
  resolveRuntimeTemporaryDirectory,
  writeRuntimeBytes,
} from "../modules/runtimePersistence";
import { joinPath, normalizeNativeLocalPath } from "../utils/path";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import { sha256Hex } from "../utils/sha256";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
} from "../modules/runtimeFileTransfer";

export type WorkflowArchiveEntry = {
  name: string;
  sourcePath?: string;
  text?: string;
  bytes?: Uint8Array | ArrayBuffer | ArrayBufferView;
};

export type WorkflowArchiveFileIntegrity = {
  size: number;
  sha256: string;
};

export type WorkflowArchiveMeasurement = {
  files: Record<string, WorkflowArchiveFileIntegrity>;
  totalEntries: number;
  totalBytes: number;
};

export type WorkflowExtractedArchive = {
  rootPath: string;
  entries: string[];
  resolvePath: (entryName: string) => string;
  readText: (entryName: string) => Promise<string>;
  readBytes: (entryName: string) => Promise<Uint8Array>;
  measureEntries: (
    entryNames: string[],
  ) => Promise<{ files: Record<string, WorkflowArchiveFileIntegrity> }>;
};

export type WorkflowArchiveApi = {
  measureEntries: (
    entries: WorkflowArchiveEntry[],
  ) => Promise<WorkflowArchiveMeasurement>;
  writeZipAtomic: (args: {
    targetPath: string;
    entries: WorkflowArchiveEntry[];
  }) => Promise<WorkflowArchiveMeasurement & { targetPath: string }>;
  withExtractedZip: <T>(
    sourcePath: string,
    callback: (archive: WorkflowExtractedArchive) => Promise<T> | T,
  ) => Promise<T>;
};

type RuntimeZipWriter = {
  open: (file: unknown, flags: number) => void;
  addEntryFile: (
    name: string,
    compression: number,
    file: unknown,
    queue: boolean,
  ) => void;
  close: () => void;
};

type RuntimeZipReader = {
  open: (file: unknown) => void;
  findEntries: (pattern: string | null) => {
    hasMore: () => boolean;
    getNext: () => unknown;
  };
  extract: (name: string, file: unknown) => void;
  close: () => void;
};

type RuntimeZipWriterInterface = {
  COMPRESSION_DEFAULT: number;
};

type RuntimeXpcFactory<T> = {
  createInstance: (interfaceId: unknown) => T;
};

type RuntimeZoteroFileApi = {
  pathToFile: (path: string) => unknown;
};

const WORKFLOW_ARCHIVE_LIMITS = Object.freeze({
  entries: 20_000,
  entryBytes: 2 * 1024 * 1024 * 1024,
  totalBytes: 16 * 1024 * 1024 * 1024,
  entryNameLength: 1024,
  depth: 64,
});

function resolveXpcFactory<T>(contractId: string) {
  const runtime = globalThis as {
    Components?: {
      classes?: Record<string, RuntimeXpcFactory<T> | undefined>;
    };
    Cc?: Record<string, RuntimeXpcFactory<T> | undefined>;
  };
  return (
    runtime.Components?.classes?.[contractId] ||
    runtime.Cc?.[contractId] ||
    null
  );
}

function resolveXpcInterface<T>(name: string) {
  const runtime = globalThis as {
    Components?: { interfaces?: Record<string, T | undefined> };
    Ci?: Record<string, T | undefined>;
  };
  return (
    runtime.Components?.interfaces?.[name] || runtime.Ci?.[name] || null
  );
}

function resolveRuntimeZoteroFileApi() {
  const zotero = resolveRuntimeZotero() as
    | { File?: Partial<RuntimeZoteroFileApi> }
    | undefined;
  return typeof zotero?.File?.pathToFile === "function"
    ? (zotero.File as RuntimeZoteroFileApi)
    : null;
}

function resolveGeckoArchiveWriterRuntime() {
  const factory = resolveXpcFactory<RuntimeZipWriter>(
    "@mozilla.org/libjar/zip-writer;1",
  );
  const interfaceId = resolveXpcInterface<RuntimeZipWriterInterface>(
    "nsIZipWriter",
  );
  const file = resolveRuntimeZoteroFileApi();
  return factory && interfaceId && file
    ? { factory, interfaceId, file }
    : null;
}

function resolveGeckoArchiveReaderRuntime() {
  const factory = resolveXpcFactory<RuntimeZipReader>(
    "@mozilla.org/libjar/zip-reader;1",
  );
  const interfaceId = resolveXpcInterface<unknown>("nsIZipReader");
  const file = resolveRuntimeZoteroFileApi();
  return factory && interfaceId && file
    ? { factory, interfaceId, file }
    : null;
}

function asBytes(value: WorkflowArchiveEntry["bytes"] | string) {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array();
}

export function normalizeWorkflowArchiveEntryName(rawName: unknown) {
  const source = String(rawName || "").replace(/\\/g, "/").trim();
  if (
    !source ||
    source.startsWith("/") ||
    /^[A-Za-z]:\//.test(source) ||
    source.includes("\0")
  ) {
    throw new Error(`Unsafe zip entry path: ${String(rawName || "")}`);
  }
  if (source.length > WORKFLOW_ARCHIVE_LIMITS.entryNameLength) {
    throw new Error("Zip entry path exceeds the fixed length limit");
  }
  const parts = source.split("/");
  if (
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe zip entry path: ${String(rawName || "")}`);
  }
  if (parts.length > WORKFLOW_ARCHIVE_LIMITS.depth) {
    throw new Error("Zip entry path exceeds the fixed depth limit");
  }
  return parts.join("/");
}

function validateEntries(entries: WorkflowArchiveEntry[]) {
  if (entries.length > WORKFLOW_ARCHIVE_LIMITS.entries) {
    throw new Error("Archive exceeds the fixed entry count limit");
  }
  const seen = new Set<string>();
  const portableSeen = new Set<string>();
  return (entries || []).map((entry) => {
    const name = normalizeWorkflowArchiveEntryName(entry?.name);
    const portableName = name.toLocaleLowerCase("en-US");
    if (seen.has(name) || portableSeen.has(portableName)) {
      throw new Error(`Duplicate zip entry path: ${name}`);
    }
    seen.add(name);
    portableSeen.add(portableName);
    const sourceCount = [
      typeof entry?.sourcePath === "string",
      typeof entry?.text === "string",
      typeof entry?.bytes !== "undefined",
    ].filter(Boolean).length;
    if (sourceCount !== 1) {
      throw new Error(`Zip entry ${name} requires exactly one content source`);
    }
    return { ...entry, name };
  });
}

async function makeTempDir(prefix: string) {
  const target = joinPath(
    resolveRuntimeTemporaryDirectory(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await ensureRuntimeDirectory(target);
  return target;
}

async function removePath(targetPath: string) {
  await removeRuntimePath(targetPath);
}

async function hashBytes(bytes: Uint8Array) {
  const digest = await sha256Hex(bytes);
  if (!digest) {
    throw new Error("SHA-256 is unavailable in the current runtime");
  }
  return digest;
}

async function measureLocalFile(path: string) {
  const source = await inspectRuntimeFileSource(
    normalizeNativeLocalPath(path),
  );
  const digest = await digestRuntimeFileSource(source);
  return {
    size: source.size,
    sha256: digest.sha256.replace(/^sha256:/, ""),
  };
}

function addMeasuredFile(
  measurement: WorkflowArchiveMeasurement,
  name: string,
  integrity: WorkflowArchiveFileIntegrity,
) {
  if (integrity.size > WORKFLOW_ARCHIVE_LIMITS.entryBytes) {
    throw new Error(`Archive entry exceeds the fixed byte limit: ${name}`);
  }
  const totalBytes = measurement.totalBytes + integrity.size;
  if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
    throw new Error("Archive exceeds the fixed total byte limit");
  }
  measurement.files[name] = integrity;
  measurement.totalEntries += 1;
  measurement.totalBytes = totalBytes;
}

async function measureValidatedEntries(
  entries: ReturnType<typeof validateEntries>,
): Promise<WorkflowArchiveMeasurement> {
  const measurement: WorkflowArchiveMeasurement = {
    files: {},
    totalEntries: 0,
    totalBytes: 0,
  };
  for (const entry of entries) {
    if (entry.sourcePath) {
      addMeasuredFile(
        measurement,
        entry.name,
        await measureLocalFile(entry.sourcePath),
      );
    } else {
      const bytes = asBytes(entry.text ?? entry.bytes!);
      addMeasuredFile(measurement, entry.name, {
        size: bytes.length,
        sha256: await hashBytes(bytes),
      });
    }
  }
  return measurement;
}

async function readLocalBytes(path: string) {
  return new Uint8Array(
    await readRuntimeBytes(normalizeNativeLocalPath(path)),
  );
}

async function writeLocalBytes(path: string, bytes: Uint8Array) {
  await writeRuntimeBytes(path, bytes, { overwrite: true });
}

async function ensureDirectory(path: string) {
  await ensureRuntimeDirectory(path);
}

function dirname(entryPath: string) {
  const index = entryPath.lastIndexOf("/");
  return index < 0 ? "" : entryPath.slice(0, index);
}

async function moveLocalPath(sourcePath: string, targetPath: string) {
  await moveRuntimePath({ sourcePath, targetPath, overwrite: true });
}

async function writeStoredZipAtomic(
  targetPath: string,
  entries: ReturnType<typeof validateEntries>,
) {
  const payloads: Array<{ name: string; bytes: Uint8Array }> = [];
  const files: Record<string, WorkflowArchiveFileIntegrity> = {};
  for (const entry of entries) {
    const bytes = entry.sourcePath
      ? await readLocalBytes(entry.sourcePath)
      : asBytes(entry.text ?? entry.bytes!);
    payloads.push({ name: entry.name, bytes });
    files[entry.name] = { size: bytes.length, sha256: await hashBytes(bytes) };
  }
  const temporary = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await writeLocalBytes(temporary, createStoreZipBytes(payloads));
    await moveLocalPath(temporary, targetPath);
  } catch (error) {
    await removePath(temporary);
    throw error;
  }
  return { files };
}

async function writeZipInGecko(
  targetPath: string,
  entries: ReturnType<typeof validateEntries>,
  runtime: NonNullable<ReturnType<typeof resolveGeckoArchiveWriterRuntime>>,
) {
  const temporary = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const materializedRoot = await makeTempDir("zs-zip-entry");
  const files: Record<string, WorkflowArchiveFileIntegrity> = {};
  const writer = runtime.factory.createInstance(runtime.interfaceId);
  try {
    writer.open(runtime.file.pathToFile(temporary), 0x02 | 0x08 | 0x20);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      let sourcePath = entry.sourcePath;
      if (!sourcePath) {
        sourcePath = joinPath(materializedRoot, `${index}.bin`);
        await writeLocalBytes(sourcePath, asBytes(entry.text ?? entry.bytes!));
      }
      files[entry.name] = await measureLocalFile(sourcePath);
      writer.addEntryFile(
        entry.name,
        runtime.interfaceId.COMPRESSION_DEFAULT,
        runtime.file.pathToFile(sourcePath),
        false,
      );
    }
    writer.close();
    await moveLocalPath(temporary, targetPath);
    return { files };
  } catch (error) {
    try {
      writer.close();
    } catch {
      // The writer may not have opened successfully.
    }
    await removePath(temporary);
    throw error;
  } finally {
    await removePath(materializedRoot);
  }
}

type ParsedStoredEntry = { name: string; bytes: Uint8Array };

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function parseStoredZip(bytes: Uint8Array): ParsedStoredEntry[] {
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (readU32(bytes, offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP end-of-central-directory is missing");
  const count = readU16(bytes, eocd + 10);
  if (count > WORKFLOW_ARCHIVE_LIMITS.entries) {
    throw new Error("Archive exceeds the fixed entry count limit");
  }
  let cursor = readU32(bytes, eocd + 16);
  const decoder = new TextDecoder("utf-8");
  const seen = new Set<string>();
  const entries: ParsedStoredEntry[] = [];
  let totalBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (readU32(bytes, cursor) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const method = readU16(bytes, cursor + 10);
    const compressedSize = readU32(bytes, cursor + 20);
    const uncompressedSize = readU32(bytes, cursor + 24);
    if (uncompressedSize > WORKFLOW_ARCHIVE_LIMITS.entryBytes) {
      throw new Error("Archive entry exceeds the fixed byte limit");
    }
    totalBytes += uncompressedSize;
    if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
      throw new Error("Archive exceeds the fixed total byte limit");
    }
    const nameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const localOffset = readU32(bytes, cursor + 42);
    const name = normalizeWorkflowArchiveEntryName(
      decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)),
    );
    if (seen.has(name)) throw new Error(`Duplicate zip entry path: ${name}`);
    seen.add(name);
    if (method !== 0 || compressedSize !== uncompressedSize) {
      throw new Error("Archive fallback supports stored ZIP entries only");
    }
    if (readU32(bytes, localOffset) !== 0x04034b50) throw new Error("Invalid ZIP local entry");
    const localNameLength = readU16(bytes, localOffset + 26);
    const localExtraLength = readU16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + uncompressedSize;
    if (dataEnd > bytes.length) throw new Error("Truncated ZIP entry");
    entries.push({ name, bytes: bytes.slice(dataStart, dataEnd) });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function extractStoredZip(sourcePath: string, rootPath: string) {
  const entries = parseStoredZip(await readLocalBytes(sourcePath));
  for (const entry of entries) {
    const target = joinPath(rootPath, ...entry.name.split("/"));
    const parent = dirname(target.replace(/\\/g, "/"));
    if (parent) await ensureDirectory(parent);
    await writeLocalBytes(target, entry.bytes);
  }
  return entries.map((entry) => entry.name);
}

async function extractInGecko(
  sourcePath: string,
  rootPath: string,
  runtime: NonNullable<ReturnType<typeof resolveGeckoArchiveReaderRuntime>>,
) {
  const reader = runtime.factory.createInstance(runtime.interfaceId);
  reader.open(runtime.file.pathToFile(sourcePath));
  try {
    const rawNames: string[] = [];
    const names = reader.findEntries(null);
    while (names.hasMore()) {
      const raw = names.getNext();
      const data =
        raw && typeof raw === "object" && "data" in raw
          ? (raw as { data?: unknown }).data
          : raw;
      const name = String(typeof raw === "string" ? raw : data || raw);
      if (!name || name.endsWith("/")) continue;
      rawNames.push(normalizeWorkflowArchiveEntryName(name));
    }
    if (
      new Set(rawNames.map((name) => name.toLocaleLowerCase("en-US"))).size !==
      rawNames.length
    ) {
      throw new Error("Duplicate zip entry path");
    }
    if (rawNames.length > WORKFLOW_ARCHIVE_LIMITS.entries) {
      throw new Error("Archive exceeds the fixed entry count limit");
    }
    let totalBytes = 0;
    for (const name of rawNames) {
      const target = joinPath(rootPath, ...name.split("/"));
      const parent = dirname(target.replace(/\\/g, "/"));
      if (parent) await ensureDirectory(parent);
      reader.extract(name, runtime.file.pathToFile(target));
      const stat = await measureLocalFile(target);
      if (stat.size > WORKFLOW_ARCHIVE_LIMITS.entryBytes) {
        throw new Error(`Archive entry exceeds the fixed byte limit: ${name}`);
      }
      totalBytes += stat.size;
      if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
        throw new Error("Archive exceeds the fixed total byte limit");
      }
    }
    return rawNames;
  } finally {
    reader.close();
  }
}

export function createWorkflowArchiveApi(): WorkflowArchiveApi {
  return {
    async measureEntries(entriesInput) {
      const entries = validateEntries(entriesInput || []);
      return measureValidatedEntries(entries);
    },
    async writeZipAtomic(args) {
      const targetPath = String(args?.targetPath || "").trim();
      if (!targetPath) throw new Error("Archive target path is required");
      const entries = validateEntries(args?.entries || []);
      const measurement = await measureValidatedEntries(entries);
      const geckoRuntime = resolveGeckoArchiveWriterRuntime();
      const written = geckoRuntime
        ? writeZipInGecko(targetPath, entries, geckoRuntime)
        : writeStoredZipAtomic(targetPath, entries);
      const result = await written;
      const actual: WorkflowArchiveMeasurement = {
        files: result.files,
        totalEntries: Object.keys(result.files).length,
        totalBytes: Object.values(result.files).reduce(
          (sum, entry) => sum + entry.size,
          0,
        ),
      };
      if (
        actual.totalEntries !== measurement.totalEntries ||
        actual.totalBytes !== measurement.totalBytes
      ) {
        throw new Error("Archive sources changed during atomic write");
      }
      return { ...actual, targetPath };
    },
    async withExtractedZip<T>(
      sourcePath: string,
      callback: (archive: WorkflowExtractedArchive) => Promise<T> | T,
    ) {
      if (typeof callback !== "function") throw new Error("Archive callback is required");
      const rootPath = await makeTempDir("zs-workflow-archive");
      let active = true;
      let operationFailed = false;
      let operationError: unknown;
      let result: T | undefined;
      try {
        const geckoRuntime = resolveGeckoArchiveReaderRuntime();
        const entries = geckoRuntime
          ? await extractInGecko(sourcePath, rootPath, geckoRuntime)
          : await extractStoredZip(sourcePath, rootPath);
        if (entries.length > WORKFLOW_ARCHIVE_LIMITS.entries) {
          throw new Error("Archive exceeds the fixed entry count limit");
        }
        const requireActive = () => {
          if (!active) {
            throw new Error("Extracted archive scope has ended");
          }
        };
        const resolvePath = (entryName: string) => {
          requireActive();
          return joinPath(
            rootPath,
            ...normalizeWorkflowArchiveEntryName(entryName).split("/"),
          );
        };
        const entrySet = new Set(entries);
        const measureEntries = async (entryNamesInput: string[]) => {
          requireActive();
          const entryNames = (entryNamesInput || []).map(
            normalizeWorkflowArchiveEntryName,
          );
          if (new Set(entryNames).size !== entryNames.length) {
            throw new Error("Duplicate extracted archive measurement entry");
          }
          const measurement: WorkflowArchiveMeasurement = {
            files: {},
            totalEntries: 0,
            totalBytes: 0,
          };
          for (const entryName of entryNames) {
            if (!entrySet.has(entryName)) {
              throw new Error(
                `Extracted archive measurement entry is unavailable: ${entryName}`,
              );
            }
            addMeasuredFile(
              measurement,
              entryName,
              await measureLocalFile(resolvePath(entryName)),
            );
          }
          return measurement;
        };
        const scopedArchive: WorkflowExtractedArchive = {
          get rootPath() {
            requireActive();
            return rootPath;
          },
          entries: [...entries],
          resolvePath,
          readText: async (entryName) => {
            requireActive();
            return new TextDecoder("utf-8").decode(
              await readLocalBytes(resolvePath(entryName)),
            );
          },
          readBytes: async (entryName) => {
            requireActive();
            return readLocalBytes(resolvePath(entryName));
          },
          measureEntries,
        };
        result = await callback(scopedArchive);
      } catch (error) {
        operationFailed = true;
        operationError = error;
      }
      active = false;
      let cleanupFailed = false;
      let cleanupError: unknown;
      try {
        await removePath(rootPath);
      } catch (error) {
        cleanupFailed = true;
        cleanupError = error;
      }
      if (operationFailed) throw operationError;
      if (cleanupFailed) throw cleanupError;
      return result as T;
    },
  };
}
