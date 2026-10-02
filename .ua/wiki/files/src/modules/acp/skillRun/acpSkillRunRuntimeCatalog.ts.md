
# src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts -->

ACP Skill Run 运行时目录（runtime catalog）的读写门面：保存 Agent 上报的可用模式/模型目录，并应用用户的运行时选择。
源码：[src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts)

## 符号（3）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts:getAcpSkillRunRuntimeCatalog -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts:setAcpSkillRunRuntimeCatalog -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts:updateAcpSkillRunRuntimeSelection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getAcpSkillRunRuntimeCatalog | 函数 | 57–64 | 简单 | acp、runtime-catalog、query | 0 | 读取指定 run 当前的 runtime catalog 快照，无数据时返回 undefined。 |
| setAcpSkillRunRuntimeCatalog | 函数 | 21–55 | 简单 | acp、runtime-catalog、cache | 0 | 用会话上报的 runtime catalog 覆盖某条 run 的目录快照，切换会话时互不干扰。 |
| updateAcpSkillRunRuntimeSelection | 函数 | 66–86 | 简单 | acp、runtime-catalog、state-management | 0 | 把用户选择的模式、模型与 reasoning effort 写回 run 记录，作为下一轮 prompt 的运行时参数。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunState.ts](acpSkillRunState.ts.md) | src/modules/acp/skillRun/acpSkillRunState.ts | ACP Skill Run 的进程内可变状态集合：run 记录表、控制器注册表、按 run 划分的权限队列与 runtime catalog，以及当前选中项。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceDataPlane.ts](acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunActions.ts](acpSkillRunActions.ts.md) | src/modules/acp/skillRun/acpSkillRunActions.ts | ACP Skills 运行的用户动作层：取消、中断当前 turn、归档、用户回复，以及 mode/model/effort 切换、连接与断连、apply 结果标记和会话关闭。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getAcpSkillRunRuntimeCatalog | 函数 | 57–64 | 读取指定 run 当前的 runtime catalog 快照，无数据时返回 undefined。 |
| setAcpSkillRunRuntimeCatalog | 函数 | 21–55 | 用会话上报的 runtime catalog 覆盖某条 run 的目录快照，切换会话时互不干扰。 |
| updateAcpSkillRunRuntimeSelection | 函数 | 66–86 | 把用户选择的模式、模型与 reasoning effort 写回 run 记录，作为下一轮 prompt 的运行时参数。 |
