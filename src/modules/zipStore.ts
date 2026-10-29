function encodeUtf8(text: string) {
  return new TextEncoder().encode(String(text || ""));
}

export type StoreZipEntry = {
  name: string;
  text?: string;
  bytes?: Uint8Array | ArrayBuffer | ArrayBufferView;
};

function asUint8Array(value: StoreZipEntry["bytes"] | string | undefined) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === "string") {
    return encodeUtf8(value);
  }
  return new Uint8Array();
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const UINT16_MAX = 0xffff;
const UINT32_MAX = 0xffffffff;

function assertZip32Range(label: string, value: number, max: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new RangeError(`ZIP32 ${label} exceeds ${max}`);
  }
}

function writeU16(output: DataView, offset: number, value: number) {
  output.setUint16(offset, value, true);
}

function writeU32(output: DataView, offset: number, value: number) {
  output.setUint32(offset, value, true);
}

function normalizeEntryName(nameRaw: unknown) {
  const name = String(nameRaw || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "")
    .replace(/\/+/g, "/")
    .trim();
  if (
    !name ||
    name === "." ||
    name.startsWith("../") ||
    name.includes("/../") ||
    name.endsWith("/..")
  ) {
    return "";
  }
  return name;
}

export function createStoreZipBytes(entries: StoreZipEntry[]) {
  const records: Array<{
    nameBytes: Uint8Array;
    content: Uint8Array;
    contentLength: number;
    crc: number;
    localOffset: number;
  }> = [];
  let localLength = 0;

  for (const entry of entries || []) {
    const name = normalizeEntryName(entry?.name);
    if (!name) {
      continue;
    }
    if (records.length >= UINT16_MAX) {
      throw new RangeError(`ZIP32 entry count exceeds ${UINT16_MAX}`);
    }
    const nameBytes = encodeUtf8(name);
    assertZip32Range("file name length", nameBytes.byteLength, UINT16_MAX);
    const content = asUint8Array(entry.bytes ?? entry.text ?? "");
    const contentLength = content.byteLength;
    assertZip32Range("entry byte length", contentLength, UINT32_MAX);
    assertZip32Range("local entry offset", localLength, UINT32_MAX);
    const recordLength = 30 + nameBytes.byteLength + contentLength;
    assertZip32Range("local entry length", recordLength, UINT32_MAX);

    records.push({
      nameBytes,
      content,
      contentLength,
      crc: 0,
      localOffset: localLength,
    });
    localLength += recordLength;
    assertZip32Range("local directory length", localLength, UINT32_MAX);
  }

  let centralLength = 0;
  for (const record of records) {
    centralLength += 46 + record.nameBytes.byteLength;
    assertZip32Range("central directory length", centralLength, UINT32_MAX);
  }
  assertZip32Range("central directory offset", localLength, UINT32_MAX);
  const totalLength = localLength + centralLength + 22;
  assertZip32Range("archive length", totalLength, UINT32_MAX);

  for (const record of records) {
    record.crc = crc32(record.content);
  }

  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);
  let cursor = 0;
  for (const record of records) {
    writeU32(view, cursor, 0x04034b50);
    writeU16(view, cursor + 4, 20);
    writeU16(view, cursor + 6, 0x0800);
    writeU16(view, cursor + 8, 0);
    writeU16(view, cursor + 10, 0);
    writeU16(view, cursor + 12, 0);
    writeU32(view, cursor + 14, record.crc);
    writeU32(view, cursor + 18, record.contentLength);
    writeU32(view, cursor + 22, record.contentLength);
    writeU16(view, cursor + 26, record.nameBytes.byteLength);
    writeU16(view, cursor + 28, 0);
    cursor += 30;
    output.set(record.nameBytes, cursor);
    cursor += record.nameBytes.byteLength;
    output.set(record.content, cursor);
    cursor += record.contentLength;
  }

  const centralStart = cursor;
  for (const record of records) {
    writeU32(view, cursor, 0x02014b50);
    writeU16(view, cursor + 4, 20);
    writeU16(view, cursor + 6, 20);
    writeU16(view, cursor + 8, 0x0800);
    writeU16(view, cursor + 10, 0);
    writeU16(view, cursor + 12, 0);
    writeU16(view, cursor + 14, 0);
    writeU32(view, cursor + 16, record.crc);
    writeU32(view, cursor + 20, record.contentLength);
    writeU32(view, cursor + 24, record.contentLength);
    writeU16(view, cursor + 28, record.nameBytes.byteLength);
    writeU16(view, cursor + 30, 0);
    writeU16(view, cursor + 32, 0);
    writeU16(view, cursor + 34, 0);
    writeU16(view, cursor + 36, 0);
    writeU32(view, cursor + 38, 0);
    writeU32(view, cursor + 42, record.localOffset);
    cursor += 46;
    output.set(record.nameBytes, cursor);
    cursor += record.nameBytes.byteLength;
  }

  writeU32(view, cursor, 0x06054b50);
  writeU16(view, cursor + 4, 0);
  writeU16(view, cursor + 6, 0);
  writeU16(view, cursor + 8, records.length);
  writeU16(view, cursor + 10, records.length);
  writeU32(view, cursor + 12, cursor - centralStart);
  writeU32(view, cursor + 16, centralStart);
  writeU16(view, cursor + 20, 0);

  return output;
}
