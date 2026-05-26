## 1. OpenSpec

- [x] 1.1 Validate the new OpenSpec change artifacts in strict mode.

## 2. Topic Graph Service

- [x] 2.1 Add topic graph types, deterministic ids, canonical schemas, normalization, and validation.
- [x] 2.2 Implement canonical load/save/upsert, manifest, diagnostics, and `topic-graph-index` projection rebuild.
- [x] 2.3 Implement relation proposal parsing and safe ingestion rules.

## 3. Topic Synthesis Integration

- [x] 3.1 Extend topic synthesis result bundle validation and host apply to read optional proposal sidecar.
- [x] 3.2 Update create/update topic synthesis skill instructions, schema, and runtime final bundle support for the sidecar.
- [x] 3.3 Upsert materialized topic nodes and ingest proposals after successful topic synthesis apply.

## 4. Workbench UI

- [x] 4.1 Add topic graph snapshot state, graph view mode defaults, graph submodes, and selected topic state.
- [x] 4.2 Render Topics Graph / List / Grid views and Topic Inspector from snapshot DTO.

## 5. Tests and Validation

- [x] 5.1 Add core tests for topic graph canonical files, edge ids, proposal ingestion, projection rebuild, and diagnostics.
- [x] 5.2 Extend topic synthesis workflow/structured artifact tests for proposal sidecar validation and apply ingestion.
- [x] 5.3 Extend Synthesis Workbench UI tests for Topics graph mode, Unplaced/root handling, inspector, and List/Grid fallback.
- [x] 5.4 Run focused OpenSpec, core, TypeScript, and formatting validations.
