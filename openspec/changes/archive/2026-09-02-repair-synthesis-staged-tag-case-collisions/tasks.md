## 1. Promotion Regression

- [x] 1.1 Add a public application regression for case-variant staged promotion and verify it fails against the current implementation
- [x] 1.2 Implement the shared grouped promotion plan and case-insensitive candidate validation; verify the application regression passes

## 2. Historical Repair

- [x] 2.1 Add public application regressions for collided canonical repair, reference/effect redirection, idempotence, and transaction rollback; verify they fail against the current implementation
- [x] 2.2 Implement the atomic repository repair transaction and application startup operation; verify repair and rollback regressions pass
- [x] 2.3 Wire best-effort repair into production startup before readiness and verify a repair failure still permits readiness

## 3. Process Coverage And Documentation

- [x] 3.1 Extend the real production route test with an isolated collided database and verify startup reads plus cold reopen pass
- [x] 3.2 Update the Synthesis architecture document with the current grouped-promotion and startup-repair ownership rules; verify the document matches implemented boundaries

## 4. Validation

- [x] 4.1 Run focused Rust application and sidecar tests plus the production route test and verify all pass
- [x] 4.2 Run Rust formatting/clippy, Synthesis capability checks, strict OpenSpec validation, and `git diff --check`; record any environment-limited validation

## Validation Notes

- Focused Tag Vocabulary tests, the complete sidecar package tests, and the real production Tags route test pass.
- The complete application package reports 96 passing tests and five unrelated Windows cleanup failures caused by locked temporary files in library snapshot and tag audit tests.
- Clippy with `-D warnings` passes for the three changed Rust packages using `--no-deps`; workspace clippy is blocked by an existing `collapsible_if` warning in `synthesis-canonical-store`.
- Rustfmt reports only pre-existing formatting in unchanged lines; all changed TypeScript, Markdown, and OpenSpec files pass Prettier.
- Runtime freshness remains intentionally stale because governed seven-platform prebuild publication was not authorized.
