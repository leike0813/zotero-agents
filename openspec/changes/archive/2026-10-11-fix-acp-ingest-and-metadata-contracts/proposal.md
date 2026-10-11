# Proposal

## Why

ACP literature ingestion rejects library-root destinations, attachment removal calls unsupported native readers, and metadata fallback emits a field rejected by its Skill schema. Automatic approval also reports a misleading `none` policy.

## What Changes

- Make collection membership optional for literature ingestion; resolve an explicit library or the personal library when no collection is requested.
- Enumerate permanent-removal descendants using native item-type APIs, including trashed children and annotations.
- Keep metadata URLs in `parent.fields.url` and validate the real workflow request.
- Report effective automatic write approval as `auto-approved` in manifests and receipts without prompting.
- Synchronize canonical contracts, CLI validation, Broker documentation and governed agent guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-broker-capability-api`: root ingestion, native removal scope and effective approval evidence.
- `host-bridge-cli-literature-ingest`: optional collection and current semantic command.
- `workflow-host-api-v12`: preserve the same optional destination through the Workflow projection.

## Impact

Broker DTOs and schemas, Bridge HTTP/MCP permission consumers, Rust CLI embedded contracts, metadata workflow, existing regression tests and agent surfaces. No dependency changes, real-library changes or release publication.
