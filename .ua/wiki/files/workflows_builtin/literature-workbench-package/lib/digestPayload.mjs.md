
# workflows_builtin/literature-workbench-package/lib/digestPayload.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/digestPayload.mjs -->

从父条目的托管笔记中定位唯一的 digest 笔记并返回其 Markdown 载荷，检测到多份时按冲突失败。
源码：[workflows_builtin/literature-workbench-package/lib/digestPayload.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/digestPayload.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/digestPayload.mjs:resolveDigestMarkdownForParent -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveDigestMarkdownForParent | 函数 | 3–27 | 简单 | digest、note、conflict-detection | 0 | 分页读取父条目笔记，筛出 noteKind 为 digest 的托管笔记并返回其 markdown，多于一份抛 conflict。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [tagRegulatorRequest.mjs](tagRegulatorRequest.mjs.md) | workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs | 标签治理工作流的请求构建模块：从父条目抽取题录与标签、物化有效标签 YAML 与 digest Markdown 输入，产出可供 Agent 消费的请求参数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveDigestMarkdownForParent | 函数 | 3–27 | 分页读取父条目笔记，筛出 noteKind 为 digest 的托管笔记并返回其 markdown，多于一份抛 conflict。 |
