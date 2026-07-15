## Why

The Synthesis Workbench still edits and deletes individual Tag Vocabulary entries by loading the complete vocabulary, mutating it in the host, and saving the complete aggregate. That split read-modify-write path is vulnerable to lost updates and leaves validation, reference maintenance, persistence, and autosync outside a single domain-owned transaction.

## What Changes

- Add strict public DTOs and `SynthesisTagsClient` commands for updating and deleting one Tag Vocabulary entry.
- Rebuild DTOs at the in-process adapter boundary, discard unknown JSON-safe fields, and preserve stable client error categories.
- Move entry update/delete semantics into Tag Vocabulary domain services that read, validate, maintain aliases and replacements, and persist atomically in one repository transaction.
- Preserve entry metadata and unrelated timestamps, reject exact and case-insensitive rename conflicts, distinguish missing update from delete no-op, and recompute validation warnings from the candidate aggregate.
- Route the two Workbench commands through the lazily resolved default client while preserving normalization, single-flight, confirmation, immediate start, failure feedback, and Tags-only invalidation.
- Update the public service inventory from 126 to 128 methods while retaining four approved direct consumers, and document Sync as the last direct-service Workbench slice.

## Capabilities

### New Capabilities

- `synthesis-workbench-tag-vocabulary-entry-mutation-client-consumer`: Defines strict client contracts, atomic Tag-domain mutation semantics, autosync behavior, and preserved Workbench orchestration for Tag Vocabulary entry update and deletion.

### Modified Capabilities

None.

## Impact

The change affects Synthesis Tag contracts, the in-process client adapter and legacy composition, Tag domain/service and repository transaction code, Workbench routing, public service inventory, focused contract/domain/autosync/UI tests, and current-state Synthesis documentation. It does not migrate generic vocabulary save, staged/import/promotion/bootstrap/audit flows, Git/WebDAV Sync, Host Bridge, MCP, or persistence formats.
