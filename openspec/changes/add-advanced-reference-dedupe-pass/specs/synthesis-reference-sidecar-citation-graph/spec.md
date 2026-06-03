## MODIFIED Requirements

### Requirement: Graph cache consumes accepted sidecar facts only
Citation graph cache rebuild SHALL consume active raw references, effective canonical references, accepted bindings, and accepted canonical redirects.

#### Scenario: Canonical redirect is written by advanced dedupe
- **WHEN** Advanced Reference Matching writes a canonical redirect
- **THEN** citation graph cache SHALL be marked stale
- **AND** graph cache rebuild SHALL later resolve references through the redirect.

#### Scenario: Canonical merge proposal is open
- **WHEN** a `canonical_merge` proposal is open
- **THEN** graph cache rebuild SHALL NOT treat it as an accepted redirect.
