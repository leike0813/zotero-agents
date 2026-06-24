const selectionContextSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "selection-context.schema.json",
  title: "SelectionContext",
  type: "object",
  required: ["selectionType", "items", "summary", "warnings", "sampledAt"],
  properties: {
    selectionType: {
      type: "string",
      enum: ["parent", "child", "attachment", "note", "mixed", "none"],
    },
    items: {
      type: "object",
      required: ["parents", "children", "attachments", "notes"],
      properties: {
        parents: { type: "array", items: { $ref: "#/$defs/ParentContext" } },
        children: { type: "array", items: { $ref: "#/$defs/ChildContext" } },
        attachments: {
          type: "array",
          items: { $ref: "#/$defs/AttachmentContext" },
        },
        notes: { type: "array", items: { $ref: "#/$defs/NoteContext" } },
      },
      additionalProperties: false,
    },
    summary: {
      type: "object",
      required: ["parentCount", "childCount", "attachmentCount", "noteCount"],
      properties: {
        parentCount: { type: "integer", minimum: 0 },
        childCount: { type: "integer", minimum: 0 },
        attachmentCount: { type: "integer", minimum: 0 },
        noteCount: { type: "integer", minimum: 0 },
      },
      additionalProperties: false,
    },
    warnings: { type: "array", items: { type: "string" } },
    sampledAt: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
  $defs: {
    ItemBase: {
      type: "object",
      required: [
        "id",
        "key",
        "itemType",
        "title",
        "libraryID",
        "parentItemID",
        "data",
      ],
      properties: {
        id: { type: "integer" },
        key: { type: "string" },
        itemType: { type: "string" },
        title: { type: "string" },
        libraryID: { type: "integer" },
        parentItemID: { type: ["integer", "null"] },
        data: { type: ["object", "null"] },
      },
      additionalProperties: true,
    },
    NoteLite: {
      allOf: [
        { $ref: "#/$defs/ItemBase" },
        {
          type: "object",
          required: ["note"],
          properties: { note: { type: "string" } },
        },
      ],
    },
    Tag: {
      type: "object",
      required: ["tag"],
      properties: {
        tag: { type: "string" },
        type: { type: "integer" },
      },
      additionalProperties: false,
    },
    ParentContext: {
      type: "object",
      required: [
        "item",
        "attachments",
        "notes",
        "tags",
        "collections",
        "children",
      ],
      properties: {
        item: { $ref: "#/$defs/ItemBase" },
        attachments: {
          type: "array",
          items: { $ref: "#/$defs/AttachmentContext" },
        },
        notes: { type: "array", items: { $ref: "#/$defs/NoteLite" } },
        tags: { type: "array", items: { $ref: "#/$defs/Tag" } },
        collections: { type: "array", items: { type: "string" } },
        children: { type: "array", items: { $ref: "#/$defs/ItemBase" } },
      },
      additionalProperties: false,
    },
    ChildContext: {
      type: "object",
      required: [
        "item",
        "parent",
        "attachments",
        "notes",
        "tags",
        "collections",
      ],
      properties: {
        item: { $ref: "#/$defs/ItemBase" },
        parent: { anyOf: [{ $ref: "#/$defs/ItemBase" }, { type: "null" }] },
        attachments: {
          type: "array",
          items: { $ref: "#/$defs/AttachmentContext" },
        },
        notes: { type: "array", items: { $ref: "#/$defs/NoteLite" } },
        tags: { type: "array", items: { $ref: "#/$defs/Tag" } },
        collections: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    AttachmentContext: {
      type: "object",
      required: ["item", "parent", "filePath", "mimeType"],
      properties: {
        item: { $ref: "#/$defs/ItemBase" },
        parent: { anyOf: [{ $ref: "#/$defs/ItemBase" }, { type: "null" }] },
        filePath: { type: ["string", "null"] },
        mimeType: { type: ["string", "null"] },
      },
      additionalProperties: false,
    },
    NoteContext: {
      type: "object",
      required: ["item", "parent", "tags", "collections"],
      properties: {
        item: { $ref: "#/$defs/ItemBase" },
        parent: { anyOf: [{ $ref: "#/$defs/ItemBase" }, { type: "null" }] },
        tags: { type: "array", items: { $ref: "#/$defs/Tag" } },
        collections: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
} as const;

export default selectionContextSchema;
