## 1. Host API

- [x] 1.1 Add workflow input file materialization types and host API implementation backed by runtime tmp.
- [x] 1.2 Document the managed input API and mark `getTempDirectoryPath()` as ephemeral scratch storage.

## 2. Workflow Migration

- [x] 2.1 Migrate tag-regulator generated `valid_tags` and digest markdown files to the managed input API.
- [x] 2.2 Migrate literature deep-reading source bundle generation to the managed input API.

## 3. Tests And Validation

- [x] 3.1 Add focused tests for host API materialization behavior.
- [x] 3.2 Update workflow request-building tests for managed input paths.
- [x] 3.3 Run focused tests, OpenSpec validation, TypeScript validation, and diff whitespace checks.
