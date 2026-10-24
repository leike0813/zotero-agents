import { assert } from "chai";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { crc32 } from "node:zlib";
import {
  createStoreZipBytes,
  type StoreZipEntry,
} from "../../src/modules/zipStore";

function decodeStoreZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocdOffset = zip.byteLength - 22;
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralLength = view.getUint32(eocdOffset + 12, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  assert.equal(view.getUint16(eocdOffset + 8, true), entryCount);
  assert.equal(centralOffset + centralLength, eocdOffset);

  const decoder = new TextDecoder();
  const entries: Array<{
    name: string;
    content: Uint8Array;
    crc: number;
    flags: number;
  }> = [];
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50);
    const flags = view.getUint16(cursor + 8, true);
    const crc = view.getUint32(cursor + 16, true);
    const contentLength = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46;
    const name = decoder.decode(
      zip.subarray(nameStart, nameStart + nameLength),
    );

    assert.equal(view.getUint32(localOffset, true), 0x04034b50);
    assert.equal(view.getUint16(localOffset + 6, true), flags);
    assert.equal(view.getUint32(localOffset + 14, true), crc);
    assert.equal(view.getUint32(localOffset + 18, true), contentLength);
    assert.equal(view.getUint32(localOffset + 22, true), contentLength);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    assert.equal(localNameLength, nameLength);
    const contentStart = localOffset + 30 + localNameLength + localExtraLength;
    const content = zip.subarray(contentStart, contentStart + contentLength);
    assert.equal(crc32(content), crc);
    entries.push({ name, content, crc, flags });
    cursor = nameStart + nameLength + extraLength + commentLength;
  }
  assert.equal(cursor, eocdOffset);
  return entries;
}

function oversizedBytes(byteLength: number) {
  const bytes = new Uint8Array();
  // Replace the view length so ZIP32 boundary checks never allocate GiBs.
  Object.defineProperty(bytes, "byteLength", { value: byteLength });
  return bytes;
}

function assertZip32Error(entries: StoreZipEntry[], label: RegExp) {
  let failure: unknown;
  try {
    createStoreZipBytes(entries);
  } catch (error) {
    failure = error;
  }
  assert.instanceOf(failure, RangeError);
  assert.match((failure as RangeError).message, label);
}

describe("store zip encoding", function () {
  it("preserves normalization and writes UTF-8 metadata with valid CRCs", function () {
    const zip = createStoreZipBytes([
      { name: "\\folder\\résumé.txt", text: "你好" },
      { name: "/nested//file.bin ", bytes: new Uint8Array([0, 1, 255]) },
      { name: "../escape.txt", text: "ignored" },
      {
        name: "view.bin",
        bytes: new DataView(new Uint8Array([7, 8, 9]).buffer, 1, 2),
      },
      { name: "buffer.bin", bytes: new Uint8Array([11, 12]).buffer },
      {
        name: "precedence.bin",
        bytes: new Uint8Array([13]),
        text: "ignored",
      },
    ]);

    const entries = decodeStoreZip(zip);
    assert.deepEqual(
      entries.map((entry) => entry.name),
      [
        "folder/résumé.txt",
        "nested/file.bin",
        "view.bin",
        "buffer.bin",
        "precedence.bin",
      ],
    );
    assert.deepEqual(
      entries.map((entry) => Array.from(entry.content)),
      [
        Array.from(new TextEncoder().encode("你好")),
        [0, 1, 255],
        [8, 9],
        [11, 12],
        [13],
      ],
    );
    assert.isTrue(entries.every((entry) => entry.flags === 0x0800));
    assert.lengthOf(
      decodeStoreZip(
        createStoreZipBytes([{ name: "../only-invalid", text: "ignored" }]),
      ),
      0,
    );
  });

  it("rejects every ZIP32 size field that cannot be represented", function () {
    assertZip32Error(
      Array.from({ length: 0x10000 }, (_, index) => ({ name: `${index}` })),
      /entry count/,
    );
    assertZip32Error([{ name: "a".repeat(0x10000) }], /file name length/);
    assertZip32Error(
      [{ name: "large.bin", bytes: oversizedBytes(0x100000000) }],
      /entry byte length/,
    );
    assertZip32Error(
      [{ name: "a", bytes: oversizedBytes(0xffffffff - 31) }, { name: "b" }],
      /local directory length/,
    );
    assertZip32Error(
      [{ name: "total.bin", bytes: oversizedBytes(0xffffffff - 99) }],
      /archive length/,
    );
  });

  it("writes a 32 MiB entry within a bounded node heap", function () {
    this.timeout(45000);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zip-store-"));
    const childPath = path.join(tempDir, "memory-check.mjs");
    fs.writeFileSync(
      childPath,
      `
import { crc32 } from "node:zlib";

const { createStoreZipBytes } = await import(process.env.ZIP_STORE_MODULE_URL);
const sourceLength = 32 * 1024 * 1024;
const source = new Uint8Array(sourceLength);
source[0] = 1;
source[sourceLength >>> 1] = 2;
source[sourceLength - 1] = 3;
const zip = createStoreZipBytes([{ name: "large/data.bin", bytes: source }]);
const nameLength = 14;
const contentOffset = 30 + nameLength;
const centralOffset = contentOffset + sourceLength;
const expectedLength = centralOffset + 46 + nameLength + 22;
if (zip.length !== expectedLength) {
  throw new Error(
    \`unexpected zip length: \${zip.length} != \${expectedLength}\`,
  );
}
const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
if (view.getUint32(0, true) !== 0x04034b50) {
  throw new Error("missing local file header");
}
if (view.getUint16(26, true) !== nameLength) {
  throw new Error("unexpected local name length");
}
if (
  zip[contentOffset] !== 1 ||
  zip[contentOffset + (sourceLength >>> 1)] !== 2 ||
  zip[contentOffset + sourceLength - 1] !== 3
) {
  throw new Error("entry content mismatch");
}
if (
  view.getUint32(14, true) !==
  crc32(zip.subarray(contentOffset, contentOffset + sourceLength))
) {
  throw new Error("entry CRC mismatch");
}
if (
  view.getUint32(centralOffset, true) !== 0x02014b50 ||
  view.getUint32(zip.length - 22, true) !== 0x06054b50
) {
  throw new Error("missing central directory");
}
process.stdout.write(
  JSON.stringify({ zipLength: zip.length, sourceLength }),
);
`,
      "utf8",
    );
    try {
      const result = spawnSync(
        process.execPath,
        ["--import", "tsx", "--max-old-space-size=192", childPath],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          timeout: 30000,
          maxBuffer: 1024 * 1024,
          env: {
            ...process.env,
            ZIP_STORE_MODULE_URL: pathToFileURL(
              path.join(process.cwd(), "src/modules/zipStore.ts"),
            ).href,
          },
        },
      );
      assert.equal(
        result.status,
        0,
        [result.error?.message, result.stderr].filter(Boolean).join("\n"),
      );
      assert.deepEqual(JSON.parse(result.stdout), {
        zipLength: 32 * 1024 * 1024 + 126,
        sourceLength: 32 * 1024 * 1024,
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
