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

function writeU16(output: number[], value: number) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(output: number[], value: number) {
  output.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function appendBytes(output: number[], bytes: Uint8Array) {
  for (const byte of bytes) {
    output.push(byte);
  }
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
  const output: number[] = [];
  const central: number[] = [];
  const records: Array<{
    nameBytes: Uint8Array;
    contentLength: number;
    crc: number;
    localOffset: number;
  }> = [];

  for (const entry of entries || []) {
    const name = normalizeEntryName(entry?.name);
    if (!name) {
      continue;
    }
    const nameBytes = encodeUtf8(name);
    const content = asUint8Array(entry.bytes ?? entry.text ?? "");
    const crc = crc32(content);
    const localOffset = output.length;

    writeU32(output, 0x04034b50);
    writeU16(output, 20);
    writeU16(output, 0x0800);
    writeU16(output, 0);
    writeU16(output, 0);
    writeU16(output, 0);
    writeU32(output, crc);
    writeU32(output, content.length);
    writeU32(output, content.length);
    writeU16(output, nameBytes.length);
    writeU16(output, 0);
    appendBytes(output, nameBytes);
    appendBytes(output, content);

    records.push({
      nameBytes,
      contentLength: content.length,
      crc,
      localOffset,
    });
  }

  const centralStart = output.length;
  for (const record of records) {
    writeU32(central, 0x02014b50);
    writeU16(central, 20);
    writeU16(central, 20);
    writeU16(central, 0x0800);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, record.crc);
    writeU32(central, record.contentLength);
    writeU32(central, record.contentLength);
    writeU16(central, record.nameBytes.length);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU16(central, 0);
    writeU32(central, 0);
    writeU32(central, record.localOffset);
    appendBytes(central, record.nameBytes);
  }
  appendBytes(output, new Uint8Array(central));

  writeU32(output, 0x06054b50);
  writeU16(output, 0);
  writeU16(output, 0);
  writeU16(output, records.length);
  writeU16(output, records.length);
  writeU32(output, central.length);
  writeU32(output, centralStart);
  writeU16(output, 0);

  return new Uint8Array(output);
}
