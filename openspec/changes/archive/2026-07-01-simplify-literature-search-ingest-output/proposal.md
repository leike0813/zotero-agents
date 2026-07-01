## Why

`literature-search-ingest` currently returns the confirmed candidates, summary counters, full per-paper ingest results, and missing-PDF references, which repeats the same paper metadata several times and makes the final user-facing result noisy.

The workflow also already knows the paper landing page when a PDF is unavailable, but `literature.ingest` only attempts PDF attachment import; users must copy links out of the result JSON instead of opening the original page from the Zotero item.

## What Changes

- Simplify the `literature-search-ingest` success output to list successful ingest references, missing-PDF references with web links, and only non-empty ingest failures.
- Extend the single-paper `literature.ingest` payload with `paper.attachLandingUrlOnMissingPdf`.
- When explicitly requested and the ingested item still has no PDF attachment, create a Zotero linked URL attachment from `landingUrl`.
- Keep URL-link attachment best-effort: failure records structured status but does not roll back or fail the bibliographic item ingest.
- Preserve the current no-op workflow `applyResult` behavior because the write action remains owned by permission-gated ingest calls.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `zotero-host-broker-capability-api`: `literature.ingest` gains an opt-in missing-PDF landing URL attachment behavior and current single-paper canonical input semantics.
- `host-bridge-cli-literature-ingest`: Host Bridge literature ingest CLI documentation and examples reflect the single-paper payload and new landing URL attachment option.
- `literature-workbench-workflows`: `literature-search-ingest` output contract is reduced to the user-facing ingest and missing-PDF reference lists.

## Impact

- Affected code: Host Capability Broker literature ingest, internal attachment handlers, Zotero mock attachment APIs, built-in `literature-search-ingest` skill assets, Host Bridge CLI generated documentation surfaces.
- Affected tests: core MCP/Host Bridge literature ingest tests and built-in workflow contract tests.
- API impact: additive optional `paper.attachLandingUrlOnMissingPdf`; existing callers are unchanged by default.
