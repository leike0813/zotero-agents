
# workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/tag-regulator/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/tag-regulator/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs -->

标签治理工作流的请求构建 hook：委托 lib/tagRegulatorRequest 组装独立请求，本文件只负责 runtime scope 包装与错误归一化。
源码：[workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs](../../../../../../../workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs)

## 符号（2）
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs:buildRequestImpl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 15–17 | 简单 | workflow-hook、entry-point | 0 | buildRequest 公开入口，在包级 runtime scope 内执行并暴露测试注入点。 |
| buildRequestImpl | 函数 | 7–13 | 简单 | request-builder、delegation、error-handling | 0 | 调用 lib 层构造器生成独立标签治理请求，失败时包装为带工作流名的错误。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [tagRegulatorRequest.mjs](../../lib/tagRegulatorRequest.mjs.md) | workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs | 标签治理工作流的请求构建模块：从父条目抽取题录与标签、物化有效标签 YAML 与 digest Markdown 输入，产出可供 Agent 消费的请求参数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 15–17 | buildRequest 公开入口，在包级 runtime scope 内执行并暴露测试注入点。 |
