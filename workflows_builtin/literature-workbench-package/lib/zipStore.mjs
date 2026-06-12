function encodeUtf8(text) {
  return new TextEncoder().encode(String(text || ""));
}

export function asUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }
  if (typeof value === "string") {
    return encodeUtf8(value);
  }
  return new Uint8Array(0);
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

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(output, value) {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(output, value) {
  output.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function appendBytes(output, bytes) {
  for (const byte of bytes) {
    output.push(byte);
  }
}

function normalizeEntryName(name) {
  return String(name || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

export function createStoreZipBytes(entries) {
  const output = [];
  const central = [];
  const records = [];

  for (const entry of entries || []) {
    const name = normalizeEntryName(entry?.name);
    if (!name) {
      continue;
    }
    const nameBytes = encodeUtf8(name);
    const content = asUint8Array(entry?.bytes ?? entry?.text ?? "");
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
  appendBytes(output, central);

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
