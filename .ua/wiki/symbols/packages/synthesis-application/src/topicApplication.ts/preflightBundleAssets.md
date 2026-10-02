
# preflightBundleAssets
<!-- node: function:packages/synthesis-application/src/topicApplication.ts:preflightBundleAssets -->

对主题 bundle 声明的资产做无副作用预检：校验路径安全、文件存在与大小上限，产出可用与缺失清单。
类型：函数  
复杂度：复杂  
入边数：1  
标签：预检、资产校验、主题、有界  
所属文件：[packages/synthesis-application/src/topicApplication.ts](../../../../../files/packages/synthesis-application/src/topicApplication.ts.md)
源码：[packages/synthesis-application/src/topicApplication.ts:641](../../../../../../../packages/synthesis-application/src/topicApplication.ts#L641)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSynthesisTopicApplication](../../../../../files/packages/synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts:708–1108 | 主题应用工厂：提供主题列表、主题详情与就绪度读取命令，结合 bundle 资产预检结果与 resolver 状态产出投影与失败诊断。 |

## 调用

该符号没有记录对外调用。
