## ADDED Requirements

### Requirement: CLI selection SHALL use canonical pages and portable refs
Context selection get SHALL accept limit/cursor and describe the exact Broker page with its default 25, maximum 100 and basis_mismatch failure. Context current SHALL describe the small canonical view without selected items. Workflow selection parsing and executable schemas SHALL accept only items/none with complete libraryId/key item refs, rejecting strings, integers, id-only, key-only and unknown fields.

#### Scenario: CLI supplies a page continuation
- **WHEN** a caller invokes context selection get with an opaque cursor
- **THEN** the CLI forwards it unchanged to the canonical selection endpoint

#### Scenario: Legacy selection input is supplied
- **WHEN** workflow selection contains an id-only object or bare key
- **THEN** validation fails before submitting a request
