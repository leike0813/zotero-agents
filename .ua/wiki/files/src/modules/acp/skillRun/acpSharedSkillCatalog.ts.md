
# src/modules/acp/skillRun/acpSharedSkillCatalog.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSharedSkillCatalog.ts -->

ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。
源码：[src/modules/acp/skillRun/acpSharedSkillCatalog.ts](../../../../../../../src/modules/acp/skillRun/acpSharedSkillCatalog.ts)

## 符号（3）
<!-- node: function:src/modules/acp/skillRun/acpSharedSkillCatalog.ts:buildAcpSharedSkillCatalog -->
<!-- node: function:src/modules/acp/skillRun/acpSharedSkillCatalog.ts:buildAcpSharedSkillCatalogImpl -->
<!-- node: function:src/modules/acp/skillRun/acpSharedSkillCatalog.ts:buildCatalogId -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpSharedSkillCatalog | 函数 | 201–223 | 中等 | acp、skill-catalog、entry-point | 1 | 对外的共享 Skill 目录构建入口，包裹实现并附加诊断与稳定性保证。 |
| [buildAcpSharedSkillCatalogImpl](../../../../../symbols/src/modules/acp/skillRun/acpSharedSkillCatalog.ts/buildAcpSharedSkillCatalogImpl.md) | 函数 | 90–197 | 复杂 | acp、skill-catalog、scanning | 1 | 扫描插件 Skill registry 与资源清单，构建共享 Skill 目录（id、名称、路径、来源、可用性）。 |
| buildCatalogId | 函数 | 60–76 | 简单 | acp、skill-catalog、hashing | 0 | 由 Skill 标识与来源目录计算稳定目录 id（fnv1a 散列），保证跨运行一致。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillResourceManifest.ts](acpSkillResourceManifest.ts.md) | src/modules/acp/skillRun/acpSkillResourceManifest.ts | Skill 资源清单：列举单个 Skill 声明的附带资源文件，供物化与校验阶段核对完整性。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillMaterializer.ts](acpSkillMaterializer.ts.md) | src/modules/acp/skillRun/acpSkillMaterializer.ts | Skill 物化器：把 Skill 目录（含资源清单）写入 runtime 工作区，并按 agent family 决定是否需要薄代理 Skill。 |
| [acpSkillRunPromptBuilder.ts](acpSkillRunPromptBuilder.ts.md) | src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts | Skill run prompt 构建器：组合 agent family 规则、共享 Skill 目录、patch 模板与工作区上下文，生成最终运行提示词。 |
| [acpThinProxySkillMaterializer.ts](acpThinProxySkillMaterializer.ts.md) | src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts | ACP Skill 的薄代理物化器：按 agent family 解析 skill 根目录，注入 patch 模板与参考重写，把 Skill 包物化成 Agent 可直接消费的目录结构。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpSharedSkillCatalog | 函数 | 201–223 | 对外的共享 Skill 目录构建入口，包裹实现并附加诊断与稳定性保证。 |
