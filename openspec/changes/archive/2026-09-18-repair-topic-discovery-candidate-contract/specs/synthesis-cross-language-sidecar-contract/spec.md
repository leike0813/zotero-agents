# Spec Delta

## ADDED Requirements

### Requirement: Topic discovery candidates SHALL be recursively closed

The protocol registry SHALL define one strict `TopicDiscoveryCandidate` object shared by Topic Detail and discovery-hint command results. Every reachable candidate object and nested reasons array SHALL reject unknown fields and bound strings and collection sizes, and TypeScript and Rust SHALL accept and reject the same corpus entries.

#### Scenario: Discovery candidate corpus is checked
- **WHEN** TypeScript and Rust process valid and invalid Topic discovery candidate documents
- **THEN** both accept the same valid documents
- **AND** both reject unknown candidate fields, invalid statuses, missing identities, and out-of-bound reasons with the same stable category

#### Scenario: General Topic projection is checked
- **WHEN** a Topic list or summary projection is validated
- **THEN** it contains discovery counts and status without carrying an opaque hint-object array

