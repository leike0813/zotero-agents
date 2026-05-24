# literature-workbench-package Delta

## MODIFIED Requirements

### Requirement: Literature Digest SHALL Auto Run Reference Matching After Apply

The `literature-digest` workflow MUST provide a default-enabled
`auto_reference_matching` workflow runtime option and, when enabled, SHALL run
reference matching on the references note produced by the digest apply step.
The option MUST NOT be dispatched to the skill/agent as a provider-facing
parameter.

#### Scenario: Digest apply uses runtime-only auto matching option
- **WHEN** `literature-digest` successfully writes its generated notes
- **AND** local result context has `auto_reference_matching` not equal to `false`
- **THEN** the workflow SHALL run reference matching on the produced references note
- **AND** it SHALL write the reference matching baseline into that references payload
- **AND** optional representative image handling SHALL NOT prevent reference matching from running.

## ADDED Requirements

### Requirement: Literature Digest Apply SHALL Consume Optional Representative Image Metadata

The `literature-digest` workflow apply step SHALL consume optional `representative_image` result metadata after writing generated notes.

#### Scenario: Representative image metadata is absent
- **WHEN** `literature-digest` result JSON does not include `representative_image`
- **THEN** the apply step SHALL write digest, references, and citation-analysis notes with the existing behavior.

#### Scenario: Representative image materialization succeeds
- **WHEN** `representative_image.status = "selected"` and Host resolves a safe Markdown image
- **THEN** the digest note SHALL include exactly one representative image block
- **AND** repeated apply runs SHALL replace the prior representative image block rather than append duplicates.

#### Scenario: Representative image materialization is skipped
- **WHEN** representative image resolution, compression, import, or PDF extraction fails best-effort
- **THEN** the apply step SHALL still return successfully with the generated notes
- **AND** the result SHALL expose a representative image skipped/warning status for diagnostics.
