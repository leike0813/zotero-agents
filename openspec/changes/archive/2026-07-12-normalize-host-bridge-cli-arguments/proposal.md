## Why

The Host Bridge CLI currently uses `--input` for both read queries and write
payloads, which obscures caller intent and encourages agents to use the raw
`call` escape hatch. Several workflow and file-output flags also use names
that do not describe their distinct domains.

## What Changes

- Make `--query` the canonical JSON-or-file flag for semantic read commands,
  while retaining hidden `--input` compatibility aliases.
- **BREAKING** Require `library item search --query` to contain a JSON query
  object; remove its bare-text query form.
- Make workflow selection, workflow requirements, and product output flags
  domain-specific, retaining hidden compatibility aliases where required.
- Render current agent guidance from the Host Bridge surface sources so it
  describes inline JSON as the default and keeps raw `call` diagnostic-only.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host-bridge-cli-interface`: Canonical argument names, read query handling,
  workflow selection and requirements syntax, product output syntax, and
  generated agent guidance change.

## Impact

- `cli/zotero-bridge` Clap arguments, command mapping, and parser tests.
- Host Bridge surface catalog, semantic wrapper sources, rendered wrapper and
  Zotero Librarian guidance, and CLI reference documentation.
