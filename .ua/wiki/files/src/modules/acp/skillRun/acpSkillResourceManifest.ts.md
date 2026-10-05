
# src/modules/acp/skillRun/acpSkillResourceManifest.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillResourceManifest.ts -->

Skill 资源清单：列举单个 Skill 声明的附带资源文件，供物化与校验阶段核对完整性。
源码：[src/modules/acp/skillRun/acpSkillResourceManifest.ts](../../../../../../../src/modules/acp/skillRun/acpSkillResourceManifest.ts)

## 符号（2）
<!-- node: function:src/modules/acp/skillRun/acpSkillResourceManifest.ts:buildAcpSkillResourceManifest -->
<!-- node: function:src/modules/acp/skillRun/acpSkillResourceManifest.ts:summarizeAcpSkillManifestAvailability -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpSkillResourceManifest | 函数 | 28–56 | 简单 | acp、manifest、resource | 0 | 列举 Skill 声明的附带资源文件并生成清单，标注存在性与体积。 |
| summarizeAcpSkillManifestAvailability | 函数 | 58–67 | 简单 | acp、manifest、summary | 0 | 汇总 manifest 中资源的可用性，输出缺失项计数供提示使用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSharedSkillCatalog.ts](acpSharedSkillCatalog.ts.md) | src/modules/acp/skillRun/acpSharedSkillCatalog.ts | ACP 共享 Skill 目录：聚合插件 Skill registry 与资源清单，生成本次会话可用的共享 Skill 列表。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpSkillResourceManifest | 函数 | 28–56 | 列举 Skill 声明的附带资源文件并生成清单，标注存在性与体积。 |
| summarizeAcpSkillManifestAvailability | 函数 | 58–67 | 汇总 manifest 中资源的可用性，输出缺失项计数供提示使用。 |
