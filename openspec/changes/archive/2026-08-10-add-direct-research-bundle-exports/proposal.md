## Why

Agents can read paper artifacts and download registered files, but they cannot directly materialize a self-contained research bundle for an explicit set of Zotero papers or Synthesis Topics. They currently have to reconstruct the bundle piecemeal or run the broader `export-research-bundle` workflow even when the requested scope is already known.

## What Changes

- Add direct paper research-bundle export for one or more Zotero item refs, including portable metadata, Markdown-or-PDF source material, and the available digest, references, citation-analysis, and literature-score artifacts.
- Add direct Topic research-bundle export for one or more Topic ids, including each Topic report and one globally deduplicated digest per associated canonical Zotero paper ref.
- Reuse one Host-owned paper materialization contract across direct export and the existing Research Bundle Product workflow while preserving their distinct selection, bibliography, Product, and delivery semantics.
- Deliver local requests into an explicit output directory and remote requests through the existing bridge-download file-handle contract.
- Add the two commands to the Minimum CLI surface and integrate direct delivery as an independent branch in the Generic Library Agent research lifecycle.
- Preserve existing instructions in place; the explicit semantic deletion inventory is empty.

## Capabilities

### New Capabilities

- `direct-research-bundle-export`: Direct paper and Topic bundle scope, content, layout, diagnostics, limits, and local/remote delivery behavior.

### Modified Capabilities

- `research-bundle-workflow`: Share canonical paper materialization without changing workflow selection, bibliography, Product registration, or visible Product behavior, and align the artifact count with the implemented score payload.
- `host-bridge-cli-interface`: Expose the two canonical CLI leaves with executable input and result contracts.
- `host-bridge-output-boundaries`: Apply bounded file delivery, path redaction, no-overwrite, and typed Handle recovery to direct bundle exports.
- `host-bridge-agent-surfaces`: Render complete Minimum command facts and Generic task policy without duplicating policy into Hermes.
- `zotero-library-agent-bundle`: Route direct bundle requests through the Generic Synthesis task and define delivery evidence and recovery independently of workflow Product export.

## Impact

- Host Bridge capability registration, Synthesis artifact access, workflow Host API, archive writing, file-handle delivery, and generated executable contracts.
- Rust `zotero-bridge` command parsing, request composition, and result validation.
- Existing Research Bundle workflow paper materialization internals, with no Product schema or selection behavior change.
- Minimum and Generic agent-facing semantic sources plus rendered surfaces and the Chinese ownership review mirror.
- No new runtime dependency, Zotero mutation, release dispatch, or prebuild publication.
