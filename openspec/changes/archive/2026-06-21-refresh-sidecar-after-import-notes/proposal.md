## Why

`import-notes` can write literature digest generated notes without notifying the Synthesis reference sidecar pipeline. Imported references can therefore leave the sidecar index stale until another workflow, such as `literature-analysis`, refreshes the same parent item.

## What Changes

- Trigger literature digest sidecar apply after `import-notes` imports any standard generated note.
- Keep the refresh partial-safe: imported digest, references, and citation-analysis artifacts are independent, and missing siblings are not fabricated.
- Share the sidecar apply wrapper used by `literature-analysis` and `import-notes`.
- Return the sidecar apply result from `import-notes` when a standard import triggers it.

## Capabilities

### New Capabilities

### Modified Capabilities

- `literature-workbench-package`: `import-notes` sidecar refresh behavior changes after standard generated-note import.

## Impact

- Affected workflows: `import-notes`, `literature-analysis`.
- Affected package helpers: `literature-workbench-package/lib`.
- No new runtime dependency.
- No change to custom-note import behavior.
