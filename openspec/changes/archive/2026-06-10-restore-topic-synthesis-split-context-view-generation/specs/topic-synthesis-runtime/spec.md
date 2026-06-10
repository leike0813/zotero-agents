## MODIFIED Requirements

### Requirement: Runtime-owned outputs are materialized by runtime actions

The split topic synthesis runtime SHALL own handoffs, views, sidecars, sections,
manifests, and final candidates.

#### Scenario: Prepare materializes core and external context views

- **WHEN** prepare Stage 30 paper triage is submitted successfully
- **THEN** the runtime SHALL write `runtime/views/cross-paper-context.md`
- **AND** it SHALL write `runtime/views/external-literature-context.md`
- **AND** it SHALL write `runtime/views/cross-paper-context.manifest.json`
- **AND** it SHALL write `runtime/views/source-paper-evidence-index.json`.

#### Scenario: Cross-paper context is evidence-rich

- **WHEN** filtered digest artifacts and citation graph metrics are available
- **THEN** `cross-paper-context.md` SHALL include paper metadata, paper triage,
  citation graph metrics, context selection, and selected filtered digest
  excerpts.

#### Scenario: External literature context is not a placeholder

- **WHEN** references or citation analysis artifacts are available
- **THEN** `external-literature-context.md` SHALL include compact references or
  citation analysis report content
- **AND** it SHALL NOT be a fixed placeholder saying no external literature was
  fetched.

#### Scenario: Context manifest stays minimal

- **WHEN** prepare context views are written
- **THEN** `cross-paper-context.manifest.json` SHALL include context paths,
  selection constants, selected refs, and per-paper artifact availability
- **AND** it SHALL NOT include hashes, receipts, audit state, or apply-blocking
  diagnostics.
