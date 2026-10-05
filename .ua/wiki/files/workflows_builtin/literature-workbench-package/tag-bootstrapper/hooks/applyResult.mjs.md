
# workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs -->

标签引导工作流的结果回写 hook：把 Agent 生成的标签建议归一化后写入条目标签，并读取 Synthesis 暂存词表辅助 facet 判定。
源码：[workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs)

## 符号（5）
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs:loadStagedTagSuggestions -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs:normalizeAddTagEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs:resolveTagBootstrapperOutput -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 199–203 | 简单 | workflow-hook、entry-point | 0 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| applyResultImpl | 函数 | 115–197 | 复杂 | orchestration、tag-vocabulary、zotero-api | 0 | 标签引导回写主流程：加载暂存建议、归一化条目、写入标签并汇总诊断。 |
| loadStagedTagSuggestions | 函数 | 108–113 | 简单 | synthesis、tag-vocabulary、integration | 0 | 读取 Synthesis 侧暂存的标签建议，作为 facet 判定与命名一致性的参考。 |
| normalizeAddTagEntries | 函数 | 46–91 | 中等 | normalization、tag-vocabulary、validation | 0 | 归一化待添加标签条目：规范名称、判定所属 facet、绑定父级并剔除词表越界项。 |
| resolveTagBootstrapperOutput | 函数 | 21–44 | 简单 | parsing、result-contract、normalization | 0 | 从运行结果中解析标签引导输出，兼容嵌套与平铺两种 Agent 返回形态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [resultOutput.mjs](../../lib/resultOutput.mjs.md) | workflows_builtin/literature-workbench-package/lib/resultOutput.mjs | Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 199–203 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
