## Why

`literature-digest` 生成的 digest note 目前只能展示文本摘要，无法把论文中最具代表性的图像带入 Zotero note。由于 Skill Runner 后端不适合接收整篇论文的全部图片本体，代表图能力需要改为 agent 只选择文本级 locator，Host 侧负责 best-effort 查找、压缩和嵌入。

## What Changes

- Add an optional `representative_image` result contract for `literature-digest` outputs.
- Add Host-side representative image resolution for Markdown sources and best-effort skip behavior for PDF sources.
- Add a unified Host image preparation path that compresses note images to bounded JPEG before embedding.
- Add Zotero embedded-image attachment support for workflow-generated digest notes.
- Preserve existing digest/references/citation note generation when image handling is absent or fails.
- Document the upstream `literature-digest` submodule contract change without modifying the submodule.

## Capabilities

### New Capabilities

- `literature-digest-representative-image`: Optional representative image metadata, Host-side materialization, compression, and note embedding for literature digest notes.

### Modified Capabilities

- `literature-workbench-package`: Extend `literature-digest` apply behavior to consume optional representative image metadata while preserving existing generated-note behavior.
- `zotero-host-capability-broker`: Add optional Host API image preparation and embedded-image note import capabilities for workflow packages.

## Impact

- Affected runtime surfaces: `WorkflowHostApi`, literature workbench package apply hooks, generated digest note HTML.
- Affected tests: literature digest apply-result coverage, Host API capability/version coverage, package runtime compatibility checks.
- No direct changes to `skills_builtin/literature-digest` submodule.
- No new package dependency is required for the initial implementation.
