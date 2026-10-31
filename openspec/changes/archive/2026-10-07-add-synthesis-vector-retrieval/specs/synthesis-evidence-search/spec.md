# Spec Delta

## ADDED Requirements

### Requirement: Vector evidence SHALL be verified from current sources

Evidence retrieved through derived vectors SHALL be re-read from its source owner during the same search call and validated against current source identity, version and original UTF-16 text range. Failure SHALL omit only the affected source and report bounded issues. Canonical Topic text SHALL remain outside Evidence scope.

#### Scenario: Indexed Markdown changed externally

- **WHEN** current source bytes or version differ from the indexed basis
- **THEN** the stale passage is omitted while other verified evidence remains usable; no stale text is returned

#### Scenario: Verified passage is projected

- **WHEN** current source and original range still match
- **THEN** the result exposes exact current text and separate source context without inferred PDF pages, local paths or mutation authority
