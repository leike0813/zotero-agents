import { readFileSync } from "node:fs";
import zlib from "node:zlib";

export type ZipArchiveReadResult = {
  entryNames: string[];
  selectedEntries: Map<string, Buffer>;
};

function requireRange(
  buffer: Buffer,
  offset: number,
  length: number,
  label: string,
) {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset + length > buffer.length
  ) {
    throw new Error(`Invalid ZIP ${label}`);
  }
}

function normalizeEntryName(name: string) {
  const normalized = name.replace(/\\/g, "/");
  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe ZIP entry: ${name}`);
  }
  return normalized;
}

export function readZipArchiveEntries(
  archivePath: string,
  options: { selectedEntries?: ReadonlySet<string> } = {},
): ZipArchiveReadResult {
  const buffer = readFileSync(archivePath);
  let endOffset = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      endOffset = index;
      break;
    }
  }
  if (endOffset === -1) {
    throw new Error(`Invalid ZIP archive: ${archivePath}`);
  }

  requireRange(buffer, endOffset, 22, "end of central directory");
  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  let cursor = buffer.readUInt32LE(endOffset + 16);
  const entryNames: string[] = [];
  const selectedEntries = new Map<string, Buffer>();
  const seen = new Set<string>();

  for (let index = 0; index < totalEntries; index += 1) {
    requireRange(buffer, cursor, 46, `central directory entry ${index}`);
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory entry ${index}`);
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    requireRange(
      buffer,
      cursor + 46,
      fileNameLength + extraLength + commentLength,
      `central directory payload ${index}`,
    );
    const rawName = buffer
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8");
    const name = normalizeEntryName(rawName);
    if (seen.has(name)) {
      throw new Error(`Duplicate ZIP entry: ${name}`);
    }
    seen.add(name);
    entryNames.push(name);
    cursor += 46 + fileNameLength + extraLength + commentLength;

    if (
      name.endsWith("/") ||
      (options.selectedEntries && !options.selectedEntries.has(name))
    ) {
      continue;
    }
    if ((flags & 0x1) !== 0) {
      throw new Error(`Encrypted ZIP entry is unsupported: ${name}`);
    }
    requireRange(buffer, localOffset, 30, `local header for ${name}`);
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid ZIP local header: ${name}`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    requireRange(buffer, dataStart, compressedSize, `entry data for ${name}`);
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const bytes =
      method === 8
        ? zlib.inflateRawSync(compressed)
        : method === 0
          ? Buffer.from(compressed)
          : null;
    if (!bytes) {
      throw new Error(`Unsupported ZIP method ${method}: ${name}`);
    }
    if (bytes.length !== uncompressedSize) {
      throw new Error(`ZIP entry size mismatch: ${name}`);
    }
    selectedEntries.set(name, bytes);
  }

  return { entryNames, selectedEntries };
}
