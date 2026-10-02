
# createPluginStateReadonlyStore
<!-- node: function:src/modules/harness/pluginStateReadonly.ts:createPluginStateReadonlyStore -->

打开只读数据库连接并组装各表查询方法，返回 Harness 使用的只读存储句柄。
类型：函数  
复杂度：中等  
入边数：2  
标签：harness、readonly、sqlite、data-access、core  
所属文件：[src/modules/harness/pluginStateReadonly.ts](../../../../../files/src/modules/harness/pluginStateReadonly.ts.md)
源码：[src/modules/harness/pluginStateReadonly.ts:303](../../../../../../../src/modules/harness/pluginStateReadonly.ts#L303)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createAssistantReadonlyPublicationSession](../../../../../files/src/modules/harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts:609–1966 | 创建只读发布会话：打开插件状态只读存储、加载后端与工作流，并为分页 transcript、run 详情等请求提供统一的分发入口。 |
| [createDashboardReadonlyModel](../../../../../files/src/modules/harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts:587–1071 | 构建 Dashboard 只读模型：打开只读存储、拉取后端与任务、合并工作流与产品资产，返回按 surface 分组的行数据与签名。 |

## 调用

该符号没有记录对外调用。
