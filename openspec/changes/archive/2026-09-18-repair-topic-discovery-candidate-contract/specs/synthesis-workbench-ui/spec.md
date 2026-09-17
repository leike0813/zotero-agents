# Spec Delta

## ADDED Requirements

### Requirement: Topic Detail SHALL present actionable discovery candidates

The Workbench Reader/Topic Detail region SHALL present open discovery candidates and separately expose rejected candidates that can be restored. Candidate rows SHALL use the public title when present and fall back to literature identity, SHALL show available bounded evidence metadata, and SHALL dispatch the existing reject or restore Topic command with the candidate hint identity.

#### Scenario: Open discovery candidates are available
- **WHEN** the user opens Topic Detail with open candidates
- **THEN** the discovery section lists at most 20 candidates with Reject actions
- **AND** missing titles fall back to the literature identity without fabricating an empty title

#### Scenario: Rejected discovery candidates are available
- **WHEN** the user views rejected candidates in Topic Detail
- **THEN** each candidate offers Restore through the existing Topic command path

#### Scenario: Discovery command settles
- **WHEN** a reject or restore command finishes and the selected Topic surface refreshes
- **THEN** the Reader reflects the new candidate status without requiring a separate endpoint or local shadow state

