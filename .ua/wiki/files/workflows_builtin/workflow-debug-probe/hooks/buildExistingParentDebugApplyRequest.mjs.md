
# workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs -->

针对已有父条目场景构造 apply 请求的构建器，从工作流参数与选中条目解析出目标父条目后调用通用契约请求构造逻辑。
源码：[workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs:portableItemRef -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs:resolveSelectedParent -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 53–64 | 简单 | 请求构造、入口、委派、调试探针 | 0 | 已有父条目场景的请求构造入口：解析选中的唯一父条目后委派 buildSingleRequest 以 bundle 模式发起调试任务。 |
| portableItemRef | 函数 | 6–21 | 中等 | 引用规范化、安全边界、校验 | 1 | 把条目引用收敛为仅含 libraryId 与 key 的 portable ref，拒绝任何额外字段泄漏。 |
| resolveSelectedParent | 函数 | 31–51 | 中等 | 条目选择、校验、宿主读取、异步 | 1 | 要求 selectionContext 中恰好有一个 parent 条目，校验其 portable ref 并读取条目详情得到父条目与标题。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [buildDebugApplyContractRequest.mjs](buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs | 调试 apply 契约的请求构造器，生成单步与序列两种 apply 请求（目标父条目、参数、产物声明），是本调试探针包中逻辑最密集的模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 53–64 | 已有父条目场景的请求构造入口：解析选中的唯一父条目后委派 buildSingleRequest 以 bundle 模式发起调试任务。 |
