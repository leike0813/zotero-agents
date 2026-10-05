
# workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-search-ingest/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-search-ingest/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs -->

检索入库工作流的结果回写 hook：校验 Agent 返回的入库候选，只对处于合法状态迁移的条目执行创建。
源码：[workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs)

## 符号（4）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs:eligibleTransitions -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs:resolveOutput -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 133–137 | 简单 | workflow-hook、entry-point | 0 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| applyResultImpl | 函数 | 78–131 | 中等 | orchestration、ingest、zotero-api | 0 | 入库回写主流程：解析候选、过滤非法迁移、创建条目并汇总跳过原因。 |
| eligibleTransitions | 函数 | 28–72 | 中等 | state-machine、idempotency、validation | 0 | 按条目当前状态计算允许的目标状态集合，并剔除已存在的条目以保证幂等。 |
| resolveOutput | 函数 | 8–26 | 简单 | parsing、result-contract、normalization | 0 | 从运行结果中解析入库输出，兼容 Agent 直接返回与嵌套在输出字段两种形态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [statusTransition.mjs](../../lib/statusTransition.mjs.md) | workflows_builtin/literature-workbench-package/lib/statusTransition.mjs | 工作流状态迁移诊断模块：检查结果状态迁移是否合法，并把违规详情收集为可并入结果的诊断项。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 133–137 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
