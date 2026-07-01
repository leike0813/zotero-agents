## 1. OpenSpec and CLI Contract

- [x] 1.1 Add OpenSpec proposal, design, tasks, and delta specs.
- [x] 1.2 Bump Rust CLI minor version metadata.
- [x] 1.3 Replace legacy top-level Rust CLI commands with canonical namespaces.
- [x] 1.4 Rewire dispatch without changing Host Bridge endpoint or capability
      payload semantics.
- [x] 1.5 Update parser and helper tests for canonical commands and removed
      legacy command paths.

## 2. Surface Catalog and Generated References

- [x] 2.1 Update the Host Bridge surface catalog to emit canonical CLI mappings
      only.
- [x] 2.2 Add endpoint mappings for run cancel, run active, and skill-run
      interaction endpoints.
- [x] 2.3 Update Host Bridge wrapper/profile renderers for canonical grouping,
      guidance, and examples.
- [x] 2.4 Update doc/profile sync checks to reject generated legacy CLI command
      examples.
- [x] 2.5 Run Host Bridge/profile render scripts and keep generated output in
      sync.

## 3. Workflow Skill Instruction Surface

- [x] 3.1 Update topic synthesis source contracts, guidance, runtime CLI argv,
      and renderer text.
- [x] 3.2 Render topic synthesis built-in skills from source.
- [x] 3.3 Update literature deep-reading template and runtime CLI argv.
- [x] 3.4 Render literature deep-reading built-in skill from source.
- [x] 3.5 Update literature search ingest skill instructions and runner prompt.
- [x] 3.6 Update Hermes zotero-librarian profile non-generated instructions and
      cron text.

## 4. Verification

- [x] 4.1 Run `cargo test --manifest-path cli\zotero-bridge\Cargo.toml`.
- [x] 4.2 Run `npm run render:host-bridge-surface`.
- [x] 4.3 Run topic synthesis skill renderer.
- [x] 4.4 Run literature deep-reading skill renderer.
- [x] 4.5 Run `npm run check:host-bridge-doc-sync`.
- [x] 4.6 Run `npm run check:zotero-librarian-profile`.
- [x] 4.7 Run Host Bridge CLI packaging regression test.
- [x] 4.8 Record expected prebuild freshness drift for release pipeline.
