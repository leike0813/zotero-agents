## ADDED Requirements

### Requirement: Core fixtures SHALL exercise current recursive DTO contracts

Core tests and shared production-route harnesses SHALL construct current recursively concrete request, result, transfer, lifecycle, and Host-effect DTOs. They MUST NOT restore deleted service owners, undocumented defaults, undefined fields, or legacy aliases to obtain a passing suite.

#### Scenario: Full core suite is executed
- **WHEN** the complete Node core suite runs without file exclusions or skipped contract cases
- **THEN** every fixture passes through the current strict DTO boundary
- **AND** shared default clients, factories, and Host ports are reset between cases
