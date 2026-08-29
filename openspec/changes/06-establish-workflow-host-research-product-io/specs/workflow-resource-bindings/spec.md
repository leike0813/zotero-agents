## ADDED Requirements

### Requirement: Workflow resource handles SHALL be run-scoped and opaque
Input and output resource references SHALL identify one accepted run, slot, and immutable file value without exposing a Host-local path remotely. A resource handle MUST become unavailable outside its owning run or after cleanup.

#### Scenario: Workflow reads a bound input
- **WHEN** a run requests an input slot with a retained resource
- **THEN** the local Workflow projection returns the trusted file view while remote callers retain only the opaque handle

#### Scenario: Handle is reused by another run
- **WHEN** a resource handle is presented outside its owning run scope
- **THEN** the request fails as invalid or unavailable and does not disclose the original file

### Requirement: Output allocation and publication SHALL be distinct
`resources.allocateOutput` SHALL reserve a managed run-scoped target without publishing it. `resources.publishOutput` SHALL validate ownership, completion, bounds, and current bytes before creating the immutable output descriptor.

#### Scenario: Unfinished output is published
- **WHEN** an allocation has not produced a valid complete file
- **THEN** publication fails and `listOutputs` does not report the allocation as an output
