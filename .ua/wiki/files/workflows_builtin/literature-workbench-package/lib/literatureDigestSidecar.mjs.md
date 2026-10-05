
# workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs -->

Synthesis sidecar 对接层：把 digest 内容、载荷哈希与笔记 key 组装成输入，委派 sidecar 应用并把失败归一为可重试的 typed 结果。
源码：[workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs:applyLiteratureDigestSidecar -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyLiteratureDigestSidecar | 函数 | 26–58 | 简单 | sidecar、integration | 1 | 调用 hostApi.synthesis.workflowApply 应用 digest，成功返回收据，失败返回 retryable 与 error_code。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyLiteratureDigestSidecar | 函数 | 26–58 | 调用 hostApi.synthesis.workflowApply 应用 digest，成功返回收据，失败返回 retryable 与 error_code。 |
