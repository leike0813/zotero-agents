## 1. Contracts and Failing Tests

- [x] 1.1 Add Core 192 subprocess tests for build/start, loopback health, authenticated handshake, token separation, bounded input, redaction, and shutdown.
- [x] 1.2 Extend Core 168 and Core 152 first with service-app dependency isolation, in-process production topology, and unchanged `108 / 1` inventory assertions.
- [x] 1.3 Add the environment-neutral sidecar system protocol, request/response, health, handshake, capability, lifecycle, and stable error contracts.

## 2. Independent Node Runtime

- [x] 2.1 Add the private `apps/synthesis-service` workspace, strict Node typecheck config, and plain-JavaScript emit config.
- [x] 2.2 Implement strict absolute-path config loading, unknown-field rejection, loopback-only startup, token separation, mutation-disabled enforcement, and opaque runtime identities.
- [x] 2.3 Implement bounded JSON parsing and strict request-envelope rebuilding with stable HTTP/error-code mapping.
- [x] 2.4 Implement unauthenticated minimal health and authenticated handshake with protocol/profile/schema/capability validation.
- [x] 2.5 Implement lifecycle-token shutdown, connection draining, bounded forced close, signal handling, structured JSONL lifecycle logs, and fail-fast process handlers.

## 3. Build and Governance

- [x] 3.1 Add root service check/build commands and make the production build compile the independent service without packaging it into the XPI.
- [x] 3.2 Update Synthesis invariant metadata and boundary guards for the service runtime foundation while preserving the in-process client and `108 / 1` inventory.
- [x] 3.3 Update Synthesis README, runtime/rebuild, invariant, and Stage 1 current-state docs without claiming launcher, worker, remote client, or data ownership.

## 4. Validation

- [x] 4.1 Run Core 192, Core 168, Core 152, Core 175, service/contracts/root TypeScript, service-boundary, and Synthesis invariant checks.
- [x] 4.2 Run targeted Prettier/ESLint, production build, `git diff --check`, and help/documentation checks; resolve regressions.
- [x] 4.3 Run strict OpenSpec validation and confirm artifacts, implementation, requirements, and task status are coherent.
