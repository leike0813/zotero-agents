## MODIFIED Requirements

### Requirement: Citation Graph neighborhood reads SHALL share page merge semantics

The existing graph slice operation SHALL accept an expected graph hash, current normalized filters, a direction of incoming, outgoing, or both, depth from one to four with default one, and bounded node and edge limits. It SHALL return a basis-bound neighborhood without advancing the sequential window cursor. Slice and slice-layout selection SHALL honor the same depth, direction, filters, and limits.

#### Scenario: Incoming neighborhood is expanded

- **WHEN** a consumer requests the incoming one-hop neighborhood of a selected node under the current basis
- **THEN** the response includes bounded incoming edges and their endpoints and leaves the page cursor unchanged.

#### Scenario: Two-hop neighborhood is requested

- **WHEN** a consumer requests depth two on a graph containing a third layer
- **THEN** the result includes eligible nodes reachable within two hops and excludes third-hop-only nodes
- **AND** the diagnostic depth is two and every returned edge is endpoint-closed.

### Requirement: Public pages and layout SHALL share one bounded projection

Default public pages SHALL preserve the existing library/shared-external overview projection. Shared layout SHALL extend its coverage to single-source external references under the existing 20,000-node and 80,000-edge caps, with stable library-first, shared-external-second, single-external-last ordering and endpoint closure. Cursor traversal SHALL remain restricted to the overview projection.

#### Scenario: A bounded projection is paged and laid out

- **WHEN** all public pages for one basis are drained and shared layout is computed for that basis
- **THEN** every retained overview node is eligible for shared layout coordinates
- **AND** additional single-source coordinates do not admit those nodes to the Workbench overview or its later cursors.

#### Scenario: Layout coverage changes

- **WHEN** a persisted layout uses the earlier overview-only coverage version
- **THEN** it is not reported as a current complete layout
- **AND** explicit stale reads may still reuse its finite coordinates without triggering recomputation.
