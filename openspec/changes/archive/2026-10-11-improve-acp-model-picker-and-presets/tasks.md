# Tasks

## 1. Connection lifecycle
- [x] 1.1 Publish immediate startup busy state and share pending connection per owner; verify lifecycle regressions and projected action state.

## 2. Provider and model identity
- [x] 2.1 Normalize grouped, nested and structured model IDs with retained metadata and raw selection mapping; verify runtime, cache and workflow regressions.
- [x] 2.2 Document model/provider behavior and review affected serializer paths.

## 3. Versioned presets
- [x] 3.1 Add OpenCode v2 first and legacy v1 last with version-specific launch/isolation; verify preset tests and update preset documentation.

## 4. Favorites and shared picker
- [x] 4.1 Persist backend favorites, validate selected-owner actions and publish composer-only updates; verify action/store/publication regressions.
- [x] 4.2 Implement grouped searchable bounded accessible picker and localized labels; verify interactions and stable DOM across transcript updates.
- [x] 4.3 Document shared picker behavior and region ownership.

## 5. Integration acceptance
- [x] 5.1 Run affected suites, TypeScript, scoped style/lint checks, localization governance, build and OpenSpec validation; inspect final diff.
