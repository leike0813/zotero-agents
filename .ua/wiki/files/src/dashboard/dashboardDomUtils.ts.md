
# src/dashboard/dashboardDomUtils.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/dashboardDomUtils.ts -->

Dashboard 页面侧的 DOM 与格式化工具集：时间/字节格式化、HTML 转义、状态与日志级别的 badge class 映射、toast 提示与剪贴板复制；刻意不含任何区域语义，由 panel model 组合成视图数据。
源码：[src/dashboard/dashboardDomUtils.ts](../../../../../src/dashboard/dashboardDomUtils.ts)

## 符号（8）
<!-- node: function:src/dashboard/dashboardDomUtils.ts:copyTextToClipboard -->
<!-- node: function:src/dashboard/dashboardDomUtils.ts:copyTextWithToastFeedback -->
<!-- node: function:src/dashboard/dashboardDomUtils.ts:dashboardStatusBadgeClass -->
<!-- node: function:src/dashboard/dashboardDomUtils.ts:dashboardStatusTone -->
<!-- node: function:src/dashboard/dashboardDomUtils.ts:escapeHtml -->
<!-- node: function:src/dashboard/dashboardDomUtils.ts:formatBytes -->
<!-- node: function:src/dashboard/dashboardDomUtils.ts:formatTime -->
<!-- node: function:src/dashboard/dashboardDomUtils.ts:showToast -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| copyTextToClipboard | 函数 | 193–216 | 中等 | clipboard、utility | 0 | 把文本写入剪贴板，优先使用 async Clipboard API，回退到 execCommand 路径。 |
| copyTextWithToastFeedback | 函数 | 218–227 | 简单 | clipboard、feedback | 0 | 复制文本并以 toast 反馈成功或失败，是页面所有复制按钮的统一出口。 |
| dashboardStatusBadgeClass | 函数 | 118–130 | 简单 | presentation、status-mapping | 0 | 由状态 token 与色调组合出最终的状态 badge class。 |
| dashboardStatusTone | 函数 | 78–114 | 中等 | presentation、status-mapping | 0 | 把状态 token 映射到语义色调（成功/告警/危险/中性），是状态 badge 样式的唯一判定源。 |
| escapeHtml | 函数 | 17–24 | 简单 | sanitization、utility | 0 | 转义 HTML 敏感字符，用于拼接 innerHTML 前的安全处理。 |
| formatBytes | 函数 | 26–40 | 简单 | formatting、utility | 0 | 把字节数格式化为人类可读的单位字符串，用于日志限额与 trace 体积展示。 |
| formatTime | 函数 | 5–15 | 简单 | formatting、utility | 0 | 格式化时间戳为本地化字符串，解析失败时原样返回，缺失时显示占位符。 |
| showToast | 函数 | 165–181 | 简单 | dom、feedback | 0 | 在 toast 宿主中显示一条短提示，自动回收并保留单例节点以避免堆积。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [dashboardPanelModel.ts](dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| copyTextToClipboard | 函数 | 193–216 | 把文本写入剪贴板，优先使用 async Clipboard API，回退到 execCommand 路径。 |
| copyTextWithToastFeedback | 函数 | 218–227 | 复制文本并以 toast 反馈成功或失败，是页面所有复制按钮的统一出口。 |
| dashboardStatusBadgeClass | 函数 | 118–130 | 由状态 token 与色调组合出最终的状态 badge class。 |
| dashboardStatusTone | 函数 | 78–114 | 把状态 token 映射到语义色调（成功/告警/危险/中性），是状态 badge 样式的唯一判定源。 |
| escapeHtml | 函数 | 17–24 | 转义 HTML 敏感字符，用于拼接 innerHTML 前的安全处理。 |
| formatBytes | 函数 | 26–40 | 把字节数格式化为人类可读的单位字符串，用于日志限额与 trace 体积展示。 |
| formatTime | 函数 | 5–15 | 格式化时间戳为本地化字符串，解析失败时原样返回，缺失时显示占位符。 |
| showToast | 函数 | 165–181 | 在 toast 宿主中显示一条短提示，自动回收并保留单例节点以避免堆积。 |
