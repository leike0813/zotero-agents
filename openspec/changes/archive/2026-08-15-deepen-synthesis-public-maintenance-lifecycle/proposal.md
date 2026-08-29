## Why

Public maintenance operation lifecycle knowledge is split across production routing, the maintenance helper, and the WebDAV wire surface. That split has already produced duplicate dispatch windows, inconsistent post-commit failure handling, incomplete terminal observation, and restart/control behavior that no single module or test surface owns.

## What Changes

- Establish one deep runtime module that owns public maintenance operation admission, dispatch ownership, control, execution context, terminalization, receipt projection, and restart reconciliation.
- Replace phase-oriented caller orchestration with typed `submit`, `control`, `read`, and `reconcile_restart` commands returning a transport-neutral maintenance operation view.
- Make durable insert/CAS winners the only dispatch owners; duplicate submit, retry, continue, and cancel commands return the current operation without repeating work or lifecycle events.
- Treat failures after durable command commit as outcomes of the same operation, while keeping pre-commit validation and persistence failures as command errors.
- Preserve explicit restart recovery: pending work becomes `continuation_required`, public running work becomes an external-effect-unknown terminal failure, and startup never replays maintenance work.
- Define `maintenance-started` as an operation-level event and publish every terminal event from the durable terminal commit winner; remove Host-side receipt inference and unpin originating traces by operation identity.
- Keep the production catalog as the route and policy source of truth through an opaque resolved maintenance route; do not add a second registry, repository port, public DTO, event schema, or database schema.
- Replace implementation-coupled lifecycle tests with command-interface tests using temporary SQLite plus private deterministic executor, clock, and event seams, retaining focused process evidence for exactly-once effects and restart behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-work-governance`: Define durable execution ownership for submit, retry, and continue; duplicate behavior; cooperative cancellation; and restart classification.
- `synthesis-native-production-routing`: Route resolved maintenance work through a typed lifecycle interface without exposing handler or persistence implementation.
- `synthesis-sidecar-operation-observability`: Define operation-level started events, terminal-winner publication, and operation-identity trace unpinning.
- `synthesis-native-webdav-maintenance-surface`: Limit the WebDAV adapter to wire translation while preserving the existing semantic surface and public representation.

## Impact

- Rust runtime: repository CAS result reporting, `runtime_public_maintenance_operation`, `runtime_production_client`, `runtime_webdav_maintenance_surface`, runtime startup reconciliation, and maintenance promotion checkpoint callers.
- TypeScript host integration: native receipt handling and sidecar trace retention.
- Tests: Rust lifecycle/catalog/wire tests and focused Node/process observability and exactly-once scenarios.
- Documentation: Synthesis glossary and runtime/workbench lifecycle documentation.
- No dependency, public manifest, public DTO, event schema, operation roster, or repository schema changes.
