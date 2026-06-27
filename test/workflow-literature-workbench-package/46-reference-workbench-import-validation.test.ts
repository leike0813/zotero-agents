import { assert } from "chai";
import {
  normalizeImportedCitationPayload,
  normalizeImportedReferencesPayload,
  validateImportedCitationPayload,
  validateImportedReferencesPayload,
} from "../../workflows_builtin/literature-workbench-package/lib/importSchemas.mjs";

function buildRawReferencesSchemaPayload() {
  return {
    items: buildNativeReferencesArrayPayload(),
  };
}

function buildNativeReferencesArrayPayload() {
  return [
    {
      author: ["Alice Zhang"],
      title: "Structured Reference",
      year: 2024,
      raw: "Alice Zhang. Structured Reference. 2024.",
      confidence: 0.92,
    },
  ];
}

function buildWrappedReferencesPayload() {
  return {
    version: 1,
    entry: "artifacts/references.json",
    format: "json",
    references: buildNativeReferencesArrayPayload(),
  };
}

function buildCitationSchemaPayload() {
  return {
    meta: {
      language: "en",
      scope: {
        section_title: "Results",
        line_start: 1,
        line_end: 8,
      },
    },
    items: [],
    unmapped_mentions: [],
    summary: "Summary text",
    timeline: {
      early: {},
      mid: {},
      recent: {},
    },
    report_md: "# Citation Analysis",
  };
}

function buildWrappedCitationPayload() {
  return {
    citation_analysis: {
      ...buildCitationSchemaPayload(),
    },
  };
}

describe("literature-workbench import schema validation", function () {
  it("accepts native references artifact arrays and normalizes them for note writing", function () {
    const raw = validateImportedReferencesPayload(
      buildNativeReferencesArrayPayload(),
    );
    assert.deepEqual(raw.errors, []);

    const normalizedRaw = normalizeImportedReferencesPayload(
      buildNativeReferencesArrayPayload(),
    );
    assert.equal(Array.isArray(normalizedRaw.references), true);
    assert.equal(normalizedRaw.references[0].title, "Structured Reference");
  });

  it("accepts schema-style native references artifact objects with top-level items", function () {
    const raw = validateImportedReferencesPayload(
      buildRawReferencesSchemaPayload(),
    );
    assert.deepEqual(raw.errors, []);

    const normalizedRaw = normalizeImportedReferencesPayload(
      buildRawReferencesSchemaPayload(),
    );
    assert.equal(Array.isArray(normalizedRaw.references), true);
    assert.equal(normalizedRaw.references[0].title, "Structured Reference");
  });

  it("rejects wrapper-shaped references payloads", function () {
    const wrapped = validateImportedReferencesPayload(
      buildWrappedReferencesPayload(),
    );
    assert.isAbove(wrapped.errors.length, 0);
  });

  it("rejects invalid references payloads that do not satisfy the copied schema", function () {
    const result = validateImportedReferencesPayload({
      items: [
        {
          title: "Missing fields",
        },
      ],
    });
    assert.isAbove(result.errors.length, 0);
  });

  it("accepts only native citation artifacts and normalizes them for note writing", function () {
    const rawPayload = buildCitationSchemaPayload();

    assert.deepEqual(validateImportedCitationPayload(rawPayload).errors, []);
    assert.equal(
      normalizeImportedCitationPayload(rawPayload).citation_analysis.report_md,
      "# Citation Analysis",
    );
  });

  it("accepts empty citation summary from tolerant best-effort analysis", function () {
    const rawPayload = {
      ...buildCitationSchemaPayload(),
      summary: "",
    };

    assert.deepEqual(validateImportedCitationPayload(rawPayload).errors, []);
    assert.equal(
      normalizeImportedCitationPayload(rawPayload).citation_analysis.summary,
      "",
    );
  });

  it("rejects wrapper-shaped citation payloads", function () {
    const result = validateImportedCitationPayload(
      buildWrappedCitationPayload(),
    );
    assert.isAbove(result.errors.length, 0);
  });

  it("rejects invalid citation payloads that do not satisfy the copied schema", function () {
    const result = validateImportedCitationPayload({
      meta: {
        language: "en",
        scope: {
          section_title: "Results",
          line_start: 1,
          line_end: 8,
        },
      },
      items: [],
      unmapped_mentions: [],
      summary: "Summary text",
      timeline: {
        early: {},
        mid: {},
        recent: {},
      },
    });
    assert.isAbove(result.errors.length, 0);
  });
});
