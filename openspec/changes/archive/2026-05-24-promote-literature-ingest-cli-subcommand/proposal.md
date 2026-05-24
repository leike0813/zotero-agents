## Why

Literature search ingest currently has no first-class Host Bridge CLI command, so
agents must rely on old MCP tool names or raw mutation calls. The ingest action
also appears as `paper.ingest` internally, which conflicts with the desired
agent-facing `literature ingest` surface.

## What Changes

- Add `zotero-bridge literature ingest --input <JSON_OR_FILE>` as the stable
  CLI entry point for Zotero literature ingest.
- Rename the canonical mutation operation to `literature.ingest`.
- Keep `paper.ingest` as a legacy input alias, normalized to
  `literature.ingest` in preview and execute responses.
- Update Host Bridge CLI documentation, run workspace guidance, injected prompt
  text, and the built-in literature-search-ingest skill to use the new command.
- Keep raw `call mutation.*` as an advanced diagnostic path, not the normal
  agent instruction.

## Capabilities

### New Capabilities

- `host-bridge-cli-literature-ingest`: The Host Bridge CLI exposes a stable
  semantic command for permission-gated literature ingest.

### Modified Capabilities

- `zotero-host-broker-capability-api`: The controlled mutation API uses
  `literature.ingest` as the canonical literature ingest operation while
  accepting only single-paper `literature.ingest` payloads.

## Impact

- Code:
  - Host Bridge mutation broker and approval prompt construction.
  - Rust CLI argument model, dispatch, and tests.
  - MCP tool contract for single-paper `ingest_paper`.
- Documentation:
  - Formal Host Bridge CLI manual.
  - ACP run workspace Host Bridge CLI README template.
  - ACP Host Bridge CLI prompt template.
  - Built-in literature-search-ingest instructions and runner prompt.
- Compatibility:
  - Existing raw `paper.ingest` and batch payloads are no longer accepted.
