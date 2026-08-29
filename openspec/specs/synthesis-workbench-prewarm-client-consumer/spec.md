# synthesis-workbench-prewarm-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for prewarm operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Workbench prewarm uses existing client reads

The Synthesis Workbench SHALL orchestrate prewarm through existing `SynthesisClient.workbench.readChrome` and `readSurface` capabilities and SHALL NOT invoke a legacy service warmup method or require a callback, streaming, or full-snapshot client capability.

#### Scenario: Default phased prewarm
- **WHEN** the Workbench starts prewarm without an explicit surface list
- **THEN** it SHALL read chrome first and then surfaces in the exact order `index`, `review`, `graph`, `tags`, `concepts`, and `topics`

#### Scenario: Explicit chrome-only prewarm
- **WHEN** the Workbench starts prewarm with `surfaces: []`
- **THEN** it SHALL read and publish chrome without reading a surface

### Requirement: A prewarm run has stable state and single-flight ownership

The Workbench SHALL preserve the exported prewarm signature and single-flight behavior, and each run SHALL capture and convert Workbench state exactly once for all client reads in that run.

#### Scenario: Concurrent prewarm callers
- **WHEN** a prewarm run is already in progress and another caller starts prewarm
- **THEN** both callers SHALL observe the same in-flight promise

#### Scenario: Reads within one run
- **WHEN** chrome and one or more surfaces are read during a prewarm run
- **THEN** every read SHALL receive the same once-converted read state

### Requirement: Prewarm remains responsive and isolates surface failures

The Workbench SHALL yield to the event loop immediately before every surface read, SHALL terminate the inner run when chrome fails, and SHALL skip only the failing surface when an individual surface read fails.

#### Scenario: A surface read begins
- **WHEN** prewarm advances from chrome or a prior surface to the next surface
- **THEN** it SHALL yield to the event loop before issuing that surface read

#### Scenario: One surface fails
- **WHEN** a surface read rejects during a multi-surface prewarm run
- **THEN** the Workbench SHALL continue with each remaining surface in order

#### Scenario: Chrome fails
- **WHEN** the chrome read rejects
- **THEN** no surface read SHALL begin and the existing outer fallback SHALL resolve the exported prewarm result as `undefined`

### Requirement: Successful phases publish through current cache and runtime owners

After every successful phase, the Workbench SHALL merge the projection into the global prewarm cache before dynamically resolving the current runtime and merging its snapshot. Chrome SHALL publish cached chrome; a surface SHALL be marked loaded and SHALL publish cached surface data only when it is active.

#### Scenario: Chrome succeeds
- **WHEN** the chrome client read returns a projection
- **THEN** the Workbench SHALL merge global cache then current runtime state and publish cached chrome

#### Scenario: Active surface succeeds
- **WHEN** a surface client read returns and that surface is active
- **THEN** the Workbench SHALL merge global cache then current runtime state, mark the surface loaded, and publish its cached surface

#### Scenario: Inactive surface succeeds
- **WHEN** a surface client read returns and that surface is not active
- **THEN** the Workbench SHALL merge global cache then current runtime state and mark the surface loaded without publishing it as active

### Requirement: Legacy warmup API is removed without broadening migration scope

The Synthesis service public surface and migration inventory SHALL omit `warmSynthesisWorkbenchSurfaces` and `workbench_warmup`, while the direct legacy consumer allowlist SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP.

#### Scenario: Service boundary inventory is checked
- **WHEN** service-boundary checks inspect the legacy public API and migration inventory
- **THEN** the warmup method and group SHALL be absent
- **AND** the direct consumer count SHALL remain four

#### Scenario: Client contract is checked
- **WHEN** the prewarm migration is reviewed
- **THEN** `SynthesisClient` SHALL expose no new callback, streaming, prewarm, or full-snapshot contract for this change
