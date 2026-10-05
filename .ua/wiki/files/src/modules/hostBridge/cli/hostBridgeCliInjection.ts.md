
# src/modules/hostBridge/cli/hostBridgeCliInjection.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/cli](../../../../../modules/src/modules/hostBridge/cli.md)
<!-- node: file:src/modules/hostBridge/cli/hostBridgeCliInjection.ts -->

把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。
源码：[src/modules/hostBridge/cli/hostBridgeCliInjection.ts](../../../../../../../src/modules/hostBridge/cli/hostBridgeCliInjection.ts)

## 符号（2）
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliInjection.ts:applyHostBridgeCliEnvToBackend -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeCliInjection.ts:materializeHostBridgeCliRunInjection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyHostBridgeCliEnvToBackend | 函数 | 310–331 | 简单 | host-bridge、environment、cli、integration | 0 | 把注入结果转成后端进程环境变量与启动参数，使 Agent 子进程能定位 CLI 与 Bridge Server。 |
| materializeHostBridgeCliRunInjection | 函数 | 169–294 | 复杂 | host-bridge、materializer、cli、permissions | 0 | 为一次 Agent 运行物化 Host Bridge CLI 注入包：写入 scope/profile/README，并绑定写审批登记与认证令牌。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [env.ts](../../../platform/env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [hostBridgeAuth.ts](../server/hostBridgeAuth.ts.md) | src/modules/hostBridge/server/hostBridgeAuth.ts | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [hostBridgeCliResolver.ts](hostBridgeCliResolver.ts.md) | src/modules/hostBridge/cli/hostBridgeCliResolver.ts | 解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。 |
| [hostBridgeProtocol.ts](../server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWriteAutoApprovalRegistry.ts](../permissions/hostBridgeWriteAutoApprovalRegistry.ts.md) | src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSessionManager.ts](../../acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../../acp/skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](../../acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyHostBridgeCliEnvToBackend | 函数 | 310–331 | 把注入结果转成后端进程环境变量与启动参数，使 Agent 子进程能定位 CLI 与 Bridge Server。 |
| materializeHostBridgeCliRunInjection | 函数 | 169–294 | 为一次 Agent 运行物化 Host Bridge CLI 注入包：写入 scope/profile/README，并绑定写审批登记与认证令牌。 |
