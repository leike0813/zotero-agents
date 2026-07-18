## 1. Red Tests

- [x] 1.1 Update client tests for all twenty-three normal and eight debug routes, JSON rebuilding, delivery context, missing ports, invalid results, and stable error classes.
- [x] 1.2 Update Host Bridge/MCP tests for client injection, local/remote delivery, debug approval, catalog-only list/call, and unchanged result envelopes.
- [x] 1.3 Update boundary tests for 128 public methods, one direct consumer, new client exports, corrected library-index disposition, and removal of MCP service dependencies.

## 2. Grouped Client Capability

- [x] 2.1 Add opaque host-query contracts, delivery context, and grouped Topic, Graph, Reference, Artifact, Concept, Maintenance, Library Index, Workflow Review, and Debug client methods.
- [x] 2.2 Add optional legacy ports and in-process implementations with shared JSON normalization and error classification.
- [x] 2.3 Compose all ports through the single legacy composition root, reusing existing Topic Report, artifact read, and paper-digest paths.

## 3. Host Proxy Migration

- [x] 3.1 Route all normal and debug Host Bridge Synthesis capabilities through the cached default client and preserve delivery mode, aliases, approvals, and results.
- [x] 3.2 Replace Host Bridge server and MCP test service resolvers with client resolvers.
- [x] 3.3 Delete the unused MCP registry dependency closure while retaining the live Host catalog adapter, shared helpers, and exported constants.
- [x] 3.4 Remove the obsolete MCP service facade and use the package delivery context from the legacy service.

## 4. Inventory, Documentation, and Validation

- [x] 4.1 Update inventory classifications and direct consumers while retaining the 128-method public service surface.
- [x] 4.2 Update Synthesis current-state and Host Bridge capability-registry documentation.
- [x] 4.3 Run focused Core 101, 107, 123, 128, 131, 168, 175, and 176 tests; readonly UI harness; and Synthesis invariants.
- [x] 4.4 Run contracts/root TypeScript, service-boundary, Host Bridge surface/doc/prebuild checks, targeted Prettier/ESLint, `git diff --check`, production build, and strict OpenSpec validation without archiving or committing.
