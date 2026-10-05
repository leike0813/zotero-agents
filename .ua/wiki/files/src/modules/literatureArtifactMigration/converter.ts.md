
# src/modules/literatureArtifactMigration/converter.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[src/modules/literatureArtifactMigration](../../../../modules/src/modules/literatureArtifactMigration.md)
<!-- node: file:src/modules/literatureArtifactMigration/converter.ts -->

legacy 文献产物到 canonical 产物的纯转换器：解析旧 payload 标签、匹配 source reference、归一 citation 结构并输出转换分类与诊断。
源码：[src/modules/literatureArtifactMigration/converter.ts](../../../../../../src/modules/literatureArtifactMigration/converter.ts)

## 符号（8）
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:classifyConversion -->
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:decodeHtmlPayloads -->
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:decodePayloadTag -->
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:makeSourceReference -->
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:matchReference -->
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:normalizeCitation -->
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:resolveLegacyValues -->
<!-- node: function:src/modules/literatureArtifactMigration/converter.ts:resolveLiteratureArtifactMigrationConversion -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [classifyConversion](../../../../symbols/src/modules/literatureArtifactMigration/converter.ts/classifyConversion.md) | 函数 | 1023–1295 | 复杂 | 分类、迁移、诊断 | 1 | 综合转换结果给出迁移分类（可迁移、需人工解析、跳过等）并汇总受影响条目与缺失产物。 |
| decodeHtmlPayloads | 函数 | 386–399 | 简单 | legacy、html、解析 | 1 | 从笔记 HTML 中提取全部 payload 标签及其对应类型。 |
| decodePayloadTag | 函数 | 358–384 | 中等 | legacy、解析、note | 0 | 解析 managed note 中的 payload 标签，返回其类型与 JSON 载荷。 |
| [makeSourceReference](../../../../symbols/src/modules/literatureArtifactMigration/converter.ts/makeSourceReference.md) | 函数 | 595–661 | 复杂 | 文献产物、canonical、校验 | 1 | 构造并校验 SourceReference 产物，缺字段时记录诊断并复用已有 sourceReferenceId。 |
| matchReference | 函数 | 663–720 | 中等 | 匹配、引用、迁移 | 1 | 按 DOI/citekey/标题等分级匹配 legacy 引用与已有 SourceReference，并报告匹配理由。 |
| [normalizeCitation](../../../../symbols/src/modules/literatureArtifactMigration/converter.ts/normalizeCitation.md) | 函数 | 824–989 | 复杂 | citation、归一化、canonical | 1 | 把 legacy citation 记录归一为 canonical citation 分析结构，生成稳定 mention id 并补全引用绑定。 |
| [resolveLegacyValues](../../../../symbols/src/modules/literatureArtifactMigration/converter.ts/resolveLegacyValues.md) | 函数 | 423–540 | 复杂 | legacy、归一化、转换 | 1 | 从多来源 legacy 输入中解析并归一 references、citation 等原始值，形成转换的中间事实。 |
| resolveLiteratureArtifactMigrationConversion | 函数 | 1304–1441 | 复杂 | 迁移、解析决策、canonical | 0 | 把用户提供的解析决策应用到转换结果，产出最终可执行的 canonical 产物集合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sourceReferenceArtifact.ts](../../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureArtifactMigration.ts](../literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [workflowEditorHost.ts](../workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveLiteratureArtifactMigrationConversion | 函数 | 1304–1441 | 把用户提供的解析决策应用到转换结果，产出最终可执行的 canonical 产物集合。 |
