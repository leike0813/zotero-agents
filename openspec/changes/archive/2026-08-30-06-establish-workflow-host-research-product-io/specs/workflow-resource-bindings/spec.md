## ADDED Requirements

### Requirement: Workflow resource handles SHALL be run-scoped and opaque
Input and output resource references SHALL identify one accepted run, slot, and immutable file value without exposing a Host-local path remotely. A resource handle MUST become unavailable outside its owning run or after cleanup.

#### Scenario: Workflow reads a bound input
- **WHEN** a run requests an input slot with a retained resource
- **THEN** the local Workflow projection returns the trusted file view while remote callers retain only the opaque handle

#### Scenario: Handle is reused by another run
- **WHEN** a resource handle is presented outside its owning run scope
- **THEN** the request fails as invalid or unavailable and does not disclose the original file

### Requirement: Local files SHALL be materialized before becoming resources
`resources.materializeFile` SHALL synchronously consume a trusted in-process source path, validate its runtime-bound slot constraints, and copy its current bytes into the owning run's managed scope before returning an immutable `ResourceRef`. The source path SHALL NOT become resource identity or remain necessary after the call settles.

#### Scenario: Extracted archive entry is imported
- **WHEN** a workflow materializes an entry path inside `archive.withExtractedZip`
- **THEN** the Host finishes the managed copy before the archive callback settles and later import resolves only the returned run-scoped resource

#### Scenario: Workflow supplies an undeclared slot
- **WHEN** a workflow asks to materialize a file into a slot not bound by the runtime manifest
- **THEN** materialization fails before retaining bytes and does not create a resource handle

### Requirement: Resource refs SHALL resolve only through their owning run
`resources.get` SHALL resolve a Host-issued `ResourceRef` to a trusted in-process managed file projection only while the owning run is active. It SHALL revalidate retained size and hash before returning and SHALL NOT expose the managed path in remote descriptors.

#### Scenario: Workflow archives a materialized attachment
- **WHEN** a workflow passes a `ResourceRef` returned by `researchBundles.materializePapers` to `resources.get`
- **THEN** it receives the verified managed path needed by the archive owner without reading identity from the opaque ref

#### Scenario: Retained bytes changed
- **WHEN** the managed file no longer matches the size or hash recorded for its ref
- **THEN** resolution fails as a resource mismatch and no path is returned

### Requirement: Output allocation and publication SHALL be distinct
`resources.allocateOutput` SHALL reserve a managed run-scoped target without publishing it. `resources.publishOutput` SHALL validate ownership, completion, bounds, and current bytes before creating the immutable output descriptor.

#### Scenario: Unfinished output is published
- **WHEN** an allocation has not produced a valid complete file
- **THEN** publication fails and `listOutputs` does not report the allocation as an output
