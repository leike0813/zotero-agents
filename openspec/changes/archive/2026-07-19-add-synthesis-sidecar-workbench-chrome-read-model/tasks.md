## 1. Contract-first application projection

- [x] 1.1 Add Core 204 tests for strict operational chrome DTOs, fixed cache readiness, bounded jobs, progress, ordering, freshness, and read purity.
- [x] 1.2 Extend Workbench and sidecar contracts with strict request/result rebuilders, general capability classification, and generic transport error codes.
- [x] 1.3 Create `packages/synthesis-application` with a narrow repository read port and the bounded operational chrome query.
- [x] 1.4 Add root typecheck/build integration and environment-neutral package boundary checks.

## 2. Production projection reuse

- [x] 2.1 Refactor plugin Workbench operation-to-job and current-failure projection to reuse the application package.
- [x] 2.2 Preserve plugin-owned storage, sync, review, canonical maintenance, public `SynthesisClient` routing, and output shape.
- [x] 2.3 Extend Core 125, 146, 150, 168, and 175 parity/invariant checks without adding implementation-detail-only coverage.

## 3. Authenticated sidecar canary

- [x] 3.1 Add the main-process `workbench.chrome.read` handler with strict input/output rebuilding and general wire limits.
- [x] 3.2 Add the internal Workbench sidecar client with authentication, identity checks, AbortSignal, one-second deadline, and strict reconstruction.
- [x] 3.3 Parameterize RPC transport error mapping while preserving existing compute and transfer client error behavior.
- [x] 3.4 Extend Core 192, 194, and 204 for auth, discovery/handshake parity, malformed payload/result, cancellation, timeout, restart reconciliation, and responsive control-plane behavior.

## 4. Boundaries and packaging

- [x] 4.1 Include the application package and Workbench contract in service TypeScript output, runtime bundle/XPI checks, and fingerprints.
- [x] 4.2 Extend static boundaries to forbid Node, worker, subprocess, repository adapter, canonical, Host, Zotero, and UI runtime dependencies from the application package.
- [x] 4.3 Extend Core 168 and 193 for exact package contents, production-disconnected client imports, fingerprint invalidation, and unchanged license/dependency inventory.

## 5. Governance and documentation

- [x] 5.1 Update `service-api-migration.yaml` with the Workbench chrome canary while preserving 108 methods, one direct consumer, engine ownership, and `mutationEnabled: false`.
- [x] 5.2 Update runtime, Workbench, persistence, performance, packaging, README, and Stage 1 WS5 documentation with the operational-only boundary.
- [x] 5.3 Update help-document indexing/checks where required without publishing or synchronizing runtime prebuilds.

## 6. Verification

- [x] 6.1 Run application/contracts/repository/service/root TypeScript checks and focused Core 125/146/150/168/175/192-194/203-204 suites.
- [x] 6.2 Run service boundary, Synthesis invariants, package/fingerprint, targeted Prettier/ESLint, help-doc, and production build checks.
- [x] 6.3 Run `git diff --check` and strict OpenSpec validation, then mark all tasks complete only after implementation matches the artifacts.
