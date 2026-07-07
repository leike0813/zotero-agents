## Why

`literature-metadata-curator` currently runs as a precompiled package hook, where raw `runtime.zotero` is intentionally unavailable. Its preflight fast path still calls `runtime.zotero.Translate.Search`, so DOI, ISBN, and URL-derived identifiers are parsed but cannot short-circuit provider dispatch.

## What Changes

- Add a read-only Host API metadata lookup capability backed by Zotero `Translate.Search`.
- Migrate `literature-metadata-curator` preflight to use `runtime.hostApi.metadata.translateIdentifier(...)` before falling back to legacy direct-runtime `runtime.zotero`.
- Preserve current Host API version because this capability is added before the next released version.
- Extend focused tests so production `executeBuildRequests()` coverage exercises the precompiled host-hook contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-capability-broker`: Adds metadata translation lookup as a broker-owned Host API capability.
- `zotero-host-broker-capability-api`: Adds JSON-safe `hostApi.metadata.translateIdentifier(...)` behavior.
- `literature-workbench-workflows`: Updates metadata curator preflight lookup to work under precompiled host hooks and URL-derived identifiers.

## Impact

- Host API types and implementation gain a read-only metadata domain without exposing raw Zotero objects.
- Metadata curator workflow preflight uses Host API for local resolver lookup.
- Broker SSOT documentation, workflow README, OpenSpec specs, and focused tests are updated.
