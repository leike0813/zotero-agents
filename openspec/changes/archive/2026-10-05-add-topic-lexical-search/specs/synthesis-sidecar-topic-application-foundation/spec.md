# Spec Delta

## ADDED Requirements

### Requirement: Topic application SHALL own bounded canonical lexical search

The production Topic application SHALL enumerate and search current canonical Topic content within a bounded source-read budget, preserve the canonical Topic identity and content basis for each match, and return typed search outcomes.

#### Scenario: Search executes in the existing Topic owner
- **WHEN** the Synthesis runtime dispatches a Topic lexical search
- **THEN** the existing Topic application performs it over the current canonical Topic data root
- **AND** no second Topic application, client-side full-list filter, or persistent lexical index owns the search

#### Scenario: Canonical Topic cannot be read or validated
- **WHEN** a candidate Topic is absent, invalid, or unreadable during a bounded search
- **THEN** the application excludes it from verified results, reports a typed issue, and does not present cached or registry-only text as canonical content

#### Scenario: Search reaches its source-read budget
- **WHEN** the application exhausts its configured bound before evaluating the requested Topic scope
- **THEN** it returns the verified results with a limited outcome and unknown total

#### Scenario: Topic current changes during continuation
- **WHEN** a search cursor basis no longer matches current Topic membership or canonical content
- **THEN** continuation returns a typed stale outcome without rerunning the search
