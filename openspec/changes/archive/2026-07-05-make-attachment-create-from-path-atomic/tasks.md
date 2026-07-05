## 1. Regression Coverage

- [x] 1.1 Add or update handler coverage proving `createFromPath()` creates a parent-linked attachment when title and MIME type are supplied.
- [x] 1.2 Add focused coverage that creation-time title and MIME type do not require the post-create `applyFieldPatch()` path.
- [x] 1.3 Keep assertions scoped to stable observable behavior and avoid locking fragile Zotero internals.

## 2. Handler Implementation

- [x] 2.1 Pass `title` from `AttachmentPathOptions` into `Zotero.Attachments.linkFromFile()` during `createFromPath()`.
- [x] 2.2 Pass `mimeType` as `contentType` into `Zotero.Attachments.linkFromFile()` during `createFromPath()`.
- [x] 2.3 Remove the `createFromPath()` post-create patch path for `title` and `contentType`.
- [x] 2.4 Leave `attachment.update()` and generic `applyFieldPatch()` behavior unchanged.

## 3. Verification

- [x] 3.1 Run the minimal relevant handler and debug apply tests.
- [x] 3.2 Run typecheck or the nearest existing static validation for touched TypeScript.
- [x] 3.3 Re-run OpenSpec status and confirm the change remains apply-ready.
