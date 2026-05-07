import { assert } from "chai";
import {
  buildMarkdownBackedNoteContent,
  getNotePayloadDetail,
  listNotePayloadBlocks,
  renderPayloadBlock,
} from "../../src/modules/notePayloadCodec";

describe("Zotero note payload codec", function () {
  it("round-trips custom markdown notes", function () {
    const markdown = "# Note\n\n- item\n\n```ts\nconst x = 1;\n```";
    const rendered = buildMarkdownBackedNoteContent({
      title: "Custom Note",
      markdown,
      noteKind: "custom",
    });

    assert.equal(rendered.payloadType, "custom-markdown");
    assert.include(rendered.content, 'data-zs-note-kind="custom"');
    assert.include(rendered.content, 'data-zs-payload="custom-markdown"');

    const detail = getNotePayloadDetail(rendered.content, {
      payloadType: "custom-markdown",
    });
    assert.equal(detail.format, "markdown");
    assert.equal(detail.markdown, markdown);
    assert.equal(detail.content, markdown);
    assert.isFalse(detail.hasMore);
  });

  it("decodes wrapped markdown payloads", function () {
    const html = [
      '<div data-zs-note-kind="digest">',
      "<h1>Digest</h1>",
      renderPayloadBlock({
        payloadType: "digest-markdown",
        payload: {
          version: 1,
          entry: "artifacts/digest.md",
          format: "markdown",
          content: "# Digest\n\nBody",
        },
      }),
      "</div>",
    ].join("\n");

    const payloads = listNotePayloadBlocks(html);
    assert.lengthOf(payloads, 1);
    assert.equal(payloads[0].noteKind, "digest");
    assert.equal(payloads[0].markdown, "# Digest\n\nBody");

    const detail = getNotePayloadDetail(html, {
      payloadType: "digest-markdown",
      maxChars: 8,
    });
    assert.equal(detail.content, "# Digest");
    assert.isTrue(detail.hasMore);
    assert.equal(detail.nextOffset, 8);
  });

  it("decodes workflow JSON payloads", function () {
    const html = [
      '<div data-zs-note-kind="references">',
      renderPayloadBlock({
        payloadType: "references-json",
        payload: {
          version: 1,
          format: "json",
          references: [{ title: "Paper", year: 2024 }],
        },
      }),
      "</div>",
    ].join("\n");

    const detail = getNotePayloadDetail(html, {
      payloadType: "references-json",
    });
    assert.equal(detail.format, "json");
    assert.deepEqual((detail.payload as any).references[0], {
      title: "Paper",
      year: 2024,
    });
    assert.include(detail.content, '"references"');
  });

  it("reports malformed payload errors", function () {
    const html =
      '<div><span data-zs-block="payload" data-zs-payload="custom-markdown" data-zs-encoding="base64" data-zs-value="@@bad@@"></span></div>';
    const payloads = listNotePayloadBlocks(html);
    assert.lengthOf(payloads, 1);
    assert.isArray(payloads[0].errors);
    assert.throws(
      () => getNotePayloadDetail(html, { payloadType: "custom-markdown" }),
      /payload|base64|Invalid/i,
    );
  });
});
