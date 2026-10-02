
# src/modules/acp/transport/acpPermissionOptions.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpPermissionOptions.ts -->

ACP 权限选项语义：定义允许/拒绝等选项种类，并解析「自动批准」应对应哪个选项 ID。
源码：[src/modules/acp/transport/acpPermissionOptions.ts](../../../../../../../src/modules/acp/transport/acpPermissionOptions.ts)

## 符号（3）
<!-- node: function:src/modules/acp/transport/acpPermissionOptions.ts:isAcpPermissionOptionKind -->
<!-- node: function:src/modules/acp/transport/acpPermissionOptions.ts:normalizeAcpPermissionOptionKind -->
<!-- node: function:src/modules/acp/transport/acpPermissionOptions.ts:resolveAutoApproveAcpPermissionOptionId -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| isAcpPermissionOptionKind | 函数 | 17–21 | 简单 | acp、权限、validation | 0 | 判定字符串是否为已知权限选项种类。 |
| normalizeAcpPermissionOptionKind | 函数 | 23–28 | 简单 | acp、权限、validation | 1 | 把任意输入规整为已知权限选项种类，缺失时回落到默认种类。 |
| resolveAutoApproveAcpPermissionOptionId | 函数 | 34–54 | 简单 | acp、权限、utility | 0 | 在权限选项列表中解析出表示自动批准的选项 ID，找不到时返回 undefined。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |
| [acpProtocol.ts](../../acpProtocol.ts.md) | src/modules/acpProtocol.ts | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [acpSessionManager.ts](../chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunExecutionSupport.ts](../skillRun/acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunPersistence.ts](../skillRun/acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpTypes.ts](../../acpTypes.ts.md) | src/modules/acpTypes.ts | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isAcpPermissionOptionKind | 函数 | 17–21 | 判定字符串是否为已知权限选项种类。 |
| normalizeAcpPermissionOptionKind | 函数 | 23–28 | 把任意输入规整为已知权限选项种类，缺失时回落到默认种类。 |
| resolveAutoApproveAcpPermissionOptionId | 函数 | 34–54 | 在权限选项列表中解析出表示自动批准的选项 ID，找不到时返回 undefined。 |
