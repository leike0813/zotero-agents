## Context

`handlers.attachment.createFromPath()` is a shared apply handler used by builtin and package workflows to materialize path-backed Zotero attachments. Its current flow creates the attachment through `Zotero.Attachments.linkFromFile()` and then applies `title` and `mimeType` through a generic field patch and a second `saveTx()`.

Zotero's attachment API already accepts `title` and `contentType` during `linkFromFile()`. Keeping these values outside the creation call splits one logical attachment mutation into multiple database transactions and exposes a narrow interleaving window with Zotero background cleanup, sync, reapply, or other plugin writes.

## Goals / Non-Goals

**Goals:**

- Make `createFromPath()` set title and MIME type through Zotero's native attachment creation metadata.
- Preserve the existing handler input shape and returned `Zotero.Item`.
- Keep the change scoped to creation-time metadata and avoid broad apply transaction changes.
- Add regression coverage for path-backed attachment creation with parent, title, and MIME type.

**Non-Goals:**

- Do not wrap full workflow `applyResult` execution in a single Zotero transaction.
- Do not redesign generic `applyFieldPatch()` or all attachment update behavior.
- Do not change debug workflow result semantics or SkillRunner/ACP provider contracts.
- Do not introduce new dependencies or Node-only runtime code in plugin paths.

## Decisions

1. Pass `title` and `contentType` directly to `Zotero.Attachments.linkFromFile()` in `createFromPath()`.

   Rationale: Zotero owns attachment creation semantics, including attachment metadata tables and item-data side effects. Passing creation metadata into the native API keeps the logical operation in the API path designed for it.

   Alternative considered: Keep the current post-create patch and add retry around `saveTx()`. This would reduce symptoms but retain the split transaction window and keep MIME type modeled as generic item data during creation.

2. Remove the `createFromPath()` post-create patch for `title` and `mimeType`.

   Rationale: The patch duplicates native API parameters and is the source of the second database write. Removing it reduces write count and avoids treating attachment MIME type as a generic item field.

   Alternative considered: Only move `mimeType` to `contentType` and keep title patching. This would still leave a second transaction for a value already accepted by `linkFromFile()`.

3. Keep `attachment.update()` and generic item field patching unchanged.

   Rationale: The observed failure is in creation-time metadata. Updating existing item fields is a separate contract and may intentionally use `setField()` semantics.

## Risks / Trade-offs

- Existing callers that relied on a half-created attachment after post-create metadata failure will now see a more atomic creation path -> This is an improvement over the intended contract; no compatibility path is needed.
- Mock runtime may not fully reflect Zotero attachment metadata tables -> Add focused mock parity coverage where possible, but rely on the native Zotero API contract for runtime correctness.
- Some MIME values may be normalized differently by Zotero when supplied during creation -> Tests should assert stable observable behavior without over-constraining internal storage details.
