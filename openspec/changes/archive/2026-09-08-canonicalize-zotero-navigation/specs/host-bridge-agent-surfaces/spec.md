## ADDED Requirements

### Requirement: Agent surfaces SHALL publish navigation cards from one contract

The generated Minimum surface SHALL contain exactly one complete command card
for each canonical navigation leaf and no card for the removed context-open
commands. Cards SHALL describe portable inputs, strict results, UI effects,
scope/approval, exact-window limitations, stable failures, and the next
explicit command for recovery. Generic and Hermes surfaces SHALL inherit these
facts without duplicating them or adding unattended navigation authority.

#### Scenario: Navigation surface is rendered
- **WHEN** the executable CLI and Host Bridge contracts are rendered
- **THEN** registry, parser, catalog, card links, schemas, and generated outputs are duplicate-free and orphan-free.

#### Scenario: Navigation guidance is reviewed against baseline
- **WHEN** the governed surfaces are compared with the fixed clean baseline
- **THEN** unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate semantic counts are all zero
- **AND** all non-navigation instructions retain their baseline meaning and depth.
