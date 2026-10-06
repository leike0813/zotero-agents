## ADDED Requirements

### Requirement: Exact artifact readiness SHALL isolate bounded child-note failures

Exact artifact readiness SHALL isolate typed child-note resource limits and preserve independently valid artifact neighbors as available. Unreadable artifacts SHALL retain the existing missing/unavailable readiness classification; artifact scanning SHALL retain bounded `resource_limited` diagnostics. Cancellation, conflicts and unclassified Host failures SHALL still fail the request, and direct note detail SHALL retain its byte bounds.

#### Scenario: Oversized source HTML or payload attachment

- **WHEN** a paper has valid References and another child note exceeds the HTML or payload byte bound
- **THEN** exact readiness keeps References available and artifact scanning returns bounded diagnostics for affected missing artifacts
- **AND** public Index projection remains readable.
