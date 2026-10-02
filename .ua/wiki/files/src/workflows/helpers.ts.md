
# src/workflows/helpers.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/helpers.ts -->

工作流 hook 辅助层：为用户编写的 hook 提供条目解析、路径处理与产物就绪判定等安全封装。

规模：50 行
源码：[src/workflows/helpers.ts](../../../../../src/workflows/helpers.ts)

## 符号（1）
<!-- node: function:src/workflows/helpers.ts:createHookHelpers -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createHookHelpers | 函数 | 17–50 | 中等 | factory、hook、workflow | 1 | 构造注入 Zotero 实例的 hook 辅助对象：条目解析、路径 basename、HTML 转义与生成笔记就绪判定。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [libraryArtifactReadiness.ts](../modules/zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createHookHelpers | 函数 | 17–50 | 构造注入 Zotero 实例的 hook 辅助对象：条目解析、路径 basename、HTML 转义与生成笔记就绪判定。 |
