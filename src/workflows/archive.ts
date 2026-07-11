import { createStoreZipBytes } from "../modules/zipStore";
import { joinPath } from "../utils/path";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

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

export type WorkflowExtractedArchive = {
  rootPath: string;
  entries: string[];
  resolvePath: (entryName: string) => string;
  readText: (entryName: string) => Promise<string>;
  readBytes: (entryName: string) => Promise<Uint8Array>;
};

export type WorkflowArchiveApi = {
  measureEntries: (
    entries: WorkflowArchiveEntry[],
  ) => Promise<{ files: Record<string, WorkflowArchiveFileIntegrity> }>;
  writeZipAtomic: (args: {
    targetPath: string;
    entries: WorkflowArchiveEntry[];
  }) => Promise<{ files: Record<string, WorkflowArchiveFileIntegrity> }>;
  withExtractedZip: <T>(
    sourcePath: string,
    callback: (archive: WorkflowExtractedArchive) => Promise<T> | T,
  ) => Promise<T>;
};

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
  const parts = source.split("/");
  if (
    parts.some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Unsafe zip entry path: ${String(rawName || "")}`);
  }
  return parts.join("/");
}

function validateEntries(entries: WorkflowArchiveEntry[]) {
  const seen = new Set<string>();
  return (entries || []).map((entry) => {
    const name = normalizeWorkflowArchiveEntryName(entry?.name);
    if (seen.has(name)) throw new Error(`Duplicate zip entry path: ${name}`);
    seen.add(name);
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

function hasGeckoArchiveRuntime() {
  const runtime = globalThis as any;
  return !!(
    runtime.Cc?.["@mozilla.org/libjar/zip-writer;1"] &&
    runtime.Ci?.nsIZipWriter &&
    runtime.Ci?.nsIZipReader &&
    runtime.Zotero?.File?.pathToFile &&
    runtime.IOUtils
  );
}

async function makeTempDir(prefix: string) {
  const runtime = globalThis as any;
  if (runtime.PathUtils?.tempDir && runtime.IOUtils?.makeDirectory) {
    const target = joinPath(
      runtime.PathUtils.tempDir,
      `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await runtime.IOUtils.makeDirectory(target, { createAncestors: true });
    return target;
  }
  const fs = await dynamicImport("fs/promises");
  const os = await dynamicImport("os");
  const path = await dynamicImport("path");
  return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

async function removePath(targetPath: string) {
  const runtime = globalThis as any;
  if (runtime.IOUtils?.remove) {
    await runtime.IOUtils.remove(targetPath, { recursive: true, ignoreAbsent: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.rm(targetPath, { recursive: true, force: true });
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashBytes(bytes: Uint8Array) {
  const subtle = (globalThis as any).crypto?.subtle;
  if (subtle?.digest) {
    return toHex(new Uint8Array(await subtle.digest("SHA-256", bytes)));
  }
  const crypto = await dynamicImport("crypto");
  return crypto.createHash("sha256").update(bytes).digest("hex") as string;
}

async function readLocalBytes(path: string) {
  const runtime = globalThis as any;
  if (runtime.IOUtils?.read) {
    return new Uint8Array(await runtime.IOUtils.read(path));
  }
  const fs = await dynamicImport("fs/promises");
  return new Uint8Array(await fs.readFile(path));
}

async function writeLocalBytes(path: string, bytes: Uint8Array) {
  const runtime = globalThis as any;
  if (runtime.IOUtils?.write) {
    await runtime.IOUtils.write(path, bytes);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(path, bytes);
}

async function ensureDirectory(path: string) {
  const runtime = globalThis as any;
  if (runtime.IOUtils?.makeDirectory) {
    await runtime.IOUtils.makeDirectory(path, { createAncestors: true, ignoreExisting: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(path, { recursive: true });
}

function dirname(entryPath: string) {
  const index = entryPath.lastIndexOf("/");
  return index < 0 ? "" : entryPath.slice(0, index);
}

async function writeZipInNode(
  targetPath: string,
  entries: ReturnType<typeof validateEntries>,
) {
  const fs = await dynamicImport("fs/promises");
  const payloads: Array<{ name: string; bytes: Uint8Array }> = [];
  const files: Record<string, WorkflowArchiveFileIntegrity> = {};
  for (const entry of entries) {
    const bytes = entry.sourcePath
      ? new Uint8Array(await fs.readFile(entry.sourcePath))
      : asBytes(entry.text ?? entry.bytes!);
    payloads.push({ name: entry.name, bytes });
    files[entry.name] = { size: bytes.length, sha256: await hashBytes(bytes) };
  }
  const temporary = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await fs.writeFile(temporary, createStoreZipBytes(payloads));
    await fs.rename(temporary, targetPath);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
  return { files };
}

async function writeZipInGecko(
  targetPath: string,
  entries: ReturnType<typeof validateEntries>,
) {
  const runtime = globalThis as any;
  const temporary = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const materializedRoot = await makeTempDir("zs-zip-entry");
  const files: Record<string, WorkflowArchiveFileIntegrity> = {};
  const writer = runtime.Cc["@mozilla.org/libjar/zip-writer;1"].createInstance(
    runtime.Ci.nsIZipWriter,
  );
  try {
    writer.open(runtime.Zotero.File.pathToFile(temporary), 0x02 | 0x08 | 0x20);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      let sourcePath = entry.sourcePath;
      if (!sourcePath) {
        sourcePath = joinPath(materializedRoot, `${index}.bin`);
        await writeLocalBytes(sourcePath, asBytes(entry.text ?? entry.bytes!));
      }
      const bytes = await readLocalBytes(sourcePath);
      files[entry.name] = { size: bytes.length, sha256: await hashBytes(bytes) };
      writer.addEntryFile(
        entry.name,
        runtime.Ci.nsIZipWriter.COMPRESSION_DEFAULT,
        runtime.Zotero.File.pathToFile(sourcePath),
        false,
      );
    }
    writer.close();
    await runtime.IOUtils.move(temporary, targetPath, { noOverwrite: false });
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
  let cursor = readU32(bytes, eocd + 16);
  const decoder = new TextDecoder("utf-8");
  const seen = new Set<string>();
  const entries: ParsedStoredEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (readU32(bytes, cursor) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const method = readU16(bytes, cursor + 10);
    const compressedSize = readU32(bytes, cursor + 20);
    const uncompressedSize = readU32(bytes, cursor + 24);
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
      throw new Error("Node archive fallback supports stored ZIP entries only");
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

async function extractInNode(sourcePath: string, rootPath: string) {
  const fs = await dynamicImport("fs/promises");
  const entries = parseStoredZip(new Uint8Array(await fs.readFile(sourcePath)));
  for (const entry of entries) {
    const target = joinPath(rootPath, ...entry.name.split("/"));
    const parent = dirname(target.replace(/\\/g, "/"));
    if (parent) await ensureDirectory(parent);
    await writeLocalBytes(target, entry.bytes);
  }
  return entries.map((entry) => entry.name);
}

async function extractInGecko(sourcePath: string, rootPath: string) {
  const runtime = globalThis as any;
  const reader = runtime.Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
    runtime.Ci.nsIZipReader,
  );
  reader.open(runtime.Zotero.File.pathToFile(sourcePath));
  try {
    const rawNames: string[] = [];
    const names = reader.findEntries(null);
    while (names.hasMore()) {
      const raw = names.getNext();
      const name = String(typeof raw === "string" ? raw : raw?.data || raw);
      if (!name || name.endsWith("/")) continue;
      rawNames.push(normalizeWorkflowArchiveEntryName(name));
    }
    if (new Set(rawNames).size !== rawNames.length) throw new Error("Duplicate zip entry path");
    for (const name of rawNames) {
      const target = joinPath(rootPath, ...name.split("/"));
      const parent = dirname(target.replace(/\\/g, "/"));
      if (parent) await ensureDirectory(parent);
      reader.extract(name, runtime.Zotero.File.pathToFile(target));
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
      const files: Record<string, WorkflowArchiveFileIntegrity> = {};
      for (const entry of entries) {
        const bytes = entry.sourcePath
          ? await readLocalBytes(entry.sourcePath)
          : asBytes(entry.text ?? entry.bytes!);
        files[entry.name] = {
          size: bytes.length,
          sha256: await hashBytes(bytes),
        };
      }
      return { files };
    },
    async writeZipAtomic(args) {
      const targetPath = String(args?.targetPath || "").trim();
      if (!targetPath) throw new Error("Archive target path is required");
      const entries = validateEntries(args?.entries || []);
      return hasGeckoArchiveRuntime()
        ? writeZipInGecko(targetPath, entries)
        : writeZipInNode(targetPath, entries);
    },
    async withExtractedZip(sourcePath, callback) {
      if (typeof callback !== "function") throw new Error("Archive callback is required");
      const rootPath = await makeTempDir("zs-workflow-archive");
      try {
        const entries = hasGeckoArchiveRuntime()
          ? await extractInGecko(sourcePath, rootPath)
          : await extractInNode(sourcePath, rootPath);
        const resolvePath = (entryName: string) =>
          joinPath(rootPath, ...normalizeWorkflowArchiveEntryName(entryName).split("/"));
        return await callback({
          rootPath,
          entries,
          resolvePath,
          readText: async (entryName) =>
            new TextDecoder("utf-8").decode(await readLocalBytes(resolvePath(entryName))),
          readBytes: async (entryName) => readLocalBytes(resolvePath(entryName)),
        });
      } finally {
        await removePath(rootPath);
      }
    },
  };
}
