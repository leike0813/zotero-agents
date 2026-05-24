## Runtime Contract Source Of Truth

The package-local `runtime_db.py` and JSON schemas are the executable contract. This change documents the existing contract instead of weakening validation.

Key contracts:

- `persist_citation_graph_metrics` requires the requested batch paper refs to be present, with `paper_refs[]` as the documented top-level field.
- `persist_filtered_artifact_manifest` requires every artifact status row to provide `payload_types_seen[]`. Available artifacts must include their own payload type in that array; missing artifacts must not include their own payload type.
- `persist_paper_units` accepts a batch object with top-level `analyses[]`. Each row must satisfy `paper_analysis_row.schema.json` and the runtime's digest/artifact availability checks.
- `persist_cross_paper_evidence_map` accepts the full evidence-map shape validated by `validate_cross_paper_evidence_map`, including schema metadata, evidence limits, candidate arrays, required reference keys, debate evidence type, and constrained gap types.

## Filtered Manifest Export

The host export command already reads artifact probe rows that contain `payload_types_seen`. The bug is that `exportFilteredPaperArtifacts` drops that field while materializing `runtime/payloads/paper-artifacts-manifest.json`.

The fix is intentionally narrow:

- Copy `payload_types_seen` from each artifact row into the manifest entry.
- Normalize absent or invalid values to `[]`.
- Keep filtered content files and hashes in the manifest, but do not expose payload bodies or hashes in the MCP response.

## Documentation Strategy

Both create and update topic synthesis skills carry their own bundled runtime. Their `SKILL.md` and reference documents must be updated in lockstep so either workflow gives the agent the same executable contract.

The reference docs remain optional analysis guidance, but their examples should not train the agent to emit payloads that fail the runtime.
