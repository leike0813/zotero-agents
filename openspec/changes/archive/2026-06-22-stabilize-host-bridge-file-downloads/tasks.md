## 1. Server Download Integrity

- [x] Replace string-assembled file responses with binary response bodies.
- [x] Write binary responses to the output stream in chunks.
- [x] Include accurate `Content-Length` on successful file downloads.
- [x] Include `X-Zotero-Bridge-Sha256` when registry metadata is available.

## 2. Registry And Agent-Run Metadata

- [x] Record registered file `size` when available.
- [x] Compute and record registered file `sha256` when bytes are available.
- [x] Register workflow agent-run zip bundles with direct byte length and hash.
- [x] Return agent-run bundle descriptors with `size` and `sha256`.

## 3. CLI Validation And Output

- [x] Validate downloaded body length against `Content-Length`.
- [x] Validate downloaded body hash against `X-Zotero-Bridge-Sha256`.
- [x] Retry `file download` and `workflow agent-run --output-dir` once for
  truncation, checksum mismatch, or interrupted response errors.
- [x] Report successful download metadata in stable JSON fields.
- [x] Report stable download error codes without absolute paths or tokens.

## 4. Tests And Release Artifacts

- [x] Extend Host Bridge file download tests for binary bytes and hash headers.
- [x] Extend workflow agent-run tests for bundle `size` and `sha256`.
- [x] Extend Rust CLI tests for content-length, checksum, retry success, and
  retry exhaustion behavior.
- [x] Run OpenSpec, TypeScript, Rust, render, prebuild, and dry-run publish
  validations.
