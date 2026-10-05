
# normalizeAutoApproveZoteroWrites
<!-- node: function:src/workflows/zoteroHostAccessOptions.ts:normalizeAutoApproveZoteroWrites -->

归一 autoApproveZoteroWrites 参数：仅接受布尔值，其它输入回退为 false。
类型：函数  
复杂度：简单  
入边数：2  
标签：normalization、security、options  
所属文件：[src/workflows/zoteroHostAccessOptions.ts](../../../../files/src/workflows/zoteroHostAccessOptions.ts.md)
源码：[src/workflows/zoteroHostAccessOptions.ts:33](../../../../../../src/workflows/zoteroHostAccessOptions.ts#L33)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [extractAutoApproveZoteroWrites](../../../../files/src/workflows/zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts:49–60 | 从工作流运行参数中提取并归一自动审批写入开关。 |
| [normalizeWorkflowRunOptions](../../../../files/src/workflows/zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts:79–98 | 归一整份工作流运行选项，剥离未知字段并保证 zoteroHostAccess 子结构形状合法。 |

## 调用

该符号没有记录对外调用。
