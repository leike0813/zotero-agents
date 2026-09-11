## ADDED Requirements

### Requirement: Artifact scanning SHALL isolate bounded note decode failures

Artifact scanning SHALL convert a child note that exceeds the Broker note-payload byte limit into bounded decode diagnostics for the affected paper. The scan SHALL continue producing descriptors for that paper and the rest of the page. Missing artifacts whose state cannot be proved because of that note SHALL be `decode_error` without a readable locator, while independently readable artifacts SHALL retain their available descriptors. Transport, cursor, cancellation, and unclassified Host failures SHALL remain page failures.

#### Scenario: One child note exceeds the payload limit

- **WHEN** a bounded artifact page contains a paper with one child note that exceeds the Broker note-payload byte limit
- **THEN** the Host SHALL return the artifact page without note content
- **AND** affected missing artifacts SHALL carry bounded `resource_limited` decode diagnostics without a locator
- **AND** independently readable artifacts and other papers SHALL remain available.

