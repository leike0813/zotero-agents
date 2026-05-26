## Tasks

- [x] Add OpenSpec delta specs and validate the change.
- [x] Move persistence path defaults to DataDirectory-scoped `zotero-agents`
      paths and update SQLite database naming.
- [x] Move default Synthesis canonical store resolution to durable
      `data/synthesis/` and keep runtime cleanup away from durable data.
- [x] Remove Zotero note mirror from normal Synthesis service runtime flow and
      Workbench primary sync state.
- [x] Add persistence integrity scanner and report-first cleanup API for
      SQLite-indexed file assets.
- [x] Add one-shot migration script and tests for dry-run/apply/verify behavior.
- [x] Add or update focused core tests for path governance, cleanup boundaries,
      and mirror deprecation.
- [x] Run OpenSpec validation, targeted tests, typecheck, and formatting checks.
