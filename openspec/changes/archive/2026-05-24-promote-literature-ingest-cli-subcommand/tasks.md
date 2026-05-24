## 1. OpenSpec

- [x] Create change scaffold.
- [x] Add proposal, design, CLI spec, broker delta spec, and tasks.

## 2. Host Bridge Broker

- [x] Add `literature.ingest` as the canonical mutation operation.
- [x] Replace legacy `paper.ingest` alias with single-paper `literature.ingest`.
- [x] Normalize preview/execute responses to `literature.ingest`.
- [x] Update human approval text for literature ingest.
- [x] Replace the old plural MCP compatibility path with `ingest_paper`.

## 3. Rust CLI

- [x] Add top-level `literature` command.
- [x] Add `literature ingest --input <JSON_OR_FILE>`.
- [x] Wrap ingest payloads as `mutation.execute` with `operation:
      "literature.ingest"`.
- [x] Reuse existing JSON input and output/error envelope behavior.

## 4. Documentation and Agent Guidance

- [x] Update `doc/host-bridge-cli.md`.
- [x] Update Host Bridge CLI run README template.
- [x] Update Host Bridge CLI prompt template.
- [x] Update literature-search-ingest `SKILL.md`.
- [x] Update literature-search-ingest `runner.json`.

## 5. Tests and Verification

- [x] Add/update Host Bridge broker tests.
- [x] Add/update Rust CLI help and command mapping tests.
- [x] Add/update literature-search-ingest workflow prompt tests.
- [x] Run targeted Node tests.
- [x] Run Rust CLI tests.
- [x] Validate OpenSpec change.
- [x] Run build and package the CLI binary.
