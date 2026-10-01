# Pi failure contract

## Purpose

Provides stable structured identities for failures in Pi execution so canonical owner facts, outcomes and privacy-safe diagnostics can refer to one observation without duplicating its semantic payload.

## Requirements

### Requirement: Canonical failure identity and classification

Pi execution SHALL normalize failures to a project-owned core containing failureId, origin, category, code, retryability and effect certainty. Corresponding owner failures SHALL commit once to canonical transcript before their audit evidence; propagation SHALL reuse the same identity. Classification and severity SHALL use one code policy. An upper-level genuinely distinct failure SHALL receive a separate identity. Raw exceptions and credentials SHALL NOT become core fields.

#### Scenario: Provider failure propagates

- **WHEN** a classified Provider failure terminates a turn
- **THEN** its canonical failure identity is reused by turn and owner projections and audit references it once

#### Scenario: Failed failure persistence

- **WHEN** the canonical failure cannot be committed
- **THEN** existing recovery behavior is preserved and diagnostics report missing evidence without fabricating a durable reference

### Requirement: Failure facts are outside model history

Failure observations SHALL remain non-context canonical facts. Existing histories SHALL remain readable without migration or invented historical IDs. Effect uncertainty SHALL remain distinct from a failure-cause category, and a failure observation SHALL NOT alone determine an owner outcome.

#### Scenario: Context rebuild after failure

- **WHEN** the next context is reconstructed from a transcript containing a failure observation
- **THEN** the observation is excluded from model input while committed semantic messages retain their normal meaning
