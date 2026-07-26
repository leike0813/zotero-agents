## 1. Source-aware Trace Naming TDD

- [x] 1.1 Extend semantic trace recorder tests for Chat and ACP Skills default partial/saved basenames.
- [x] 1.2 Implement the single source-kind-to-filename-token mapping in recorder arming.
- [x] 1.3 Verify Replay sample derivation preserves the new `chat` and `skills` tokens while legacy trace names remain readable.

## 2. Existing Artifact Migration

- [x] 2.1 Verify source kind, digest pairing, current hashes, and target-path collision absence for all existing trace and Replay files.
- [x] 2.2 Rename the earlier Skills trace, later Chat trace, and all corresponding Replay JSON/Markdown pairs without rewriting content.
- [x] 2.3 Verify old paths are absent, new paths are complete, hashes are unchanged, and every renamed Replay file still matches its trace source/digest.

## 3. Validation

- [x] 3.1 Run focused recorder/replay tests, TypeScript, changed-file formatting/lint, strict OpenSpec, release-elision, and `git diff --check`.
