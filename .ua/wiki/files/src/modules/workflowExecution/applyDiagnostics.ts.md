
# src/modules/workflowExecution/applyDiagnostics.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/applyDiagnostics.ts -->

工作流 apply 阶段诊断信息的归一化，限制 warning 数量与 code 长度上限，输出结构化且有界的诊断记录。
源码：[src/modules/workflowExecution/applyDiagnostics.ts](../../../../../../src/modules/workflowExecution/applyDiagnostics.ts)

## 符号（1）
<!-- node: function:src/modules/workflowExecution/applyDiagnostics.ts:normalizeWorkflowApplyDiagnostics -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| normalizeWorkflowApplyDiagnostics | 函数 | 18–58 | 简单 | diagnostics、normalization、bounded、validation | 1 | 归一化 apply 诊断信息：过滤非法 warning、限制 code 数量与长度并保留错误码。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applySeam.ts](applySeam.ts.md) | src/modules/workflowExecution/applySeam.ts | 工作流运行结果的 apply seam：读取结果 bundle 与 result context，调用运行时 apply 产出结构化结果，并处理 ACP 可恢复状态、序列步骤 apply 汇总与终态归因。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| normalizeWorkflowApplyDiagnostics | 函数 | 18–58 | 归一化 apply 诊断信息：过滤非法 warning、限制 code 数量与长度并保留错误码。 |
