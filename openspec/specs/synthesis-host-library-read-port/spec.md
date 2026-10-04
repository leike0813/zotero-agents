# synthesis-host-library-read-port Specification

## Purpose
Defines the Synthesis Host port for host library read, specifying the injected interface that the application service uses to delegate to Host-owned implementation.

## Requirements

### Requirement: Host library reads are bounded and JSON-safe

The Synthesis application SHALL read Zotero library metadata through an environment-neutral Host port. Page requests SHALL default to 50 rows, reject limits above 100, and use opaque cursors. Results SHALL contain only JSON-safe bibliographic summaries and continuation metadata, never Zotero objects, functions, notes, payloads, or local paths.

#### Scenario: Library page is read
- **WHEN** the application requests a library page with a valid cursor and limit
- **THEN** the Host SHALL return items in deterministic stable-key order
- **AND** each item SHALL contain a stable paper ref and bibliographic metadata only
- **AND** continuation SHALL use the returned opaque cursor

#### Scenario: Library request is invalid
- **WHEN** the request has an invalid library, cursor, ref list, or limit
- **THEN** validation SHALL fail before Zotero is accessed
- **AND** the failure SHALL use the stable invalid-request classification

### Requirement: Stable-ref lookup replaces direct item access

Point reads SHALL accept at most 100 stable paper refs and SHALL return found summaries plus missing refs. Synthesis query and workflow-input paths SHALL NOT read Zotero objects or call Zotero item methods directly.

#### Scenario: Known and missing refs are requested
- **WHEN** a bounded request contains both existing and absent paper refs
- **THEN** the Host SHALL return summaries for existing refs and explicit missing refs
- **AND** the application SHALL not infer identities from titles or display text

### Requirement: Default composition owns the Host adapter

The complete service SHALL accept a Host read port rather than construct a Zotero adapter. The single legacy client composition root SHALL own the default service instance, adapter injection, caching, and invalidation. The public service SHALL retain 128 methods and exactly one production direct consumer.

#### Scenario: Static boundary is checked
- **WHEN** the Synthesis boundary checker runs
- **THEN** service query paths SHALL have no concrete Zotero library adapter dependency
- **AND** the inventory SHALL report 128 public methods and one direct consumer

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
