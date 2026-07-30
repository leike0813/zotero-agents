## ADDED Requirements

### Requirement: Runtime installation SHALL retain admission-pinned generations

The installer SHALL resolve verified native bundles by build fingerprint and
SHALL retain the current admitted generation and any pending target generation
until the admission transition completes or is safely reversed.

#### Scenario: Compatible upgrade begins
- **WHEN** current and target build fingerprints are verified
- **THEN** both content-addressed runtime bundles remain addressable for the bounded attempt

#### Scenario: Pre-activation recovery restarts the old generation
- **WHEN** the target fails before durable activation
- **THEN** the supervisor launches the exact previously admitted verified bundle without using a mutable active pointer
