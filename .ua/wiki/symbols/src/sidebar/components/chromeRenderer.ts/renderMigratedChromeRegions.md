
# renderMigratedChromeRegions
<!-- node: function:src/sidebar/components/chromeRenderer.ts:renderMigratedChromeRegions -->

chrome 迁移后的核心渲染：逐区域比较 signature，只对真正变化的区域发起 Preact 渲染。
类型：函数  
复杂度：复杂  
入边数：1  
标签：renderer、signature-memoization、coordinator、assistant-workspace、preact  
所属文件：[src/sidebar/components/chromeRenderer.ts](../../../../../files/src/sidebar/components/chromeRenderer.ts.md)
源码：[src/sidebar/components/chromeRenderer.ts:71](../../../../../../../src/sidebar/components/chromeRenderer.ts#L71)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createChromePanelRenderer](../../../../../files/src/sidebar/components/chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts:279–297 | 创建面板 chrome 渲染器实例，绑定区域元素、action 回调与托管挂载函数。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [renderTranscriptRegion](../../../../../files/src/sidebar/components/chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts:228–237 | 把 transcript 容器交给命令式渲染器，路径与 chrome 渲染完全分离。 |
| [contextDrawerEqualityInput](../../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:184–200 | 上下文抽屉比较输入：分组键、任务键与各任务动作，构成抽屉的唯一重渲染依据。 |
| [detailsDrawerEqualityInput](../../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:162–177 | 详情抽屉比较输入：区块标题、条目文本与开放状态。 |
| [messageCountsEqualityInput](../../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:77–92 | 构造消息计数区域的比较输入，只包含用户可见计数。 |
| [permissionDrawerEqualityInput](../../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:145–157 | 权限抽屉比较输入：只含待审批项的标识、选项与开放状态。 |
