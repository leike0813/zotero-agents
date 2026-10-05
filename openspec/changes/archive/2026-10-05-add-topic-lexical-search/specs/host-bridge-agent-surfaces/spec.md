# Spec Delta

## ADDED Requirements

### Requirement: Host Bridge agent surfaces SHALL describe Topic search at the correct ownership layer

The minimum-core CLI surface SHALL document the exact `synthesis topic search` command, input, bounded result, paging, and typed cursor recovery from the canonical CLI contracts. Generic research guidance and the Hermes hosted facet SHALL inherit the current Minimum surface without duplicating command mechanics or changing their existing task or residency policies.

#### Scenario: Agent discovers Topic search
- **WHEN** an agent searches or describes the canonical CLI command
- **THEN** the Minimum surface exposes its exact capability target, `--query` binding, input/result schema, paging, effect, and recovery from generated contracts

#### Scenario: Generic and Hermes inherit the command
- **WHEN** the Generic or Hermes surface is materialized
- **THEN** each inherits the same Minimum command guidance and preserves its own existing policy without adding duplicate command facts

#### Scenario: Surface semantic baseline is reviewed
- **WHEN** Topic search guidance is added to the governed source and rendered surfaces are checked
- **THEN** comparison against baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820` reports zero unmapped, downgraded, unauthorized dropped, and intra-package duplicate semantic units
- **AND** the semantic deletion inventory is empty
- **AND** materialized substantive instruction lines do not decrease and normalized prose remains at least 95 percent of baseline
