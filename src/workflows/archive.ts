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
import {
  assertWorkflowCallNotCanceled,
  createWorkflowHostError,
} from "./workflowHostErrorContract";
import type { WorkflowCallControl } from "./types";

export type WorkflowArchiveEntryDto = {
  name: string;
  content:
    | { kind: "file"; sourcePath: string }
    | { kind: "text"; text: string }
    | { kind: "bytes"; bytes: Uint8Array | ArrayBuffer };
};

export type WorkflowArchiveFileIntegrityDto = {
  sizeBytes: number;
  sha256: string;
};

export type WorkflowArchiveMeasureResultDto = {
  files: Record<string, WorkflowArchiveFileIntegrityDto>;
  totalEntries: number;
  totalBytes: number;
};

export type WorkflowExtractedArchive = Readonly<{
  rootPath: string;
  entries: string[];
  resolvePath(entryName: string): string;
  readText(entryName: string): Promise<string>;
  readBytes(entryName: string): Promise<Uint8Array>;
  measureEntries(
    entryNames: string[],
  ): Promise<WorkflowArchiveMeasureResultDto>;
}>;

export type WorkflowArchiveApi = {
  measureEntries: (
    input: { entries: WorkflowArchiveEntryDto[] },
    control?: WorkflowCallControl,
  ) => Promise<WorkflowArchiveMeasureResultDto>;
  writeZipAtomic: (
    input: { targetPath: string; entries: WorkflowArchiveEntryDto[] },
    control?: WorkflowCallControl,
  ) => Promise<WorkflowArchiveMeasureResultDto & { targetPath: string }>;
  withExtractedZip: <T>(
    input: { sourcePath: string },
    control: WorkflowCallControl,
    callback: (archive: WorkflowExtractedArchive) => Promise<T> | T,
  ) => Promise<T>;
};

type ValidatedArchiveEntry = {
  name: string;
  content: WorkflowArchiveEntryDto["content"];
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

function invalidRequest(
  reason:
    | "missing_field"
    | "invalid_type"
    | "invalid_value"
    | "invalid_combination"
    | "invalid_format"
    | "duplicate_value"
    | "unsafe_path",
  message: string,
  field?: string,
) {
  return createWorkflowHostError("invalid_request", message, {
    reason,
    ...(field ? { field } : {}),
  });
}

function resourceLimited(
  resource: "entries" | "bytes" | "depth" | "path_length",
  limit: number,
  observed?: number,
) {
  return createWorkflowHostError(
    "resource_limited",
    "Workflow archive operation exceeds a fixed limit",
    {
      resource,
      limit,
      ...(typeof observed === "number" ? { observed } : {}),
    },
  );
}

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

function asBytes(value: Uint8Array | ArrayBuffer | ArrayBufferView | string) {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array();
}

function entryBytes(content: ValidatedArchiveEntry["content"]) {
  return content.kind === "text"
    ? asBytes(content.text)
    : content.kind === "bytes"
      ? asBytes(content.bytes)
      : null;
}

export function normalizeWorkflowArchiveEntryName(rawName: unknown) {
  const source = String(rawName || "").replace(/\\/g, "/").trim();
  if (
    !source ||
    source.startsWith("/") ||
    /^[A-Za-z]:\//.test(source) ||
    source.includes("\0")
  ) {
    throw invalidRequest(
      "unsafe_path",
      "Workflow archive entry path is unsafe",
      "name",
    );
  }
  if (source.length > WORKFLOW_ARCHIVE_LIMITS.entryNameLength) {
    throw resourceLimited(
      "path_length",
      WORKFLOW_ARCHIVE_LIMITS.entryNameLength,
      source.length,
    );
  }
  const parts = source.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw invalidRequest(
      "unsafe_path",
      "Workflow archive entry path is unsafe",
      "name",
    );
  }
  if (parts.length > WORKFLOW_ARCHIVE_LIMITS.depth) {
    throw resourceLimited(
      "depth",
      WORKFLOW_ARCHIVE_LIMITS.depth,
      parts.length,
    );
  }
  return parts.join("/");
}

function trackUniqueEntryName(
  seen: Set<string>,
  portableSeen: Set<string>,
  name: string,
) {
  const portableName = name.toLocaleLowerCase("en-US");
  if (seen.has(name) || portableSeen.has(portableName)) {
    throw invalidRequest(
      "duplicate_value",
      "Workflow archive contains a duplicate entry path",
      "name",
    );
  }
  seen.add(name);
  portableSeen.add(portableName);
}

function validateEntries(entries: WorkflowArchiveEntryDto[]) {
  if (!Array.isArray(entries)) {
    throw invalidRequest(
      "invalid_type",
      "Workflow archive entries must be an array",
      "entries",
    );
  }
  if (entries.length > WORKFLOW_ARCHIVE_LIMITS.entries) {
    throw resourceLimited(
      "entries",
      WORKFLOW_ARCHIVE_LIMITS.entries,
      entries.length,
    );
  }
  const seen = new Set<string>();
  const portableSeen = new Set<string>();
  return entries.map((entry): ValidatedArchiveEntry => {
    const name = normalizeWorkflowArchiveEntryName(entry?.name);
    trackUniqueEntryName(seen, portableSeen, name);
    const content = entry?.content;
    if (
      !content ||
      (content.kind === "file" &&
        typeof content.sourcePath !== "string") ||
      (content.kind === "text" && typeof content.text !== "string") ||
      (content.kind === "bytes" && typeof content.bytes === "undefined") ||
      (content.kind !== "file" &&
        content.kind !== "text" &&
        content.kind !== "bytes")
    ) {
      throw invalidRequest(
        "invalid_combination",
        "Workflow archive entry requires exactly one content variant",
        "content",
      );
    }
    return { name, content };
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
    throw createWorkflowHostError(
      "unavailable",
      "SHA-256 is unavailable in the current runtime",
      { reason: "capability" },
    );
  }
  return digest;
}

async function measureLocalFile(path: string) {
  const source = await inspectRuntimeFileSource(
    normalizeNativeLocalPath(path),
  );
  const digest = await digestRuntimeFileSource(source);
  return {
    sizeBytes: source.size,
    sha256: digest.sha256.replace(/^sha256:/, ""),
  };
}

function addMeasuredFile(
  measurement: WorkflowArchiveMeasureResultDto,
  name: string,
  integrity: WorkflowArchiveFileIntegrityDto,
) {
  if (integrity.sizeBytes > WORKFLOW_ARCHIVE_LIMITS.entryBytes) {
    throw resourceLimited("bytes", WORKFLOW_ARCHIVE_LIMITS.entryBytes);
  }
  const totalBytes = measurement.totalBytes + integrity.sizeBytes;
  if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
    throw resourceLimited("bytes", WORKFLOW_ARCHIVE_LIMITS.totalBytes);
  }
  measurement.files[name] = integrity;
  measurement.totalEntries += 1;
  measurement.totalBytes = totalBytes;
}

async function measureValidatedEntries(
  entries: ValidatedArchiveEntry[],
  control?: WorkflowCallControl,
): Promise<WorkflowArchiveMeasureResultDto> {
  const measurement: WorkflowArchiveMeasureResultDto = {
    files: {},
    totalEntries: 0,
    totalBytes: 0,
  };
  for (const entry of entries) {
    assertWorkflowCallNotCanceled(control);
    if (entry.content.kind === "file") {
      addMeasuredFile(
        measurement,
        entry.name,
        await measureLocalFile(entry.content.sourcePath),
      );
    } else {
      const bytes = entryBytes(entry.content)!;
      addMeasuredFile(measurement, entry.name, {
        sizeBytes: bytes.length,
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
  entries: ValidatedArchiveEntry[],
  control?: WorkflowCallControl,
) {
  const payloads: Array<{ name: string; bytes: Uint8Array }> = [];
  const files: Record<string, WorkflowArchiveFileIntegrityDto> = {};
  for (const entry of entries) {
    assertWorkflowCallNotCanceled(control);
    const bytes =
      entry.content.kind === "file"
        ? await readLocalBytes(entry.content.sourcePath)
        : entryBytes(entry.content)!;
    payloads.push({ name: entry.name, bytes });
    files[entry.name] = {
      sizeBytes: bytes.length,
      sha256: await hashBytes(bytes),
    };
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
  entries: ValidatedArchiveEntry[],
  runtime: NonNullable<ReturnType<typeof resolveGeckoArchiveWriterRuntime>>,
  control?: WorkflowCallControl,
) {
  const temporary = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const materializedRoot = await makeTempDir("zs-zip-entry");
  const files: Record<string, WorkflowArchiveFileIntegrityDto> = {};
  const writer = runtime.factory.createInstance(runtime.interfaceId);
  try {
    writer.open(runtime.file.pathToFile(temporary), 0x02 | 0x08 | 0x20);
    for (let index = 0; index < entries.length; index += 1) {
      assertWorkflowCallNotCanceled(control);
      const entry = entries[index];
      let sourcePath =
        entry.content.kind === "file" ? entry.content.sourcePath : "";
      if (!sourcePath) {
        sourcePath = joinPath(materializedRoot, `${index}.bin`);
        await writeLocalBytes(sourcePath, entryBytes(entry.content)!);
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

function assertWrittenMatchesMeasured(
  measurement: WorkflowArchiveMeasureResultDto,
  files: Record<string, WorkflowArchiveFileIntegrityDto>,
) {
  const names = Object.keys(files);
  const totalBytes = Object.values(files).reduce(
    (sum, entry) => sum + entry.sizeBytes,
    0,
  );
  const changed =
    names.length !== measurement.totalEntries ||
    totalBytes !== measurement.totalBytes ||
    names.some((name) => {
      const expected = measurement.files[name];
      const actual = files[name];
      return (
        !expected ||
        expected.sizeBytes !== actual.sizeBytes ||
        expected.sha256 !== actual.sha256
      );
    });
  if (changed) {
    throw createWorkflowHostError(
      "conflict",
      "Archive sources changed during atomic write",
      { reason: "concurrent_modification" },
    );
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
  if (eocd < 0) {
    throw invalidRequest("invalid_format", "ZIP end-of-central-directory is missing");
  }
  const count = readU16(bytes, eocd + 10);
  if (count > WORKFLOW_ARCHIVE_LIMITS.entries) {
    throw resourceLimited("entries", WORKFLOW_ARCHIVE_LIMITS.entries, count);
  }
  let cursor = readU32(bytes, eocd + 16);
  const decoder = new TextDecoder("utf-8");
  const seen = new Set<string>();
  const portableSeen = new Set<string>();
  const entries: ParsedStoredEntry[] = [];
  let totalBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (readU32(bytes, cursor) !== 0x02014b50) {
      throw invalidRequest("invalid_format", "Invalid ZIP central directory");
    }
    const method = readU16(bytes, cursor + 10);
    const compressedSize = readU32(bytes, cursor + 20);
    const uncompressedSize = readU32(bytes, cursor + 24);
    if (uncompressedSize > WORKFLOW_ARCHIVE_LIMITS.entryBytes) {
      throw resourceLimited("bytes", WORKFLOW_ARCHIVE_LIMITS.entryBytes);
    }
    totalBytes += uncompressedSize;
    if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
      throw resourceLimited("bytes", WORKFLOW_ARCHIVE_LIMITS.totalBytes);
    }
    const nameLength = readU16(bytes, cursor + 28);
    const extraLength = readU16(bytes, cursor + 30);
    const commentLength = readU16(bytes, cursor + 32);
    const localOffset = readU32(bytes, cursor + 42);
    const name = normalizeWorkflowArchiveEntryName(
      decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)),
    );
    trackUniqueEntryName(seen, portableSeen, name);
    if (method !== 0 || compressedSize !== uncompressedSize) {
      throw createWorkflowHostError(
        "unsupported_operation",
        "Archive fallback supports stored ZIP entries only",
        { memberOrOperation: "archive.withExtractedZip" },
      );
    }
    if (readU32(bytes, localOffset) !== 0x04034b50) {
      throw invalidRequest("invalid_format", "Invalid ZIP local entry");
    }
    const localNameLength = readU16(bytes, localOffset + 26);
    const localExtraLength = readU16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + uncompressedSize;
    if (dataEnd > bytes.length) {
      throw invalidRequest("invalid_format", "Truncated ZIP entry");
    }
    entries.push({ name, bytes: bytes.slice(dataStart, dataEnd) });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function extractStoredZip(
  sourcePath: string,
  rootPath: string,
  control?: WorkflowCallControl,
) {
  const entries = parseStoredZip(await readLocalBytes(sourcePath));
  for (const entry of entries) {
    assertWorkflowCallNotCanceled(control);
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
  control?: WorkflowCallControl,
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
    const seen = new Set<string>();
    const portableSeen = new Set<string>();
    for (const name of rawNames) {
      trackUniqueEntryName(seen, portableSeen, name);
    }
    if (rawNames.length > WORKFLOW_ARCHIVE_LIMITS.entries) {
      throw resourceLimited(
        "entries",
        WORKFLOW_ARCHIVE_LIMITS.entries,
        rawNames.length,
      );
    }
    let totalBytes = 0;
    for (const name of rawNames) {
      assertWorkflowCallNotCanceled(control);
      const target = joinPath(rootPath, ...name.split("/"));
      const parent = dirname(target.replace(/\\/g, "/"));
      if (parent) await ensureDirectory(parent);
      reader.extract(name, runtime.file.pathToFile(target));
      const stat = await measureLocalFile(target);
      if (stat.sizeBytes > WORKFLOW_ARCHIVE_LIMITS.entryBytes) {
        throw resourceLimited("bytes", WORKFLOW_ARCHIVE_LIMITS.entryBytes);
      }
      totalBytes += stat.sizeBytes;
      if (totalBytes > WORKFLOW_ARCHIVE_LIMITS.totalBytes) {
        throw resourceLimited("bytes", WORKFLOW_ARCHIVE_LIMITS.totalBytes);
      }
    }
    return rawNames;
  } finally {
    reader.close();
  }
}

export function createWorkflowArchiveApi(): WorkflowArchiveApi {
  return {
    async measureEntries(input, control) {
      assertWorkflowCallNotCanceled(control);
      const entries = validateEntries(input?.entries || []);
      const measurement = await measureValidatedEntries(entries, control);
      assertWorkflowCallNotCanceled(control);
      return measurement;
    },
    async writeZipAtomic(input, control) {
      assertWorkflowCallNotCanceled(control);
      const targetPath = String(input?.targetPath || "").trim();
      if (!targetPath) {
        throw invalidRequest(
          "missing_field",
          "Archive target path is required",
          "targetPath",
        );
      }
      const entries = validateEntries(input?.entries || []);
      const measurement = await measureValidatedEntries(entries, control);
      const geckoRuntime = resolveGeckoArchiveWriterRuntime();
      const written = geckoRuntime
        ? writeZipInGecko(targetPath, entries, geckoRuntime, control)
        : writeStoredZipAtomic(targetPath, entries, control);
      const result = await written;
      assertWrittenMatchesMeasured(measurement, result.files);
      assertWorkflowCallNotCanceled(control);
      return { ...measurement, targetPath };
    },
    async withExtractedZip<T>(
      input: { sourcePath: string },
      control: WorkflowCallControl,
      callback: (archive: WorkflowExtractedArchive) => Promise<T> | T,
    ) {
      assertWorkflowCallNotCanceled(control);
      if (typeof callback !== "function") {
        throw invalidRequest(
          "missing_field",
          "Archive callback is required",
          "callback",
        );
      }
      const sourcePath = String(input?.sourcePath || "").trim();
      if (!sourcePath) {
        throw invalidRequest(
          "missing_field",
          "Archive source path is required",
          "sourcePath",
        );
      }
      const rootPath = await makeTempDir("zs-workflow-archive");
      let active = true;
      let operationFailed = false;
      let operationError: unknown;
      let result: T | undefined;
      try {
        const geckoRuntime = resolveGeckoArchiveReaderRuntime();
        const entries = geckoRuntime
          ? await extractInGecko(sourcePath, rootPath, geckoRuntime, control)
          : await extractStoredZip(sourcePath, rootPath, control);
        if (entries.length > WORKFLOW_ARCHIVE_LIMITS.entries) {
          throw resourceLimited(
            "entries",
            WORKFLOW_ARCHIVE_LIMITS.entries,
            entries.length,
          );
        }
        const requireActive = () => {
          if (!active) {
            throw invalidRequest(
              "invalid_value",
              "Extracted archive scope has ended",
            );
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
            throw invalidRequest(
              "duplicate_value",
              "Duplicate extracted archive measurement entry",
            );
          }
          const measurement: WorkflowArchiveMeasureResultDto = {
            files: {},
            totalEntries: 0,
            totalBytes: 0,
          };
          for (const entryName of entryNames) {
            assertWorkflowCallNotCanceled(control);
            if (!entrySet.has(entryName)) {
              throw createWorkflowHostError(
                "not_found",
                "Extracted archive measurement entry is unavailable",
                { kind: "archive_entry" },
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
            assertWorkflowCallNotCanceled(control);
            return new TextDecoder("utf-8").decode(
              await readLocalBytes(resolvePath(entryName)),
            );
          },
          readBytes: async (entryName) => {
            requireActive();
            assertWorkflowCallNotCanceled(control);
            return readLocalBytes(resolvePath(entryName));
          },
          measureEntries,
        };
        result = await callback(scopedArchive);
        // The native extract and callback are not interruptible; a canceled
        // run must not publish a late success result.
        assertWorkflowCallNotCanceled(control);
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
