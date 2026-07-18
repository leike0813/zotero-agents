## ADDED Requirements

### Requirement: Engine extraction SHALL preserve Advanced Matching progress

Advanced Reference Matching SHALL continue reporting binding and canonical-dedupe phases and counters even though engine computation is persistence-free.

#### Scenario: Engine computation completes

- **WHEN** binding and dedupe results have been validated and promoted
- **THEN** operation diagnostics SHALL report indexed papers, processed binding inputs, accepted bindings, binding proposals, dedupe clusters/actions, redirects, merge proposals, rejected proposals preserved, and budget counters
- **AND** no completed status SHALL be emitted before atomic promotion succeeds.
