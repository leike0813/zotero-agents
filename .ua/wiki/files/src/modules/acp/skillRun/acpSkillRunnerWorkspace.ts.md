
# src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts -->

Skill runner 工作区管理：创建/清理 runtime 下的运行工作目录，隔离不同 requestId 的产物。
源码：[src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts)

## 符号（6）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:assertReusableWorkspace -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:createAcpSkillRunnerWorkspace -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:registerAcpWorkflowWorkspaceForReuse -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:resolveWorkspacePaths -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:scanRunnerFileNamespaces -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts:writeAcpSkillRunnerInputManifest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertReusableWorkspace | 函数 | 125–135 | 简单 | acp、workspace、validation | 0 | 校验工作区是否满足复用条件，避免复用残留脏状态的目录。 |
| [createAcpSkillRunnerWorkspace](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts/createAcpSkillRunnerWorkspace.md) | 函数 | 163–227 | 复杂 | acp、workspace、entry-point、filesystem | 1 | 创建或复用 Skill runner 工作区，分配命名空间并准备输入、输出与临时目录。 |
| registerAcpWorkflowWorkspaceForReuse | 函数 | 137–157 | 中等 | acp、workspace、registry | 1 | 把工作区注册到可复用登记表，供后续同 requestId 的运行复用。 |
| resolveWorkspacePaths | 函数 | 110–123 | 简单 | acp、workspace、path-resolution | 0 | 解析工作区的输入/输出/临时目录路径，全部落在受管 runtime 根之下。 |
| scanRunnerFileNamespaces | 函数 | 86–108 | 中等 | acp、workspace、scanning | 0 | 扫描工作区中已存在的文件命名空间，判断哪些 requestId 可被复用。 |
| writeAcpSkillRunnerInputManifest | 函数 | 229–237 | 简单 | acp、workspace、manifest | 0 | 写入输入 manifest，记录本次运行采用的输入物化事实。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunAuditTrail.ts](acpSkillRunAuditTrail.ts.md) | src/modules/acp/skillRun/acpSkillRunAuditTrail.ts | skill run 的审计工件写入器：生成 run/timeline/update/final-state/transport 五类 schema 的审计文件，做敏感字段脱敏与有界写入，并输出可读 README。 |
| [acpSkillRunExecutionSupport.ts](acpSkillRunExecutionSupport.ts.md) | src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts | skill run 执行期的支撑层：组装 prompt 与启动前置、解析运行时选项、准备 Host Bridge CLI、执行 MCP 工具预检、硬超时监控与权限请求路由。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunPromptBuilder.ts](acpSkillRunPromptBuilder.ts.md) | src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createAcpSkillRunnerWorkspace](../../../../../symbols/src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts/createAcpSkillRunnerWorkspace.md) | 函数 | 163–227 | 创建或复用 Skill runner 工作区，分配命名空间并准备输入、输出与临时目录。 |
| registerAcpWorkflowWorkspaceForReuse | 函数 | 137–157 | 把工作区注册到可复用登记表，供后续同 requestId 的运行复用。 |
| writeAcpSkillRunnerInputManifest | 函数 | 229–237 | 写入输入 manifest，记录本次运行采用的输入物化事实。 |
