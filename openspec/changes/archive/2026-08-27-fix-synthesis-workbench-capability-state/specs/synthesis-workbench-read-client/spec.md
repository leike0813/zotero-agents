## MODIFIED Requirements

### Requirement: Workbench contracts are environment-neutral

Workbench client requests and results SHALL be JSON-safe, SHALL use the contract-owned Workbench surface union, and SHALL NOT include plugin UI classes, host objects, functions, absolute paths, legacy service-derived public types, persistence records, or the complete plugin UI state. Chrome and surface reads SHALL use one closed, recursively concrete Workbench read state contract across in-process and native transports. Each surface result SHALL use the closed projection selected by its originating surface request; Review SHALL additionally select by the requested active tab. Native result rebuilding SHALL use that originating request immediately after transport resolution.

#### Scenario: Contract package is checked

- **WHEN** the independent contracts typecheck, recursive DTO gate, and environment-neutrality guard run
- **THEN** all four Workbench methods SHALL compile without DOM, Zotero, Node, or plugin implementation imports
- **AND** Chrome and surface request validation SHALL resolve the same Workbench state schema
- **AND** surface result validation SHALL resolve only the definition selected by the surface and Review tab request

#### Scenario: Default Workbench state crosses the native boundary

- **WHEN** the default plugin UI state is projected for a Chrome or supported surface read
- **THEN** the request SHALL pass strict capability validation and reach the selected native route
- **AND** the route SHALL receive only the protocol-owned Workbench read state

#### Scenario: Invalid runtime request crosses the boundary

- **WHEN** a Workbench request contains a function, cyclic object, host-class instance, unknown state field, missing required state section, or unprojected plugin UI state
- **THEN** the grouped client SHALL reject it with stable `SynthesisClientError` code `invalid_request` before invoking the legacy or native port

#### Scenario: Graph query carries continuation state

- **WHEN** a Graph surface request includes a continuation cursor or expected graph basis
- **THEN** the Workbench read state SHALL use the contract-owned Citation Graph query shape
- **AND** absent optional continuation fields SHALL be omitted rather than filled with undocumented defaults

#### Scenario: Every Workbench surface result crosses the native boundary

- **WHEN** native composition receives a valid Home, Topics, Index, Graph, Tags, Concepts, Reader, Reference Review, Concept Review, or Topic Graph Review result
- **THEN** it SHALL rebuild the recursively concrete projection for that requested route
- **AND** the public client return type SHALL match the requested surface

#### Scenario: A different surface result is returned

- **WHEN** a port returns a structurally valid projection that belongs to a different surface or Review tab
- **THEN** the grouped client SHALL reject it with stable `SynthesisClientError` code `internal`
- **AND** it SHALL NOT forward the mismatched projection to the UI adapter

#### Scenario: Real persisted rows cross the native boundary

- **WHEN** Home, Topics, or Review returns historical Topic state or non-empty persisted Review data
- **THEN** native composition SHALL validate the route-specific public projection rather than a generic capability result
- **AND** the returned DTO SHALL omit persistence-only Topic, Concept proposal, and Reference matcher payloads
