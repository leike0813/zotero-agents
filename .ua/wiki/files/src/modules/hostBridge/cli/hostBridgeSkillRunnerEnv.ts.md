
# src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/cli](../../../../../modules/src/modules/hostBridge/cli.md)
<!-- node: file:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts -->

为 SkillRunner 后端推导 Host Bridge 运行环境：判定后端连接本地还是远程，据此拼装代理侧连接 Host Bridge 所需的环境变量。
源码：[src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts](../../../../../../../src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts)

## 符号（7）
<!-- node: function:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:buildLocalSkillRunnerHostBridgeRuntimeEnv -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:buildRemoteSkillRunnerHostBridgeRuntimeEnv -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:buildSkillRunnerHostBridgeRuntimeEnv -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:buildSkillRunnerHostBridgeScopeEnv -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:classifySkillRunnerBackendLocality -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:extractBackendHost -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts:isLoopbackOrWildcardHost -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildLocalSkillRunnerHostBridgeRuntimeEnv | 函数 | 104–135 | 中等 | 环境变量、skillrunner、本地后端 | 0 | 为本地 SkillRunner 后端构造仅含 loopback 端点与最小作用域的运行环境。 |
| buildRemoteSkillRunnerHostBridgeRuntimeEnv | 函数 | 137–264 | 复杂 | 环境变量、skillrunner、远程后端 | 0 | 为远程 SkillRunner 后端构造运行环境，注入可达广告主机、token 与受限作用域，广告主机不可用时给出明确失败。 |
| buildSkillRunnerHostBridgeRuntimeEnv | 函数 | 266–305 | 中等 | 入口点、环境变量、skillrunner | 0 | 统一入口：按后端本地性选择本地或远程环境构造路径。 |
| buildSkillRunnerHostBridgeScopeEnv | 函数 | 57–68 | 简单 | 环境变量、mutation-scope、host-bridge | 0 | 构造 Host Bridge 作用域相关环境变量，把 mutation scope 与审批语义注入后端进程。 |
| classifySkillRunnerBackendLocality | 函数 | 88–102 | 简单 | 后端适配、主机判定、host-bridge | 0 | 综合后端 URL 与广告主机检测结果判定后端是本地还是远程。 |
| extractBackendHost | 函数 | 70–86 | 简单 | url-解析、后端配置、host-bridge | 0 | 从后端配置 URL 中解析主机名，供本地性判定使用。 |
| isLoopbackOrWildcardHost | 函数 | 41–51 | 简单 | 主机判定、loopback、host-bridge | 0 | 判断主机名是否属于 loopback 或通配地址，用于区分本地与远程后端。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeAdvertisedHostDetection.ts](../server/hostBridgeAdvertisedHostDetection.ts.md) | src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts | 广告主机检测：探测 Host Bridge 在网络上可被外部访问的地址，剔除不可用或明显不合法的 IPv4 候选，供远程后端生成可达连接配置。 |
| [hostBridgeAuth.ts](../server/hostBridgeAuth.ts.md) | src/modules/hostBridge/server/hostBridgeAuth.ts | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [hostBridgeProtocol.ts](../server/hostBridgeProtocol.ts.md) | src/modules/hostBridge/server/hostBridgeProtocol.ts | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [productionExecution.ts](../../workflow/productionExecution.ts.md) | src/modules/workflow/productionExecution.ts | 工作流执行各 seam 的生产态依赖装配点，把 Host Bridge 环境构造、Assistant 侧边栏与 SkillRunner 工作区聚焦等真实实现注入 preparation/run/duplicateGuard/submission seam。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildLocalSkillRunnerHostBridgeRuntimeEnv | 函数 | 104–135 | 为本地 SkillRunner 后端构造仅含 loopback 端点与最小作用域的运行环境。 |
| buildRemoteSkillRunnerHostBridgeRuntimeEnv | 函数 | 137–264 | 为远程 SkillRunner 后端构造运行环境，注入可达广告主机、token 与受限作用域，广告主机不可用时给出明确失败。 |
| buildSkillRunnerHostBridgeRuntimeEnv | 函数 | 266–305 | 统一入口：按后端本地性选择本地或远程环境构造路径。 |
| buildSkillRunnerHostBridgeScopeEnv | 函数 | 57–68 | 构造 Host Bridge 作用域相关环境变量，把 mutation scope 与审批语义注入后端进程。 |
| classifySkillRunnerBackendLocality | 函数 | 88–102 | 综合后端 URL 与广告主机检测结果判定后端是本地还是远程。 |
