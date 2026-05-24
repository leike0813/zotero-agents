## 1. OpenSpec

- [x] Create change scaffold.
- [x] Add proposal, design, output-boundary spec, and tasks.

## 2. Host Bridge Output Boundary

- [x] Add shared workflow/task DTO sanitizer.
- [x] Redact path-like `inputUnitIdentity` values from submit/run/task outputs.
- [x] Redact local filesystem paths inside externally returned task errors.
- [x] Update manifest CLI metadata to `supported: true` with schema.

## 3. CLI Output Boundary

- [x] Change `file download` success payload from `output` to `outputName`.
- [x] Change download output error details from `output` to `outputName`.
- [x] Clarify CLI installer PATH/restart result messages.

## 4. Tests and Verification

- [x] Extend Host Bridge workflow-control tests for response redaction.
- [x] Extend Host Bridge manifest tests for CLI metadata.
- [x] Extend Rust CLI tests for download output redaction.
- [x] Extend CLI packaging tests for PATH messaging.
- [x] Run targeted Node tests.
- [x] Run Rust CLI tests.
- [x] Run build.
