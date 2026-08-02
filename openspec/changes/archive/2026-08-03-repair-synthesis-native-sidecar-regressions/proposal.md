## Why

The native Synthesis production route currently loses large reverse-Host responses at the transport boundary, rejects valid literature-digest payloads before operation-level admission, applies digests without materializing their business state, and returns a paged object where the public Tag client promises an array. These regressions block the Rust sidecar from acting as the production owner and must be repaired without restoring a Node fallback or changing public client DTOs.

## What Changes

- Make reverse-Host response completion depend on exact `Content-Length` delivery, preserve capability-specific deadlines, and separate successful connection release from failure/stop abort.
- Admit production `client.*` string members under the existing 1 MiB request budget while retaining the stricter general-capability string limit.
- Route literature-digest apply through the existing reference-refresh application so artifact, reference, canonical binding, citation role, matching metadata, cache staleness, receipts, rollback, and idempotency are committed as one native operation.
- Restore `listStagedTagSuggestions` to its public complete-array contract by consuming the internal paged application safely and deterministically.
- Document the stable recovery and lifecycle rules for these production paths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-host-artifact-read-port`: Extend the capability-specific ten-second reverse-Host deadline to artifact scanning and require complete bounded response delivery without EOF dependence.
- `synthesis-native-production-routing`: Define production request admission and atomic native literature-digest apply behavior.
- `synthesis-incremental-update-triggers`: Require workflow apply to persist artifact, reference, binding, role, and matching-metadata projections atomically and idempotently.
- `synthesis-native-tag-surface`: Require the staged-suggestion client operation to return the full stable array even though the application port is paged.

## Impact

The change affects the TypeScript reverse-Host endpoint and production capability policy, the Rust sidecar reverse-Host client, production RPC adapters, reference-refresh application and repository schema, the native Tag surface, focused Node/Zotero/Rust tests, and Synthesis runtime documentation. Public TypeScript client interfaces, workflow payloads, schema identity, data permissions, and production ownership remain unchanged.
