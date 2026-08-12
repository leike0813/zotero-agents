## Why

`export-research-bundle` currently reads each selected Topic's saved `resolved_paper_set` snapshot instead of the current Topic artifact's canonical `source_papers` table. A valid but empty saved snapshot can therefore cause every Topic paper to disappear from candidate discovery without a diagnostic, leaving metadata search as the bundle's only real input.

## What Changes

- Read selected Topic papers from the existing `topics.get_context` semantic view and treat `semantic.source_papers` as the Topic membership source of truth.
- Preserve valid Topic papers as mandatory candidates while allowing missing, malformed, empty, or partially invalid Topic source tables to degrade to bounded metadata discovery with structured runtime diagnostics.
- Prevent degraded zero-candidate discovery from being mislabeled as confirmed empty or producing `no_related_literature`.
- Update the current-state Skill, gate guidance, workflow documentation, and focused tests to use the same Topic source-paper semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-bundle-workflow`: Change Topic candidate discovery from saved resolver snapshots to current Topic `source_papers`, and define degraded discovery and diagnostic behavior.

## Impact

- Affects the built-in `export-research-bundle` Skill runtime, instructions, gate text, and workflow README.
- Uses the existing `topics.get_context` semantic response; no Host Bridge capability, database, dependency, Product manifest, or workflow output-schema change is required.
- Extends the existing Research Bundle runtime and Synthesis integration tests without adding test files.
