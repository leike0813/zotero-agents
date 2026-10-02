
# src/modules/hostBridge/server/hostBridgeAuth.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/server](../../../../../modules/src/modules/hostBridge/server.md)
<!-- node: file:src/modules/hostBridge/server/hostBridgeAuth.ts -->

Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。
源码：[src/modules/hostBridge/server/hostBridgeAuth.ts](../../../../../../../src/modules/hostBridge/server/hostBridgeAuth.ts)

## 符号（12）
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:base64ToBytes -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:bytesToBase64 -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:deriveMasterTokenKey -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:generateHostBridgeToken -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:getHostBridgeMasterTokenStatus -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:getHostBridgeToken -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:getOrCreateMasterKeyMaterial -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:isHostBridgeAuthorizationValid -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:readHostBridgeMasterToken -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:redactHostBridgeToken -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:rotateHostBridgeMasterToken -->
<!-- node: function:src/modules/hostBridge/server/hostBridgeAuth.ts:rotateHostBridgeToken -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| base64ToBytes | 函数 | 95–108 | 简单 | base64、解码、沙箱兼容 | 0 | 把 base64 字符串解码为字节数组，非法字符被拒绝。 |
| bytesToBase64 | 函数 | 72–93 | 简单 | base64、编码、沙箱兼容 | 0 | 在沙箱环境中手写字节到 base64 编码，避免依赖 Node Buffer。 |
| deriveMasterTokenKey | 函数 | 141–168 | 简单 | 密钥派生、安全、host-bridge | 0 | 由主密钥材料派生用于 master token 的密钥，派生过程不落盘中间结果。 |
| generateHostBridgeToken | 函数 | 44–56 | 简单 | token、随机数、安全 | 0 | 生成高熵 Host Bridge token 字符串。 |
| getHostBridgeMasterTokenStatus | 函数 | 183–191 | 简单 | 状态、token、对外接口 | 0 | 返回 master token 的状态（是否已配置、来源、更新时间），不泄露密钥本身。 |
| getHostBridgeToken | 函数 | 170–181 | 简单 | token、对外接口、host-bridge | 0 | 返回当前 Host Bridge token，尚未初始化时先生成再返回。 |
| getOrCreateMasterKeyMaterial | 函数 | 121–139 | 简单 | 密钥管理、持久化、安全 | 0 | 读取或首次生成持久化主密钥材料，缺失时写入且不覆盖已有密钥。 |
| isHostBridgeAuthorizationValid | 函数 | 320–338 | 简单 | 认证、定长比较、安全 | 0 | 定长比较校验 Authorization 头，缺失或格式不符均判为未授权。 |
| readHostBridgeMasterToken | 函数 | 239–303 | 中等 | token、持久化、读取 | 0 | 读取并解析持久化的 master token 材料，格式非法时明确报错而不静默重置。 |
| redactHostBridgeToken | 函数 | 110–119 | 简单 | 脱敏、token、安全 | 0 | 对 token 做脱敏，仅保留首尾少量字符供用户辨认。 |
| rotateHostBridgeMasterToken | 函数 | 193–230 | 中等 | token-轮换、安全、持久化 | 0 | 轮换 master token 并持久化新密钥，轮换过程保证旧 token 立即失效。 |
| rotateHostBridgeToken | 函数 | 305–318 | 简单 | token-轮换、安全、host-bridge | 0 | 轮换单次会话 token。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [timingSafeEqual.ts](../../../utils/timingSafeEqual.ts.md) | src/utils/timingSafeEqual.ts | 字符串定长时间安全比较：长度不等直接返回 false，等长时以累积异或差值避免逐字符短路。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCliInjection.ts](../cli/hostBridgeCliInjection.ts.md) | src/modules/hostBridge/cli/hostBridgeCliInjection.ts | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [hostBridgeServer.ts](hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeSkillRunnerEnv.ts](../cli/hostBridgeSkillRunnerEnv.ts.md) | src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts | 为 SkillRunner 后端推导 Host Bridge 运行环境：判定后端连接本地还是远程，据此拼装代理侧连接 Host Bridge 所需的环境变量。 |
| [webDavSyncCredentialPrefs.ts](../../synthesis/webDavSyncCredentialPrefs.ts.md) | src/modules/synthesis/webDavSyncCredentialPrefs.ts | WebDAV 凭据的加密存取：基于插件主密钥派生密钥对凭据做加密后写入首选项，读取时解密并做基本校验。 |
| [zoteroMcpServer.ts](../mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| generateHostBridgeToken | 函数 | 44–56 | 生成高熵 Host Bridge token 字符串。 |
| getHostBridgeMasterTokenStatus | 函数 | 183–191 | 返回 master token 的状态（是否已配置、来源、更新时间），不泄露密钥本身。 |
| getHostBridgeToken | 函数 | 170–181 | 返回当前 Host Bridge token，尚未初始化时先生成再返回。 |
| isHostBridgeAuthorizationValid | 函数 | 320–338 | 定长比较校验 Authorization 头，缺失或格式不符均判为未授权。 |
| readHostBridgeMasterToken | 函数 | 239–303 | 读取并解析持久化的 master token 材料，格式非法时明确报错而不静默重置。 |
| redactHostBridgeToken | 函数 | 110–119 | 对 token 做脱敏，仅保留首尾少量字符供用户辨认。 |
| rotateHostBridgeMasterToken | 函数 | 193–230 | 轮换 master token 并持久化新密钥，轮换过程保证旧 token 立即失效。 |
| rotateHostBridgeToken | 函数 | 305–318 | 轮换单次会话 token。 |
