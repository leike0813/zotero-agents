# Design

## Artifact Shape

The playbook is stored under
`artifact/topic-synthesis-create-detr-playbook/` and is intentionally structured
like a run workspace:

- `runtime/input.json` fixes the seed, language, and operation.
- `runtime/bridge/*.json` records read-only Host Bridge command transcripts or
  explicit error transcripts.
- `runtime/payloads/*.json` stores schema-valid stage payload examples.
- `runtime/views/*` stores the derived 5-paper workset views used by later
  stages.
- `runtime/handoff/*.json` stores handoff manifests validated by the split
  skill handoff schema.
- `result/*` stores a dry-run final candidate bundle and public result paths.
- `schemas/examples/*.json` mirrors stage payload examples as stable test
  fixtures.

The artifact records `zotero-bridge` output as environment evidence, not as a
new persistence path. Any command that would require an ACP run workspace or
write host state is recorded as diagnostics instead of forced.

## Data Minimization

The captured data keeps paper refs, item keys, titles, years, tags, manifest
hashes, and short analysis summaries. It does not retain local attachment
paths, full digest bodies, or arbitrary Zotero note contents. Resolver output is
kept because it is small and required to prove that the selected 5 papers are a
deterministic subset of the live resolver result.

## Selection Policy

The resolver uses `{"mode":"tag_query","query":{"and":["model:DL/DETR"]}}`.
The selected 5 papers cover:

- original DETR baseline,
- Deformable DETR as sparse/multi-scale attention improvement,
- Conditional DETR as convergence-oriented query design,
- DINO as denoising anchor/query training improvement,
- real-time DETR-vs-YOLO direction.

This intentionally keeps paper triage and cross-paper context bounded while
preserving representative route diversity.

## Validation

The focused test validates filesystem structure, resolver subset identity,
stage payload schemas, handoff schema, and final candidate shape. It avoids
locking long prose, full bridge response ordering, or exact user-facing text.
