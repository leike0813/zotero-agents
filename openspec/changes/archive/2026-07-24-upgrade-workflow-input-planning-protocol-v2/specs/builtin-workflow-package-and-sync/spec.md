## ADDED Requirements

### Requirement: Distributed workflows SHALL use manifest schema version 2
Every built-in, debug, package, fixture, and test workflow manifest SHALL use v2 input planning declarations, and repository checks SHALL reject remaining v1 fields.

#### Scenario: Built-in manifest validation runs
- **WHEN** the built-in workflow manifest check scans distributed workflows
- **THEN** every manifest passes the v2 schema without compatibility normalization

### Requirement: Workflow content API SHALL be version 3.0.0
The supported workflow content API and distributed package metadata SHALL declare `3.0.0` for the breaking manifest protocol.

#### Scenario: Older content package is inspected
- **WHEN** a package declares a pre-v3 workflow content API
- **THEN** subscription validation rejects it instead of rewriting its manifests

### Requirement: Publication SHALL remain outside this change
The migration SHALL update source and validation contracts only and SHALL NOT publish plugin versions, content feeds, content-package releases, or Host Bridge release sets.

#### Scenario: Migration verification completes
- **WHEN** source, tests, docs, and strict OpenSpec validation pass
- **THEN** no remote release or mutable feed pointer has been changed
