## 1. OpenSpec

- [x] 1.1 Validate the new OpenSpec change artifacts in strict mode.

## 2. Concept KB Service

- [x] 2.1 Add concept, sense, alias, relation, topic-link, proposal, projection, and diagnostics types.
- [x] 2.2 Implement canonical load/save/upsert, manifest, diagnostics, and `concept-kb-index` projection rebuild.
- [x] 2.3 Implement concept card proposal parsing, exact alias merge, token-overlap review diagnostics, and topic concept links.
- [x] 2.4 Implement display-text edit helpers and overlay DTO generation.

## 3. Topic Synthesis Integration

- [x] 3.1 Extend topic synthesis result bundle validation and host apply to read optional concept proposal sidecar.
- [x] 3.2 Update create/update topic synthesis skill instructions, schema, runner prompt, and runtime final bundle support for the sidecar.
- [x] 3.3 Ingest concept proposals after successful topic synthesis apply without blocking main artifact persistence.

## 4. Workbench UI

- [x] 4.1 Add Concepts tab snapshot state, filters, selected concept state, projection state, diagnostics, and overlay enabled state.
- [x] 4.2 Render Concepts tab list/detail and route display-text edit host command.
- [x] 4.3 Add dynamic concept overlay and bubble support for reader/detail content without rewriting source text.

## 5. Tests and Validation

- [x] 5.1 Add core tests for concept canonical files, proposal ingestion, exact alias merge, review diagnostics, projection rebuild, and sanitized diagnostics.
- [x] 5.2 Extend topic synthesis workflow/structured artifact tests for concept sidecar validation and apply ingestion.
- [x] 5.3 Extend Synthesis Workbench UI tests for Concepts tab, read-only identity, display-text edit routing, and overlay skip/bubble behavior.
- [x] 5.4 Run focused OpenSpec, core, TypeScript, and formatting validations.
