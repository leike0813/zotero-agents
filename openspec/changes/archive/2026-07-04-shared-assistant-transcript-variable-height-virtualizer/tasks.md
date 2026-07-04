## 1. OpenSpec

- [x] Add variable-height virtualization requirements to `assistant-sidebar-ui`.

## 2. Shared Renderer

- [x] Add renderer-owned row height measurement and anchor state.
- [x] Compute virtual windows, spacer heights, and page boundary checks from
      cumulative row heights.
- [x] Preserve non-sticky scroll position by stable row anchor across rerenders.

## 3. Tests and Validation

- [x] Extend fake DOM measurement support and cover variable-height scroll
      behavior.
- [x] Preserve ACP Skills shared-renderer delegation smoke tests.
- [x] Run OpenSpec validation, focused UI tests, TypeScript, and Prettier check.
