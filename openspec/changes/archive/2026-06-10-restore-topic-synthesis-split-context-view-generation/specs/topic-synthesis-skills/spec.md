## MODIFIED Requirements

### Requirement: Split skill instructions expose only local stage inputs

Generated split topic synthesis skills SHALL describe only the inputs and
runtime files relevant to the current skill.

#### Scenario: Context views are scoped to the consuming skill

- **WHEN** split skill packages are rendered
- **THEN** the core enrichment skill SHALL reference
  `runtime/views/cross-paper-context.md`
- **AND** it SHALL NOT reference
  `runtime/views/external-literature-context.md`
- **AND** the finalize skill SHALL reference
  `runtime/views/external-literature-context.md`.

#### Scenario: Prepare instructions describe runtime-owned context generation

- **WHEN** prepare skill packages are rendered
- **THEN** Stage 30 instructions SHALL explain that the runtime materializes
  cross-paper context, external-literature context, a context manifest, and a
  source evidence index after paper triage submit.
