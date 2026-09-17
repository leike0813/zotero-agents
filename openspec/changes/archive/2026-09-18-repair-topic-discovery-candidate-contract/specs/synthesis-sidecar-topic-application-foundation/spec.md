# Spec Delta

## ADDED Requirements

### Requirement: Topic Detail SHALL own the public discovery-candidate projection

The Topic application SHALL project discovery candidates for the requested Topic across that Topic and the confirmed `broader_than` descendant closure. It SHALL deduplicate by literature identity, prefer an open candidate over a rejected duplicate, choose a deterministic representative, report the total unique open count, and return separately bounded open and rejected arrays.

#### Scenario: Descendants contain duplicate candidates
- **WHEN** the requested Topic and its confirmed descendants contain multiple hints for one literature item
- **THEN** Topic Detail returns at most one public candidate for that literature item
- **AND** an open hint wins over rejected hints
- **AND** equal-status representatives are selected by descending score and then ascending hint identity

#### Scenario: Candidate window is projected
- **WHEN** more than 20 unique open or rejected candidates are available
- **THEN** Topic Detail returns the first 20 of each status in descending score and ascending hint-identity order
- **AND** the open candidate count still describes all unique open candidates

#### Scenario: Topic list projection is read
- **WHEN** a caller reads a list or summary Topic record
- **THEN** discovery count, status, and cascade summary remain available
- **AND** detailed candidates remain exclusive to Topic Detail

