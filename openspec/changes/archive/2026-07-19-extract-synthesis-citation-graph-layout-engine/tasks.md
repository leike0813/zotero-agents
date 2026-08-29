## 1. Engine Contract and Parity TDD

- [x] 1.1 Add Core 183 red tests for canonical request/result rebuilding, JSON safety, shared bounds, duplicate/dangling/non-finite rejection, unknown-field removal, and environment-neutral dependencies.
- [x] 1.2 Add characterization coverage for force, radial, components, isolated nodes, legacy preset normalization, layout version/params, representative coordinates, and layout-hash parity.
- [x] 1.3 Implement the strict `packages/synthesis-engine` contract, deterministic kernels, checkpoint seam, and in-process engine without Node/plugin/runtime dependencies.

## 2. Application Orchestration

- [x] 2.1 Add an application adapter for DB graph request projection and existing persisted layout/result projection while keeping layout hashing in the application.
- [x] 2.2 Inject the engine through `SynthesisServiceOptions` and default legacy composition without changing Graph client or public service methods.
- [x] 2.3 Compute outside the library write lock, re-read graph basis under a short promotion lock, and preserve the prior layout on superseded, throwing, malformed, or oversized results.

## 3. Process Canary and Boundary Guardrails

- [x] 3.1 Add a test-only Node worker fixture and assert direct/worker structured-clone parity without adding production worker imports.
- [x] 3.2 Update Core 122/125/129/168/175 as needed for deterministic parity, Graph routing, guarded promotion, engine dependency rules, and unchanged `125 methods / 1 direct consumer` inventory.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, performance/scale, and Citation Graph documentation for the engine seam and lock/promotion behavior.
- [x] 4.2 Run Core 122, 125, 129, 138, 157, 168, 172, 175, 176, 178-183, Synthesis invariants, engine/contracts/root TypeScript, service-boundary, targeted Prettier/ESLint, `git diff --check`, and production build.
- [x] 4.3 Run strict OpenSpec validation and confirm all tasks complete without archiving, publishing, or committing the change.
