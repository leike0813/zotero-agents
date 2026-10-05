# Spec Delta

## ADDED Requirements

### Requirement: Host source reads SHALL return bounded versioned content
The private Synthesis Host read boundary SHALL provide bounded current Library source facts and source passages with complete content, format, stable source identity, and an opaque owner-provided content version, without paths or Zotero objects.

#### Scenario: Source owner returns a current passage
- **WHEN** a valid request identifies an in-scope source and expected owner version and range
- **THEN** the Host returns the complete requested passage and current source facts only when version, scope, and range still match

#### Scenario: Source version or scope changed
- **WHEN** the source owner observes a changed version, changed scope, missing source, or invalid range
- **THEN** it returns a bounded typed failure and no content from the changed source

#### Scenario: Markdown full text is read
- **WHEN** evidence search reads an existing Markdown full-text source
- **THEN** the Host reuses the actual Markdown read path and runtime filesystem adapter and does not treat attachment item revision as content version

#### Scenario: Analysis artifact is read
- **WHEN** evidence search reads a canonical digest or analysis source
- **THEN** the Host reuses the existing source-owner read and version verification path while preserving the concrete artifact identity
