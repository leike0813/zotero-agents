# Design: Split Output to Host Apply Alignment

## Runtime Output Strategy

The Host apply layer remains the authority for persisted topic artifacts. The
split finalize runtime must provide the same complete structured artifact shape
that the Host currently validates:

- `result/topic-analysis.json` is a complete
  `synthesis.topic_analysis_manifest`.
- Every section entry has `path`, `hash`, and `content_type: "json"`.
- Every sidecar entry has `path`, `hash`, `content_type: "json"`, and
  `schema_id`.
- `result/sections/*.json` covers the complete section set consumed by
  `assembleTopicArtifact`, `validateTopicSynthesisArtifact`, storage, and topic
  details UI.

The runtime may derive conservative fallback section content from prepare
triage, core payloads, KG payloads, coverage payload, and summary payload. These
fallbacks are runtime-owned artifacts, not LLM-written files.

## Apply Compatibility

`validateSynthesisResultBundle` continues to accept the split final candidate.
The service still rejects incomplete create/update_full analysis manifests, but
error reporting should identify the split-output mismatch clearly. Where a
manifest already provides sidecar entries, apply may use those paths even when
legacy top-level sidecar path fields are absent.

## Topic Details UI

The details page keeps existing semantic sections but presents them in a clearer
workbench layout:

- Header and toolbar show language, paper count, external count, coverage and
  artifact hashes.
- Navigation groups the old section set into Overview, Evidence, Routes/Claims,
  Coverage, Report, and Provenance-oriented views.
- A provenance panel exposes manifest schema, section hashes, sidecars,
  resolver paths, artifact paths and diagnostics.
- Missing optional fields render stable empty states instead of blank panels.

The UI change is scoped to topic details and does not redesign the whole
synthesis workbench.
