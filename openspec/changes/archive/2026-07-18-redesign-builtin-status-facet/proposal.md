## Why

Workflow 待办状态目前混在用户词表与旧式阅读进度约定中，既无法保证关键状态定义始终存在，也允许 Bootstrapper、Regulator、导入和普通编辑误改 workflow 所依赖的标签。插件需要一个启动即就绪、由 builtin policy 单独治理的 `status` facet，同时保持文献条目上的状态实例可由对应 workflow 生命周期和用户直接操作。

## What Changes

- 新增五个插件内建的 `status:need-*` 受控词表定义，并在 Synthesis persistence 可用后的启动阶段幂等初始化。
- 保存、导入、同步恢复、staged promotion、Workbench UI 与 host command 统一执行 builtin policy，保护身份字段并允许编辑 note/aliases。
- 新增 `WorkflowHostApi.statusTags`，以稳定 key 操作文献条目上的 builtin 状态实例。
- 将 Search、Metadata Curator、MinerU、Literature Analysis 和 Deep Reading 的成功 apply 生命周期接入状态转换，并以 partial warning 报告状态更新失败。
- 将 Tag Bootstrapper 限定为自定义词表管理；在非 submodule Tag Regulator apply 边界过滤 builtin status 的增删。
- 从 Tag Standard、Hermes triage 与站点文档移除数字阅读进度和 `match_status`/`matching_status`，改为 workflow 待办语义。
- 只读审查相关 skill submodule，并交付可在各 submodule 仓库独立执行的修改方案；不修改 submodule 文件或指针。

## Capabilities

### New Capabilities

- `builtin-workflow-status-policy`: 定义 builtin status 词表治理、启动初始化、文献实例转换和保护边界。

### Modified Capabilities

- `synthesis-tag-vocabulary`: 受控词表持久化与 Workbench 管理必须持续保留 builtin 定义。
- `literature-workbench-workflows`: 内建文献 workflow 的 apply 生命周期必须转换对应待办状态。
- `tag-bootstrapper-workflow`: Bootstrapper 仅建议并写入用户自定义词表项。
- `tag-regulator-workflow`: Regulator 不得增删文献上的 builtin status 实例。
- `literature-workbench-package`: Tag Standard 与 workflow 文档使用新的 status facet 语义。

## Impact

- 影响 Synthesis tag vocabulary、启动 hooks、Workbench UI/commands 与 workflow host API。
- 影响五个 builtin workflow apply hook、Tag Bootstrapper/Regulator 非 submodule 边界及相关 README。
- 影响 Hermes Zotero Librarian profile、站点文档、本地化与 OpenSpec。
- 不增加数据库字段，不迁移或删除旧式 `status:*` 标签，不监听用户手工附件变化。
