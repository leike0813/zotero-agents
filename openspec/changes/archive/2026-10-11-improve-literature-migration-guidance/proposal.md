# Proposal

## Why

迁移功能已经可用，但向导导航不显眼，组策略控件偏小，部分文案难以理解。长文本会挤压布局，受影响条目的首批摘要也不足以支持完整审阅。

## What Changes

- 将步骤导航与最终迁移操作集中到内容滚动区外的固定页脚，保留返回时的问题组上下文。
- 放大组策略卡片，说明操作后果、整组范围与单篇例外，并修订 11 种语言的指引文案。
- 为长标题和说明提供有界摘要与展开入口，改善窄窗口的列表和详情切换。
- 统一文献列表分页交互，为问题下的全部受影响条目提供每页最多 25 条的宿主分页。
- 更新设计文档、行为规格与现有测试。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `literature-artifact-migration`: 明确向导导航、决策呈现、长文本与窄窗口行为，并补充基于原始扫描证据的受影响条目分页契约。

## Impact

- 页面：`src/dashboard/components/MigrationsRegion.tsx`、Dashboard 样式及标签投影。
- 宿主：迁移服务、Dashboard action/runtime/snapshot 与共享 wire contract，新增只读的 `literature-migration-list-issue-items` action。
- 文案：`addon/locale/*/addon.ftl` 的 11 种语言。
- 验证：现有迁移服务、Dashboard 集成、UI region 与浏览器测试；设计文档位于 `docs/components/literature-artifact-migration.md`。
- 无新增依赖；不改变迁移写入语义、持久化格式或迁移定义版本。

本 change 补录本次已实现、已验证的改动。主规格中的对应内容已同步；delta spec 保留相对于本次改动前基线的增量，供后续审阅和归档。
