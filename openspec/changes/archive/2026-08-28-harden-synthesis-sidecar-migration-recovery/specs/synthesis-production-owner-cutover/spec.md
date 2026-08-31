## ADDED Requirements

### Requirement: Repository foundation upgrades SHALL follow the registered chain
The production owner SHALL upgrade every supported Rust repository foundation version to the current version through each registered migration in order, under one backup and one transaction. A repository with no complete registered path SHALL fail without mutation.

#### Scenario: Version one repository starts under version three runtime
- **WHEN** the repository declares foundation v1 and the current runtime declares foundation v3
- **THEN** the owner applies v1-to-v2 and v2-to-v3 in order
- **AND** commits both only after the final v3 repository validates

### Requirement: Failed production ownership SHALL be recoverable explicitly
A deterministic startup failure SHALL remain terminal until a caller explicitly requests recovery. Recovery SHALL clear failed promise ownership, start one new supervised generation, and never overlap with the failed generation.

#### Scenario: User retries a corrected startup
- **WHEN** startup failed, the underlying cause was corrected, and the user invokes retry
- **THEN** the production owner creates one new startup generation
- **AND** all production consumers observe that generation rather than a permanently cached rejection

