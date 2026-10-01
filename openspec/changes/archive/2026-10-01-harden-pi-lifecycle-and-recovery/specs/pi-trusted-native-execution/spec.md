## ADDED Requirements

### Requirement: Native physical evidence and staging holds survive logical cancellation
Native execution SHALL report physical settlement separately from its logical result, preserve quota/write claims and referenced files while termination is unproved, and expose owner-bound staging residue for safe startup cleanup. Age cleanup SHALL not override unknown/repair holds and failed staging cleanup SHALL remain retryable.

#### Scenario: Native child ignores stop request
- **WHEN** a logical cancel returns before observed child exit
- **THEN** its physical claim and output/staging files remain until verified settlement
