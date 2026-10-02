
# workflows_builtin/literature-workbench-package/lib/model.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/model.mjs -->

标签词表领域模型：定义偏好键常量与分面（FACETS），并实现 parent binding 归一化、暂存条目与远端词表 payload 的规范化逻辑。
源码：[workflows_builtin/literature-workbench-package/lib/model.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/model.mjs)

## 符号（7）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/model.mjs:collectParentBindingsByTag -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/model.mjs:mergeParentBindingsIntoStagedEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/model.mjs:normalizeParentBindings -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/model.mjs:normalizeRemoteAbbrevs -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/model.mjs:normalizeRemoteVocabularyPayload -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/model.mjs:normalizeStagedEntryWithBindings -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/model.mjs:sanitizeRemoteTags -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectParentBindingsByTag | 函数 | 135–157 | 简单 | data-model、tagging、aggregation | 0 | 按标签聚合其父条目绑定集合，是词表与库内条目的连接点。 |
| mergeParentBindingsIntoStagedEntries | 函数 | 93–133 | 中等 | data-model、tagging、merge | 0 | 把父级绑定下推到各暂存条目，使每个条目都带有完整可追溯的标签来源。 |
| normalizeParentBindings | 函数 | 22–52 | 中等 | data-model、normalization、tagging | 0 | 归一化父条目与标签的绑定集合，剔除无效标签并按 key 排序去重。 |
| normalizeRemoteAbbrevs | 函数 | 208–222 | 简单 | normalization、tagging | 0 | 归一化远端词表的缩写映射，保证比较与展示时一致。 |
| normalizeRemoteVocabularyPayload | 函数 | 224–253 | 中等 | normalization、validation、data-model | 0 | 归一化远端词表 payload 结构，校验分面与条目字段并丢弃非法项。 |
| normalizeStagedEntryWithBindings | 函数 | 66–91 | 中等 | data-model、normalization、tagging | 0 | 把暂存词条与其父绑定合并为规范条目，供发布前审阅。 |
| sanitizeRemoteTags | 函数 | 181–206 | 简单 | normalization、tagging、validation | 0 | 清洗远端词表中的标签字符串，去除非法字符与多余空白。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../tag-regulator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs | 标签治理工作流的核心 hook（约 2000 行）：构建建议标签交互式对话框，接收人工决策后把建议并入受控词表或暂存区，提交受控词表并落盘标签变更。 |
| [remote.mjs](remote.mjs.md) | workflows_builtin/literature-workbench-package/lib/remote.mjs | 标签词表的 GitHub 远端同步模块：读取已发布词表基线、比对并回写托管版本，同时提供变更订阅能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectParentBindingsByTag | 函数 | 135–157 | 按标签聚合其父条目绑定集合，是词表与库内条目的连接点。 |
| mergeParentBindingsIntoStagedEntries | 函数 | 93–133 | 把父级绑定下推到各暂存条目，使每个条目都带有完整可追溯的标签来源。 |
| normalizeParentBindings | 函数 | 22–52 | 归一化父条目与标签的绑定集合，剔除无效标签并按 key 排序去重。 |
| normalizeRemoteAbbrevs | 函数 | 208–222 | 归一化远端词表的缩写映射，保证比较与展示时一致。 |
| normalizeRemoteVocabularyPayload | 函数 | 224–253 | 归一化远端词表 payload 结构，校验分面与条目字段并丢弃非法项。 |
| normalizeStagedEntryWithBindings | 函数 | 66–91 | 把暂存词条与其父绑定合并为规范条目，供发布前审阅。 |
| sanitizeRemoteTags | 函数 | 181–206 | 清洗远端词表中的标签字符串，去除非法字符与多余空白。 |
