
# workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs -->

在已有父条目上下文上复用 bundle 回写逻辑的薄包装 hook，解析请求指定的父条目后委托给通用 applyDebugApplyContractResult 实现。
源码：[workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs)

## 符号（2）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs:resolveRequestParent -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 15–22 | 简单 | hook、产物回写、委派、适配器 | 0 | 已有父条目场景的 bundle 回写入口：解析请求指定的父条目后注入 args 并委派通用 apply 契约实现。 |
| resolveRequestParent | 函数 | 3–13 | 简单 | 父条目解析、校验、异步 | 1 | 从 request.targetParentRef 解析并校验既有父条目，缺失或非 regular 条目时报错。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyDebugApplyContractResult.mjs](applyDebugApplyContractResult.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs | 调试 apply 契约的产物回写 hook，负责把 apply 阶段生成的 bundle（产物文件、manifest、附件源）解析、校验并写入 Zotero，同时处理单条与序列两种结果模式。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 15–22 | 已有父条目场景的 bundle 回写入口：解析请求指定的父条目后注入 args 并委派通用 apply 契约实现。 |
