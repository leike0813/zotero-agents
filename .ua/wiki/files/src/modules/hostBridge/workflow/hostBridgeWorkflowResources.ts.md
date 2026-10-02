
# src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/workflow](../../../../../modules/src/modules/hostBridge/workflow.md)
<!-- node: file:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts -->

Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。
源码：[src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts](../../../../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts)

## 符号（9）
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:assertAccepts -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:assertRequirementShape -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:createHostBridgeWorkflowResourceApi -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:createWorkflowRunResourceStore -->
<!-- node: class:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:HostBridgeWorkflowResourceError -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:parseInputSlot -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:parseOutputSlot -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:parseWorkflowResourceBindings -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:validateWorkflowResourceBindings -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertAccepts | 函数 | 344–386 | 中等 | host-bridge、validation、resources | 0 | 校验给定值是否落在槽位声明的 accepts 约束内，不满足时抛出 typed 资源错误。 |
| assertRequirementShape | 函数 | 316–342 | 简单 | host-bridge、validation、resources | 1 | 校验资源需求声明的结构完整性，缺字段时给出明确错误码而非运行期崩溃。 |
| [createHostBridgeWorkflowResourceApi](../../../../../symbols/src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts/createHostBridgeWorkflowResourceApi.md) | 函数 | 476–825 | 复杂 | host-bridge、resources、api-handler、core | 1 | 构造工作流资源 API：注册输出文件、登记输入引用并提供受 slot 约束的读写操作，交互缺失时返回 typed 错误。 |
| createWorkflowRunResourceStore | 函数 | 32–167 | 中等 | host-bridge、resources、state-machine、core | 1 | 创建一次运行独立的资源存储，维护输入输出槽位到文件句柄的映射并在运行结束后统一释放。 |
| HostBridgeWorkflowResourceError | 类 | 1–20 | 简单 | error-handling、host-bridge、resources、type-definition | 0 | 资源层专用错误类型，携带槽位标识与错误码，供上层映射为 Agent 可见的失败原因。 |
| parseInputSlot | 函数 | 223–244 | 简单 | host-bridge、parsing、manifest、resources | 1 | 解析输入槽声明，抽取来源类型、必填性与取值约束。 |
| parseOutputSlot | 函数 | 246–258 | 简单 | host-bridge、parsing、manifest、resources | 1 | 解析输出槽声明，抽取期望的内容类型与文件命名规则。 |
| parseWorkflowResourceBindings | 函数 | 260–314 | 中等 | host-bridge、parsing、manifest、resources | 1 | 解析 manifest 中声明的资源绑定，输出输入槽与输出槽的规范形状。 |
| validateWorkflowResourceBindings | 函数 | 388–457 | 中等 | host-bridge、validation、resources、core | 0 | 校验资源绑定的形状与类型兼容性，是资源准入的对外入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeFileRegistry.ts](../server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeFileTransfer.ts](../../runtimeFileTransfer.ts.md) | src/modules/runtimeFileTransfer.ts | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [runtime.ts](../../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createHostBridgeWorkflowResourceApi](../../../../../symbols/src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts/createHostBridgeWorkflowResourceApi.md) | 函数 | 476–825 | 构造工作流资源 API：注册输出文件、登记输入引用并提供受 slot 约束的读写操作，交互缺失时返回 typed 错误。 |
| createWorkflowRunResourceStore | 函数 | 32–167 | 创建一次运行独立的资源存储，维护输入输出槽位到文件句柄的映射并在运行结束后统一释放。 |
| HostBridgeWorkflowResourceError | 类 | 1–20 | 资源层专用错误类型，携带槽位标识与错误码，供上层映射为 Agent 可见的失败原因。 |
| parseWorkflowResourceBindings | 函数 | 260–314 | 解析 manifest 中声明的资源绑定，输出输入槽与输出槽的规范形状。 |
| validateWorkflowResourceBindings | 函数 | 388–457 | 校验资源绑定的形状与类型兼容性，是资源准入的对外入口。 |
