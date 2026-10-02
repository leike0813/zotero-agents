
# buildAcpFoldedModelGroups
<!-- node: function:src/modules/acp/chat/acpModelOptionFolding.ts:buildAcpFoldedModelGroups -->

按 provider 与 effort 层级构造折叠分组，剔除重复项并保持后端返回顺序。
类型：函数  
复杂度：中等  
入边数：2  
标签：acp、model-selection、grouping  
所属文件：[src/modules/acp/chat/acpModelOptionFolding.ts](../../../../../../files/src/modules/acp/chat/acpModelOptionFolding.ts.md)
源码：[src/modules/acp/chat/acpModelOptionFolding.ts:364](../../../../../../../../src/modules/acp/chat/acpModelOptionFolding.ts#L364)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [AcpProvider](../../../../../../files/src/providers/acp/provider.ts.md) | src/providers/acp/provider.ts:27–252 | ACP 协议 Provider 实现：声明支持的请求种类与运行时选项 schema，折叠 provider 作用域的模型选择，并委托 ACP SkillRunner 编排器执行任务。 |
| [foldAcpModelOptions](../../../../../../files/src/modules/acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts:408–467 | 折叠模型选项列表，产出分组视图模型并保留每个选项到 raw model id 的反查关系。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [parseAcpEffortFromModelText](../../../../../../files/src/modules/acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts:299–331 | 从模型展示文本尾部解析 reasoning effort 变体，识别已知档位并保留未知后缀。 |
