
# validateProviderOptionsForBackend
<!-- node: function:src/providers/profile.ts:validateProviderOptionsForBackend -->

按后端对应的 provider 运行时选项 schema 校验选项集合，类型不符或枚举越界时报出 ProviderProfileError。
类型：函数  
复杂度：复杂  
入边数：1  
标签：validation、provider、schema  
所属文件：[src/providers/profile.ts](../../../../files/src/providers/profile.ts.md)
源码：[src/providers/profile.ts:409](../../../../../../src/providers/profile.ts#L409)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validateProviderProfile](../../../../files/src/providers/profile.ts.md) | src/providers/profile.ts:537–653 | 校验完整 provider profile：schema 版本、后端存在性、选项安全性与逐项 schema 合法性。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [assertOptionType](../../../../files/src/providers/profile.ts.md) | src/providers/profile.ts:395–407 | 按选项声明的标称类型校验单个运行时选项值，类型不符时抛出带路径上下文的校验错误。 |
