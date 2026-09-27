## ADDED Requirements

### Requirement: Literature analysis SHALL persist bounded Citation artifacts consistently

The built-in literature-analysis apply hook SHALL opt into Citation snippet compaction with a 512 Unicode code-point default. The returned workflow result SHALL preserve any structured compaction report, and downstream sidecar apply SHALL receive the Citation artifact read from the persisted managed-note result rather than the original oversized input.

#### Scenario: Analysis Citation snippets are compacted
- **WHEN** literature-analysis applies a Citation artifact containing snippets longer than the proactive cap
- **THEN** the stored artifact SHALL contain compacted snippets with all identities and structure preserved
- **AND** the workflow result SHALL expose the compaction report
- **AND** sidecar apply SHALL receive the same compacted artifact that was stored.
