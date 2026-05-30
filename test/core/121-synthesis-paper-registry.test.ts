import { assert } from "chai";
import { renderPayloadBlock } from "../../src/modules/notePayloadCodec";
import {
  buildPaperRegistryRow,
  buildSynthesisLayerDbPath,
} from "../../src/modules/synthesis/registry";

function note(args: {
  key: string;
  payloadType: string;
  payload: unknown;
  payloadFormat?: "json" | "text";
  visible?: string;
}) {
  return {
    key: args.key,
    title: args.key,
    updatedAt: "2026-05-10T12:00:00.000Z",
    html: [
      `<div><h1>${args.visible || args.key}</h1>`,
      renderPayloadBlock({
        payloadType: args.payloadType,
        payload: args.payload,
        payloadFormat: args.payloadFormat,
      }),
      "</div>",
    ].join("\n"),
  };
}

describe("Synthesis Paper Registry", function () {
  it("builds registry rows from paper DTOs and derived artifact payloads", function () {
    const row = buildPaperRegistryRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      year: "2024",
      itemType: "journalArticle",
      tags: ["topic:test"],
      collections: ["COLL1"],
      notes: [
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest\n\nBody",
          payloadFormat: "text",
        }),
        note({
          key: "R1",
          payloadType: "references-json",
          payload: { references: [{ title: "Ref" }] },
        }),
        note({
          key: "C1",
          payloadType: "citation-analysis-json",
          payload: { citations: [{ role: "background" }] },
        }),
      ],
    });

    assert.equal(row.paper_ref, "1:ABCD1234");
    assert.equal(row.readiness, "ready");
    assert.equal(row.coverage, "complete");
    assert.equal(row.artifacts.digest.status, "available");
    assert.equal(row.artifacts.references.status, "available");
    assert.equal(row.artifacts.citation_analysis.status, "available");
    assert.match(row.artifacts.digest.hash || "", /^sha256:[a-f0-9]{64}$/);
    assert.deepEqual(row.tags, ["topic:test"]);
    assert.deepEqual(row.collections, ["COLL1"]);
  });

  it("hashes decoded payload content and ignores visible note HTML", function () {
    const first = buildPaperRegistryRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest\n\nBody",
          payloadFormat: "text",
          visible: "Visible A",
        }),
      ],
    });
    const second = buildPaperRegistryRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest\n\nBody",
          payloadFormat: "text",
          visible: "Visible B",
        }),
      ],
    });

    assert.equal(first.artifacts.digest.hash, second.artifacts.digest.hash);
  });

  it("records duplicate payload diagnostics while selecting deterministic candidates", function () {
    const row = buildPaperRegistryRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [
        note({
          key: "D2",
          payloadType: "digest-markdown",
          payload: "# Digest 2",
          payloadFormat: "text",
        }),
        note({
          key: "D1",
          payloadType: "digest-markdown",
          payload: "# Digest 1",
          payloadFormat: "text",
        }),
      ],
    });

    assert.equal(row.artifacts.digest.note_key, "D1");
    assert.includeDeepMembers(row.diagnostics, [
      {
        code: "duplicate_payload_candidates",
        artifact_type: "digest",
        message: "2 valid candidates found for digest",
      },
    ]);
  });

  it("marks rows partial when required artifacts are missing", function () {
    const row = buildPaperRegistryRow({
      libraryId: 1,
      itemKey: "ABCD1234",
      title: "Paper",
      notes: [],
    });

    assert.equal(row.readiness, "partial");
    assert.equal(row.coverage, "missing");
    assert.deepEqual(
      row.diagnostics.map((entry) => entry.code),
      ["payload_missing", "payload_missing", "payload_missing"],
    );
  });

  it("plans a dedicated local SQLite database path", function () {
    assert.match(
      buildSynthesisLayerDbPath("C:/runtime").replace(/\\/g, "/"),
      /C:\/runtime\/state\/zotero-agents\.db$/,
    );
  });
});
