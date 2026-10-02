
# src/modules/acp/skillRun/acpSkillResultFileFallback.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillResultFileFallback.ts -->

Skill 结果文件回退：当 Agent 未直接给出结构化结果时，从落盘结果文件回读并按校验器语义归一。
源码：[src/modules/acp/skillRun/acpSkillResultFileFallback.ts](../../../../../../../src/modules/acp/skillRun/acpSkillResultFileFallback.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpSkillResultFileFallback.ts:collectCandidatePaths -->
<!-- node: function:src/modules/acp/skillRun/acpSkillResultFileFallback.ts:resolveAcpSkillResultFileFallback -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectCandidatePaths | 函数 | 47–81 | 中等 | acp、fallback、path-resolution | 0 | 按约定优先级枚举工作区中可能承载 Skill 结果的 JSON 文件路径。 |
| [resolveAcpSkillResultFileFallback](../../../../../symbols/src/modules/acp/skillRun/acpSkillResultFileFallback.ts/resolveAcpSkillResultFileFallback.md) | 函数 | 83–158 | 复杂 | acp、fallback、output、entry-point | 1 | 当 Agent 未直接返回结构化结果时，按候选路径回读结果文件并归一为标准载荷。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillOutputValidator.ts](acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [acpSkillRunRecovery.ts](acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [resolveAcpSkillResultFileFallback](../../../../../symbols/src/modules/acp/skillRun/acpSkillResultFileFallback.ts/resolveAcpSkillResultFileFallback.md) | 函数 | 83–158 | 当 Agent 未直接返回结构化结果时，按候选路径回读结果文件并归一为标准载荷。 |
