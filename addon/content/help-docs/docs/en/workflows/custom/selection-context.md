# Selection Context

When a user selects items in Zotero, the plugin builds a structured **Selection Context (SelectionContext)** that describes what the user selected and what type each selected item belongs to. This context serves as the input basis for the `buildRequest` Hook.

## Selection Types

Based on the combination of selected item types, `selectionContext.selectionType` returns one of the following values:

| Type | Description |
|------|-------------|
| `"parent"` | All selected items are parent items (top-level items) |
| `"child"` | All selected items are child items (non-top-level items) |
| `"attachment"` | All selected items are attachments |
| `"note"` | All selected items are notes |
| `"mixed"` | Selected items are a mix of multiple types |
| `"none"` | No items are selected |

## Context Structure

```ts
selectionContext = {
  selectionType: "parent",       // Selection type
  items: {
    parents: [ /* List of parent items */ ],
    children: [ /* List of child items */ ],
    attachments: [ /* List of attachments */ ],
    notes: [ /* List of notes */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // Warning messages
  sampledAt: "2026-01-15T...",   // Context creation time
}
```

Each type of item contains rich contextual information.

### Parent Item (ParentContext)

A parent item is a top-level item in the Zotero library (e.g., journal article, book, web page, etc.). Each parent item context contains:

```ts
{
  item: Zotero.Item,         // Item object
  id: number,                // Item ID
  title: string,             // Title
  attachments: [             // Child attachments under this item
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // Child notes under this item
    { id, content, ... }
  ],
  tags: string[],            // Tag list
  collections: string[],     // Containing collections
  children: [                // Other child items
    { id, type, ... }
  ],
}
```

### Attachment (AttachmentContext)

An attachment is a file attachment of an item (PDF, Markdown, etc.). Each attachment context contains:

```ts
{
  item: Zotero.Item,         // Attachment item object
  id: number,                // Item ID
  filePath: string,          // Local file path
  fileName: string,          // Filename
  mimeType: string,          // MIME type (e.g., "application/pdf")
  dateAdded: Date,           // Date added
  parentItem: {              // Owning parent item
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### Note (NoteContext)

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // Note content (HTML)
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## Using Selection Context in Hooks

### Getting Selected Attachments

```js
export function buildRequest({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    input: {
      files: attachments.map((attachment) => ({
        path: runtime.helpers.getAttachmentFilePath(attachment),
        name: runtime.helpers.getAttachmentFileName(attachment),
      })),
    },
  };
}
```

### Getting Selected Parent Items and Their Child Content

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // Attachments under this parent item
    const notes = parent.notes;              // Notes under this parent item
  }

  // ...
}
```

### Checking Selection Type to Determine Behavior

```js
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // No items selected, skip
    return { kind: "skip", reason: "no selected items" };
  }

  if (selectionType === "attachment") {
    // User selected only attachments, use attachment processing logic
  } else if (selectionType === "parent") {
    // User selected only parent items, expand the first qualifying attachment
  }

  return { kind: "continue", context: { selectionType } };
}
```

### Filtering Attachments

Use declarative `validateSelection` for common attachment filtering:

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "filters": []
  }
}
```

For runtime-only decisions that depend on the resolved unit, use `preflight` to skip or continue:

```js
export function preflight({ selectionContext, runtime }) {
  const { helpers } = runtime;

  const hasPdf = selectionContext.items.attachments.some(
    a => helpers.isPdfAttachment(a)
  );

  if (!hasPdf) {
    return { kind: "skip", reason: "no PDF attachments" };
  }

  return { kind: "continue" };
}
```

### Workflows When No Items Are Selected

When `inputs.member.kind: "selection"`, `inputs.grouping.mode: "all"`, and
`trigger.requiresSelection: false`, a workflow can be triggered without any
items selected. Its `selection` selector produces the complete empty
SelectionContext as the single member. Selection requirements remain active and
must not make the empty selection impossible.

## Declarative Selection Validation

If your workflow only needs to **skip items that already have results** or **filter specific types of input**, use the declarative `validateSelection` field without writing a JavaScript hook.

```json
{
  "validateSelection": {
    "select": { "policy": "generated-note-candidates" },
    "filters": [
      {
        "kind": "generated-note-kinds-absent",
        "phase": "availability",
        "noteKinds": ["digest"]
      }
    ]
  }
}
```

See the full documentation in [Writing the Manifest](#doc/workflows%2Fcustom%2Fmanifest#selection-validation).

> **Contract boundary:** `validateSelection` produces and filters candidates;
> `inputs` declares what request construction consumes and how candidates are
> grouped. `buildRequest` consumes the prepared unit and must not reimplement
> selection planning.

## Next Steps

- [Host API Reference](#doc/workflows%2Fcustom%2Fhost-api) — Complete API for manipulating Zotero data in hooks
- [Writing the Manifest](#doc/workflows%2Fcustom%2Fmanifest) — Define candidate production and execution grouping
