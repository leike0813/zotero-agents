## MODIFIED Requirements

### Requirement: Topic synthesis skills SHALL depend on the wrapper skill for Host Bridge CLI guidance

Topic synthesis skill instructions SHALL route Host Bridge CLI semantics through
the wrapper skill instead of duplicating full Host Bridge command guidance.

#### Scenario: Topic synthesis Host Bridge fragment is rendered

- **WHEN** topic synthesis skill instructions are rendered
- **THEN** the Host Bridge CLI fragment SHALL point agents to the
  `zotero-bridge-cli` wrapper skill and generated reference
- **AND** it SHALL include only the minimal topic-synthesis-specific command
  summary needed for the workflow
- **AND** it SHALL NOT duplicate the full wrapper semantic guidance for
  workflow agent-run or apply-back.
