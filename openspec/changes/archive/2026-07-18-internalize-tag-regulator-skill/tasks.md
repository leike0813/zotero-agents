## 1. Contract Tests

- [x] 1.1 Add a repository-owned Tag Regulator skill contract test covering builtin status semantics, current facet set, removed legacy rules, and public-list exclusion.
- [x] 1.2 Extend workflow apply tests so builtin statuses from add, remove, and suggest paths are ignored while ordinary tag changes continue.
- [x] 1.3 Extend content package collection coverage for the repository-owned Tag Regulator runtime files.

## 2. Repository Ownership

- [x] 2.1 Remove only the Tag Regulator submodule declaration and convert its current fixed snapshot from gitlink to ordinary tracked files.
- [x] 2.2 Verify the Tag Regulator path no longer contains a nested Git pointer and is absent from `git submodule status` without modifying other submodules.

## 3. Skill Policy

- [x] 3.1 Rewrite `SKILL.md` so plugin-provided builtin workflow statuses are compliant read-only entries that are never inferred or emitted as add, remove, or suggest output.
- [x] 3.2 Rewrite `references/tag_standard.md` as a current-state-only eight-facet standard with workflow-pending status semantics and no matching or reading-progress rules.
- [x] 3.3 Confirm runner, schemas, scripts, skill id, workflow request shape, and independent public-skill list remain unchanged.
- [x] 3.4 Restore the upstream Tag Standard structure, apply only required workflow-status deltas, and keep the Tag Regulator and Tag Bootstrapper copies byte-identical.

## 4. Verification

- [x] 4.1 Run targeted Tag Regulator and content package tests, manifest check, TypeScript check, and scoped lint/format checks.
- [x] 4.2 Validate the OpenSpec change strictly and verify final Git index modes and submodule boundaries.
