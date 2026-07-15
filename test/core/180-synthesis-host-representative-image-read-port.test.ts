import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX,
  SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_DIAGNOSTICS_MAX,
  SynthesisClientError,
  rebuildSynthesisHostRepresentativeImageReadRequest,
  rebuildSynthesisHostRepresentativeImageReadResult,
  type SynthesisHostRepresentativeImageReadResult,
} from "../../packages/synthesis-contracts/src/index";
import { createZoteroSynthesisRepresentativeImageReadPort } from "../../src/modules/synthesis/representativeImageReadAdapter";

const LIBRARY_ID = 1;
const NOTE_KEY = "DIGEST01";
const ATTACHMENT_KEY = "IMAGE001";

function availableResult(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    status: "available",
    attachmentKey: ATTACHMENT_KEY,
    mimeType: "image/jpeg",
    contentBase64: "/9j/2Q==",
    alt: "Figure 2",
    caption: "Figure 2 caption",
    width: 320,
    height: 180,
    compressedBytes: 4,
    sourceKind: "markdown_image_ref",
    strategy: "markdown_src_hint",
    diagnostics: [],
    ...overrides,
  };
}

function representativeImageHtml(attachmentKey = ATTACHMENT_KEY) {
  return [
    '<div data-zs-block="representative-image"',
    ' data-zs-representative_image_width="320"',
    ' data-zs-representative_image_height="180"',
    ' data-zs-representative_image_compressed_bytes="999"',
    ' data-zs-representative_image_source_kind="markdown_image_ref"',
    ' data-zs-representative_image_strategy="markdown_src_hint">',
    `<figure><img data-attachment-key="${attachmentKey}" alt="Figure 2" />`,
    "<figcaption>Figure 2 caption</figcaption></figure>",
    "</div>",
  ].join("");
}

function note(noteHtml = representativeImageHtml()) {
  return {
    id: 501,
    key: NOTE_KEY,
    getNote: () => noteHtml,
  };
}

function attachment(filePath: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 502,
    key: ATTACHMENT_KEY,
    parentItemID: 501,
    isAttachment: () => true,
    getField: (field: string) => (field === "contentType" ? "image/jpeg" : ""),
    getFilePathAsync: async () => filePath,
    ...overrides,
  };
}

async function withZoteroLookup<T>(
  resolve: (libraryId: number, itemKey: string) => unknown,
  run: () => Promise<T>,
) {
  const previous = Zotero.Items.getByLibraryAndKey;
  (Zotero.Items as any).getByLibraryAndKey = resolve;
  try {
    return await run();
  } finally {
    (Zotero.Items as any).getByLibraryAndKey = previous;
  }
}

function assertInvalid(run: () => unknown) {
  let failure: unknown;
  try {
    run();
  } catch (error) {
    failure = error;
  }
  assert.instanceOf(failure, SynthesisClientError);
  assert.equal((failure as SynthesisClientError).code, "invalid_request");
}

describe("Synthesis Host representative image read port", function () {
  it("canonically rebuilds requests and all result variants", function () {
    assert.deepEqual(
      rebuildSynthesisHostRepresentativeImageReadRequest({
        libraryId: LIBRARY_ID,
        noteKey: NOTE_KEY,
        ignored: { safe: true },
      }),
      { libraryId: LIBRARY_ID, noteKey: NOTE_KEY },
    );

    assert.deepEqual(
      rebuildSynthesisHostRepresentativeImageReadResult({
        ...availableResult(),
        ignored: "discarded",
      }),
      availableResult(),
    );
    assert.deepEqual(
      rebuildSynthesisHostRepresentativeImageReadResult({
        status: "unavailable",
        attachmentKey: ATTACHMENT_KEY,
        alt: "Figure 2",
        caption: "Figure 2 caption",
        sourceKind: "markdown_image_ref",
        strategy: "markdown_src_hint",
        diagnostics: ["representative_image_attachment_not_found"],
        ignored: ["discarded"],
      }),
      {
        status: "unavailable",
        attachmentKey: ATTACHMENT_KEY,
        alt: "Figure 2",
        caption: "Figure 2 caption",
        sourceKind: "markdown_image_ref",
        strategy: "markdown_src_hint",
        diagnostics: ["representative_image_attachment_not_found"],
      },
    );
    assert.deepEqual(
      rebuildSynthesisHostRepresentativeImageReadResult({
        status: "absent",
        diagnostics: [],
        ignored: true,
      }),
      { status: "absent", diagnostics: [] },
    );
  });

  it("rejects non-JSON and invalid request/result values", function () {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const invalidRequests = [
      null,
      { libraryId: 0, noteKey: NOTE_KEY },
      { libraryId: 1.5, noteKey: NOTE_KEY },
      { libraryId: LIBRARY_ID, noteKey: "" },
      { libraryId: LIBRARY_ID, noteKey: "bad key" },
      { libraryId: LIBRARY_ID, noteKey: "x".repeat(129) },
      { libraryId: LIBRARY_ID, noteKey: NOTE_KEY, callback: () => undefined },
      cyclic,
    ];
    for (const request of invalidRequests) {
      assertInvalid(() =>
        rebuildSynthesisHostRepresentativeImageReadRequest(request),
      );
    }

    const invalidResults = [
      null,
      { status: "unknown", diagnostics: [] },
      { status: "absent", diagnostics: [], callback: () => undefined },
      availableResult({ attachmentKey: "bad key" }),
      availableResult({ mimeType: "text/html" }),
      availableResult({ contentBase64: "not-base64" }),
      availableResult({ compressedBytes: 3 }),
      availableResult({ width: 0 }),
      availableResult({ height: 1.5 }),
      availableResult({ diagnostics: [""] }),
      {
        status: "unavailable",
        diagnostics: [],
      },
    ];
    for (const result of invalidResults) {
      assertInvalid(() =>
        rebuildSynthesisHostRepresentativeImageReadResult(result),
      );
    }
  });

  it("enforces decoded-byte and diagnostic bounds", function () {
    const encodedLength =
      Math.ceil(SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX / 3) * 4;
    const atLimit = `${"A".repeat(encodedLength - 1)}=`;
    assert.equal(
      rebuildSynthesisHostRepresentativeImageReadResult(
        availableResult({
          contentBase64: atLimit,
          compressedBytes:
            SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX,
          diagnostics: Array.from(
            {
              length: SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_DIAGNOSTICS_MAX,
            },
            (_, index) => `diagnostic_${index}`,
          ),
        }),
      ).status,
      "available",
    );
    assertInvalid(() =>
      rebuildSynthesisHostRepresentativeImageReadResult(
        availableResult({
          contentBase64: `${atLimit}AAAA`,
          compressedBytes:
            SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX + 3,
        }),
      ),
    );
    assertInvalid(() =>
      rebuildSynthesisHostRepresentativeImageReadResult({
        status: "unavailable",
        diagnostics: Array.from(
          {
            length: SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_DIAGNOSTICS_MAX + 1,
          },
          (_, index) => `diagnostic_${index}`,
        ),
      }),
    );
  });

  it("rejects invalid requests before touching Zotero", async function () {
    const port = createZoteroSynthesisRepresentativeImageReadPort();
    let lookups = 0;
    await withZoteroLookup(
      () => {
        lookups += 1;
        return null;
      },
      async () => {
        for (const request of [
          { libraryId: 0, noteKey: NOTE_KEY },
          { libraryId: LIBRARY_ID, noteKey: "bad key" },
          {
            libraryId: LIBRARY_ID,
            noteKey: NOTE_KEY,
            callback: () => undefined,
          },
        ]) {
          let failure: unknown;
          try {
            await port.read(request as any);
          } catch (error) {
            failure = error;
          }
          assert.instanceOf(failure, SynthesisClientError);
          assert.equal(
            (failure as SynthesisClientError).code,
            "invalid_request",
          );
        }
      },
    );
    assert.equal(lookups, 0);
  });

  it("returns available JSON-safe bytes and ignores untrusted marker size", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-rep-image-"));
    const imagePath = path.join(root, "representative.jpg");
    await fs.writeFile(imagePath, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]));
    const noteItem = note();
    const attachmentItem = attachment(imagePath);
    const port = createZoteroSynthesisRepresentativeImageReadPort();

    const result = await withZoteroLookup(
      (_libraryId, itemKey) =>
        itemKey === NOTE_KEY
          ? noteItem
          : itemKey === ATTACHMENT_KEY
            ? attachmentItem
            : null,
      () => port.read({ libraryId: LIBRARY_ID, noteKey: NOTE_KEY }),
    );

    assert.deepEqual(result, availableResult());
    assert.doesNotThrow(() => JSON.stringify(result));
    assert.notProperty(result, "path");
    assert.notProperty(result, "noteHtml");
  });

  it("distinguishes a missing marker from stable unavailable outcomes", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-rep-image-"));
    const validPath = path.join(root, "valid.jpg");
    const emptyPath = path.join(root, "empty.jpg");
    const oversizedPath = path.join(root, "oversized.jpg");
    await fs.writeFile(validPath, new Uint8Array([1, 2, 3, 4]));
    await fs.writeFile(emptyPath, new Uint8Array());
    await fs.writeFile(
      oversizedPath,
      new Uint8Array(SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX + 1),
    );
    const port = createZoteroSynthesisRepresentativeImageReadPort();

    const absent = await withZoteroLookup(
      (_libraryId, itemKey) =>
        itemKey === NOTE_KEY ? note("<p>Digest without an image</p>") : null,
      () => port.read({ libraryId: LIBRARY_ID, noteKey: NOTE_KEY }),
    );
    assert.deepEqual(absent, { status: "absent", diagnostics: [] });

    const cases: Array<{
      expected: string;
      noteItem?: unknown;
      attachmentItem?: unknown;
    }> = [
      { expected: "digest_note_not_found" },
      {
        expected: "representative_image_attachment_key_missing",
        noteItem: note(representativeImageHtml("")),
      },
      {
        expected: "representative_image_attachment_not_found",
        noteItem: note(),
      },
      {
        expected: "representative_image_attachment_not_attachment",
        noteItem: note(),
        attachmentItem: attachment(validPath, {
          isAttachment: () => false,
        }),
      },
      {
        expected: "representative_image_attachment_parent_mismatch",
        noteItem: note(),
        attachmentItem: attachment(validPath, { parentItemID: 999 }),
      },
      {
        expected: "representative_image_attachment_not_image",
        noteItem: note(),
        attachmentItem: attachment(validPath, {
          getField: () => "text/html",
        }),
      },
      {
        expected: "representative_image_attachment_path_missing",
        noteItem: note(),
        attachmentItem: attachment(path.join(root, "missing.jpg")),
      },
      {
        expected: "representative_image_attachment_empty",
        noteItem: note(),
        attachmentItem: attachment(emptyPath),
      },
      {
        expected: "representative_image_attachment_oversize",
        noteItem: note(),
        attachmentItem: attachment(oversizedPath),
      },
    ];

    for (const testCase of cases) {
      const result = await withZoteroLookup(
        (_libraryId, itemKey) =>
          itemKey === NOTE_KEY
            ? testCase.noteItem || null
            : itemKey === ATTACHMENT_KEY
              ? testCase.attachmentItem || null
              : null,
        () => port.read({ libraryId: LIBRARY_ID, noteKey: NOTE_KEY }),
      );
      assert.equal(result.status, "unavailable");
      assert.deepEqual(result.diagnostics, [testCase.expected]);
      assert.notMatch(JSON.stringify(result), new RegExp(root));
    }
  });

  it("maps read failures to a stable diagnostic without leaking errors", async function () {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-rep-image-"));
    const secretPath = path.join(root, "secret.jpg");
    const runtime = globalThis as any;
    const previousDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "IOUtils",
    );
    runtime.IOUtils = {
      stat: async () => ({ type: "file", size: 4 }),
      read: async () => {
        throw new Error(`do not leak ${secretPath}`);
      },
    };
    try {
      const result = await withZoteroLookup(
        (_libraryId, itemKey) =>
          itemKey === NOTE_KEY
            ? note()
            : itemKey === ATTACHMENT_KEY
              ? attachment(secretPath)
              : null,
        () =>
          createZoteroSynthesisRepresentativeImageReadPort().read({
            libraryId: LIBRARY_ID,
            noteKey: NOTE_KEY,
          }),
      );
      assert.deepEqual(result.diagnostics, [
        "representative_image_read_failed",
      ]);
      assert.notInclude(JSON.stringify(result), root);
      assert.notInclude(JSON.stringify(result), "do not leak");
    } finally {
      if (previousDescriptor) {
        Object.defineProperty(globalThis, "IOUtils", previousDescriptor);
      } else {
        delete runtime.IOUtils;
      }
    }
  });
});
