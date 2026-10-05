
# normalizeSkillRunnerModelForProvider
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:normalizeSkillRunnerModelForProvider -->

把任意模型输入归一为该 provider 作用域下的合法模型名，非法值回退默认模型。
类型：函数  
复杂度：复杂  
入边数：1  
标签：normalization、model-catalog、skillrunner  
所属文件：[src/providers/skillrunner/modelCatalog.ts](../../../../../files/src/providers/skillrunner/modelCatalog.ts.md)
源码：[src/providers/skillrunner/modelCatalog.ts:679](../../../../../../../src/providers/skillrunner/modelCatalog.ts#L679)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [normalizeSkillRunnerModel](../../../../../files/src/providers/skillrunner/modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts:721–744 | SkillRunner 模型规格归一入口，自动补全 provider 前缀并校验 effort 合法性。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [findModelEntry](../../../../../files/src/providers/skillrunner/modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts:455–471 | 在模型条目中定位与规格匹配的首个条目，未命中返回 undefined。 |
