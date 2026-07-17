## ADDED Requirements

### Requirement: Representative scale remains outside canary eligibility
The internal Citation Graph build canary SHALL remain limited by the existing
compute request/response byte and JSON-node bounds. Benchmark evidence SHALL NOT
route an ineligible profile, raise limits, split payloads, or change production
composition.

#### Scenario: Benchmark proves wire ineligibility
- **WHEN** a representative graph-build request or result exceeds an existing compute limit
- **THEN** the canary remains internal-only and production graph build continues through the injected in-process engine
