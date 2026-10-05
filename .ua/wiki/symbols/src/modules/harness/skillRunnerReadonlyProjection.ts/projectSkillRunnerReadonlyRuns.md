
# projectSkillRunnerReadonlyRuns
<!-- node: function:src/modules/harness/skillRunnerReadonlyProjection.ts:projectSkillRunnerReadonlyRuns -->

批量投影 SkillRunner run 列表，合并 sequence 状态、技能显示名与工作流信息，输出 Harness 行数据。
类型：函数  
复杂度：中等  
入边数：2  
标签：harness、readonly、skillrunner、projection、core  
所属文件：[src/modules/harness/skillRunnerReadonlyProjection.ts](../../../../../files/src/modules/harness/skillRunnerReadonlyProjection.ts.md)
源码：[src/modules/harness/skillRunnerReadonlyProjection.ts:347](../../../../../../../src/modules/harness/skillRunnerReadonlyProjection.ts#L347)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createAssistantReadonlyPublicationSession](../../../../../files/src/modules/harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts:609–1966 | 创建只读发布会话：打开插件状态只读存储、加载后端与工作流，并为分页 transcript、run 详情等请求提供统一的分发入口。 |
| [createDashboardReadonlyModel](../../../../../files/src/modules/harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts:587–1071 | 构建 Dashboard 只读模型：打开只读存储、拉取后端与任务、合并工作流与产品资产，返回按 surface 分组的行数据与签名。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [parseRunRecord](../../../../../files/src/modules/harness/skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts:174–249 | 解析 run 记录的 JSON 字段，容错缺失字段并输出统一形状的 run 视图。 |
| [parseSequenceState](../../../../../files/src/modules/harness/skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts:251–277 | 解析 sequence 状态记录，抽取根状态与已完成的 step 摘要。 |
