## 1. Path Boundary Regression Tests

- [x] 1.1 Extend platform path tests for Windows slash paths, local file URLs, percent decoding, and malformed inputs.
- [x] 1.2 Extend Host file and Product storage tests for nativeized IOUtils calls, non-throwing existence probes, and local-file source normalization.

## 2. Shared Path Boundary Implementation

- [x] 2.1 Extend the shared native path normalizer and apply it consistently across Host file operations.
- [x] 2.2 Normalize Product local-file sources before existence checks and copy operations.

## 3. Optional Markdown Image Regression and Fix

- [x] 3.1 Add Literature Bundle and Research Bundle tests for resolver rejection, preserved links, omitted assets, and manifest warnings.
- [x] 3.2 Catch shared Markdown image resolver failures and retain the existing `markdown_image_missing` warning contract.

## 4. Apply Diagnostics Regression and Implementation

- [x] 4.1 Add seam and log instrumentation tests for bounded diagnostics on normal, short-circuit, and aggregate apply success paths.
- [x] 4.2 Add typed apply diagnostics normalization and propagate summaries through every apply success branch.
- [x] 4.3 Return manifest-derived diagnostics from the Research Bundle apply hook without duplicating warning facts.

## 5. Validation

- [x] 5.1 Run targeted Node tests and TypeScript checking; record any real-Zotero-only validation limitation.
  - Validation: 144 targeted tests and 48 adjacent regression tests passed; TypeScript passed. The five real-Zotero platform-service cases remain pending under the Node mock.
- [x] 5.2 Run changed-file formatting/lint checks, strict OpenSpec validation, and `git diff --check`.
