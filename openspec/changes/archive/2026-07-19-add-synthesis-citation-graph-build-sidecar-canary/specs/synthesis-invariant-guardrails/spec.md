## ADDED Requirements

### Requirement: Inventory SHALL record one in-process graph-build canary
Migration governance SHALL mark graph build as `in_process` with
`sidecar_worker_canary: true` and `production_worker: false`, retain layout and
metrics as the only production workers, and retain the other five engines in
process.

#### Scenario: Inventory is checked
- **WHEN** synthesis migration invariants are evaluated
- **THEN** they SHALL report two production worker engines, one in-process worker canary, five other in-process engines, `108 methods / 1 direct consumer`, and `mutationEnabled: false`

### Requirement: Graph-build worker SHALL have no application authority
The graph-build worker route SHALL NOT import or use repositories, DB access,
canonical files, Host capabilities, Zotero globals, child processes, or a local
production fallback.

#### Scenario: Service boundary is checked
- **WHEN** static dependency governance scans the graph-build route
- **THEN** worker-thread imports SHALL remain allowlisted and all prohibited authority SHALL remain absent
