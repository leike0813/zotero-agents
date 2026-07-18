## ADDED Requirements

### Requirement: Exactly two engines use production workers
Migration governance SHALL mark Citation Graph layout and metrics as
`sidecar_worker` with `production_worker: true`, while the other six extracted
engines remain in process.

#### Scenario: Inventory is checked
- **WHEN** synthesis migration invariants are evaluated
- **THEN** they report two production worker engines, six in-process engines, `108 methods / 1 direct consumer`, and `mutationEnabled: false`

### Requirement: Metrics worker has no host authority
The metrics worker route SHALL NOT import or use repositories, DB access,
canonical files, Host capabilities, Zotero globals, child processes, or a local
production fallback.

#### Scenario: Service boundary is checked
- **WHEN** static dependency governance scans the metrics route
- **THEN** only the designated pool and worker files may import `node:worker_threads` and all prohibited authority remains absent
