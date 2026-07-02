## 1. Host Bridge

- [x] Extract the Zotero `Artifacts` column detection logic into a shared evaluator.
- [x] Add `library.readiness_audit` to the Host Bridge capability registry.
- [x] Add broker support for paginated readiness audit results using the existing library page selector.
- [x] Mark the capability read-only and approval-free.

## 2. CLI and Surface

- [x] Add `library readiness audit|missing-pdf|missing-markdown|missing-analysis`.
- [x] Map all readiness commands to `library.readiness_audit`.
- [x] Update the surface catalog and generated Host Bridge CLI documentation.
- [x] Update wrapper/profile semantic source and render generated outputs.

## 3. Tests

- [x] Cover shared artifact evaluator behavior for source Markdown and generated note markers.
- [x] Cover Host Bridge readiness capability filtering and redacted evidence.
- [x] Cover CLI parser and payload builders.
- [x] Run Host Bridge doc/profile sync checks and focused packaging checks.
