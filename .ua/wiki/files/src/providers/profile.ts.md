
# src/providers/profile.ts
所属分层：[Agent 协议与后端运行时](../../../layers/agent-runtime.md)  
所属目录：[src/providers](../../../modules/src/providers.md)
<!-- node: file:src/providers/profile.ts -->

Provider Profile 层：把后端实例投影为可校验、可指纹化的 provider profile，并按 provider 运行时选项 schema 校验取值。

规模：653 行
源码：[src/providers/profile.ts](../../../../../src/providers/profile.ts)

## 符号（10）
<!-- node: function:src/providers/profile.ts:assertOptionType -->
<!-- node: function:src/providers/profile.ts:catalogState -->
<!-- node: function:src/providers/profile.ts:describeProviderProfile -->
<!-- node: function:src/providers/profile.ts:listProviderProfileBackends -->
<!-- node: function:src/providers/profile.ts:optionDescriptors -->
<!-- node: function:src/providers/profile.ts:providerForBackend -->
<!-- node: class:src/providers/profile.ts:ProviderProfileError -->
<!-- node: function:src/providers/profile.ts:rejectUnsafeValue -->
<!-- node: function:src/providers/profile.ts:validateProviderOptionsForBackend -->
<!-- node: function:src/providers/profile.ts:validateProviderProfile -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertOptionType | 函数 | 395–407 | 简单 | validation、provider、type-guard | 1 | 按选项声明的标称类型校验单个运行时选项值，类型不符时抛出带路径上下文的校验错误。 |
| [catalogState](../../../symbols/src/providers/profile.ts/catalogState.md) | 函数 | 195–294 | 复杂 | catalog、provider、introspection | 1 | 枚举 provider 与后端可选的运行时选项目录，包含枚举取值、就绪状态与 provider/backend 类型兼容矩阵。 |
| describeProviderProfile | 函数 | 347–393 | 中等 | provider、projection、api-contract | 0 | 生成 provider profile 描述符：schema 版本、后端标识、选项目录与默认值，供 UI 与 Host Bridge 展示。 |
| listProviderProfileBackends | 函数 | 327–345 | 中等 | provider、catalog、query | 0 | 列出可生成 provider profile 的后端实例列表，含连接就绪状态与请求种类。 |
| optionDescriptors | 函数 | 296–325 | 中等 | ui-contract、provider、projection | 1 | 把 provider 声明的运行时选项 schema 转换为 UI 描述符（标题、类型、枚举项与默认值）。 |
| providerForBackend | 函数 | 156–166 | 简单 | provider、resolution、utility | 0 | 按后端类型解析应使用的 provider 实例标识。 |
| ProviderProfileError | 类 | 73–87 | 简单 | error-type、validation、provider | 0 | provider profile 校验失败时抛出的错误类型，携带 code 与结构化 details。 |
| rejectUnsafeValue | 函数 | 128–154 | 中等 | validation、security、recursive | 0 | 递归扫描 provider 选项值，拒绝非 JSON 安全的构造（函数、undefined、循环引用等）并累积问题路径。 |
| [validateProviderOptionsForBackend](../../../symbols/src/providers/profile.ts/validateProviderOptionsForBackend.md) | 函数 | 409–535 | 复杂 | validation、provider、schema | 1 | 按后端对应的 provider 运行时选项 schema 校验选项集合，类型不符或枚举越界时报出 ProviderProfileError。 |
| validateProviderProfile | 函数 | 537–653 | 复杂 | validation、provider、profile | 0 | 校验完整 provider profile：schema 版本、后端存在性、选项安全性与逐项 schema 合法性。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpModelOptionFolding.ts](../modules/acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [registry.ts](../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [registry.ts](registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [types.ts](../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| describeProviderProfile | 函数 | 347–393 | 生成 provider profile 描述符：schema 版本、后端标识、选项目录与默认值，供 UI 与 Host Bridge 展示。 |
| listProviderProfileBackends | 函数 | 327–345 | 列出可生成 provider profile 的后端实例列表，含连接就绪状态与请求种类。 |
| ProviderProfileError | 类 | 73–87 | provider profile 校验失败时抛出的错误类型，携带 code 与结构化 details。 |
| [validateProviderOptionsForBackend](../../../symbols/src/providers/profile.ts/validateProviderOptionsForBackend.md) | 函数 | 409–535 | 按后端对应的 provider 运行时选项 schema 校验选项集合，类型不符或枚举越界时报出 ProviderProfileError。 |
| validateProviderProfile | 函数 | 537–653 | 校验完整 provider profile：schema 版本、后端存在性、选项安全性与逐项 schema 合法性。 |
