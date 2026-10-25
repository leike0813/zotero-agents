# Proposal

## Why

Literature export requests a nonexistent native ZIP writer contract and falls back to a JavaScript encoder whose numeric arrays amplify memory use. A 32 MiB input reproduces heap exhaustion under a 192 MiB heap limit. Long exports also repeat a discarded snapshot checksum pass and provide no progress feedback.

## What Changes

- Select the native Zotero ZIP writer correctly, write asynchronously, and verify before atomic publication.
- Replace numeric-array ZIP assembly with a bounded-allocation ZIP32 encoder for Node consumers.
- Add scoped, dismissible workflow progress toasts and optional operation progress observations.
- Integrate progress and stage diagnostics into literature export, remove the unused snapshot checksum pass, and use materialized attachment bytes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-host-api-v12`: scoped progress notification member, observational call progress, and asynchronous atomic archive behavior.
- `workflow-execution-notifications`: validated progress controllers with caller ownership and cleanup.
- `literature-bundle-workflows`: observable export stages and stable materialized export sources.

## Impact

Workflow Host types, manifest, facade and leaf scope; archive and ZIP encoder; notification owner; research materializer; literature package code, locales and documentation; existing Node and isolated Zotero tests. No new dependencies or changes to the exported product schema. The ordinary toast API remains fire-and-forget. The separate research export workflow is outside this change.
