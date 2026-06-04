## 1. OpenSpec and Documentation

- [x] 1.1 Add and validate OpenSpec artifacts for surface-scoped Workbench refresh.
- [x] 1.2 Update active Synthesis docs and contracts with Shell/Chrome/Surface architecture and hot-path invariants.

## 2. Service Read Models

- [x] 2.1 Add Workbench chrome/surface DTO types and lightweight service APIs.
- [x] 2.2 Split surface readers so Index, Review, Graph, Tags, Concepts, Topics, and Home load only their required data.
- [x] 2.3 Rename the monolithic snapshot API to debug-only and remove it from active Workbench host paths.

## 3. Host Bridge and Warmup

- [x] 3.1 Add `synthesis:chrome`, `synthesis:surface`, and `synthesis:surface-error` bridge messages.
- [x] 3.2 Rework `ready`, `refresh`, `selectTab`, and progress handling to use chrome/surface messages without full snapshots.
- [x] 3.3 Add phased startup/visible-surface warmup with event-loop yielding and surface cache invalidation rules.

## 4. Frontend Rendering

- [x] 4.1 Add surface runtime state and stable `data-synthesis-surface` containers.
- [x] 4.2 Implement `renderSurface(surface)` and keep chrome/statusbar updates independent from content surfaces.
- [x] 4.3 Route local Review pending/selection/filter interactions through local surface refresh only.

## 5. Guards and Validation

- [x] 5.1 Add static and behavior guards for no full snapshot hot paths and no surface-local global rerender.
- [x] 5.2 Run targeted Synthesis UI/reference/graph/performance/invariant tests.
- [x] 5.3 Run TypeScript, build, and OpenSpec strict validation.
