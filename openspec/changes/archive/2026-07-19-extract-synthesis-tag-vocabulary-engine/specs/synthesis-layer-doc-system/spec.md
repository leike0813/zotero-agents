## ADDED Requirements

### Requirement: Documentation SHALL describe the Tag Vocabulary engine boundary

Active Synthesis documentation SHALL describe TagVocab validation and index construction as process-portable engine contracts orchestrated by the application layer.

#### Scenario: Developer reads Tag Vocabulary documentation

- **WHEN** active docs describe Tag Vocabulary implementation
- **THEN** they SHALL identify `synthesis-engine` as the validation and index algorithm owner
- **AND** they SHALL identify SQLite, transactions, manifests, import merge policy, diagnostics, staged suggestions, Host effects, progress, and autosync as application responsibilities.
