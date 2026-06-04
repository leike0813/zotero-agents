## Why

Workbench payloads stored as PNG tail bytes on unreferenced embedded image attachments can be removed by Zotero note normalization or unused embedded-image cleanup. This makes Synthesis artifact availability unstable and lets notes appear present while their machine-readable artifact payload is gone.

## What Changes

- Replace new payload writes with a v2 embedded-image protocol: a parseable PNG ancillary chunk plus a legal note HTML `<img data-attachment-key>` anchor.
- Extend `literature-digest`, `import-notes`, and `literature-explainer` notes to use the same v2 payload storage contract.
- Upgrade `debug-migrate-note-payloads` to migrate legacy hidden HTML payload blocks and v1 tail-marker embedded attachments into v2 anchored attachments.
- Keep legacy hidden blocks and v1 tail markers readable for export/debug migration only.
- **BREAKING**: Synthesis artifact availability must not fall back to note title, note existence, or hidden HTML payload blocks.

## Capabilities

### New Capabilities

- `workbench-embedded-payload-storage`: Defines v2 note payload storage, anchor retention, legacy read compatibility, and migration behavior.

### Modified Capabilities

- `literature-workbench-package`: Digest-family and conversation notes use the shared v2 payload storage contract.
- `literature-explainer-workflow`: Conversation note payloads are attachment-backed instead of hidden HTML blocks.
- `custom-note-import-export`: Custom/conversation markdown payload export remains compatible with legacy and v2 storage.
- `zotero-host-broker-capability-api`: Payload listing exposes storage version, source, hash, and anchor diagnostics.
- `zotero-mcp-tool-suite`: Payload tools expose v2 payload metadata while retaining legacy reads.
- `synthesis-reference-sidecar-index`: Artifact availability is based only on parseable embedded payload attachments.
- `synthesis-invariant-guardrails`: Guards forbid note-only and hidden-block artifact availability fallback.
- `synthesis-layer-doc-system`: Active docs describe the v2 storage contract and migration boundary.

## Impact

Affected areas include shared note payload codecs, literature workbench note writers, literature-explainer apply, debug payload migration, Host Bridge/MCP payload DTOs, Synthesis artifact scanning, and targeted workflow/Synthesis tests. No new npm dependency or database table is required.
