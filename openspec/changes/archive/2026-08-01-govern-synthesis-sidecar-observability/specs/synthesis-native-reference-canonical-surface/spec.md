## MODIFIED Requirements

### Requirement: Reference operations SHALL use generic spans and facts

Reference refresh and Advanced Matching SHALL use the common boundary model.
Matching facts are limited to matching hash and proposal, fact, and warning
counts; warning text and library identifiers SHALL be absent.

#### Scenario: Advanced Matching completes
- **WHEN** binding, dedupe, and durable promotion reach a terminal state
- **THEN** one causal trace contains both worker attempts and allowlisted counts
