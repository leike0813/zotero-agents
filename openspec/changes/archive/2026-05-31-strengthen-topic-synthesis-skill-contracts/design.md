## Design

The final analysis manifest becomes the machine-readable index for section
files and sidecars. Runtime still writes sidecars to fixed paths and registers
them in `artifact_registry`, then `validate_final_artifacts` renders:

```json
{
  "sidecars": {
    "topic_interest_metadata": { "path": "...", "hash": "...", "content_type": "json", "schema_id": "topic_interest_metadata.v1" },
    "concept_cards_proposal": { "path": "...", "hash": "...", "content_type": "json", "schema_id": "synthesis.concept_cards_proposal" },
    "topic_graph_relation_proposals": { "path": "...", "hash": "...", "content_type": "json", "schema_id": "synthesis.topic_graph_relation_proposals" }
  }
}
```

Host apply reads `analysis_manifest_path`, validates the manifest, and uses
`manifest.sidecars` to ingest concept proposals, topic graph proposals, and
topic interest metadata. Legacy top-level bundle fields remain optional fallback
only; manifest entries take precedence.

Skill documentation uses a two-level schema presentation:

- `SKILL.md`: compact payload skeleton, stage-local semantics, command.
- `references/step_*.md`: fuller schema/example first, then field-level semantic
  rules, examples, empty-output guidance, and anti-patterns.

Canonical names come from `runtime_db.STAGES` and gate `next_action`; aliases
may be mentioned only as compatibility notes, not in primary headings or
commands.

## Compatibility

Existing run workspaces that still emit top-level sidecar path fields are
accepted by host apply when the manifest lacks a sidecar entry. New runtime
outputs should not rely on those fields.
