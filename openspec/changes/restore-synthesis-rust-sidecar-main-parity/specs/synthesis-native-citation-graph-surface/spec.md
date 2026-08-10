## ADDED Requirements

### Requirement: Default Citation Graph visibility SHALL use distinct library-source degree

The default Citation Graph SHALL contain library nodes and external nodes cited by more than one distinct eligible library source. Multiple references or mentions from one library source count once. External nodes cited by exactly one source SHALL remain outside the default graph and MAY appear only in a bounded ephemeral hover neighborhood.

#### Scenario: One source repeats the same external citation
- **WHEN** one library source contains multiple references or mentions resolving to one external node
- **THEN** that external node has incoming degree one and is absent from the default node page
- **AND** it remains available through the source node's hover neighborhood

#### Scenario: A second source cites the external node
- **WHEN** a second distinct library source resolves to the same external node
- **THEN** the external node enters the default projection
- **AND** its endpoint-closed citation edges are eligible for layout

### Requirement: Public pages and layout SHALL share one bounded projection

The default public graph pages and Citation layout SHALL consume one basis-bound projection with library-first stable ordering, a 20,000-node cap, an 80,000-edge cap, and endpoint closure. Cursor traversal MUST NOT admit nodes outside that projection, and view filters may only remove projected nodes or edges.

#### Scenario: A bounded projection is paged and laid out
- **WHEN** all public pages for one basis are drained and layout is computed for that basis
- **THEN** the page union and layout node/edge identity sets are equal
- **AND** a node excluded by the projection cap or degree policy cannot appear through a later cursor
