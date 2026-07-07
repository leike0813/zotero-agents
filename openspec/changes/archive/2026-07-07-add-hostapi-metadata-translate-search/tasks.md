## 1. OpenSpec

- [x] 1.1 Add proposal, design, and delta specs for Host API metadata lookup and metadata curator preflight migration.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Host API

- [x] 2.1 Add JSON-safe metadata translate DTO types to the broker/API contract.
- [x] 2.2 Implement `hostApi.metadata.translateIdentifier(...)` without bumping `WORKFLOW_HOST_API_VERSION`.
- [x] 2.3 Update the Host Capability Broker SSOT document.

## 3. Workflow

- [x] 3.1 Migrate `literature-metadata-curator` preflight to prefer `runtime.hostApi.metadata.translateIdentifier(...)`.
- [x] 3.2 Keep direct-runtime `runtime.zotero.Translate.Search` as legacy/test fallback only.
- [x] 3.3 Update current-state workflow documentation.

## 4. Tests and Verification

- [x] 4.1 Add Host API broker tests for metadata translate JSON-safe behavior and unchanged Host API version.
- [x] 4.2 Add metadata curator `executeBuildRequests()` tests for precompiled-hook short-circuit behavior.
- [x] 4.3 Run focused workflow and broker tests, TypeScript validation, strict OpenSpec validation, and diff checks.
