export type ZipFileEntry = {
  name: string;
  data: Uint8Array;
};

export type MultipartZipPart = {
  fieldName: string;
  filename: string;
  zipBytes: Uint8Array;
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const idx = (crc ^ bytes[i]) & 0xff;
    crc = (CRC32_TABLE[idx] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(value: number, target: number[]) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32LE(value: number, target: number[]) {
  target.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

export function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, entry) => sum + entry.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function utf8Bytes(input: string) {
  return new TextEncoder().encode(input);
}

function sanitizeZipEntryName(name: string) {
  const normalized = String(name || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    /^[A-Za-z]:\//.test(normalized) ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid zip entry name: ${name}`);
  }
  return segments.join("/");
}

export function createZipFromNamedFiles(entries: ZipFileEntry[]) {
  const ZIP_UTF8_FILENAME_FLAG = 0x0800;
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const safeName = sanitizeZipEntryName(entry.name);
    const nameBytes = utf8Bytes(safeName);
    const crc = crc32(entry.data);
    const localHeader: number[] = [];
    writeUint32LE(0x04034b50, localHeader);
    writeUint16LE(20, localHeader);
    writeUint16LE(ZIP_UTF8_FILENAME_FLAG, localHeader);
    writeUint16LE(0, localHeader);
    writeUint16LE(0, localHeader);
    writeUint16LE(0, localHeader);
    writeUint32LE(crc, localHeader);
    writeUint32LE(entry.data.length, localHeader);
    writeUint32LE(entry.data.length, localHeader);
    writeUint16LE(nameBytes.length, localHeader);
    writeUint16LE(0, localHeader);

    const localBlock = concatBytes([
      new Uint8Array(localHeader),
      nameBytes,
      entry.data,
    ]);
    localChunks.push(localBlock);

    const centralHeader: number[] = [];
    writeUint32LE(0x02014b50, centralHeader);
    writeUint16LE(20, centralHeader);
    writeUint16LE(20, centralHeader);
    writeUint16LE(ZIP_UTF8_FILENAME_FLAG, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint32LE(crc, centralHeader);
    writeUint32LE(entry.data.length, centralHeader);
    writeUint32LE(entry.data.length, centralHeader);
    writeUint16LE(nameBytes.length, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint16LE(0, centralHeader);
    writeUint32LE(0, centralHeader);
    writeUint32LE(offset, centralHeader);

    centralChunks.push(concatBytes([new Uint8Array(centralHeader), nameBytes]));
    offset += localBlock.length;
  }

  const centralStart = offset;
  const central = concatBytes(centralChunks);
  const endHeader: number[] = [];
  writeUint32LE(0x06054b50, endHeader);
  writeUint16LE(0, endHeader);
  writeUint16LE(0, endHeader);
  writeUint16LE(entries.length, endHeader);
  writeUint16LE(entries.length, endHeader);
  writeUint32LE(central.length, endHeader);
  writeUint32LE(centralStart, endHeader);
  writeUint16LE(0, endHeader);

  return concatBytes([...localChunks, central, new Uint8Array(endHeader)]);
}

export function createMultipartZipPayload(parts: MultipartZipPart[]) {
  if (parts.length === 0) {
    throw new Error("multipart zip payload requires at least one part");
  }
  const boundary = `----zotero-skills-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const chunks: Uint8Array[] = [];
  for (const part of parts) {
    chunks.push(
      utf8Bytes(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${part.fieldName}"; filename="${part.filename}"\r\n` +
          `Content-Type: application/zip\r\n\r\n`,
      ),
      part.zipBytes,
      utf8Bytes("\r\n"),
    );
  }
  chunks.push(utf8Bytes(`--${boundary}--\r\n`));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: concatBytes(chunks),
  };
}
