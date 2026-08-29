## 1. Red Tests

- [x] 1.1 Extend client foundation tests for the four Workbench routes, request forwarding, JSON-safe boundaries, and stable errors.
- [x] 1.2 Update the read-only UI harness test to require client routing, region-scoped reads, and retained mutation blocking.
- [x] 1.3 Extend the sidecar boundary test to require one legacy composition root and exactly four direct consumers.

## 2. Workbench Contracts

- [x] 2.1 Add environment-neutral Workbench request/result DTOs, the surface-name union, and the grouped client interface.
- [x] 2.2 Make the contracts surface union the single source of truth and register/export the Workbench client group.

## 3. Adapter and Composition

- [x] 3.1 Extend the narrow legacy port and in-process client with four validated Workbench query routes and stable error mapping.
- [x] 3.2 Extract one shared legacy service composition and method adapter for default and fixed read-only service resolution.
- [x] 3.3 Preserve default client singleton and invalidation behavior while removing its direct service import.

## 4. Read-only Harness Migration

- [x] 4.1 Replace the read-only service factory with a client factory that retains adapter ownership and failure cleanup.
- [x] 4.2 Route UI harness chrome, surface, Topic detail, and paper digest reads through `client.workbench` without adding full-snapshot or mutation routes.
- [x] 4.3 Update the direct-consumer inventory and active runtime/client-boundary documentation.

## 5. Validation

- [x] 5.1 Run contract/root typechecks, focused client/harness tests, boundary and Synthesis invariant checks, and targeted format/lint checks.
- [x] 5.2 Run the production build and strict OpenSpec validation, then confirm every task and direct-consumer invariant is complete.
