
# src/modules/acp/skillRun/acpSkillRunPayloadStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunPayloadStore.ts -->

skill run 的载荷持久化：读写 run context 载荷并维护 output revision 追加日志，为产物投影与恢复提供磁盘事实源。
源码：[src/modules/acp/skillRun/acpSkillRunPayloadStore.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunPayloadStore.ts)

## 符号（5）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPayloadStore.ts:appendAcpSkillRunOutputRevision -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPayloadStore.ts:readAcpSkillRunContextPayload -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPayloadStore.ts:readAcpSkillRunOutputRevisions -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPayloadStore.ts:writeAcpSkillRunContextPayload -->
<!-- node: function:src/modules/acp/skillRun/acpSkillRunPayloadStore.ts:writeAcpSkillRunOutputRevisions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendAcpSkillRunOutputRevision | 函数 | 123–140 | 中等 | 持久化、revision、产物 | 0 | 追加一条 output revision 记录，保留产物演进轨迹供投影与审计使用。 |
| readAcpSkillRunContextPayload | 函数 | 83–98 | 简单 | 持久化、容错、acp-skills | 0 | 读取 run context 载荷，文件缺失或损坏时返回 undefined 而不抛出。 |
| readAcpSkillRunOutputRevisions | 函数 | 142–166 | 中等 | 持久化、归一化、产物 | 0 | 读取并归一化 output revision 日志，丢弃损坏行并返回有序 revision 列表。 |
| writeAcpSkillRunContextPayload | 函数 | 54–81 | 中等 | 持久化、上下文、acp-skills | 0 | 写入 run context 载荷 JSON，用于运行中断后恢复上下文事实。 |
| writeAcpSkillRunOutputRevisions | 函数 | 100–121 | 中等 | 持久化、revision、acp-skills | 0 | 整体重写 output revision 日志，用于收敛历史 revision 记录。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunPersistence.ts](acpSkillRunPersistence.ts.md) | src/modules/acp/skillRun/acpSkillRunPersistence.ts | ACP Skill Run 记录的持久化层：负责 run 记录的解析规整、插件状态库水合、运行时文件写入合并与保留期清理。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillRunStore.ts](acpSkillRunStore.ts.md) | src/modules/acp/skillRun/acpSkillRunStore.ts | ACP Skill Run 的内存状态与写入主入口：维护 run 记录表、状态机转换校验、transcript 条目写入、用户回复、输出修订与工作区读取模型的组装。 |
| [acpSkillRunWorkspaceDataPlane.ts](acpSkillRunWorkspaceDataPlane.ts.md) | src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts | ACP Skills 工作区的数据面：把 run 记录、transcript 镜像与 runtime catalog 投影为工作区读取模型，并合并高频变更事件对外发布。 |
