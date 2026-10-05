
# src/workflows/workflowHostContract.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowHostContract.ts -->

Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。

规模：471 行
源码：[src/workflows/workflowHostContract.ts](../../../../../src/workflows/workflowHostContract.ts)

## 符号（7）
<!-- node: function:src/workflows/workflowHostContract.ts:collectManifestLeafPaths -->
<!-- node: function:src/workflows/workflowHostContract.ts:defineWorkflowHostCandidateManifest -->
<!-- node: function:src/workflows/workflowHostContract.ts:inspectWorkflowHostCandidate -->
<!-- node: function:src/workflows/workflowHostContract.ts:inspectWorkflowHostContract -->
<!-- node: function:src/workflows/workflowHostContract.ts:inspectWorkflowHostContractVariants -->
<!-- node: function:src/workflows/workflowHostContract.ts:resolveWorkflowHostContractVersion -->
<!-- node: function:src/workflows/workflowHostContract.ts:summarizeWorkflowHostApiCapabilities -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectManifestLeafPaths | 函数 | 228–242 | 中等 | contract、traversal、utility | 1 | 把候选 manifest 递归展开为叶子路径集合，oneOf 与函数成员单独处理。 |
| defineWorkflowHostCandidateManifest | 函数 | 48–52 | 简单 | contract、declaration、host-bridge | 0 | 定义 Workflow Host API 的候选能力 manifest，作为契约比对的期望形状。 |
| [inspectWorkflowHostCandidate](../../../symbols/src/workflows/workflowHostContract.ts/inspectWorkflowHostCandidate.md) | 函数 | 244–310 | 复杂 | contract、validation、host-bridge | 1 | 按候选 manifest 检查实际宿主实现，产出缺失成员、多余成员、非函数、非对象与取值不符五类偏差。 |
| inspectWorkflowHostContract | 函数 | 424–471 | 复杂 | contract、entry-point、host-bridge | 0 | Workflow Host 契约检查入口：按候选 manifest 汇总各变体检查结果与能力摘要。 |
| [inspectWorkflowHostContractVariants](../../../symbols/src/workflows/workflowHostContract.ts/inspectWorkflowHostContractVariants.md) | 函数 | 329–363 | 复杂 | contract、validation、host-bridge | 2 | 依次检查 interactive 与 non-interactive 两个契约变体，报告实际满足的变体。 |
| resolveWorkflowHostContractVersion | 函数 | 387–405 | 中等 | contract、versioning、resolution | 1 | 解析宿主实际支持的 Workflow Host API 契约版本号，供输入规划选择上下文构造方式。 |
| summarizeWorkflowHostApiCapabilities | 函数 | 407–422 | 中等 | contract、diagnostics、summary | 0 | 把 Workflow Host API 能力面压缩为摘要结构，供诊断信息与版本协商使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [inspect-literature-analysis.ts](../../scripts/inspect-literature-analysis.ts.md) | scripts/inspect-literature-analysis.ts | 调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。 |
| [loader.ts](loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| defineWorkflowHostCandidateManifest | 函数 | 48–52 | 定义 Workflow Host API 的候选能力 manifest，作为契约比对的期望形状。 |
| [inspectWorkflowHostCandidate](../../../symbols/src/workflows/workflowHostContract.ts/inspectWorkflowHostCandidate.md) | 函数 | 244–310 | 按候选 manifest 检查实际宿主实现，产出缺失成员、多余成员、非函数、非对象与取值不符五类偏差。 |
| inspectWorkflowHostContract | 函数 | 424–471 | Workflow Host 契约检查入口：按候选 manifest 汇总各变体检查结果与能力摘要。 |
| [inspectWorkflowHostContractVariants](../../../symbols/src/workflows/workflowHostContract.ts/inspectWorkflowHostContractVariants.md) | 函数 | 329–363 | 依次检查 interactive 与 non-interactive 两个契约变体，报告实际满足的变体。 |
| resolveWorkflowHostContractVersion | 函数 | 387–405 | 解析宿主实际支持的 Workflow Host API 契约版本号，供输入规划选择上下文构造方式。 |
| summarizeWorkflowHostApiCapabilities | 函数 | 407–422 | 把 Workflow Host API 能力面压缩为摘要结构，供诊断信息与版本协商使用。 |
