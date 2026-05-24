## Why

Topic synthesis runtime validation has become stricter than the instructions exposed to agents. Recent runs failed because `SKILL.md` and reference examples did not fully describe the payloads required by `runtime_db.py` and the package-local JSON schemas.

The most visible drift is in citation graph metrics, filtered artifact manifests, paper-unit analyses, and cross-paper evidence maps. In addition, `synthesis.export_filtered_paper_artifacts` writes a manifest that omits `payload_types_seen`, even though `persist_filtered_artifact_manifest` validates that field.

## What Changes

- Align create/update topic synthesis skill instructions with the runtime payload contracts for:
  - `persist_citation_graph_metrics`
  - `persist_filtered_artifact_manifest`
  - `persist_paper_units`
  - `persist_cross_paper_evidence_map`
- Update step reference examples so they use schema-valid `analyses[]`, paper analysis rows, and cross-paper evidence map rows.
- Fix filtered artifact export so manifest rows always carry `payload_types_seen[]`; missing rows without observed payload evidence use an empty array.
- Add targeted regression coverage for the export manifest field and documentation contract snippets.

## Impact

- Affected skills: `create-topic-synthesis`, `update-topic-synthesis`.
- Affected module: `src/modules/synthesis/service.ts`.
- Affected tests: synthesis MCP/runtime contract tests.
- No schema relaxation and no new runtime stage behavior.
