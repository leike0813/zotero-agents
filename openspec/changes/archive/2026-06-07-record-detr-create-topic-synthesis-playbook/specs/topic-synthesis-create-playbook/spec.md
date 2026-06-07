## ADDED Requirements

### Requirement: DETR create playbook records a real dry-run baseline

The repository SHALL include a DETR create topic synthesis playbook produced
from read-only Zotero Bridge calls and stored as a dry-run artifact.

#### Scenario: Playbook keeps real bridge transcripts

- **GIVEN** the DETR create playbook artifact exists
- **WHEN** its runtime bridge directory is inspected
- **THEN** it SHALL contain status, manifest summary, topic list, library index,
  resolver, citation metrics, artifact manifest, and diagnostic command
  transcripts
- **AND** those transcripts SHALL record command inputs or command errors from a
  real local Zotero Bridge run

#### Scenario: Paper triage uses a bounded resolver subset

- **GIVEN** the resolver transcript contains the full DETR resolver result
- **WHEN** the selected paper set is inspected
- **THEN** it SHALL contain exactly five papers
- **AND** each selected paper SHALL appear in the resolver result
- **AND** the selection policy SHALL explain why those papers represent the
  example route diversity.

#### Scenario: Stage examples remain schema-valid

- **GIVEN** the playbook stage example files exist
- **WHEN** they are validated against
  `skills_src/topic-synthesis/contracts/payload-schemas/*.schema.json`
- **THEN** every stage example SHALL validate against its matching stage schema
- **AND** the handoff manifests SHALL validate against
  `skills_src/topic-synthesis/contracts/handoff.schema.json`.

#### Scenario: Final candidate is a create result, not a handoff

- **GIVEN** the playbook final candidate exists
- **WHEN** the final candidate JSON is inspected
- **THEN** it SHALL use `kind: "topic_synthesis"`
- **AND** it SHALL use `operation: "create"`
- **AND** it SHALL NOT use `kind: "topic_synthesis_handoff"`.
