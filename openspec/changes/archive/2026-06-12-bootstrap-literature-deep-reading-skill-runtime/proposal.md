## Why

`literature-deep-reading` 已经有产品形态和 runtime 合同草案，但仓库中还没有可执行的 skill 包。需要先建立单体 skill 的开发真源和 bootstrap runtime，验证 source bundle 能被稳定解包、结构化和登记，为后续 Host context、翻译和最终 HTML 渲染阶段打基础。

## What Changes

- Add `skills_src/literature-deep-reading/` as the source of truth for the built-in skill package.
- Add a deterministic renderer that emits the self-contained built-in package under `skills_builtin/literature-deep-reading/`.
- Add one agent-facing runtime CLI: `scripts/deep_reading_runtime.py`.
- Implement first-phase `stage_00_bootstrap`: unzip `source_bundle.zip`, parse Markdown source structure, build runtime SQLite, and write bootstrap runtime views.
- Add focused tests for rendering, skill registry validity, and bootstrap runtime behavior.
- Do not add workflow manifests, workflow package entries, Host Bridge collection, translation, reading enrichment, or final HTML rendering in this phase.

## Capabilities

### New Capabilities

- `literature-deep-reading-skill`: Built-in `literature-deep-reading` skill package with a single-script bootstrap runtime.

### Modified Capabilities

- None.

## Impact

- Affected areas: OpenSpec contract, `skills_src/literature-deep-reading/`, generated `skills_builtin/literature-deep-reading/`, and focused core tests.
- No workflow entrypoint, no source bundle buildRequest hook, no dependency installation, no database migration, and no Host Bridge behavior change.

