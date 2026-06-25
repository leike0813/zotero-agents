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
export function filterInputs({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  for (const attachment of attachments) {
    const filePath = runtime.helpers.getAttachmentFilePath(attachment);
    const fileName = runtime.helpers.getAttachmentFileName(attachment);
    // Process attachment
  }

  return selectionContext;
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
export function filterInputs({ selectionContext, runtime }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // No items selected, skip
    return null;
  }

  if (selectionType === "attachment") {
    // User selected only attachments, use attachment processing logic
  } else if (selectionType === "parent") {
    // User selected only parent items, expand the first qualifying attachment
  }

  return selectionContext;
}
```

### Filtering Attachments

Use `helpers.withFilteredAttachments` to update the selection context after processing:

```js
export function filterInputs({ selectionContext, runtime }) {
  const { helpers } = runtime;

  // Keep only PDF attachments
  const pdfs = selectionContext.items.attachments.filter(
    a => helpers.isPdfAttachment(a)
  );

  // Keep only parent items that have PDF attachments from all items
  const matched = selectionContext.items.parents.filter(parent => {
    return parent.attachments.some(
      a => helpers.isPdfAttachment(a)
    );
  });

  // If no matches, skip execution
  if (matched.length === 0) return null;

  // Update context with the filtered result
  return helpers.withFilteredAttachments(selectionContext, matched);
}
```

### Workflows When No Items Are Selected

When `inputs.unit: "workflow"` and `trigger.requiresSelection: false`, the workflow can be triggered without any items selected. In this case, `selectionContext.selectionType` is `"none"`, and all arrays in `items` are empty. This mode is suitable for creating global operations (e.g., "Create Topic Synthesis").

## Declarative Selection Validation

If your workflow only needs to **skip items that already have results** or **filter specific types of input**, you can use the declarative `validateSelection` field without writing a `filterInputs` Hook.

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "generated-notes-all", "noteKinds": ["digest"] }
    ]
  }
}
```

See the full documentation in [Writing the Manifest](#doc/workflows%2Fcustom%2Fmanifest#selection-validation).

> **Selection Guide:** Use declarative `validateSelection` whenever possible — it requires zero JavaScript and zero maintenance. Complex selection logic can be implemented in the `buildRequest` Hook.

## Next Steps

- [Host API Reference](#doc/workflows%2Fcustom%2Fhost-api) — Complete API for manipulating Zotero data in hooks
- [Writing the Manifest](#doc/workflows%2Fcustom%2Fmanifest) — Define the workflow's input unit types
