## 1. Update workflow manifest

- [x] 1.1 Add `parameters.sourceOnly` boolean (default `false`) to `export-literature-bundle/workflow.json`.

## 2. Update the hook

- [x] 2.1 Read `runResult?.parameters?.sourceOnly` in `hooks/applyResult.mjs` and forward it to `exportLiteratureBundle()`.

## 3. Implement source-only export in `lib/literatureBundle.mjs`

- [x] 3.1 Add `buildLiteratureBundleSourceOnlyExport(args)`: traverse selected parents, pick Markdown-first / PDF-fallback, derive sanitized filenames with collision suffixes, record `no_source_file` warnings for parents without qualifying files, and build the flat ZIP with a `kind: "zotero-agents-literature-bundle-source-only"` manifest.
- [x] 3.2 Update `exportLiteratureBundle(args)` to accept `sourceOnly` and delegate to `buildLiteratureBundleSourceOnlyExport()` when `true`.

## 4. Update user documentation

- [x] 4.1 Update `export-literature-bundle/README.md` to document the `sourceOnly` parameter and the flat bundle structure it produces.

## 5. Update the spec

- [x] 5.1 Add the source-only requirements and scenarios to `openspec/specs/literature-bundle-workflows/spec.md`.

## 6. Verify

- [x] 6.1 Run relevant existing tests and confirm no regressions in the standard export path.
- [x] 6.2 Run typecheck and lint.

