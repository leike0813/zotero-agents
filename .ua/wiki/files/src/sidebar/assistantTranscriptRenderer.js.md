
# src/sidebar/assistantTranscriptRenderer.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/assistantTranscriptRenderer.js -->

Transcript 区域的命令式渲染器：虚拟滚动窗口、分页缓存与 anchor 保持、工具调用活动分组、代码块装饰及底部粘滞逻辑都在此实现。
源码：[src/sidebar/assistantTranscriptRenderer.js](../../../../../src/sidebar/assistantTranscriptRenderer.js)

## 符号（29）
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:applyAssistantTranscriptEffects -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:applyAssistantTranscriptEffectsExact -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:buildTranscriptRenderItems -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:buildVirtualTranscriptDomDescriptors -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:buildVirtualTranscriptLoadingGap -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:buildVirtualTranscriptWindow -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:captureVirtualScrollAnchor -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:copyTextToClipboard -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:createToolActivityGroup -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:decorateMarkdownCodeBlocks -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:getVirtualTranscriptState -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:installAssistantTranscriptStickiness -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:installVirtualTranscriptScrollHandler -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:maybeRequestVirtualTranscriptPages -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:measureVirtualTranscriptRows -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:mergeVirtualTranscriptPage -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:normalizeVirtualTranscriptPage -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:reconcileVirtualTranscriptChildren -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:reconcileVirtualTranscriptPageRanges -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:renderAssistantTranscript -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:renderAssistantTranscriptItemIfChanged -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:requestVirtualTranscriptPage -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:resetAssistantTranscriptVirtualState -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:restoreVirtualScrollAnchor -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:scheduleVirtualTranscriptRender -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:shouldStickAssistantTranscript -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:stickAssistantTranscriptToBottom -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:transcriptItemSignature -->
<!-- node: function:src/sidebar/assistantTranscriptRenderer.js:trimVirtualTranscriptPages -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyAssistantTranscriptEffects | 函数 | 2491–2493 | 简单 | entry-point、transcript、dispatch、assistant-workspace | 1 | transcript 效果应用入口，按需走精确路径或宽松路径。 |
| [applyAssistantTranscriptEffectsExact](../../../symbols/src/sidebar/assistantTranscriptRenderer.js/applyAssistantTranscriptEffectsExact.md) | 函数 | 2361–2489 | 复杂 | incremental-update、delta、transcript、performance | 2 | 精确增量路径：只对 delta 涉及的条目做追加、更新与删除，并保持行身份稳定。 |
| buildTranscriptRenderItems | 函数 | 1698–1721 | 中等 | projection、grouping、transcript、tool-activity | 0 | 把 transcript 快照条目转为渲染项，连续的工具调用合并为活动分组。 |
| buildVirtualTranscriptDomDescriptors | 函数 | 1067–1119 | 中等 | virtual-scroll、dom、transcript、descriptor | 1 | 把虚拟窗口条目转换为 DOM 描述列表，附带行键、工具展示与权限展示元数据。 |
| buildVirtualTranscriptLoadingGap | 函数 | 518–602 | 中等 | virtual-scroll、loading-state、dom、transcript | 1 | 构造加载间隙占位 DOM：按分页请求状态放置 spinner 位置，支持 owner 作用域隔离。 |
| [buildVirtualTranscriptWindow](../../../symbols/src/sidebar/assistantTranscriptRenderer.js/buildVirtualTranscriptWindow.md) | 函数 | 733–894 | 复杂 | virtual-scroll、windowing、transcript、performance | 1 | 根据滚动位置计算当前应渲染的虚拟行窗口，输出可渲染的条目描述与边缘占位。 |
| captureVirtualScrollAnchor | 函数 | 637–657 | 简单 | virtual-scroll、anchor、transcript、scroll | 0 | 滚动时捕获锚点行及其偏移，作为分页插入后的定位基准。 |
| copyTextToClipboard | 函数 | 1291–1327 | 中等 | clipboard、sandbox、code-block、utility | 0 | 把代码块文本复制到剪贴板，兼容 Zotero 沙箱内的剪贴板 API 差异。 |
| createToolActivityGroup | 函数 | 1677–1696 | 简单 | grouping、tool-activity、transcript、projection | 1 | 把连续工具调用条目合并为一个活动分组，携带分组键与汇总状态。 |
| decorateMarkdownCodeBlocks | 函数 | 1329–1367 | 中等 | markdown、code-block、decoration、transcript | 0 | 为渲染出的 markdown 代码块追加语言标签与复制按钮。 |
| getVirtualTranscriptState | 函数 | 71–93 | 简单 | virtual-scroll、state、factory、transcript | 0 | 按容器惰性创建虚拟滚动状态对象，集中持有窗口、测量缓存与分页缓存。 |
| installAssistantTranscriptStickiness | 函数 | 1382–1436 | 中等 | scroll、stickiness、transcript、ux | 1 | 安装底部粘滞逻辑：仅在用户已贴近底部时保持跟随，避免打断向上翻阅。 |
| installVirtualTranscriptScrollHandler | 函数 | 1238–1259 | 简单 | event-handler、virtual-scroll、transcript、scroll | 0 | 安装滚动监听，驱动虚拟窗口重算与滚动锚点维护。 |
| maybeRequestVirtualTranscriptPages | 函数 | 930–958 | 中等 | pagination、virtual-scroll、throttle、transcript | 1 | 按可见窗口与边界余量决定是否发起分页请求，避免滚动抖动引发过量读取。 |
| measureVirtualTranscriptRows | 函数 | 1185–1217 | 中等 | measurement、virtual-scroll、performance、transcript | 0 | 批量测量已渲染行高并写回测量缓存，同时清理失效条目。 |
| mergeVirtualTranscriptPage | 函数 | 212–240 | 中等 | pagination、cache、transcript、merge | 1 | 把新读到的分页合并进缓存，重叠区间去重并保持序号单调。 |
| normalizeVirtualTranscriptPage | 函数 | 176–210 | 中等 | validation、pagination、transcript、normalization | 0 | 校验并归一化 transcript 分页结果：条目数组、序号范围与是否尾部。 |
| reconcileVirtualTranscriptChildren | 函数 | 1121–1171 | 中等 | dom-reconciliation、performance、transcript、virtual-scroll | 1 | 以键复用方式增量同步容器子节点，避免整列表重建。 |
| reconcileVirtualTranscriptPageRanges | 函数 | 261–322 | 中等 | pagination、cache-invalidation、transcript、reconciliation | 0 | 对齐分页区间，清除与当前 items 源不一致的过期页并统计缓存命中。 |
| [renderAssistantTranscript](../../../symbols/src/sidebar/assistantTranscriptRenderer.js/renderAssistantTranscript.md) | 函数 | 2495–2697 | 复杂 | entry-point、virtual-scroll、transcript、renderer、performance | 1 | Transcript 区域总渲染入口：装载容器、驱动虚拟窗口、处理滚动与粘滞，并保持与 chrome 完全解耦。 |
| renderAssistantTranscriptItemIfChanged | 函数 | 2168–2210 | 中等 | memoization、incremental-render、transcript、performance | 1 | 仅在签名变化时重建该行的 DOM，是 transcript-only 更新的关键门禁。 |
| requestVirtualTranscriptPage | 函数 | 901–928 | 中等 | pagination、async、transcript、deduplication | 0 | 发起单页 transcript 读取请求，进行 in-flight 去重与 owner 级请求键管理。 |
| resetAssistantTranscriptVirtualState | 函数 | 164–174 | 简单 | reset、virtual-scroll、transcript、lifecycle | 1 | 重置 transcript 虚拟状态缓存，用于 owner 切换等全量失效场景。 |
| restoreVirtualScrollAnchor | 函数 | 663–688 | 中等 | virtual-scroll、anchor、transcript、scroll | 0 | 分页或重排后按锚点恢复滚动位置，保证行身份不漂移。 |
| scheduleVirtualTranscriptRender | 函数 | 1219–1236 | 简单 | scheduling、performance、transcript、throttle | 1 | 用 animation frame 合并滚动引发的多次渲染请求，避免同帧重复布局。 |
| shouldStickAssistantTranscript | 函数 | 1438–1448 | 简单 | scroll、guard、transcript、ux | 0 | 判定当前是否允许把 transcript 粘到底部，综合用户滚动意图与流式状态。 |
| stickAssistantTranscriptToBottom | 函数 | 1450–1473 | 中等 | scroll、scheduling、transcript、ux | 0 | 在下一帧把 transcript 滚动到底部并复位粘滞状态。 |
| transcriptItemSignature | 函数 | 2125–2166 | 中等 | memoization、signature、transcript、performance | 1 | 计算单个 transcript 条目的稳定签名，用于跳过无变化的行渲染。 |
| trimVirtualTranscriptPages | 函数 | 357–380 | 中等 | cache、lru、transcript、eviction | 1 | 按 LRU 上限淘汰 cold full mirror 页，同时保证 pinned 的 live/prompting 页不被淘汰。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpToolCallDisplay.ts](../shared/acpToolCallDisplay.ts.md) | src/shared/acpToolCallDisplay.ts | ACP 工具调用的展示投影：把各后端异构的 tool call 载荷规整为统一的标题、状态、摘要与兼容性展示信息。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceAcpChild.js](assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyAssistantTranscriptEffects | 函数 | 2491–2493 | transcript 效果应用入口，按需走精确路径或宽松路径。 |
| [applyAssistantTranscriptEffectsExact](../../../symbols/src/sidebar/assistantTranscriptRenderer.js/applyAssistantTranscriptEffectsExact.md) | 函数 | 2361–2489 | 精确增量路径：只对 delta 涉及的条目做追加、更新与删除，并保持行身份稳定。 |
| buildTranscriptRenderItems | 函数 | 1698–1721 | 把 transcript 快照条目转为渲染项，连续的工具调用合并为活动分组。 |
| copyTextToClipboard | 函数 | 1291–1327 | 把代码块文本复制到剪贴板，兼容 Zotero 沙箱内的剪贴板 API 差异。 |
| decorateMarkdownCodeBlocks | 函数 | 1329–1367 | 为渲染出的 markdown 代码块追加语言标签与复制按钮。 |
| installAssistantTranscriptStickiness | 函数 | 1382–1436 | 安装底部粘滞逻辑：仅在用户已贴近底部时保持跟随，避免打断向上翻阅。 |
| [renderAssistantTranscript](../../../symbols/src/sidebar/assistantTranscriptRenderer.js/renderAssistantTranscript.md) | 函数 | 2495–2697 | Transcript 区域总渲染入口：装载容器、驱动虚拟窗口、处理滚动与粘滞，并保持与 chrome 完全解耦。 |
| renderAssistantTranscriptItemIfChanged | 函数 | 2168–2210 | 仅在签名变化时重建该行的 DOM，是 transcript-only 更新的关键门禁。 |
| shouldStickAssistantTranscript | 函数 | 1438–1448 | 判定当前是否允许把 transcript 粘到底部，综合用户滚动意图与流式状态。 |
| stickAssistantTranscriptToBottom | 函数 | 1450–1473 | 在下一帧把 transcript 滚动到底部并复位粘滞状态。 |
