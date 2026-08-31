## 1. Source baselines and repository boundaries

- [x] 1.1 Add shallow Zotero 7.0.32, 9.0.6, and 10.0.1 submodule gitlinks and verify each exact tag, commit, shallow state, and uninitialized nested submodules.
- [x] 1.2 Exclude the three worktrees from default repository scanning, document baseline/update policy in `AGENTS.md`, and verify default and explicit searches observe the intended boundary.
- [x] 1.3 Narrow CI content-submodule initialization to `skills_builtin` and verify all three affected workflows contain no unbounded initialization command.

## 2. Compatibility audit

- [x] 2.1 Record the Zotero 10 source audit for collection selection, ItemTree rows, Search/FullText, Local API, item/attachment validation, WAL/database access, and Firefox 140, and verify each conclusion against pinned source and project call sites.
- [x] 2.2 Confirm no production compatibility branch, dependency update, API, DTO, schema, or `src/**` change is required, using existing compatibility fixture and real-host evidence as the behavioral boundary.

## 3. Documentation alignment

- [x] 3.1 Update `doc/testing-framework.md` with source paths, update procedure, and audit scope, and verify it preserves the platform-specific evidence distinction.
- [x] 3.2 Update all localized README version badges, minimum requirements, and Zotero 7/9/10 compatibility statements, and verify no listed README retains the Zotero 7/9-only claim.
- [x] 3.3 Update localized Docusaurus installation and intro sources, regenerate embedded help with `npm run build:help-docs`, and verify the generated tree is current.

## 4. Validation

- [x] 4.1 Strictly validate the OpenSpec change and run the existing compatibility fixture Node tests.
- [x] 4.2 Run `npm run lint:check` and `npm run build`, recording any environment or unrelated failures without weakening the compatibility claim.
- [x] 4.3 Run Linux real-host behavior for Zotero 7.0.32, 9.0.6, and 10.0.1 plus Zotero 10.0.1 formal-XPI smoke, and verify requested/observed versions, phases, and cleanup receipts.
