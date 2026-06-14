## ADDED Requirements

### Requirement: Topic context audit exposes update preflight inputs

The `topics.get_context` audit view SHALL expose the current topic resolver and compact source paper triage records needed by topic synthesis update preflight.

#### Scenario: Audit view is requested for an existing topic

- **WHEN** `topics.get_context` is called with `view: "audit"`
- **THEN** the response SHALL include audit fields for `topic_resolver` and `source_paper_triage`
- **AND** SHALL NOT inline the full synthesis report body.
