# Proposal

## Why

C03 can choose a Pi model and retain encrypted credentials, but no production path can execute the selected model. C04 connects that frozen choice to native pi-ai streaming before Conversation integration.

## What Changes

- Add API-key and explicitly keyless Provider execution over supported native wire adapters.
- Preserve typed, redacted Provider failures through the C01 turn terminal.
- Add transient API-key management and an explicit connection test to the Built-in Agent page.
- Guard the exact unreachable Bun-only `provider-env.js -> node:fs` import in the browser build.

## Capabilities

### New Capabilities

- `pi-api-key-provider-execution`: Credential-bound native Provider streams, admission, cancellation, and failure behavior.

### Modified Capabilities

- `builtin-pi-runtime-spine`: Preserve project-owned typed model failures through the turn terminal.
- `backend-manager-ui`: Add credential actions and an explicit connection test to the Built-in Agent page.

## Impact

Pi Runtime and Provider configuration modules, Backend Manager host/page wire and Preact UI, browser build guard, targeted Node/Zotero tests, and living handoff. No dependency or Backend Profile migration.
