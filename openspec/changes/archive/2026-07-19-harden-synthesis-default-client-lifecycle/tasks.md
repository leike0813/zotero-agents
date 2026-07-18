## 1. Lifecycle Regression Tests

- [x] 1.1 Extend Core 176 with concurrent acquisition, initialization invalidation, stale-client fail-closed, fresh replacement ordering, and idempotent shutdown/reset cases
- [x] 1.2 Extend Core 159 with canonical-maintenance timer cancellation and active WebDAV application drain cases
- [x] 1.3 Extend Core 42 with the ordered, timeout-protected `synthesis-client-dispose` plugin shutdown step
- [x] 1.4 Run the focused new cases against the pre-fix implementation and confirm the lifecycle regressions fail

## 2. Default Client and Composition Lifecycle

- [x] 2.1 Implement generation-scoped shared initialization, synchronous invalidation, tracked cleanup, fresh acquisition ordering, shutdown, and test reset in `defaultClient.ts`
- [x] 2.2 Implement private owner identity, disposed fail-closed client calls, owner-specific cleanup, and idempotent composition disposal in `legacyComposition.ts`

## 3. Service and Plugin Cleanup

- [x] 3.1 Add the internal WeakMap service disposer without changing the public service method inventory
- [x] 3.2 Cancel canonical-maintenance debounce state on runtime abort and make disposal stop admission and drain active WebDAV applications
- [x] 3.3 Invoke default-client shutdown before the sidecar supervisor stop step in `hooks.ts`

## 4. Verification

- [x] 4.1 Run Core 42, 130, 146, 159, and 176 plus related Synthesis invariant tests
- [x] 4.2 Run root TypeScript, service-boundary checks, target ESLint/Prettier, and `git diff --check`
- [x] 4.3 Strictly validate the OpenSpec change and confirm 108 public service methods, one direct production consumer, no dependency/storage/runtime-asset drift, and no unrelated workspace changes
