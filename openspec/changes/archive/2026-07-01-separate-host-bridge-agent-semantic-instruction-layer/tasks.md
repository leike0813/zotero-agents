## 1. OpenSpec artifacts

- [x] 1.1 Create proposal, design, tasks, and spec deltas for the semantic
  instruction layer governance change.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Semantic source structure

- [x] 2.1 Add wrapper skill semantic source under
  `skills_src/zotero-bridge-cli/semantic/`.
- [x] 2.2 Add Zotero Librarian profile semantic source under
  `profiles_src/hermes/zotero-librarian/`.
- [x] 2.3 Move manually maintained wrapper/profile guidance into semantic
  sources and keep generated tables out of semantic sources.

## 3. Render composition

- [x] 3.1 Update `render-host-bridge-surface.ts` to compose wrapper semantic
  source with generated Host Bridge surface sections.
- [x] 3.2 Update `render-zotero-librarian-profile.ts` to compose profile
  semantic source with generated Host Bridge and workflow references.
- [x] 3.3 Ensure render remains idempotent and updates host-bridge-cli-bundle
  and profile publish inputs through existing pipelines.

## 4. Agent semantic guidance

- [x] 4.1 Add wrapper command selection guidance for bridge, library,
  synthesis, workflow, run, mutation, file, debug, and raw call.
- [x] 4.2 Add workflow lifecycle guidance for `workflow submit`,
  `workflow agent-run`, `workflow agent-apply`, run control, and skill-run
  interaction handles.
- [x] 4.3 Add profile operating principles for local index usage, direct Host
  Bridge reads, workflow choice, scheduled jobs, run monitoring, and apply-back.
- [x] 4.4 Remove historical protocol wording from final skill/profile output.

## 5. Non-rendered business logic governance

- [x] 5.1 Fix Zotero Librarian attention-queue cron to use
  `zotero-bridge synthesis insight attention-queue`.
- [x] 5.2 Extend profile checks to validate canonical `zotero-bridge` argv in
  cron YAML and related profile business logic.
- [x] 5.3 Extend doc/profile checks to reject historical protocol wording and
  stale command namespaces in semantic and generated outputs.

## 6. Verification

- [x] 6.1 Run `npm run render:host-bridge-surface`.
- [x] 6.2 Run `npm run check:host-bridge-doc-sync`.
- [x] 6.3 Run `npm run check:zotero-librarian-profile`.
- [x] 6.4 Run `cargo test --manifest-path cli\zotero-bridge\Cargo.toml`.
- [x] 6.5 Run focused packaging/profile/renderer mocha tests for Host Bridge
  wrapper, Zotero Librarian profile, and topic synthesis renderer.
