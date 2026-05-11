# Tasks

## 1. OpenSpec Contracts

- [x] Add proposal, design, tasks, and delta specs for the MVP closure.
- [x] Validate `complete-synthesis-layer-mvp` with OpenSpec.

## 2. Library Adapter And Registry

- [x] Add tests proving mock Zotero items produce a non-empty library index.
- [x] Add tests proving default service registry reads Zotero-derived artifact notes.
- [x] Implement a Zotero-backed Synthesis library adapter.
- [x] Wire `getLibraryIndex()` and `getPaperRegistry()` to the adapter by default.

## 3. Resolver And Artifact Reads

- [x] Add tests for `tag_query` AND/OR/NOT and mixed exclude-over-include.
- [x] Add tests proving `resolve_resolver` rejects non-canonical resolver fields.
- [x] Add tests proving `resolve_resolver` marks zero-match resolvers as invalid.
- [x] Add tests for `readPaperArtifacts()` reading decoded workflow payloads.
- [x] Implement resolver execution against registry rows.
- [x] Fold resolver validation into `resolve_resolver` and remove the public `validate_resolver` MCP tool.
- [x] Implement paper artifact manifest/read methods against child note payloads.

## 4. Citation Graph Projection

- [x] Add tests proving graph inputs are derived from Zotero reference payloads.
- [x] Wire `queryCitationGraph()` and UI graph snapshots to derived graph inputs.
- [x] Persist graph snapshot/layout assets if canonical projection storage exists.

## 5. ACP Skill Backend

- [x] Add tests proving `synthesize-topic` workflow declares the builtin skill backend.
- [x] Add tests proving builtin workflow loading discovers `synthesize-topic`.
- [x] Add tests proving the builtin skill is registered with an output schema.
- [x] Add the builtin topic resolver schema asset and document it in `SKILL.md`.
- [x] Add the builtin `synthesize-topic` ACP Skill instructions and runner metadata.
- [x] Change `synthesize-topic` Skill output to return `markdown_path` instead of embedding Markdown in final JSON.
- [x] Wire `synthesize-topic` workflow request creation to the builtin skill id.
- [x] Add the `synthesis-layer` builtin workflow package manifest.

## 6. Workbench/MCP/Review Closure

- [x] Add tests that MCP, Workbench snapshot, and review input read the same service state.
- [x] Add tests proving Workbench `Run synthesis` is wired to workflow execution.
- [x] Implement Workbench `runSynthesizeTopic` host command as a real workflow submission entry.
- [x] Remove fixture-only data paths from production service defaults.
- [x] Keep fixture injection available only as explicit test scaffolding.

## 7. Verification

- [x] Run targeted Synthesis MVP tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run `openspec validate complete-synthesis-layer-mvp --strict`.
