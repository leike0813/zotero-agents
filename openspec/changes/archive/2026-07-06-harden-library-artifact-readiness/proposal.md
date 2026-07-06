## Why

Generated literature-analysis notes can lose `data-zs-payload-anchor` markers after Zotero note normalization or note-editor save paths, while their embedded payload attachments remain readable. The Library Artifacts column and Host Bridge library readiness currently rely on the shared classifier, so marker loss makes both UI and CLI readiness under-report generated artifacts.

## What Changes

- Harden generated artifact detection by keeping the current HTML marker fast path and adding a narrow embedded-payload fallback only for schema-versioned generated notes whose marker is missing.
- Keep heading text as a filter for when fallback is allowed, not as proof that an artifact exists.
- Register a Zotero item Notifier observer so note, attachment, and parent item changes invalidate the Artifacts column cache and refresh affected parent rows.
- Preserve scoped `refresh/item` row updates and avoid `ItemTreeManager.refreshColumns()`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-library-artifacts-column`: shared artifact readiness classification tolerates missing payload anchors and row state updates after Zotero item changes.
- `host-bridge-service`: library readiness audit uses the same hardened classifier without returning decoded payload bodies.

## Impact

- Source modules: shared library artifact readiness evaluator, Artifacts column invalidation, Zotero lifecycle hooks.
- Tests: focused Artifacts column/readiness tests and Zotero mock surfaces for embedded payload fallback and Notifier observation.
- No public API, persistence, migration, dependency, or CLI command shape changes.
