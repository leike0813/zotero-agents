# Spec Delta

## MODIFIED Requirements

### Requirement: Persisted Citation Graph layout SHALL use the public layout format

Native layout computation SHALL validate the worker result and persist a
normalized layout containing snake-case identity fields, layout version,
algorithm, parameters, a node-ID coordinate map, and a canonical layout hash.

#### Scenario: A legacy raw worker layout is read
- **WHEN** the stored JSON contains the worker node array instead of the normalized coordinate map
- **THEN** the layout is reported as stale and its coordinates are not applied
- **AND** automatic recomputation may replace it without a schema migration

#### Scenario: A layout is ready
- **WHEN** the layout graph hash and version match and every displayed node has finite coordinates
- **THEN** Workbench returns `ready` and attaches the coordinates
- **AND** a missing, stale, or failed layout does not hide the last-good graph

#### Scenario: A read explicitly accepts stale coordinates

- **WHEN** `getCitationGraphLayout` is called with `allowStale: true`
- **THEN** normalized persisted coordinates MAY be returned even when their graph basis is old or they cover only part of the requested nodes
- **AND** the result retains `status: "stale"`, `layout_status: "stale"`, and `ok: false` when the layout is not current and complete
- **AND** only requested current graph nodes with finite stored coordinates and edges whose endpoints are returned SHALL be included
- **AND** the read SHALL remain bounded and validate its current graph read-view basis without computing or persisting coordinates
- **AND** omitted or false `allowStale` SHALL preserve strict layout readiness behavior.
