## ADDED Requirements

### Requirement: Pi performance observations are continuous and phase-bound

The existing probe SHALL record continuous event-loop delay and residentFast RSS across warmup, idle, mixed-load and settling phases, along with admission and outcome completeness. Missing or unsupported observations SHALL not be represented as zero or passing. Reports SHALL bind observed values to actual host, candidate, workload duration and capacity, and distinguish exploration from final certification.

#### Scenario: RSS collection is unavailable

- **WHEN** the host cannot provide a resident measurement
- **THEN** the corresponding gate is missing rather than an inferred pass
