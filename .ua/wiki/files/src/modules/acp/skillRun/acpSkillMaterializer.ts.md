
# src/modules/acp/skillRun/acpSkillMaterializer.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillMaterializer.ts -->

Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。
源码：[src/modules/acp/skillRun/acpSkillMaterializer.ts](../../../../../../../src/modules/acp/skillRun/acpSkillMaterializer.ts)

## 符号（1）
<!-- node: function:src/modules/acp/skillRun/acpSkillMaterializer.ts:materializeAcpSkill -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [materializeAcpSkill](../../../../../symbols/src/modules/acp/skillRun/acpSkillMaterializer.ts/materializeAcpSkill.md) | 函数 | 37–109 | 复杂 | acp、materialization、skill、entry-point | 1 | 把指定 Skill 目录物化到运行工作区：复制文件、注入资源 manifest，并按家族决定是否生成薄代理 Skill。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAgentFamilyResolver.ts](acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [acpSharedSkillCatalog.ts](acpSharedSkillCatalog.ts.md) | src/modules/acp/skillRun/acpSharedSkillCatalog.ts | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |
| [acpThinProxySkillMaterializer.ts](acpThinProxySkillMaterializer.ts.md) | src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [materializeAcpSkill](../../../../../symbols/src/modules/acp/skillRun/acpSkillMaterializer.ts/materializeAcpSkill.md) | 函数 | 37–109 | 把指定 Skill 目录物化到运行工作区：复制文件、注入资源 manifest，并按家族决定是否生成薄代理 Skill。 |
