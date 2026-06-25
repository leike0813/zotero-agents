## Context

`literature-analysis` writes digest, references, and citation-analysis notes through `upsertLiteratureDigestGeneratedNotes`, then calls `runtime.hostApi.synthesis.applyLiteratureDigestSidecar`. `import-notes` uses the same note writer but currently returns immediately after the write. The Synthesis service already treats omitted digest, references, or citation-analysis inputs as missing artifacts, so the import path does not need a complete three-note set.

## Goals / Non-Goals

**Goals:**

- Refresh the Synthesis reference sidecar after standard `import-notes` imports.
- Preserve partial import behavior for any combination of digest, references, and citation-analysis artifacts.
- Avoid duplicate sidecar wrapper logic between `literature-analysis` and `import-notes`.

**Non-Goals:**

- Do not trigger sidecar apply for custom markdown notes.
- Do not introduce automatic reference matching.
- Do not require `import-notes` to read sibling notes that were not selected in the current import batch.

## Decisions

- Move the workflow-local sidecar wrapper into `lib/literatureDigestSidecar.mjs`.
  - Rationale: both workflows need the same host API guard and request shape.
  - Alternative considered: duplicate the wrapper in `import-notes`; rejected because it would create another place where source metadata and host API behavior can drift.
- Build sidecar inputs only from selected standard import candidates and notes written by the current batch.
  - Rationale: importing one artifact should refresh the cache for that artifact without pretending the other artifacts were re-imported.
  - Alternative considered: read existing sibling notes to send a complete sidecar payload; rejected because it expands the import operation beyond the selected files and can mask missing/stale sibling state.
- Return `sidecar_apply` as an optional result field.
  - Rationale: callers that care can inspect the refresh result; existing callers that only read `imported` and `representative_image` are unaffected.

## Risks / Trade-offs

- Partial import marks omitted siblings as missing for the source ref according to the Synthesis service contract. This matches the current sidecar API semantics and keeps import behavior honest.
- Host API implementations without `synthesis.applyLiteratureDigestSidecar` still return `null` from the helper, preserving graceful behavior in limited test or runtime environments.

## Open Questions

- None.
