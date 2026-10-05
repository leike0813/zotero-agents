
# workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/tag-regulator/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/tag-regulator/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs -->

标签治理工作流的核心 hook（约 2000 行）：构建建议标签交互式对话框，接收人工决策后把建议并入受控词表或暂存区，提交受控词表并落盘标签变更。
源码：[workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs)

## 符号（23）
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:addUniqueInvalid -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:applyTagMutations -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:buildSuggestTagLookup -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:collectSuggestTagsIntake -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:collectValidationIssuesFallback -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:commitSynthesisControlledEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:createSuggestTagsRenderer -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:ensureSuggestDialogState -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:intakeSuggestTagsToStaged -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:intakeSuggestTagsToVocabulary -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:loadSynthesisControlledState -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:mergeCurrentParentIntoStagedSuggestEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:normalizePersistedStagedEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:normalizeSuggestTagEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:normalizeUniqueStringArray -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:openSuggestTagsDialog -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:persistSynthesisStagedEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:reconcileSuggestTagsAgainstCurrentState -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:resolveTagRegulatorOutput -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:resolveTagVocabularyBridge -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:stagedEntryFromSynthesis -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| addUniqueInvalid | 函数 | 521–549 | 中等 | validation、diagnostics、ui | 0 | 记录一条无效标签建议及其原因，保证对话框中每个问题只提示一次。 |
| applyResult | 函数 | 2079–2081 | 简单 | workflow-hook、entry-point | 0 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| applyResultImpl | 函数 | 1840–2077 | 复杂 | orchestration、tag-vocabulary、ui-dialog、state-sync | 0 | 标签治理回写主流程：解析输出、加载词表状态、驱动对话框收集决策、提交词表并写入标签。 |
| applyTagMutations | 函数 | 1779–1838 | 中等 | zotero-api、write、tag-vocabulary | 0 | 把已决策的标签变更写入目标条目，逐项确认后执行并汇总失败项。 |
| buildSuggestTagLookup | 函数 | 581–600 | 中等 | indexing、tag-vocabulary、lookup | 0 | 按规范化名称与别名为建议标签建立查找表，供冲突检测与父级合并使用。 |
| collectSuggestTagsIntake | 函数 | 1568–1728 | 复杂 | orchestration、ui、tag-vocabulary | 0 | 处置收集主流程：按对话框决策分别处理接受、合并、拒绝与全量操作，并产出汇总。 |
| collectValidationIssuesFallback | 函数 | 192–230 | 中等 | validation、fallback、dom | 0 | 在缺少宿主编辑器能力时以 DOM 方式收集校验问题，作为主路径的降级实现。 |
| commitSynthesisControlledEntries | 函数 | 345–371 | 中等 | persistence、tag-vocabulary、remote-sync | 0 | 提交受控词表变更：合并暂存条目、写回受控区并触发远端发布准备。 |
| createSuggestTagsRenderer | 函数 | 860–1068 | 复杂 | ui、dom、rendering | 0 | 构建建议标签对话框的 DOM 渲染器：分面分组、逐项操作按钮与实时校验反馈。 |
| ensureSuggestDialogState | 函数 | 562–579 | 简单 | ui、state-machine、idempotency | 0 | 惰性创建建议对话框状态对象并补齐缺省字段，重复调用不产生副作用。 |
| intakeSuggestTagsToStaged | 函数 | 697–778 | 复杂 | tag-vocabulary、state-sync、merge | 0 | 把人工接受的建议标签写入暂存分区，处理重名、别名与父级绑定合并。 |
| intakeSuggestTagsToVocabulary | 函数 | 1201–1380 | 复杂 | tag-vocabulary、merge、state-sync | 0 | 把接受的建议标签并入受控词表，含 facet 归类、父级绑定规范化与冲突消解。 |
| loadSynthesisControlledState | 函数 | 289–306 | 简单 | synthesis、tag-vocabulary、state-sync | 0 | 读取受控词表当前状态快照，供建议比对与提交前校验使用。 |
| mergeCurrentParentIntoStagedSuggestEntries | 函数 | 1473–1566 | 复杂 | merge、tag-vocabulary、parent-binding | 0 | 把当前条目的父级引用合并进暂存建议条目，保证词表条目带有完整父级绑定。 |
| normalizePersistedStagedEntries | 函数 | 373–407 | 中等 | normalization、persistence、resilience | 0 | 归一化从持久层读回的暂存条目，修复旧版本字段并剔除已失效项。 |
| normalizeSuggestTagEntries | 函数 | 90–151 | 复杂 | normalization、tag-vocabulary、validation | 0 | 归一化 Agent 给出的标签建议条目，校验名称、facet、父级绑定与别名并剔除非法项。 |
| normalizeUniqueStringArray | 函数 | 41–71 | 中等 | normalization、bounded-input、utility | 0 | 归一化字符串数组：去空白、去重、保序并强制长度上限，防止无界输入进入词表。 |
| openSuggestTagsDialog | 函数 | 1070–1164 | 复杂 | ui、interaction、orchestration | 0 | 打开建议标签对话框，收集人工决策并返回逐项处置结果供后续落库。 |
| persistSynthesisStagedEntries | 函数 | 327–343 | 简单 | persistence、synthesis、tag-vocabulary | 0 | 把暂存条目写回 Synthesis 暂存分区，失败时保留原有暂存内容。 |
| reconcileSuggestTagsAgainstCurrentState | 函数 | 1382–1428 | 中等 | reconciliation、tag-vocabulary、resilience | 0 | 以当前受控/暂存状态为基线重新核对建议清单，剔除已被处理或已不存在的条目。 |
| resolveTagRegulatorOutput | 函数 | 1730–1762 | 中等 | parsing、result-contract、normalization | 0 | 从运行结果中解析标签治理输出，归一化建议清单与决策字段。 |
| resolveTagVocabularyBridge | 函数 | 409–432 | 中等 | host-bridge、integration、resolution | 0 | 取得 Host Bridge 的标签词表接口，桥接不可用时给出明确降级路径。 |
| stagedEntryFromSynthesis | 函数 | 257–279 | 中等 | synthesis、tag-vocabulary、normalization | 0 | 把 Synthesis 侧的暂存词表条目转换为插件内部表示，保持字段语义一致。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bindings.mjs](../../lib/bindings.mjs.md) | workflows_builtin/literature-workbench-package/lib/bindings.mjs | 绑定模型的 re-export barrel：把 model.mjs 中的 parent binding 相关归一化函数单独暴露给工作流使用。 |
| [model.mjs](../../lib/model.mjs.md) | workflows_builtin/literature-workbench-package/lib/model.mjs | 标签词表领域模型：定义偏好键常量与分面（FACETS），并实现 parent binding 归一化、暂存条目与远端词表 payload 的规范化逻辑。 |
| [resultOutput.mjs](../../lib/resultOutput.mjs.md) | workflows_builtin/literature-workbench-package/lib/resultOutput.mjs | Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 2079–2081 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
