
# completeCandidate
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:completeCandidate -->

组装完整的主题候选视图：合并定义、resolver 结果、引用 artifact 列表与资产清单，标记缺失的依赖。
类型：函数  
复杂度：复杂  
入边数：1  
标签：主题、候选、组装、依赖  
所属文件：[packages/synthesis-application/src/topicApplication.ts](../../../../../files/packages/synthesis-application/src/topicApplication.ts.md)
源码：[packages/synthesis-application/src/topicApplication.ts:514](../../../../../../../packages/synthesis-application/src/topicApplication.ts#L514)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSynthesisTopicApplication](../../../../../files/packages/synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts:708–1108 | 主题应用工厂：提供主题列表、主题详情与就绪度读取命令，结合 bundle 资产预检结果与 resolver 状态产出投影与失败诊断。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [topicReadinessView](../../../../../files/packages/synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts:219–260 | 计算主题就绪度视图：聚合来源材料百分比、resolver 状态与资产缺失情况，给出可应用或需刷新的结论。 |
