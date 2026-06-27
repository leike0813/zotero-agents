import { joinPath } from "./path.mjs";
import { validateWithJsonSchemaLite } from "./jsonSchemaLite.mjs";

export const REFERENCES_SCHEMA_ASSET_RELATIVE_PATH =
  "assets/references.schema.json";
export const CITATION_SCHEMA_ASSET_RELATIVE_PATH =
  "assets/citation_analysis.schema.json";

export const REFERENCES_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          author: {
            type: "array",
            items: {
              type: "string",
            },
          },
          title: {
            type: "string",
          },
          year: {
            type: ["integer", "null"],
          },
          raw: {
            type: "string",
          },
          confidence: {
            type: "number",
          },
        },
        required: ["author", "title", "year", "raw", "confidence"],
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

export const CITATION_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    citation_analysis: {
      type: "object",
      properties: {
        meta: {
          type: "object",
          properties: {
            language: {
              type: "string",
            },
            scope: {
              type: "object",
              properties: {
                section_title: {
                  type: "string",
                },
                line_start: {
                  type: "integer",
                },
                line_end: {
                  type: "integer",
                },
              },
              required: ["section_title", "line_start", "line_end"],
            },
            scope_source: {
              type: "string",
            },
            scope_decision: {
              type: "object",
              properties: {
                selection_reason: {
                  type: "string",
                },
                covered_sections: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                fallback_from: {
                  type: ["object", "null"],
                },
                fallback_reason: {
                  type: "string",
                },
              },
              required: [
                "selection_reason",
                "covered_sections",
                "fallback_from",
                "fallback_reason",
              ],
            },
            mapping_reliability: {
              type: "string",
            },
          },
          required: ["language", "scope"],
        },
        items: {
          type: "array",
        },
        unmapped_mentions: {
          type: "array",
        },
        summary: {
          type: "string",
        },
        timeline: {
          type: "object",
          properties: {
            early: {
              type: "object",
            },
            mid: {
              type: "object",
            },
            recent: {
              type: "object",
            },
          },
          required: ["early", "mid", "recent"],
        },
        report_md: {
          type: "string",
        },
      },
      required: [
        "meta",
        "summary",
        "timeline",
        "items",
        "unmapped_mentions",
        "report_md",
      ],
    },
  },
  required: ["citation_analysis"],
  additionalProperties: false,
};

function isObjectLike(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value || null));
}

function resolveCitationArtifactSchema(schema) {
  if (!isObjectLike(schema)) {
    return schema;
  }
  const candidate = schema?.properties?.citation_analysis;
  if (isObjectLike(candidate)) {
    return candidate;
  }
  return schema;
}

function normalizeReferencesForSchema(value) {
  if (Array.isArray(value)) {
    return {
      items: value,
    };
  }
  return value;
}

function normalizeCitationForSchema(value) {
  return value;
}

export function validateImportedReferencesPayload(value, schema = REFERENCES_SCHEMA) {
  return validateWithJsonSchemaLite(normalizeReferencesForSchema(value), schema);
}

export function validateImportedCitationPayload(
  value,
  schema = CITATION_ANALYSIS_SCHEMA,
) {
  return validateWithJsonSchemaLite(
    normalizeCitationForSchema(value),
    resolveCitationArtifactSchema(schema),
  );
}

export function normalizeImportedReferencesPayload(value) {
  if (Array.isArray(value)) {
    return {
      version: 1,
      entry: "",
      format: "json",
      references: cloneSerializable(value),
    };
  }
  if (!isObjectLike(value) || !Array.isArray(value.items)) {
    throw new Error(
      "references import payload must be native artifact JSON array or object with top-level items",
    );
  }
  return {
    version: 1,
    entry: "",
    format: "json",
    references: cloneSerializable(value.items),
  };
}

export function normalizeImportedCitationPayload(value) {
  if (!isObjectLike(value)) {
    throw new Error("citation analysis import payload must be native artifact JSON");
  }
  if (isObjectLike(value.citation_analysis)) {
    throw new Error(
      "citation analysis import payload must be native artifact JSON, not wrapper",
    );
  }
  return {
    version: 1,
    entry: "",
    format: "json",
    citation_analysis: cloneSerializable(value),
  };
}

export async function loadImportSchemas(runtime) {
  const workflowRootDir = String(runtime?.workflowRootDir || "").trim();
  const readText = runtime?.hostApi?.file?.readText;
  if (!workflowRootDir || typeof readText !== "function") {
    return {
      referencesSchema: REFERENCES_SCHEMA,
      citationSchema: CITATION_ANALYSIS_SCHEMA,
    };
  }
  try {
    const [referencesText, citationText] = await Promise.all([
      readText(joinPath(workflowRootDir, REFERENCES_SCHEMA_ASSET_RELATIVE_PATH)),
      readText(joinPath(workflowRootDir, CITATION_SCHEMA_ASSET_RELATIVE_PATH)),
    ]);
    return {
      referencesSchema: JSON.parse(referencesText),
      citationSchema: JSON.parse(citationText),
    };
  } catch {
    return {
      referencesSchema: REFERENCES_SCHEMA,
      citationSchema: CITATION_ANALYSIS_SCHEMA,
    };
  }
}
