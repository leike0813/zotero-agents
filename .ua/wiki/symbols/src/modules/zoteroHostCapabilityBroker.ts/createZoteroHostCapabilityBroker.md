
# createZoteroHostCapabilityBroker
<!-- node: function:src/modules/zoteroHostCapabilityBroker.ts:createZoteroHostCapabilityBroker -->

创建 Broker 实例：装配只读能力、canonical mutation 控制、快照会话与导航适配器，是全部宿主能力的唯一构造入口。
类型：函数  
复杂度：复杂  
入边数：2  
标签：broker、factory、capability、exported  
所属文件：[src/modules/zoteroHostCapabilityBroker.ts](../../../../files/src/modules/zoteroHostCapabilityBroker.ts.md)
源码：[src/modules/zoteroHostCapabilityBroker.ts:17292](../../../../../../src/modules/zoteroHostCapabilityBroker.ts#L17292)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createZoteroSynthesisHostReadPort](../../../../files/src/modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts:1248–1572 | 构造 Synthesis 宿主读 port：实现条目分页、单条目读取、产物扫描页与产物就绪查询等全部读能力。 |
| [createWorkflowHostCapabilityBroker](../../../../files/src/workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts:309–313 | 投影 Broker 能力为工作流可见的只读与受控变更接口。 |

## 调用

该符号没有记录对外调用。
