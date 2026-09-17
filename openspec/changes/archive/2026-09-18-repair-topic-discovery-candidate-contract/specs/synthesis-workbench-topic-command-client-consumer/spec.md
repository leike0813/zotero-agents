# Spec Delta

## ADDED Requirements

### Requirement: Discovery-hint commands SHALL preserve candidate identity

Reject and restore commands SHALL return the same strict candidate DTO consumed by Topic Detail. The existing client command, single-flight, diagnostic, and selected-surface invalidation flow SHALL remain unchanged.

#### Scenario: User rejects an open candidate
- **WHEN** the reject command commits
- **THEN** the result candidate retains its hint, Topic, literature, and display metadata
- **AND** its status is `rejected`

#### Scenario: User restores a rejected candidate
- **WHEN** the restore command commits
- **THEN** the result candidate retains its hint, Topic, literature, and display metadata
- **AND** its status is `open`

