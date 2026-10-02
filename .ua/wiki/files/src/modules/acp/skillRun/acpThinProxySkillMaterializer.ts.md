
# src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts -->

ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。
源码：[src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts](../../../../../../../src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts)

## 符号（5）
<!-- node: function:src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts:buildExampleFromSchema -->
<!-- node: function:src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts:buildOutputContractDetailsSection -->
<!-- node: function:src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts:buildPatchBlock -->
<!-- node: function:src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts:materializeAcpThinProxySkills -->
<!-- node: function:src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts:writeProxySkill -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildExampleFromSchema | 函数 | 168–215 | 中等 | schema、utility、synthesis、acp | 0 | 从 JSON Schema 递归合成一个合法示例值，用于在 SKILL.md 中给出输入/输出样例。 |
| buildOutputContractDetailsSection | 函数 | 248–319 | 复杂 | skill-rendering、schema、documentation、acp | 0 | 根据 output schema 生成 SKILL.md 中的输出契约章节，列出字段表与示例值。 |
| buildPatchBlock | 函数 | 343–385 | 中等 | skill-rendering、acp、template、prompt | 1 | 组装注入到 Skill 文档中的 patch 区块，包含运行反馈循环与资源映射说明。 |
| materializeAcpThinProxySkills | 函数 | 487–563 | 复杂 | acp、materializer、skill-run、entry-point | 0 | 把共享 Skill 目录物化为 ACP 薄代理 Skill：按 agent family 决定 skill 根、渲染 patch 块并写出落盘快照。 |
| writeProxySkill | 函数 | 411–457 | 中等 | file-io、materializer、acp、persistence | 1 | 把生成的薄代理 Skill 写入运行时持久化目录，并在需要时选择整包快照或仅追加 patch。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpAgentFamilyResolver.ts](acpAgentFamilyResolver.ts.md) | src/modules/acp/skillRun/acpAgentFamilyResolver.ts | agent family 解析器：按后端类型与命令特征判定当前 Agent 所属家族，为 skill run 提供差异化的执行假设。 |
| [acpSharedSkillCatalog.ts](acpSharedSkillCatalog.ts.md) | src/modules/acp/skillRun/acpSharedSkillCatalog.ts | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |
| [acpSkillPatchTemplates.ts](acpSkillPatchTemplates.ts.md) | src/modules/acp/skillRun/acpSkillPatchTemplates.ts | Skill Patch 模板模块：把内置 patch 模板物化到 runtime 目录，供不同 agent family 修补 SKILL.md 行为差异。 |
| [acpSkillReferenceRewriter.ts](acpSkillReferenceRewriter.ts.md) | src/modules/acp/skillRun/acpSkillReferenceRewriter.ts | Skill 内容引用重写器：把 SKILL.md 等文本中的相对引用改写为物化后的绝对路径，无外部依赖。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillMaterializer.ts](acpSkillMaterializer.ts.md) | src/modules/acp/skillRun/acpSkillMaterializer.ts | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| materializeAcpThinProxySkills | 函数 | 487–563 | 把共享 Skill 目录物化为 ACP 薄代理 Skill：按 agent family 决定 skill 根、渲染 patch 块并写出落盘快照。 |
