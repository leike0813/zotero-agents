## 1. Implementation

- [x] Move legacy standalone sidebar host modules to
  `deprecated/assistant-sidebar-entrypoints/`.
- [x] Add archive README explaining that deprecated files are not active source.
- [x] Keep `assistantWorkspaceSidebar.ts` as the only active sidebar host.
- [x] Keep compatibility action names routed through unified workspace tabs.
- [x] Preserve Assistant Workspace child page resources.

## 2. Tests

- [x] Update SkillRunner sidebar entrypoint tests to assert unified workspace routing.
- [x] Update sidebar host runtime tests to target `assistantWorkspaceSidebar.ts`.
- [x] Update ACP UI smoke assertions that previously read deprecated host files.
- [x] Run targeted Assistant sidebar regression tests.
- [x] Run build.

## 3. Validation

- [x] Validate this OpenSpec change with `openspec validate --strict`.
