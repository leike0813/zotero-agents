## ADDED Requirements

### Requirement: Advanced Reference Matching SHALL use the configured matcher engine

Production Advanced Reference Matching SHALL route library binding and clustered canonical dedupe through the configured Reference Matcher engine while keeping lightweight sidecar binding separate.

#### Scenario: Advanced matching runs

- **WHEN** the explicit Advanced Reference Matching command processes current unbound canonicals
- **THEN** the application SHALL invoke `matchBindings` once and `dedupeCanonicals` once for the captured basis
- **AND** refresh, workflow apply, graph rebuild, and related-items sync SHALL NOT invoke either heavy matcher method.

### Requirement: Matcher results SHALL promote as one validated unit

Automatic binding facts, canonical redirects, and review proposals from one Advanced Reference Matching run SHALL be persisted only after both engine results are valid and the captured matcher basis remains current.

#### Scenario: Both results are valid and current

- **WHEN** binding and dedupe computation completes and basis recapture matches
- **THEN** all matcher facts and proposals SHALL be applied in one repository transaction
- **AND** existing rejected proposals SHALL remain rejected.

#### Scenario: Compute or promotion cannot complete

- **WHEN** either engine throws, is cancelled, rejects bounds, returns malformed output, the basis is superseded, or the repository transaction fails
- **THEN** no matcher facts or proposals from the run SHALL be durably applied
- **AND** prior binding, redirect, proposal, and rejection facts SHALL remain unchanged.
