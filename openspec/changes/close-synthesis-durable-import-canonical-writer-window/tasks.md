## 1. Regression Contract

- [x] 1.1 Add a Core 215 regression that stages a canonical import batch, proves an overlapping ordinary promotion is rejected without writes, and verifies batch commit plus later admission.
- [x] 1.2 Run the focused regression against the current implementation and confirm it fails on the open writer window.

## 2. Canonical Writer Admission

- [x] 2.1 Centralize Node canonical promotion behind a private admission path that rejects ordinary writers while a batch marker exists.
- [x] 2.2 Authorize only matching receipt commit and recovery to promote the staged batch, preserving cleanup and repair-required behavior.

## 3. Verification

- [x] 3.1 Pass focused Core 205/215, service and root TypeScript, service boundary, formatting, and diff checks.
- [x] 3.2 Strictly validate the completed OpenSpec change and confirm no public interface, runtime asset, or unrelated worktree changes were introduced.
