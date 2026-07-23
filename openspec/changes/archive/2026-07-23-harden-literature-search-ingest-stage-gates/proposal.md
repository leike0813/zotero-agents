## Why

`literature-search-ingest` needs a complete executable contract that preserves
its guided, multilingual, seed-expansion, targeted-ingest, candidate-review, and
typed-Zotero behavior while making every stage observable and fail-closed.
Natural-language instructions alone cannot enforce discovery rounds, evidence
quality, three-route PDF coverage, immutable payloads, or receipt binding.

## What Changes

- Keep Literature Search Ingest interactive, with explicit user decisions for
  the search plan and ingest scope.
- Preserve the complete Skill semantics in a standalone `SKILL.md` and deepen
  stage-specific judgment through four directly routed references.
- Add a strict Draft-07 action schema and lightweight JSON gate runtime that
  prevents search before plan approval and prevents ingest before every
  approved candidate completes metadata resolution and public-PDF probing.
- Model discovery as cumulative rounds. Stage 30 may approve, request a focused
  expansion that returns to Stage 20 with the next round, or cancel.
- Automatically execute metadata resolution, PDF probing, typed payload
  preparation, and per-paper ingest after the user approves the ingest scope,
  without adding another waiting state.
- Apply evidence acceptance and original-script rules aligned with the
  successful `literature-metadata-search` Skill.
- Make cancellation terminal and explicit at the two user-decision stages;
  distinguish completed and canceled terminal gates while using the same final
  return action.
- Store DOI in Zotero's native DOI field whenever the selected item type
  supports it; use `Extra` only for item types without a native DOI field.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-package`: Require the interactive search and ingest
  workflow to advance through deterministic stage gates while preserving two
  user decision points and automating the approved post-selection work.
- `zotero-host-broker-capability-api`: Normalize typed ingest DOI values into
  the native Zotero DOI field when supported and limit the `Extra` fallback to
  unsupported item types.

## Impact

- Built-in Literature Search Ingest Skill instructions, four stage references,
  strict runtime action schema, runner metadata, package documentation, and
  standard-library Python gate scripts.
- Literature Workbench workflow version and focused contract/runtime tests.
- Zotero Host Broker typed literature-ingest normalization and its regression
  tests.
- No new dependency, SQLite database, provider API, workflow output shape,
  release action, or non-interactive execution mode.
