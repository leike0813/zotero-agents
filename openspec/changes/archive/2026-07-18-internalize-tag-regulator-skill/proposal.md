## Why

Tag Regulator 现在依赖插件内建 workflow status policy，继续作为独立 submodule 发布会把实际治理边界拆散到两个仓库，并增加规则漂移风险。将其固定快照转为本仓库直接维护，可以让 skill 语义约束、workflow apply 保护和内容包交付保持同一变更周期。

## What Changes

- 将 `skills_builtin/tag-regulator` 从 Git submodule 转为本仓库直接跟踪的普通 skill 目录，不导入上游历史。
- 保持 `tag-regulator` skill ID、路径、输入输出 Schema、runner 契约和 workflow 调用方式不变。
- 按 Tag Bootstrapper 的治理分层改写 Tag Regulator：skill 将插件提供的五个 builtin workflow status 视为只读保留项，workflow apply 边界继续从插件 builtin policy 获取权威集合并过滤增删。
- 从 Tag Regulator Tag Standard 删除 `match_status`/`matching_status`、数字阅读进度、单 status 约束、颜色槽建议和版本历史，只保留当前支持的八个 facet。
- 以 Tag Regulator 上游 Tag Standard 为结构与内容基线，让 Tag Regulator 与 Tag Bootstrapper 维护完全一致的增量版本。
- 保持 Tag Regulator 不进入独立公开 skill 列表，由官方内容包以原路径和 ID 交付。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `tag-regulator-workflow`: 规定 Tag Regulator skill 由本仓库直接维护，并将 builtin workflow status 视为不得推断或输出变更的保留项。
- `tag-bootstrapper-workflow`: 规定 Bootstrapper 与 Regulator 使用同一份上游派生 Tag Standard，避免两套规则漂移。
- `content-package-subscription`: 规定仓库直接跟踪的 Tag Regulator skill 继续按原路径和 ID 进入官方内容包，不依赖 submodule 初始化。

## Impact

- 影响 `.gitmodules`、两个 skill 的 Tag Standard、Tag Regulator workflow 契约测试和内容包收集验证。
- 不改变公开 API、skill payload、Schema、workflow manifest 或内容包安装布局。
- 不修改其他 submodule，不执行内容包版本提升、发布或 Git 提交。
