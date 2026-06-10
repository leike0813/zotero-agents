## MODIFIED Requirements

### Requirement: Topic synthesis apply stores current artifacts

The synthesis layer SHALL persist topic synthesis structured artifacts without a
separate compatibility Markdown export.

#### Scenario: Topic detail DTO exposes report body, not markdown export

- **WHEN** a persisted topic detail is read
- **THEN** the DTO SHALL expose the structured sections including
  `synthesis_report`
- **AND** it SHALL NOT expose `markdown_export`
- **AND** it SHALL NOT expose markdown/export hashes.
