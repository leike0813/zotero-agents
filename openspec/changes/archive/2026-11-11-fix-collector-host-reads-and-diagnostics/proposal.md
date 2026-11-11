# Proposal

## Why

A normal linked-URL attachment aborts the complete library snapshot required by collection recall. On Windows, the collector also selects a POSIX shim before a usable native wrapper, while Synthesis validation failures omit the available schema diagnostics from business logs.

## What Changes

- Count annotations only on file attachments while retaining snapshot failure for genuine file-attachment read errors.
- Select the collector's platform-appropriate Bridge launcher and send JSON through UTF-8 stdin.
- Preserve stable error codes and bounded, sanitized protocol validation metadata in Synthesis business failure logs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-library-full-snapshot-feed`: distinguish non-file attachments from failed annotation reads.
- `collection-collector-workflow`: require platform-correct launchers and lossless JSON query transport.
- `synthesis-sidecar-operation-observability`: retain safe request and response validation diagnostics in the single business failure record.

## Impact

Changes are confined to the Host snapshot serializer, collector Python runtime, Synthesis business audit, their existing tests, and owner documentation. No dependencies, business DTOs, CLI arguments, runtime history formats, or publication surfaces change. The two historical Synthesis failures remain unclassified beyond the available evidence; this change repairs their diagnostic gap without claiming their root causes.
