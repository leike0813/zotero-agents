## Why

`handlers.attachment.createFromPath()` currently creates a Zotero attachment and then performs a second `saveTx()` to patch attachment title and MIME metadata. This splits one logical apply mutation across multiple Zotero transactions and can surface rare `itemData` foreign-key failures during high-frequency debug apply, reapply, or background Zotero database activity.

## What Changes

- Make path-backed attachment creation apply the requested title and MIME type during the Zotero attachment creation call.
- Stop treating `mimeType` as a generic item-data field patch during `createFromPath`.
- Preserve existing public handler inputs and returned attachment behavior.
- Add focused regression coverage for path-backed attachment creation with parent, title, and MIME type.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `result-apply-handlers`: Attachment creation through apply handlers must use Zotero-native creation metadata for title and MIME type so result apply does not split a single attachment creation into a post-create metadata patch.

## Impact

- Affected code: `src/handlers/index.ts`.
- Affected tests: handler tests and mock parity coverage for `handlers.attachment.createFromPath()`.
- No dependency, manifest, workflow package, or user-visible UI changes.
