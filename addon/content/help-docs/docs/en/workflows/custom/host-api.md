# Host API Reference

`runtime.hostApi` is the primary interface for workflow hooks to interact with Zotero. It encapsulates complete operational capabilities for Zotero libraries, items, file systems, preferences, and more.

## Item Operations (hostApi.items)

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // Get item by reference
  resolve: (ref) => Zotero.Item,             // Same as get, but throws if item doesn't exist
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // Get by library ID + Key
  getAll: () => Promise<Zotero.Item[]>,      // Get all items
}
```

`ref` can be a `Zotero.Item` object, a numeric ID, or a string Key.

**Example:**

```js
// Get item by ID
const item = hostApi.items.get(12345);

// Get item by library Key
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## Context (hostApi.context)

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // Current active view information
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // Currently selected items list
}
```

**Example:**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## Library Operations (hostApi.library)

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // Paginated item listing
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // Search items
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // Get item detail information
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // Get item's note list
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // Get note body
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // List note embedded payloads
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // Get a specific payload
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // Get item's attachment list
}
```

**Example:**

```js
// Search items
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// Get item's notes
const notes = await hostApi.library.getItemNotes(ref);

// Get item's attachments
const attachments = await hostApi.library.getItemAttachments(ref);
```

## Mutation Operations (hostApi.mutations)

Used to create, update, and delete data in Zotero. Write operations require user approval (confirmed in the Zotero UI).

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // Preview mutation effects
  execute: (request) => Promise<MutationExecuteResponse>,   // Execute mutation
}
```

### Supported Mutation Operations

| `operation` | Purpose | Description |
|-------------|---------|-------------|
| `item.updateFields` | Update item fields | Modify title, author, date, and other fields |
| `item.addTags` | Add tags | Add one or more tags to an item |
| `item.removeTags` | Remove tags | Remove specified tags from an item |
| `note.createChild` | Create child note | Create a new note under a parent item |
| `note.update` | Update note | Modify the content of an existing note |
| `note.upsertPayload` | Update embedded payload | Update the note's workflow payload attachment |
| `literature.ingest` | Ingest literature | Import a paper into Zotero |
| `collection.addItems` | Add to collection | Add items to a collection |
| `collection.removeItems` | Remove from collection | Remove items from a collection |

**Example: Create a note**

```js
const result = await hostApi.mutations.execute({
  operation: "note.createChild",
  parentItem: parentItem.getField("id"),
  data: {
    content: htmlContent,
    tags: ["generated"],
  },
});
```

**Example: Add tags**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## Note Operations (hostApi.notes)

```ts
hostApi.notes = {
  // ... All methods from the low-level note handler
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### Image Processing (hostApi.images)

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

Used to process images into a format suitable for embedding in notes:

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## Attachment Operations (hostApi.attachments)

```ts
hostApi.attachments = {
  // All methods from the low-level attachment handler
  // Including: list attachments, get attachment paths, create attachments, etc.
}
```

## Tag Operations (hostApi.tags)

```ts
hostApi.tags = {
  // All methods from the low-level tag handler
  // Including: list tags, get tags, create tags, etc.
}
```

## Collection Operations (hostApi.collections)

```ts
hostApi.collections = {
  // All methods from the low-level collection handler
  // Including: list collections, get sub-collections, etc.
}
```

## File Operations (hostApi.file)

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // Read text file
  writeText: (path, content) => Promise<void>,            // Write text file
  readBytes: (path) => Promise<Uint8Array>,               // Read binary file
  writeBytes: (path, bytes) => Promise<void>,             // Write binary file
  copy: (source, target) => Promise<void>,                // Copy file
  exists: (path) => Promise<boolean>,                     // Check if file exists
  makeDirectory: (path) => Promise<void>,                 // Create directory (including parent directories)
  pathToFile: (path) => nsIFile,                          // Convert path to Zotero file object
  getTempDirectoryPath: () => string,                     // Get temporary directory path
  pickDirectory: (args?) => Promise<string | null>,       // Open directory picker
  pickFile: (args?) => Promise<string | null>,            // Open file picker
  pickFiles: (args?) => Promise<string[] | null>,         // Open multi-file picker
}
```

**Example:**

```js
// Read file
const content = await hostApi.file.readText("/path/to/file.md");

// Write file
await hostApi.file.writeText("/path/to/output.md", newContent);

// Open directory picker to let user choose export directory
const dir = await hostApi.file.pickDirectory({
  title: "Select Export Directory",
});
if (dir) {
  // User selected a directory
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## Preferences (hostApi.prefs)

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // Read preference
  set: (key, value, global?) => void,  // Write preference
  clear: (key, global?) => void,       // Clear preference
}
```

The prefix is automatically handled by the plugin; you only need to pass the key name.

**Example:**

```js
// Read configuration
const vocab = hostApi.prefs.get("tagVocabularyJson");

// Write configuration
hostApi.prefs.set("mySetting", "myValue");
```

## UI Notifications (hostApi.notifications)

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**Example:**

```js
hostApi.notifications.toast({
  text: "Processing complete!",
  type: "success",
});
```

## Runtime Logging (hostApi.logging)

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

Used to append diagnostic information to the runtime logger.

## Plugin Configuration (hostApi.addon)

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## API Version (hostApi.version)

```ts
hostApi.version: number
```

The current Host API version number. Use it to guard against breaking changes when writing hooks that need compatibility across plugin versions.

## Parent Operations (hostApi.parents)

```ts
hostApi.parents = {
  // Low-level parent item handler operations
}
```

Provides lower-level access to parent item management. Prefer using `hostApi.library` and `hostApi.mutations` unless you need the lower-level handler interface.

## Command Operations (hostApi.command)

```ts
hostApi.command = {
  // Low-level command handler operations
}
```

Lower-level interface for command execution. Typically not needed in workflow hooks.

## Editor Operations (hostApi.editor)

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Manages workflow editor sessions. `registerRenderer` and `unregisterRenderer` allow custom renderers for workflow-specific output formats.

## Synthesis Operations (hostApi.synthesis)

```ts
hostApi.synthesis?: SynthesisService
```

Provides access to the Synthesis Workbench service (topics, concepts, tags, citation graph, etc.). Available only when the Synthesis system is initialized.

## Complete Example

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. Resolve parent item
  const parentItem = helpers.resolveItemRef(parent);

  // 2. Read artifact from bundle
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. Convert to HTML note
  const htmlContent = helpers.toHtmlNote("Processing Result", markdownContent);

  // 4. Create note
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. Add tags
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. Notify user
  hostApi.notifications.toast({
    text: `Processing complete: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## Next Steps

- [Packaging & Deployment](#doc/workflows%2Fcustom%2Fpackaging) — Publish custom workflows
- [Debugging & Testing](#doc/workflows%2Fcustom%2Fdebugging) — Verify workflow correctness
