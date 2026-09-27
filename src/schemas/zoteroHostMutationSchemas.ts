import type {
  MutationOperation,
  MutationPreviewOperation,
  MutationRequestByOperation,
  MutationResultByOperation,
} from "../workflows/types";

type JsonSchema = Record<string, unknown>;

const portableItemRef = {
  type: "object",
  properties: {
    libraryId: { type: "integer", minimum: 1 },
    key: { type: "string", minLength: 1 },
  },
  required: ["libraryId", "key"],
  additionalProperties: false,
} satisfies JsonSchema;

const portableCollectionRef = portableItemRef;
const stringArray = {
  type: "array",
  items: { type: "string", minLength: 1 },
} satisfies JsonSchema;
const itemRefArray = {
  type: "array",
  items: { $ref: "#/$defs/itemRef" },
} satisfies JsonSchema;
const collectionRefArray = {
  type: "array",
  items: { $ref: "#/$defs/collectionRef" },
} satisfies JsonSchema;
const creator = {
  type: "object",
  properties: {
    firstName: { type: "string" },
    lastName: { type: "string" },
    name: { type: "string" },
    creatorType: { type: "string" },
  },
  additionalProperties: false,
} satisfies JsonSchema;
const jsonValue = {
  anyOf: [
    { type: "null" },
    { type: "boolean" },
    { type: "number" },
    { type: "string" },
    { type: "array", items: { $ref: "#/$defs/jsonValue" } },
    { type: "object", additionalProperties: { $ref: "#/$defs/jsonValue" } },
  ],
} satisfies JsonSchema;

const attachmentContentManifest = {
  type: "object",
  properties: {
    schema: { const: "zotero-agents.attachment-content.v1" },
    identity: { type: "string", minLength: 1 },
    main: {
      type: "object",
      properties: {
        relativePath: { type: "string", minLength: 1 },
        sizeBytes: { type: "integer", minimum: 0 },
        sha256: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
      },
      required: ["relativePath", "sizeBytes", "sha256"],
      additionalProperties: false,
    },
    companions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          relativePath: { type: "string", minLength: 1 },
          sizeBytes: { type: "integer", minimum: 0 },
          sha256: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
        },
        required: ["relativePath", "sizeBytes", "sha256"],
        additionalProperties: false,
      },
    },
  },
  required: ["schema", "identity", "main", "companions"],
  additionalProperties: false,
} satisfies JsonSchema;

const storedAttachmentSource = {
  type: "object",
  properties: {
    kind: { const: "stored_file" },
    content: { $ref: "#/$defs/attachmentContentManifest" },
    targetFilename: { type: "string", minLength: 1 },
    companions: {
      type: "array",
      items: {
        type: "object",
        properties: { targetRelativePath: { type: "string", minLength: 1 } },
        required: ["targetRelativePath"],
        additionalProperties: false,
      },
    },
  },
  required: ["kind", "content"],
  additionalProperties: false,
} satisfies JsonSchema;

const attachmentSource = {
  oneOf: [
    { $ref: "#/$defs/storedAttachmentSource" },
    {
      type: "object",
      properties: {
        kind: { const: "linked_url" },
        url: { type: "string", minLength: 1 },
      },
      required: ["kind", "url"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "stored_url" },
        url: { type: "string", minLength: 1 },
      },
      required: ["kind", "url"],
      additionalProperties: false,
    },
  ],
} satisfies JsonSchema;

const noteContent = {
  type: "object",
  properties: {
    format: { enum: ["html", "text"] },
    value: { type: "string" },
    embeddedImages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slot: { type: "string", minLength: 1 },
          preparedImage: {
            type: "object",
            properties: {
              kind: { const: "prepared_note_image" },
              id: { type: "string", minLength: 1 },
            },
            required: ["kind", "id"],
            additionalProperties: false,
          },
          altText: { type: "string" },
        },
        required: ["slot", "preparedImage"],
        additionalProperties: false,
      },
    },
  },
  required: ["format", "value"],
  additionalProperties: false,
} satisfies JsonSchema;

const managedWriteTarget = {
  oneOf: [
    {
      type: "object",
      properties: {
        kind: { const: "create" },
        parentRef: { $ref: "#/$defs/itemRef" },
      },
      required: ["kind", "parentRef"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "update" },
        noteRef: { $ref: "#/$defs/itemRef" },
      },
      required: ["kind", "noteRef"],
      additionalProperties: false,
    },
  ],
} satisfies JsonSchema;

const managedWriteContent = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1 },
    markdown: { type: "string", minLength: 1 },
  },
  required: ["title", "markdown"],
  additionalProperties: false,
} satisfies JsonSchema;

const operationInputSchemas = {
  "item.create": {
    type: "object",
    properties: {
      operation: { const: "item.create" },
      libraryId: { type: "integer", minimum: 1 },
      itemType: { type: "string", minLength: 1 },
      fields: { type: "object", additionalProperties: { type: "string" } },
      creators: { type: "array", items: { $ref: "#/$defs/creator" } },
      initialTags: { $ref: "#/$defs/stringArray" },
      collectionRefs: { $ref: "#/$defs/collectionRefArray" },
      initialRelatedRefs: { $ref: "#/$defs/itemRefArray" },
    },
    required: ["operation", "itemType", "fields"],
  },
  "item.updateMetadata": {
    type: "object",
    properties: {
      operation: { const: "item.updateMetadata" },
      itemRef: { $ref: "#/$defs/itemRef" },
      patch: {
        type: "object",
        properties: {
          fields: {
            type: "object",
            additionalProperties: { type: ["string", "null"] },
          },
          creators: { type: "array", items: { $ref: "#/$defs/creator" } },
        },
        additionalProperties: false,
      },
    },
    required: ["operation", "itemRef", "patch"],
  },
  "item.changeType": {
    type: "object",
    properties: {
      operation: { const: "item.changeType" },
      itemRef: { $ref: "#/$defs/itemRef" },
      targetItemType: { type: "string", minLength: 1 },
      incompatibleData: { enum: ["reject", "move_to_extra", "drop"] },
    },
    required: ["operation", "itemRef", "targetItemType", "incompatibleData"],
  },
  "item.remove": {
    type: "object",
    properties: {
      operation: { const: "item.remove" },
      itemRef: { $ref: "#/$defs/itemRef" },
      disposition: { const: "permanent" },
      childPolicy: { enum: ["reject_if_present", "cascade"] },
    },
    required: ["operation", "itemRef", "disposition", "childPolicy"],
  },
  "item.updateTags": {
    type: "object",
    properties: {
      operation: { const: "item.updateTags" },
      itemRef: { $ref: "#/$defs/itemRef" },
      add: { $ref: "#/$defs/stringArray" },
      remove: { $ref: "#/$defs/stringArray" },
    },
    required: ["operation", "itemRef", "add", "remove"],
  },
  "item.addRelated": {
    type: "object",
    properties: {
      operation: { const: "item.addRelated" },
      sourceRef: { $ref: "#/$defs/itemRef" },
      relatedRefs: { $ref: "#/$defs/itemRefArray" },
    },
    required: ["operation", "sourceRef", "relatedRefs"],
  },
  "item.removeRelated": {
    type: "object",
    properties: {
      operation: { const: "item.removeRelated" },
      sourceRef: { $ref: "#/$defs/itemRef" },
      relatedRefs: { $ref: "#/$defs/itemRefArray" },
    },
    required: ["operation", "sourceRef", "relatedRefs"],
  },
  "collection.create": {
    type: "object",
    properties: {
      operation: { const: "collection.create" },
      name: { type: "string", minLength: 1 },
      placement: {
        oneOf: [
          {
            type: "object",
            properties: {
              kind: { const: "root" },
              libraryId: { type: "integer", minimum: 1 },
            },
            required: ["kind"],
            additionalProperties: false,
          },
          {
            type: "object",
            properties: {
              kind: { const: "child" },
              parentRef: { $ref: "#/$defs/collectionRef" },
            },
            required: ["kind", "parentRef"],
            additionalProperties: false,
          },
        ],
      },
      initialMemberRefs: { $ref: "#/$defs/itemRefArray" },
    },
    required: ["operation", "name", "placement"],
  },
  "collection.update": {
    type: "object",
    properties: {
      operation: { const: "collection.update" },
      collectionRef: { $ref: "#/$defs/collectionRef" },
      patch: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          parentRef: {
            anyOf: [{ $ref: "#/$defs/collectionRef" }, { type: "null" }],
          },
        },
        additionalProperties: false,
      },
    },
    required: ["operation", "collectionRef", "patch"],
  },
  "collection.updateMembership": {
    type: "object",
    properties: {
      operation: { const: "collection.updateMembership" },
      collectionRef: { $ref: "#/$defs/collectionRef" },
      add: { $ref: "#/$defs/itemRefArray" },
      remove: { $ref: "#/$defs/itemRefArray" },
    },
    required: ["operation", "collectionRef", "add", "remove"],
  },
  "collection.remove": {
    type: "object",
    properties: {
      operation: { const: "collection.remove" },
      collectionRef: { $ref: "#/$defs/collectionRef" },
      childPolicy: { enum: ["reject_if_present", "cascade"] },
    },
    required: ["operation", "collectionRef", "childPolicy"],
  },
  "notes.create": {
    type: "object",
    properties: {
      operation: { const: "notes.create" },
      placement: {
        oneOf: [
          {
            type: "object",
            properties: {
              kind: { const: "top_level" },
              libraryId: { type: "integer", minimum: 1 },
              collectionRefs: { $ref: "#/$defs/collectionRefArray" },
            },
            required: ["kind"],
            additionalProperties: false,
          },
          {
            type: "object",
            properties: {
              kind: { const: "child" },
              parentRef: { $ref: "#/$defs/itemRef" },
            },
            required: ["kind", "parentRef"],
            additionalProperties: false,
          },
        ],
      },
      content: { $ref: "#/$defs/noteContent" },
      initialTags: { $ref: "#/$defs/stringArray" },
    },
    required: ["operation", "placement", "content"],
  },
  "notes.updateContent": {
    type: "object",
    properties: {
      operation: { const: "notes.updateContent" },
      noteRef: { $ref: "#/$defs/itemRef" },
      content: { $ref: "#/$defs/noteContent" },
    },
    required: ["operation", "noteRef", "content"],
  },
  "notes.remove": {
    type: "object",
    properties: {
      operation: { const: "notes.remove" },
      noteRef: { $ref: "#/$defs/itemRef" },
      disposition: { const: "permanent" },
    },
    required: ["operation", "noteRef", "disposition"],
  },
  "notes.upsertPayload": {
    type: "object",
    properties: {
      operation: { const: "notes.upsertPayload" },
      noteRef: { $ref: "#/$defs/itemRef" },
      payload: {
        type: "object",
        properties: {
          payloadType: { type: "string", minLength: 1 },
          noteKind: { type: "string", minLength: 1 },
          schemaVersion: { type: "string", minLength: 1 },
          format: { enum: ["json", "markdown", "text"] },
          value: { $ref: "#/$defs/jsonValue" },
        },
        required: [
          "payloadType",
          "noteKind",
          "schemaVersion",
          "format",
          "value",
        ],
        additionalProperties: false,
      },
    },
    required: ["operation", "noteRef", "payload"],
  },
  "attachments.create": {
    type: "object",
    properties: {
      operation: { const: "attachments.create" },
      placement: {
        oneOf: [
          {
            type: "object",
            properties: {
              kind: { const: "top_level" },
              libraryId: { type: "integer", minimum: 1 },
              collectionRefs: { $ref: "#/$defs/collectionRefArray" },
            },
            required: ["kind"],
            additionalProperties: false,
          },
          {
            type: "object",
            properties: {
              kind: { const: "child" },
              parentRef: { $ref: "#/$defs/itemRef" },
            },
            required: ["kind", "parentRef"],
            additionalProperties: false,
          },
        ],
      },
      source: { $ref: "#/$defs/attachmentSource" },
      metadata: {
        type: "object",
        properties: {
          title: { type: "string" },
          contentType: { type: "string" },
          charset: { type: "string" },
          originalUrl: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    required: ["operation", "placement", "source"],
  },
  "attachments.updateMetadata": {
    type: "object",
    properties: {
      operation: { const: "attachments.updateMetadata" },
      attachmentRef: { $ref: "#/$defs/itemRef" },
      patch: {
        type: "object",
        properties: {
          title: { type: ["string", "null"] },
          url: { type: ["string", "null"] },
          contentType: { type: ["string", "null"] },
          charset: { type: ["string", "null"] },
        },
        additionalProperties: false,
      },
    },
    required: ["operation", "attachmentRef", "patch"],
  },
  "attachments.replaceFile": {
    type: "object",
    properties: {
      operation: { const: "attachments.replaceFile" },
      attachmentRef: { $ref: "#/$defs/itemRef" },
      source: { $ref: "#/$defs/storedAttachmentSource" },
    },
    required: ["operation", "attachmentRef", "source"],
  },
  "attachments.move": {
    type: "object",
    properties: {
      operation: { const: "attachments.move" },
      attachmentRef: { $ref: "#/$defs/itemRef" },
      placement: {
        oneOf: [
          {
            type: "object",
            properties: {
              kind: { const: "top_level" },
              libraryId: { type: "integer", minimum: 1 },
              collectionRefs: { $ref: "#/$defs/collectionRefArray" },
            },
            required: ["kind"],
            additionalProperties: false,
          },
          {
            type: "object",
            properties: {
              kind: { const: "child" },
              parentRef: { $ref: "#/$defs/itemRef" },
            },
            required: ["kind", "parentRef"],
            additionalProperties: false,
          },
        ],
      },
    },
    required: ["operation", "attachmentRef", "placement"],
  },
  "attachments.remove": {
    type: "object",
    properties: {
      operation: { const: "attachments.remove" },
      attachmentRef: { $ref: "#/$defs/itemRef" },
      disposition: { const: "permanent" },
    },
    required: ["operation", "attachmentRef", "disposition"],
  },
  "statusTags.transition": {
    type: "object",
    properties: {
      operation: { const: "statusTags.transition" },
      itemRef: { $ref: "#/$defs/itemRef" },
      add: {
        type: "array",
        items: {
          enum: [
            "need-metadata-curation",
            "need-fulltext",
            "need-markdown",
            "need-analysis",
            "need-deep-reading",
          ],
        },
      },
      remove: {
        type: "array",
        items: {
          enum: [
            "need-metadata-curation",
            "need-fulltext",
            "need-markdown",
            "need-analysis",
            "need-deep-reading",
          ],
        },
      },
    },
    required: ["operation", "itemRef"],
  },
  "trash.setItemsState": {
    type: "object",
    properties: {
      operation: { const: "trash.setItemsState" },
      itemRefs: { $ref: "#/$defs/itemRefArray" },
      state: { enum: ["trashed", "active"] },
    },
    required: ["operation", "itemRefs", "state"],
  },
  "literature.ingest": {
    type: "object",
    properties: {
      operation: { const: "literature.ingest" },
      collectionRef: { $ref: "#/$defs/collectionRef" },
      paper: {
        type: "object",
        properties: {
          itemType: { type: "string", minLength: 1 },
          fields: {
            type: "object",
            additionalProperties: {
              type: ["string", "number", "boolean", "null"],
            },
          },
          creators: { type: "array", items: { $ref: "#/$defs/creator" } },
          identifiers: {
            type: "object",
            properties: {
              doi: { type: "string" },
              arxiv: { type: "string" },
              pmid: { type: "string" },
              isbn: { type: "string" },
            },
            additionalProperties: false,
          },
          landingUrl: { type: "string" },
          pdfUrl: { type: "string" },
          attachLandingUrlOnMissingPdf: { type: "boolean" },
        },
        required: ["itemType", "fields", "creators", "identifiers"],
        additionalProperties: false,
      },
    },
    required: ["operation", "collectionRef", "paper"],
  },
  "managed_note.write_custom": {
    type: "object",
    properties: {
      operation: { const: "managed_note.write_custom" },
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      target: managedWriteTarget,
      content: managedWriteContent,
    },
    required: ["operation", "target", "content"],
    additionalProperties: false,
  },
  "managed_note.write_conversation": {
    type: "object",
    properties: {
      operation: { const: "managed_note.write_conversation" },
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      target: managedWriteTarget,
      content: managedWriteContent,
    },
    required: ["operation", "target", "content"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_digest": {
    type: "object",
    properties: {
      operation: { const: "literature_artifact.upsert_digest" },
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      markdown: { type: "string", minLength: 1 },
    },
    required: ["operation", "parentRef", "markdown"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_references": {
    type: "object",
    properties: {
      operation: { const: "literature_artifact.upsert_references" },
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      references: { $ref: "#/$defs/jsonValue" },
    },
    required: ["operation", "parentRef", "references"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_citation_analysis": {
    type: "object",
    properties: {
      operation: { const: "literature_artifact.upsert_citation_analysis" },
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      citationAnalysis: { $ref: "#/$defs/jsonValue" },
    },
    required: ["operation", "parentRef", "citationAnalysis"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_score": {
    type: "object",
    properties: {
      operation: { const: "literature_artifact.upsert_score" },
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      score: { $ref: "#/$defs/literatureScoreArtifact" },
    },
    required: ["operation", "parentRef", "score"],
    additionalProperties: false,
  },
} satisfies Record<MutationOperation, JsonSchema>;

// These type-only aliases make a missing canonical operation fail compilation at the schema boundary.
type _RequestCoverage = {
  [K in MutationOperation]: MutationRequestByOperation[K];
};
type _ResultCoverage = {
  [K in MutationOperation]: MutationResultByOperation[K];
};
void (0 as unknown as _RequestCoverage | _ResultCoverage);

const mutationDefs = {
  itemRef: portableItemRef,
  collectionRef: portableCollectionRef,
  itemRefArray,
  collectionRefArray,
  stringArray,
  creator,
  jsonValue,
  noteContent,
  attachmentContentManifest,
  storedAttachmentSource,
  attachmentSource,
  literatureScoreArtifact: {
    type: "object",
    additionalProperties: false,
    required: [
      "schema",
      "rubric_id",
      "paper_type",
      "paper_type_reason",
      "overall_score",
      "confidence",
      "confidence_adjusted_score",
      "dimensions",
    ],
    properties: {
      schema: { const: "literature_score.v1" },
      rubric_id: { type: "string", minLength: 1 },
      paper_type: {
        enum: [
          "empirical",
          "review",
          "theoretical",
          "qualitative",
          "mixed_methods",
          "other",
        ],
      },
      paper_type_reason: { type: "string", minLength: 1 },
      overall_score: { type: "number", minimum: 0, maximum: 100 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      confidence_adjusted_score: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      dimensions: {
        type: "array",
        minItems: 6,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "dimension_key",
            "name",
            "configured_weight",
            "effective_weight",
            "raw_score",
            "applicable_max_score",
            "score",
            "confidence",
            "summary",
            "criteria",
          ],
          properties: {
            dimension_key: { type: "string", minLength: 1 },
            name: { type: "string", minLength: 1 },
            configured_weight: { type: "number", minimum: 0, maximum: 1 },
            effective_weight: { type: "number", minimum: 0, maximum: 1 },
            raw_score: { type: "integer", minimum: 0 },
            applicable_max_score: { type: "integer", minimum: 0 },
            score: {
              type: ["number", "null"],
              minimum: 0,
              maximum: 100,
            },
            confidence: {
              type: ["number", "null"],
              minimum: 0,
              maximum: 1,
            },
            summary: { type: "string", minLength: 1 },
            criteria: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "criterion_key",
                  "name",
                  "status",
                  "score",
                  "max_score",
                  "reason",
                  "evidence",
                ],
                properties: {
                  criterion_key: { type: "string", minLength: 1 },
                  name: { type: "string", minLength: 1 },
                  status: { enum: ["scored", "not_applicable"] },
                  score: { type: ["integer", "null"], minimum: 0 },
                  max_score: { type: "integer", minimum: 1 },
                  reason: { type: "string", minLength: 1 },
                  evidence: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["line_start", "line_end", "quote"],
                      properties: {
                        line_start: { type: "integer", minimum: 1 },
                        line_end: { type: "integer", minimum: 1 },
                        quote: {
                          type: "string",
                          minLength: 1,
                          maxLength: 500,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const managedNoteKind = {
  enum: [
    "custom",
    "conversation-note",
    "digest",
    "references",
    "citation-analysis",
    "literature-score",
  ],
} satisfies JsonSchema;

const noteDetail = {
  oneOf: [
    {
      type: "object",
      properties: {
        kind: { const: "ordinary" },
        ref: { $ref: "#/$defs/itemRef" },
        parentRef: {
          anyOf: [{ $ref: "#/$defs/itemRef" }, { type: "null" }],
        },
        title: { type: "string" },
        format: { enum: ["html", "text"] },
        content: { type: "string" },
        revision: { type: "string", minLength: 1 },
      },
      required: [
        "kind",
        "ref",
        "parentRef",
        "title",
        "format",
        "content",
        "revision",
      ],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "managed" },
        noteKind: managedNoteKind,
        ref: { $ref: "#/$defs/itemRef" },
        parentRef: {
          anyOf: [{ $ref: "#/$defs/itemRef" }, { type: "null" }],
        },
        title: { type: "string" },
        payload: { $ref: "#/$defs/jsonValue" },
        payloadBytes: { type: "integer", minimum: 0 },
        detailBytes: { type: "integer", minimum: 0 },
        revision: { type: "string", minLength: 1 },
        provenance: {
          type: "object",
          properties: {
            sourceRef: { $ref: "#/$defs/itemRef" },
            referencesBasis: { type: "string", minLength: 1 },
          },
          additionalProperties: false,
        },
        health: {
          type: "object",
          properties: {
            state: { enum: ["current", "stale"] },
            currentReferencesBasis: { type: "string", minLength: 1 },
          },
          required: ["state"],
          additionalProperties: false,
        },
        derived: {
          type: "object",
          properties: {
            markdown: { type: "string" },
            representativeImage: {
              type: "object",
              properties: {
                attachmentRef: { $ref: "#/$defs/itemRef" },
                alt: { type: "string" },
              },
              required: ["attachmentRef", "alt"],
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
      required: [
        "kind",
        "noteKind",
        "ref",
        "parentRef",
        "title",
        "payload",
        "payloadBytes",
        "detailBytes",
        "revision",
      ],
      additionalProperties: false,
    },
  ],
} satisfies JsonSchema;

/** Shared Note detail schema for Broker and Host Bridge projections. */
export const NOTE_DETAIL_OUTPUT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  ...noteDetail,
  $defs: { itemRef: portableItemRef, jsonValue },
} satisfies JsonSchema;

const managedNoteWriteTarget = {
  oneOf: [
    {
      type: "object",
      properties: {
        kind: { const: "create" },
        parentRef: { $ref: "#/$defs/itemRef" },
      },
      required: ["kind", "parentRef"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        kind: { const: "update" },
        noteRef: { $ref: "#/$defs/itemRef" },
      },
      required: ["kind", "noteRef"],
      additionalProperties: false,
    },
  ],
} satisfies JsonSchema;

export const MANAGED_NOTE_WRITE_INPUT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    operationId: { type: "string", minLength: 1, maxLength: 128 },
    target: managedNoteWriteTarget,
    content: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1 },
        markdown: { type: "string", minLength: 1 },
      },
      required: ["title", "markdown"],
      additionalProperties: false,
    },
  },
  required: ["operationId", "target", "content"],
  additionalProperties: false,
  $defs: { itemRef: portableItemRef },
} satisfies JsonSchema;

export const LITERATURE_ARTIFACT_UPSERT_INPUT_SCHEMAS = {
  digest: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      markdown: { type: "string", minLength: 1 },
    },
    required: ["operationId", "parentRef", "markdown"],
    additionalProperties: false,
    $defs: { itemRef: portableItemRef },
  },
  references: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      references: { $ref: "#/$defs/jsonValue" },
    },
    required: ["operationId", "parentRef", "references"],
    additionalProperties: false,
    $defs: { itemRef: portableItemRef, jsonValue },
  },
  citationAnalysis: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      citationAnalysis: { $ref: "#/$defs/jsonValue" },
    },
    required: ["operationId", "parentRef", "citationAnalysis"],
    additionalProperties: false,
    $defs: { itemRef: portableItemRef, jsonValue },
  },
  score: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      operationId: { type: "string", minLength: 1, maxLength: 128 },
      parentRef: { $ref: "#/$defs/itemRef" },
      score: { $ref: "#/$defs/literatureScoreArtifact" },
    },
    required: ["operationId", "parentRef", "score"],
    additionalProperties: false,
    $defs: {
      itemRef: portableItemRef,
      jsonValue,
      literatureScoreArtifact: mutationDefs.literatureScoreArtifact,
    },
  },
} as const;

export const MUTATION_EXECUTE_INPUT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: { operationId: { type: "string", minLength: 1, maxLength: 128 } },
  required: ["operationId"],
  oneOf: Object.values(operationInputSchemas),
  unevaluatedProperties: false,
  $defs: mutationDefs,
} satisfies JsonSchema;

export const MUTATION_PREVIEW_INPUT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  oneOf: Object.values(operationInputSchemas),
  unevaluatedProperties: false,
  $defs: mutationDefs,
} satisfies JsonSchema;

const receipt = {
  type: "object",
  properties: {
    schema: { const: "zotero-agents.mutation-receipt.v1" },
    receiptId: { type: "string", minLength: 1 },
    operationId: { type: "string", minLength: 1, maxLength: 128 },
    operation: { enum: Object.keys(operationInputSchemas) },
    outcome: { enum: ["committed", "unchanged"] },
    committedAt: { type: "string", minLength: 1 },
    effectDigest: { type: "string", minLength: 1 },
    changes: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  },
  required: [
    "schema",
    "receiptId",
    "operationId",
    "operation",
    "outcome",
    "committedAt",
    "effectDigest",
    "changes",
  ],
  additionalProperties: false,
} satisfies JsonSchema;

const mutationAttempt = {
  type: "object",
  properties: {
    schema: { const: "zotero-agents.mutation-attempt.v1" },
    attemptId: { type: "string", minLength: 1 },
    operationId: { type: "string", minLength: 1, maxLength: 128 },
    operation: { enum: Object.keys(operationInputSchemas) },
    status: { enum: ["failed", "canceled", "unknown", "repair_required"] },
    error: {
      type: "object",
      properties: {
        code: { type: "string", minLength: 1 },
        phase: {
          enum: [
            "validation",
            "reservation",
            "read",
            "staging",
            "commit",
            "verification",
            "compensation",
            "cleanup",
          ],
        },
        recovery: {
          enum: [
            "none",
            "retry_same_operation",
            "refresh_and_retry_new_operation",
            "reconcile",
            "manual_repair",
          ],
        },
        message: { type: "string" },
        details: { $ref: "#/$defs/jsonValue" },
      },
      required: ["code", "phase", "recovery", "details"],
      additionalProperties: false,
    },
    affectedRefs: {
      type: "array",
      items: { type: "object", additionalProperties: false },
    },
    residualRefs: {
      type: "array",
      items: { type: "object", additionalProperties: false },
    },
  },
  required: [
    "schema",
    "attemptId",
    "operationId",
    "operation",
    "status",
    "error",
    "affectedRefs",
    "residualRefs",
  ],
  additionalProperties: false,
} satisfies JsonSchema;

const resultPayloadSchemas = {
  "item.create": {
    type: "object",
    properties: { item: { type: "object", additionalProperties: true } },
    required: ["item"],
    additionalProperties: false,
  },
  "item.updateMetadata": {
    type: "object",
    properties: { item: { type: "object", additionalProperties: true } },
    required: ["item"],
    additionalProperties: false,
  },
  "item.changeType": {
    type: "object",
    properties: { item: { type: "object", additionalProperties: true } },
    required: ["item"],
    additionalProperties: false,
  },
  "item.remove": {
    type: "object",
    properties: {
      itemRef: { $ref: "#/$defs/itemRef" },
      outcome: {
        enum: [
          "trashed",
          "permanently_deleted",
          "already_trashed",
          "already_absent",
        ],
      },
    },
    required: ["itemRef", "outcome"],
    additionalProperties: false,
  },
  "item.updateTags": {
    type: "object",
    properties: { item: { type: "object", additionalProperties: true } },
    required: ["item"],
    additionalProperties: false,
  },
  "item.addRelated": {
    type: "object",
    properties: {
      sourceRef: { $ref: "#/$defs/itemRef" },
      relatedRefs: { $ref: "#/$defs/itemRefArray" },
      relations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            relatedRef: { $ref: "#/$defs/itemRef" },
            outcome: {
              enum: ["added", "removed", "already_present", "already_absent"],
            },
          },
          required: ["relatedRef", "outcome"],
          additionalProperties: false,
        },
      },
      sourceRevision: { type: "string", minLength: 1 },
    },
    required: ["sourceRef", "relatedRefs", "relations", "sourceRevision"],
    additionalProperties: false,
  },
  "item.removeRelated": {
    type: "object",
    properties: {
      sourceRef: { $ref: "#/$defs/itemRef" },
      relatedRefs: { $ref: "#/$defs/itemRefArray" },
      relations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            relatedRef: { $ref: "#/$defs/itemRef" },
            outcome: {
              enum: ["added", "removed", "already_present", "already_absent"],
            },
          },
          required: ["relatedRef", "outcome"],
          additionalProperties: false,
        },
      },
      sourceRevision: { type: "string", minLength: 1 },
    },
    required: ["sourceRef", "relatedRefs", "relations", "sourceRevision"],
    additionalProperties: false,
  },
  "collection.create": {
    type: "object",
    properties: { collection: { type: "object", additionalProperties: true } },
    required: ["collection"],
    additionalProperties: false,
  },
  "collection.update": {
    type: "object",
    properties: { collection: { type: "object", additionalProperties: true } },
    required: ["collection"],
    additionalProperties: false,
  },
  "collection.updateMembership": {
    type: "object",
    properties: {
      collection: { type: "object", additionalProperties: true },
      addedRefs: { $ref: "#/$defs/itemRefArray" },
      removedRefs: { $ref: "#/$defs/itemRefArray" },
    },
    required: ["collection", "addedRefs", "removedRefs"],
    additionalProperties: false,
  },
  "collection.remove": {
    type: "object",
    properties: { removedRef: { $ref: "#/$defs/collectionRef" } },
    required: ["removedRef"],
    additionalProperties: false,
  },
  "notes.create": {
    type: "object",
    properties: { note: { type: "object", additionalProperties: true } },
    required: ["note"],
    additionalProperties: false,
  },
  "notes.updateContent": {
    type: "object",
    properties: { note: { type: "object", additionalProperties: true } },
    required: ["note"],
    additionalProperties: false,
  },
  "notes.remove": {
    type: "object",
    properties: {
      noteRef: { $ref: "#/$defs/itemRef" },
      outcome: {
        enum: [
          "trashed",
          "permanently_deleted",
          "already_trashed",
          "already_absent",
        ],
      },
    },
    required: ["noteRef", "outcome"],
    additionalProperties: false,
  },
  "notes.upsertPayload": {
    type: "object",
    properties: {
      note: { type: "object", additionalProperties: true },
      payload: { type: "object", additionalProperties: true },
      outcome: { enum: ["created", "replaced", "unchanged"] },
    },
    required: ["note", "payload", "outcome"],
    additionalProperties: false,
  },
  "attachments.create": {
    type: "object",
    properties: { attachment: { type: "object", additionalProperties: true } },
    required: ["attachment"],
    additionalProperties: false,
  },
  "attachments.updateMetadata": {
    type: "object",
    properties: { attachment: { type: "object", additionalProperties: true } },
    required: ["attachment"],
    additionalProperties: false,
  },
  "attachments.replaceFile": {
    type: "object",
    properties: {
      attachment: { type: "object", additionalProperties: true },
      outcome: { enum: ["replaced", "unchanged"] },
    },
    required: ["attachment", "outcome"],
    additionalProperties: false,
  },
  "attachments.move": {
    type: "object",
    properties: {
      attachment: { type: "object", additionalProperties: true },
      outcome: { enum: ["moved", "unchanged"] },
    },
    required: ["attachment", "outcome"],
    additionalProperties: false,
  },
  "attachments.remove": {
    type: "object",
    properties: {
      attachmentRef: { $ref: "#/$defs/itemRef" },
      outcome: {
        enum: [
          "trashed",
          "permanently_deleted",
          "already_trashed",
          "already_absent",
        ],
      },
    },
    required: ["attachmentRef", "outcome"],
    additionalProperties: false,
  },
  "statusTags.transition": {
    type: "object",
    properties: {
      itemRef: { $ref: "#/$defs/itemRef" },
      added: { $ref: "#/$defs/stringArray" },
      removed: { $ref: "#/$defs/stringArray" },
      unchanged: { $ref: "#/$defs/stringArray" },
      revision: { type: "string", minLength: 1 },
    },
    required: ["itemRef", "added", "removed", "unchanged", "revision"],
    additionalProperties: false,
  },
  "trash.setItemsState": {
    type: "object",
    properties: {
      state: { enum: ["trashed", "active"] },
      explicitRefs: { $ref: "#/$defs/itemRefArray" },
      expandedRefs: { $ref: "#/$defs/itemRefArray" },
    },
    required: ["state", "explicitRefs", "expandedRefs"],
    additionalProperties: false,
  },
  "literature.ingest": {
    type: "object",
    properties: {
      item: { type: "object", additionalProperties: true },
      collectionRef: { $ref: "#/$defs/collectionRef" },
      itemOutcome: { enum: ["created", "existing"] },
      collectionOutcome: { enum: ["added", "already_present"] },
      enrichment: {
        type: "array",
        items: {
          oneOf: [
            {
              type: "object",
              properties: {
                kind: { enum: ["pdf", "landing"] },
                outcome: { const: "attached" },
              },
              required: ["kind", "outcome"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: {
                kind: { enum: ["pdf", "landing"] },
                outcome: { const: "skipped" },
              },
              required: ["kind", "outcome"],
              additionalProperties: false,
            },
            {
              type: "object",
              properties: {
                kind: { enum: ["pdf", "landing"] },
                outcome: { const: "failed" },
                code: { type: "string", minLength: 1 },
              },
              required: ["kind", "outcome", "code"],
              additionalProperties: false,
            },
          ],
        },
      },
    },
    required: [
      "item",
      "collectionRef",
      "itemOutcome",
      "collectionOutcome",
      "enrichment",
    ],
    additionalProperties: false,
  },
  "managed_note.write_custom": {
    type: "object",
    properties: { note: noteDetail },
    required: ["note"],
    additionalProperties: false,
  },
  "managed_note.write_conversation": {
    type: "object",
    properties: { note: noteDetail },
    required: ["note"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_digest": {
    type: "object",
    properties: {
      note: noteDetail,
      dependentStale: { type: "boolean" },
      referencesBasis: { type: "string", minLength: 1 },
    },
    required: ["note"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_references": {
    type: "object",
    properties: {
      note: noteDetail,
      dependentStale: { type: "boolean" },
      referencesBasis: { type: "string", minLength: 1 },
    },
    required: ["note"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_citation_analysis": {
    type: "object",
    properties: {
      note: noteDetail,
      dependentStale: { type: "boolean" },
      referencesBasis: { type: "string", minLength: 1 },
    },
    required: ["note"],
    additionalProperties: false,
  },
  "literature_artifact.upsert_score": {
    type: "object",
    properties: {
      note: noteDetail,
      dependentStale: { type: "boolean" },
      referencesBasis: { type: "string", minLength: 1 },
    },
    required: ["note"],
    additionalProperties: false,
  },
} satisfies Record<MutationOperation, JsonSchema>;

const successfulResultSchemas = Object.entries(resultPayloadSchemas).map(
  ([operation, result]) => ({
    type: "object",
    properties: {
      outcome: { enum: ["committed", "unchanged"] },
      receipt: {
        allOf: [
          { $ref: "#/$defs/receipt" },
          {
            type: "object",
            properties: { operation: { const: operation } },
            required: ["operation"],
          },
        ],
      },
      result,
    },
    required: ["outcome", "receipt", "result"],
    additionalProperties: false,
  }),
);

const failedResultSchema: JsonSchema = {
  type: "object",
  properties: {
    outcome: { enum: ["failed", "canceled", "unknown", "repair_required"] },
    attempt: { $ref: "#/$defs/mutationAttempt" },
  },
  required: ["outcome", "attempt"],
  additionalProperties: false,
};

const mutationExecutionResultDefinitions = {
  ...mutationDefs,
  managedNoteDetail: noteDetail,
  receipt,
  mutationAttempt,
};

export const MUTATION_EXECUTION_RESULT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  oneOf: [...successfulResultSchemas, failedResultSchema],
  $defs: mutationExecutionResultDefinitions,
} satisfies JsonSchema;

export const MUTATION_EXECUTE_OUTPUT_SCHEMA = MUTATION_EXECUTION_RESULT_SCHEMA;
export const MUTATION_PREVIEW_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    schema: { const: "zotero-agents.mutation-preview.v1" },
    operation: { enum: Object.keys(operationInputSchemas) },
    outcome: { enum: ["would_change", "unchanged"] },
    observedAt: { type: "string", minLength: 1 },
    domainPlanDigest: { type: "string", minLength: 1 },
    plan: { type: "object", additionalProperties: true },
  },
  required: [
    "schema",
    "operation",
    "outcome",
    "observedAt",
    "domainPlanDigest",
    "plan",
  ],
  additionalProperties: false,
} satisfies JsonSchema;

export const MUTATION_GET_OPERATION_INPUT_SCHEMA = {
  type: "object",
  properties: { operationId: { type: "string", minLength: 1, maxLength: 128 } },
  required: ["operationId"],
  additionalProperties: false,
} satisfies JsonSchema;

export const MUTATION_GET_OPERATION_OUTPUT_SCHEMA = {
  oneOf: [
    {
      type: "object",
      properties: { state: { const: "running" } },
      required: ["state"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: { state: { const: "unavailable" } },
      required: ["state"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        state: { const: "settled" },
        result: { oneOf: [...successfulResultSchemas, failedResultSchema] },
      },
      required: ["state", "result"],
      additionalProperties: false,
    },
  ],
  $defs: mutationExecutionResultDefinitions,
} satisfies JsonSchema;

export const MUTATION_INPUT_SCHEMAS_BY_OPERATION =
  operationInputSchemas satisfies Record<MutationPreviewOperation, JsonSchema>;
export const MUTATION_RESULT_SCHEMAS_BY_OPERATION =
  resultPayloadSchemas satisfies Record<MutationOperation, JsonSchema>;

function cloneSchema<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Public projection schemas deliberately omit the internal operation tag. */
export const MUTATION_PUBLIC_INPUT_SCHEMAS_BY_OPERATION = Object.fromEntries(
  Object.entries(operationInputSchemas).map(([operation, schema]) => {
    const projected = cloneSchema(schema) as JsonSchema;
    const properties = (projected.properties || {}) as JsonSchema;
    delete properties.operation;
    properties.dryRun = { type: "boolean", default: false };
    properties.operationId = { type: "string", minLength: 1, maxLength: 128 };
    projected.properties = properties;
    projected.required = ((projected.required || []) as string[]).filter(
      (property) => property !== "operation",
    );
    projected.additionalProperties = false;
    return [operation, projected];
  }),
) as unknown as Record<MutationOperation, JsonSchema>;

export const MUTATION_PUBLIC_PREVIEW_OUTPUT_SCHEMAS_BY_OPERATION =
  Object.fromEntries(
    Object.keys(operationInputSchemas).map((operation) => [
      operation,
      {
        ...cloneSchema(MUTATION_PREVIEW_OUTPUT_SCHEMA),
        properties: {
          ...(MUTATION_PREVIEW_OUTPUT_SCHEMA.properties as JsonSchema),
          operation: { const: operation },
        },
        required: MUTATION_PREVIEW_OUTPUT_SCHEMA.required,
      },
    ]),
  ) as unknown as Record<MutationOperation, JsonSchema>;

export const MUTATION_PUBLIC_EXECUTION_OUTPUT_SCHEMAS_BY_OPERATION =
  Object.fromEntries(
    Object.keys(resultPayloadSchemas).map((operation) => {
      const successful = successfulResultSchemas.find((branch) => {
        const receipt = (branch.properties as JsonSchema).receipt as JsonSchema;
        const allOf = receipt.allOf as JsonSchema[];
        const operationProperty = (allOf[1].properties as JsonSchema)
          .operation as JsonSchema;
        return operationProperty.const === operation;
      });
      return [
        operation,
        {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          oneOf: [successful, failedResultSchema],
          $defs: mutationExecutionResultDefinitions,
        },
      ];
    }),
  ) as unknown as Record<MutationOperation, JsonSchema>;
