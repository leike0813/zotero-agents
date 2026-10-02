
# loadBackendsRegistryReadonly
<!-- node: function:src/modules/harness/backendsReadonly.ts:loadBackendsRegistryReadonly -->

读取并返回只读后端列表，读取失败时返回空集合而不是抛出。
类型：函数  
复杂度：中等  
入边数：2  
标签：harness、readonly、backends、loader  
所属文件：[src/modules/harness/backendsReadonly.ts](../../../../../files/src/modules/harness/backendsReadonly.ts.md)
源码：[src/modules/harness/backendsReadonly.ts:123](../../../../../../../src/modules/harness/backendsReadonly.ts#L123)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createAssistantReadonlyPublicationSession](../../../../../files/src/modules/harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts:609–1966 | 创建只读发布会话：打开插件状态只读存储、加载后端与工作流，并为分页 transcript、run 详情等请求提供统一的分发入口。 |
| [createDashboardReadonlyModel](../../../../../files/src/modules/harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts:587–1071 | 构建 Dashboard 只读模型：打开只读存储、拉取后端与任务、合并工作流与产品资产，返回按 surface 分组的行数据与签名。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeBackendEntry](../../../../../files/src/modules/harness/backendsReadonly.ts.md) | src/modules/harness/backendsReadonly.ts:43–112 | 把松散的后端配置归一化为 Harness 后端 DTO，保留类型、显示名、启用态与连接参数摘要。 |
