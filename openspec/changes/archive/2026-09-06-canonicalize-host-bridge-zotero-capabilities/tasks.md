## 1. Canonical contracts and preparation

- [x] 1.1 Replace legacy mutation types with the closed canonical request/result mapping and strict Broker-owned schemas; verify type checking and schema operation coverage.
- [x] 1.2 Implement effect-free private preparation, safe preview, digest binding and in-slice revalidation for every write; verify preflight and stale-plan behavior through Broker tests.
- [x] 1.3 Enforce normalized explicit/expanded list limits and canonical related/Trash semantics; verify atomicity, duplicate rejection and parent-child cases.

## 2. Durable mutation authority

- [x] 2.1 Persist identity admission and terminal evidence in pluginStateStore with atomic winner execution; verify concurrency, conflicts and persistence-failure behavior.
- [x] 2.2 Resolve replay before preparation/resource acquisition, reconcile interrupted executions, retain 30-day evidence and permanent tombstones; verify restart, expiry and unknown/repair retention.
- [x] 2.3 Add canonical getOperation observation and preserve existing receipt consumers; verify running/settled/unavailable through public APIs.

## 3. Native effects and trusted files

- [x] 3.1 Move retained native effects into Broker-private ownership and replace Workflow executor injection with trusted prepared-file context; verify default Broker writes and Workflow adapter behavior.
- [x] 3.2 Implement managed file preparation, import/replacement validation and compensation; verify immutable identity, stored modes, preserved placement and cleanup failures.
- [x] 3.3 Implement literature.ingest required core effects and optional enrichment outcomes with bounded identity lookup; verify existing metadata preservation and required/optional failure rollback.

## 4. Bridge, MCP and CLI

- [x] 4.1 Route Bridge/MCP through canonical preparation and shared approval continuation; verify changed-plan reapproval and stable caller scope.
- [x] 4.2 Bypass generic HTTP mutation reservation for canonical writes and share attachment locality/lease handling across execution and observation; verify replay without upload resource and opaque output.
- [x] 4.3 Project canonical contracts into Bridge/CLI schemas, migrate command builders and resolve one operation identity per intent; verify schema mode, conflicting identity and mutation get-operation.

## 5. Consumers and deletion

- [x] 5.1 Add explicit Workflow mutations.getOperation projection and update the 89-callable contract; verify Workflow contract and complete fail-closed harnesses.
- [x] 5.2 Migrate Synthesis tag effects and remaining mutation/receipt consumers; verify existing public consumer tests.
- [x] 5.3 Delete legacy mutation routes, public token/revision authority and handlers aggregate/injection under DEL-03/04/08/14; verify targeted repository searches and type checking.

## 6. Guidance and completion

- [x] 6.1 Record fixed baseline metrics and approved semantic deletion inventory, update governed source guidance, and review parity before generation; deliver review evidence with all four semantic counts.
- [x] 6.2 Render affected governed surfaces and Chinese mirrors using existing tooling; verify thickness, parity and freshness while recording unrelated release metadata failures separately.
- [x] 6.3 Update architecture/ownership documentation and run focused plus required integration checks; record commands, results and any pre-existing failures in acceptance evidence.
- [x] 6.4 Verify the change against all artifacts, synchronize delta specs and archive without commit or publication; verify archived artifacts and clean task completion state.
