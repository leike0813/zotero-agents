## Overview

This change introduces a hard write boundary: normal Synthesis runtime code may not write under `<persistence>/data/synthesis/**`. The DB remains the hot-path SSOT. Any remaining legacy JSON/canonical helpers must write only to non-data runtime/debug locations until they are replaced by DB-backed implementations or explicit export/checkpoint commands.

## Decisions

- Resolve all internal Synthesis file roots through a runtime file root, not the data root. When callers pass the historical `dataDir` or `data/synthesis` root, path construction maps to `<persistence>/runtime/synthesis`.
- Keep repository state in `state/zotero-agents.db`. Do not move DB tables or change schema ownership merely to satisfy file placement.
- Explicit import/export/checkpoint commands may still read or write file bundles, but those bundles are not Workbench state and must not be used as snapshot fallbacks.
- Clean-install reset clears DB runtime state and removes both old data-root Synthesis files and the new runtime-root Synthesis scratch files.

## Implementation Notes

- Centralize path mapping in `foundation.ts` so all legacy helpers share the same boundary.
- Add a path helper that recognizes historical roots:
  - `<root>/data`
  - `<root>/data/synthesis`
  - `<root>/runtime/synthesis`
  - direct test roots
- Update reset/debug cleanup to remove both `<persistence>/data/synthesis` and `<persistence>/runtime/synthesis`.
- Keep DB-first UI behavior intact; do not reintroduce JSON fallback reads.

## Risks

- Some older tests assert exact JSON file paths. These should be updated to assert behavior or explicit export output rather than hot-path implementation files.
- This does not complete the full semantic DB migration of topic artifact details; it prevents data-root writes first and leaves the deeper DB-only topic artifact persistence as follow-up tasks inside this change.
