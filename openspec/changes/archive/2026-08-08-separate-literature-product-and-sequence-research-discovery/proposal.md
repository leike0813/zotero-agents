## Why

The unified literature export introduced in `af757a4b` reused the compact Research Product contract and therefore stopped preserving every PDF, ordinary note, note image, and item relation required for a faithful cross-instance Zotero import. The Research Bundle discovery runtime also searches the library before Topic assessment and reads Topic papers from a Host response shape that no longer exposes them inline, so selected Topics do not reliably contribute their complete paper sets.

## What Changes

- Introduce an independent, agent-readable `literature_bundle.product@1.0.0` contract that preserves complete Zotero parent metadata, direct attachments, notes, note images, embedded workbench payloads, and in-bundle relations.
- Keep the compact `research_bundle.product@2.0.0` contract separate: core papers carry one Markdown-or-PDF source and new exports include only digest, references, and citation-analysis payloads.
- Reorder Research Bundle discovery so Topic assessment precedes Topic paper collection and library search, merge both sources by `paper_ref`, and prevent graph neighbors from expanding the candidate set.
- Keep Topic-associated papers mandatory through assessment and selection, with diagnostics when Topic context cannot provide its resolved paper set.
- Update the export-research-bundle Skill, workflow documentation, and public behavior tests to describe and enforce the current contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-bundle-workflows`: Define the independent lossless Literature Product export/import contract and its Agent-facing projections.
- `research-bundle-workflow`: Define Topic-first candidate discovery, graph enrichment boundaries, and the compact three-payload Research Product contract.

## Impact

- Affected bundle code: `workflows_builtin/literature-workbench-package/lib/` and the workflow package manifest.
- Affected runtime: `skills_builtin/export-research-bundle/scripts/stage_runtime.py` and its Skill contract.
- Affected public interfaces: the default Literature Bundle manifest identity and layout; Research Product identity and selection schema remain unchanged.
- No dependency installation, database migration, workflow parameter change, or Zotero storage-format change is required.
