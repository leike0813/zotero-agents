
# readArtifactsFromRegistryInputs
<!-- node: function:src/modules/synthesis/libraryAdapter.ts:readArtifactsFromRegistryInputs -->

按需读取条目产物内容并返回描述符与状态，同时区分宿主读取失败与产物缺失两类诊断。
类型：函数  
复杂度：复杂  
入边数：2  
标签：产物读取、诊断、host-read  
所属文件：[src/modules/synthesis/libraryAdapter.ts](../../../../../files/src/modules/synthesis/libraryAdapter.ts.md)
源码：[src/modules/synthesis/libraryAdapter.ts:829](../../../../../../../src/modules/synthesis/libraryAdapter.ts#L829)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createZoteroReadonlyHostReadPort](../../../../../files/src/modules/harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts:271–552 | 创建 Synthesis 宿主只读端口：提供 library index、artifact 读取、citation graph 输入与代表图/managed note 投影。 |
| [createZoteroSynthesisHostReadPort](../../../../../files/src/modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts:1248–1572 | 构造 Synthesis 宿主读 port：实现条目分页、单条目读取、产物扫描页与产物就绪查询等全部读能力。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [childNotes](childNotes.md) | src/modules/synthesis/libraryAdapter.ts:309–388 | 读取条目的子笔记列表，并按 managed note kind 区分 digest、references 与 citation-analysis 等语义。 |
| [hostArtifactDescriptor](../../../../../files/src/modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts:1180–1228 | 把内部产物记录投影为契约要求的 host artifact descriptor。 |
| [payloadBlocksForInput](payloadBlocksForInput.md) | src/modules/synthesis/libraryAdapter.ts:606–681 | 从条目输入中提取全部 payload 块，识别各块对应的产物类型与解析状态。 |
