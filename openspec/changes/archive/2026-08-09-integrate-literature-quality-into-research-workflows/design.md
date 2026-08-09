## Context

The fixed semantic baseline is `77c30549cfa2718036c4efd42799182ccbe31ceb`. At that baseline, Registry coverage owns a three-artifact set while `literature_score.v1` is read separately for UI routing. Topic Stage 30 invents `paper_quality_level`, Research Bundle uses an opaque `score`, and Manuscript Framing does not freeze intrinsic quality in its evidence inventory.

Affected materialized Host Bridge baseline metrics are:

| File | Lines | Characters |
| --- | ---: | ---: |
| `zotero-bridge-cli/.../artifact/export-filtered.md` | 464 | 14738 |
| `zotero-bridge-cli/.../artifact/manifest.md` | 412 | 12562 |
| `zotero-bridge-cli/.../artifact/read.md` | 464 | 14506 |
| addon `zotero-research-synthesis/SKILL.md` | 207 | 13244 |
| addon `zotero-research-synthesis/references/playbook.md` | 369 | 17145 |
| Hermes inherited `zotero-research-synthesis/SKILL.md` | 207 | 13244 |
| Hermes inherited `zotero-research-synthesis/references/playbook.md` | 369 | 17145 |

The explicit semantic deletion inventory is empty. No existing Host Bridge instruction may be compressed, deleted, merged, reordered, or replaced by thinner wording.

## Goals / Non-Goals

**Goals:**

- Establish one four-artifact SSOT and one quality snapshot/quality-prior implementation.
- Preserve relevance and Topic-mandatory boundaries before quality affects ranking.
- Make quality changes observable in Topic freshness and surface-local Workbench invalidation.
- Keep decoded score payloads complete in filtered exports while manifests remain compact.
- Preserve Host Bridge semantic parity and current-state-only Skill contracts.

**Non-Goals:**

- Generating scores during reference refresh or automatically backfilling a library.
- Ranking or excluding manuscript evidence solely by intrinsic quality.
- Expanding candidates through high quality when relevance rules reject them.
- Changing the Host Bridge CLI command set, Rust CLI, release identity, or publication state.

## Decisions

### One paper-artifact vocabulary

`PaperArtifactType` and `PAPER_ARTIFACT_TYPES` are the sole vocabulary. Payload mapping, default requests, coverage, artifact facets, row hashes, Topic dependency snapshots, and Index state reuse them. The `reference` facet continues to hash only references and citation analysis.

### One quality projection

The shared score module validates `literature_score.v1` and derives a compact `LiteratureQualitySnapshot` with status, schema/rubric/paper type, three score fields, `quality_prior`, and payload hash. The only formula is:

`quality_prior = 0.5 + confidence * (overall_score / 100 - 0.5)`

Missing and invalid scores use `0.5` and stable `literature_score_missing` or `literature_score_invalid` diagnostics. Exported score content remains the complete decoded payload.

### Relevance gates quality

Topic relevance maps `core=1`, `related=0.65`, `external=0.3`, `irrelevant=0`, and `unknown=0.5`. Only core/related papers enter core context; external/unknown stay external and irrelevant enters neither. Topic selection uses 45% relevance, 20% quality, 20% artifact availability, and 15% graph.

Research Bundle first enforces the 0.45 semantic threshold and Topic-mandatory policy. With graph metrics, weights are 50% semantic, 15% quality, 15% graph, 15% Topic coverage, and 5% material readiness. Without graph metrics, graph weight returns to semantic relevance, making it 65%.

### Frozen workflow evidence

Topic rows and final `source_papers[]` carry `literature_quality` and `context_selection_score`. Research Bundle carries four-artifact states, the same snapshot, every component, and `selection_score`. Manuscript Stage 2 persists `writing.manuscript_evidence_inventory` `1.0.0`; later stages consume that frozen inventory and do not re-score intrinsic quality.

### Freshness and UI behavior

Topic dependency snapshots include score status and payload hash. Any score addition, removal, invalidation, or content change produces a score-specific freshness reason and `update_full`. Score-note change invalidates only Index, Topics, and Home surfaces.

Index renders four artifact icons and retains the separate star Rating column. Analyze is disabled only when all four artifacts are available; a complete legacy triplet plus missing/invalid score routes to score-only; any legacy artifact gap routes to full analysis. The UI DTO does not carry a separate routing mode.

### Governed surfaces

Host Bridge command and research-task guidance changes are made only in semantic sources. Unified rendering owns addon/Profile materialization. The baseline-relative package gate must retain substantive line count and at least 95% normalized prose, while semantic review must separately report zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate units.

## Versioning

- `synthesis.filtered_paper_artifacts_manifest` `1.1.0`
- `synthesis.runtime_paper_context_selection` `2.0.0`
- `synthesis.topic_synthesis_artifact` `4.0.0`
- `research_bundle.selection` `2.0.0`
- `writing.manuscript_evidence_inventory` `1.0.0`

## Risks / Trade-offs

- Four-artifact completeness changes existing Index and Registry states. The single constant and targeted regression coverage prevent drift.
- Invalid score payloads must remain distinguishable from absence. Artifact status retains `error`, while the quality snapshot uses `invalid`.
- Generated Skill and Host Bridge trees are large. Source-only edits plus renderer and baseline gates prevent divergent manual fixes.

## Validation

Use focused Registry/API/Index/Topic/Research Bundle/Manuscript tests first, then TypeScript, sidebar typecheck, workflow manifest, formatter/lint, strict OpenSpec, Topic renderer drift, Host Bridge unified render/check, semantic parity, review mirror, and baseline-relative instruction-depth gates.
