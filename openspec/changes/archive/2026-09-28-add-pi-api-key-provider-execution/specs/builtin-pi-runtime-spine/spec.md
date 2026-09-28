# Spec Delta

## ADDED Requirements

### Requirement: Trusted model failure codes survive the turn boundary

The runtime SHALL preserve a known project-owned model failure code in its single failed terminal while normalizing all untrusted exceptions to a generic failure.

#### Scenario: Provider reports a classified failure
- **WHEN** the model source fails with a classified, redacted Provider failure
- **THEN** the turn publishes one failed terminal containing that project code and no native detail

#### Scenario: Unknown model exception
- **WHEN** the model source throws an unclassified exception
- **THEN** the turn publishes one generic failed terminal without the exception message
