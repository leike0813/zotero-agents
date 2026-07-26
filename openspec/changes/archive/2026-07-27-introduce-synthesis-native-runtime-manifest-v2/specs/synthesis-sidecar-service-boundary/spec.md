## ADDED Requirements

### Requirement: Native delivery SHALL not change the production owner

Manifest v2, native installation, and native lifecycle integration SHALL use
isolated shadow roots while the existing plugin production owner remains
authoritative.

#### Scenario: R8 candidate runs
- **WHEN** the plugin integrates with a native v2 candidate
- **THEN** no production database, canonical tree, Host mutation, or public mutation capability SHALL be owned or modified by the candidate
- **AND** failure SHALL not fall back to a Node runtime
