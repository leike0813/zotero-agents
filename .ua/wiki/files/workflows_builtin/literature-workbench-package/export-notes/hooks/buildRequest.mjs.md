
# workflows_builtin/literature-workbench-package/export-notes/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/export-notes/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/export-notes/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/export-notes/hooks/buildRequest.mjs -->

export-notes 工作流的 buildRequest hook：透传选区与 exportCandidates，交给 pass-through 后端执行。
源码：[workflows_builtin/literature-workbench-package/export-notes/hooks/buildRequest.mjs](../../../../../../../workflows_builtin/literature-workbench-package/export-notes/hooks/buildRequest.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/export-notes/hooks/buildRequest.mjs:buildRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 3–12 | 简单 | request-builder、pass-through | 0 | 组装 pass-through.run.v1 请求，携带选区、参数与导出候选列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 3–12 | 组装 pass-through.run.v1 请求，携带选区、参数与导出候选列表。 |
