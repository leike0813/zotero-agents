## Why

Host Bridge exposes ACP's `autoApproveAcpPermissions` schema through workflow discovery, but rejects the same request-level provider option at submit time. External workflow agents therefore cannot apply an explicitly configured ACP permission policy through the existing CLI submission payload.

## What Changes

- Allow `providerProfile.providerOptions.autoApproveAcpPermissions` in Host Bridge workflow describe, requirements, validate, and submit requests.
- Preserve all existing provider-profile restrictions for credentials, endpoints, and local paths.
- Document provider, backend, and request-level provider profile as distinct concepts, and document the ACP auto-approval option for the Zotero Bridge CLI and Zotero Librarian profile.
- Keep provider profiles external-agent-owned and request-scoped; Host Bridge does not persist, manage, or infer them.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `host-bridge-workflow-control`: accept and apply the ACP auto-approval provider option in a validated workflow request.
- `host-bridge-cli-interface`: document the request-level provider-profile payload and its ACP permission policy boundary.
- `zotero-librarian-profile`: guide the profile to use the option only as an external workflow preset supplied at submission.

## Impact

- Host Bridge workflow-control validation and its focused regression tests.
- Existing Rust CLI request-payload coverage; no new CLI argument or endpoint.
- Host Bridge semantic sources and their generated wrapper, documentation, and published profile outputs.
