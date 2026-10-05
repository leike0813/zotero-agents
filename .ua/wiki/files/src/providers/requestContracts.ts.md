
# src/providers/requestContracts.ts
所属分层：[Agent 协议与后端运行时](../../../layers/agent-runtime.md)  
所属目录：[src/providers](../../../modules/src/providers.md)
<!-- node: file:src/providers/requestContracts.ts -->

Provider 请求契约校验层：为每种 request kind 定义 provider/backend 兼容矩阵与负载校验规则，并在调度前断言契约成立。

规模：797 行
源码：[src/providers/requestContracts.ts](../../../../../src/providers/requestContracts.ts)

## 符号（14）
<!-- node: function:src/providers/requestContracts.ts:assertProviderRequestDispatchContract -->
<!-- node: function:src/providers/requestContracts.ts:assertRequestKindBackendCompatible -->
<!-- node: function:src/providers/requestContracts.ts:assertRequestKindProviderCompatible -->
<!-- node: function:src/providers/requestContracts.ts:assertRequestKindSupported -->
<!-- node: function:src/providers/requestContracts.ts:assertRequestPayloadContract -->
<!-- node: function:src/providers/requestContracts.ts:buildContractErrorMessage -->
<!-- node: class:src/providers/requestContracts.ts:ProviderRequestContractError -->
<!-- node: function:src/providers/requestContracts.ts:validateAcpSkillRunPayload -->
<!-- node: function:src/providers/requestContracts.ts:validateSequenceHandoff -->
<!-- node: function:src/providers/requestContracts.ts:validateSequenceShortCircuit -->
<!-- node: function:src/providers/requestContracts.ts:validateSequenceStepApplyResult -->
<!-- node: function:src/providers/requestContracts.ts:validateSkillRunnerJobPayload -->
<!-- node: function:src/providers/requestContracts.ts:validateSkillRunnerSequencePayload -->
<!-- node: function:src/providers/requestContracts.ts:validateStringMap -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [assertProviderRequestDispatchContract](../../../symbols/src/providers/requestContracts.ts/assertProviderRequestDispatchContract.md) | 函数 | 761–797 | 复杂 | validation、contract、entry-point、dispatch | 1 | Provider 调度前的总契约断言：依次校验 kind 存在性、backend 兼容、provider 兼容与负载形状。 |
| assertRequestKindBackendCompatible | 函数 | 689–715 | 中等 | validation、contract、guard | 1 | 断言请求 kind 与后端类型兼容，按表驱动兼容矩阵判定。 |
| assertRequestKindProviderCompatible | 函数 | 717–742 | 中等 | validation、contract、guard | 1 | 断言请求 kind 与目标 provider 兼容，阻止跨 provider 误派发。 |
| assertRequestKindSupported | 函数 | 665–687 | 中等 | validation、contract、guard | 1 | 断言请求 kind 在全局已知集合内，未知 kind 立即拒绝。 |
| [assertRequestPayloadContract](../../../symbols/src/providers/requestContracts.ts/assertRequestPayloadContract.md) | 函数 | 744–759 | 中等 | validation、contract、entry-point | 2 | 按请求 kind 断言负载通过对应校验函数，不通过时抛出带上下文的契约错误。 |
| buildContractErrorMessage | 函数 | 603–622 | 中等 | error-handling、formatting、contract | 1 | 把契约违规细节组装为可读错误消息，包含 kind、provider 与具体原因。 |
| ProviderRequestContractError | 类 | 624–663 | 中等 | error-type、contract、validation | 0 | 请求契约违规时抛出的错误类型，携带 category、reason、requestKind、backendType 与 providerId。 |
| validateAcpSkillRunPayload | 函数 | 551–601 | 复杂 | validation、contract、acp | 0 | 校验 acp.skillrun.v1 负载：skill、prompt、模型/推理强度选择与工作区声明。 |
| validateSequenceHandoff | 函数 | 291–343 | 中等 | validation、contract、sequence | 0 | 校验序列步骤间的交接声明：上游产物路径、必填字段与移交语义。 |
| validateSequenceShortCircuit | 函数 | 345–374 | 中等 | validation、contract、sequence | 0 | 校验序列步骤的短路声明是否合法，避免出现无上游却声明跳过的矛盾配置。 |
| validateSequenceStepApplyResult | 函数 | 376–397 | 中等 | validation、contract、sequence | 0 | 校验单步 applyResult 形状：产物清单、回填开关与结果证据字段。 |
| validateSkillRunnerJobPayload | 函数 | 107–201 | 复杂 | validation、contract、skillrunner | 0 | 校验 skillrunner.job.v1 负载的完整形状：skill id、mode、输入、附件、运行时选项与交接字段。 |
| validateSkillRunnerSequencePayload | 函数 | 399–491 | 复杂 | validation、contract、sequence | 0 | 校验 skillrunner.sequence.v1 整体负载：步骤数组非空、顺序稳定且每一步均通过单步契约。 |
| validateStringMap | 函数 | 203–216 | 简单 | validation、utility、type-guard | 0 | 校验值必须为字符串键值对的普通对象，供 env 等运行时选项复用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [declarativeRequestCompiler.ts](../workflows/declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [registry.ts](registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [runtime.ts](../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [assertProviderRequestDispatchContract](../../../symbols/src/providers/requestContracts.ts/assertProviderRequestDispatchContract.md) | 函数 | 761–797 | Provider 调度前的总契约断言：依次校验 kind 存在性、backend 兼容、provider 兼容与负载形状。 |
| assertRequestKindBackendCompatible | 函数 | 689–715 | 断言请求 kind 与后端类型兼容，按表驱动兼容矩阵判定。 |
| assertRequestKindProviderCompatible | 函数 | 717–742 | 断言请求 kind 与目标 provider 兼容，阻止跨 provider 误派发。 |
| assertRequestKindSupported | 函数 | 665–687 | 断言请求 kind 在全局已知集合内，未知 kind 立即拒绝。 |
| [assertRequestPayloadContract](../../../symbols/src/providers/requestContracts.ts/assertRequestPayloadContract.md) | 函数 | 744–759 | 按请求 kind 断言负载通过对应校验函数，不通过时抛出带上下文的契约错误。 |
| ProviderRequestContractError | 类 | 624–663 | 请求契约违规时抛出的错误类型，携带 category、reason、requestKind、backendType 与 providerId。 |
