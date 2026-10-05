
# normalizeWithSchema
<!-- node: function:src/providers/registry.ts:normalizeWithSchema -->

按 provider 声明的运行时选项 schema 归一运行时选项：裁剪未知键、按类型强转、枚举越界回退默认值。
类型：函数  
复杂度：复杂  
入边数：1  
标签：normalization、schema、validation  
所属文件：[src/providers/registry.ts](../../../../files/src/providers/registry.ts.md)
源码：[src/providers/registry.ts:63](../../../../../../src/providers/registry.ts#L63)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [executeWithProvider](../../../../files/src/providers/registry.ts.md) | src/providers/registry.ts:155–221 | 经 provider 执行请求的主入口：完成 kind/backend/provider 三重契约校验、运行时选项归一、调用 execute 并归一执行结果。 |

## 调用

该符号没有记录对外调用。
