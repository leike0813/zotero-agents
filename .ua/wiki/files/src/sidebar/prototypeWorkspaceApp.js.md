
# src/sidebar/prototypeWorkspaceApp.js
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/sidebar](../../../modules/src/sidebar.md)
<!-- node: file:src/sidebar/prototypeWorkspaceApp.js -->

Harness 专用的原型工作台 shell：复用生产 shell 的子页面桥接与发布逻辑，把导航模型换成「Conversations / Skill Runs」双泳道加子标签切换，并渲染由生产样式表驱动的静态 mock 面板。
源码：[src/sidebar/prototypeWorkspaceApp.js](../../../../../src/sidebar/prototypeWorkspaceApp.js)

## 符号（16）
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:bootstrapPrototypeShell -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockBanner -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockContextDrawer -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockDetailsDrawer -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockHintSurface -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockPermissionOverlay -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockReplySurface -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockToolbar -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:mockTranscriptRow -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:newConversationItems -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:openMenu -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:renderLaneSwitcher -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:renderMockPane -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:renderSubTabs -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:resolveMockPermission -->
<!-- node: function:src/sidebar/prototypeWorkspaceApp.js:updatePaneVisibility -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bootstrapPrototypeShell | 函数 | 2580–2590 | 简单 | prototype、entry-point、shell | 0 | 原型 shell 的启动函数：安装子页面桥接、渲染初始泳道与面板并绑定导航事件。 |
| mockBanner | 函数 | 2063–2149 | 中等 | prototype、mock、banner | 0 | 构造 mock banner 区域，呈现等待用户、错误与提示三类横幅。 |
| mockContextDrawer | 函数 | 1767–1842 | 中等 | prototype、mock、drawer | 0 | 构造 mock context 抽屉，展示选中对象的上下文元数据。 |
| mockDetailsDrawer | 函数 | 1871–1920 | 中等 | prototype、mock、drawer | 0 | 构造 mock details 抽屉，展示结构化详情分区。 |
| mockHintSurface | 函数 | 2151–2236 | 中等 | prototype、mock、hint | 0 | 构造 mock hint 面板，呈现执行提示与下一步建议。 |
| mockPermissionOverlay | 函数 | 1922–1972 | 中等 | prototype、mock、permission | 0 | 构造 mock 权限覆盖层，验证授权对话框的布局与按钮层级。 |
| mockReplySurface | 函数 | 2299–2399 | 中等 | prototype、mock、reply | 0 | 构造 mock 回复面板，呈现输入区、附件与发送交互的视觉结构。 |
| mockToolbar | 函数 | 1995–2061 | 中等 | prototype、mock、toolbar | 0 | 构造 mock 工具栏区域，用于验证按钮、显示模式与区域折叠的视觉表现。 |
| mockTranscriptRow | 函数 | 1543–1683 | 复杂 | prototype、mock、transcript | 0 | 生成一条 mock transcript 行，复用生产 DOM 结构与类名以验证真实样式。 |
| newConversationItems | 函数 | 1332–1346 | 简单 | prototype、mock、navigation | 0 | 构造新建会话的可选来源列表，供原型导航演示。 |
| openMenu | 函数 | 1260–1328 | 中等 | prototype、menu、interaction | 0 | 在原型 shell 中打开工具栏菜单，处理外部点击关闭与定位。 |
| renderLaneSwitcher | 函数 | 1368–1410 | 中等 | prototype、navigation、rendering | 0 | 渲染顶部泳道切换条（Conversations / Skill Runs），切换泳道时重建子标签与面板。 |
| renderMockPane | 函数 | 2401–2440 | 简单 | prototype、rendering、mock | 0 | 按当前来源选择渲染对应的 mock 面板区域，是原型页面的渲染入口。 |
| renderSubTabs | 函数 | 1412–1459 | 中等 | prototype、navigation、rendering | 0 | 渲染泳道内的来源子标签行，处理需要注意的来源角标与选中态。 |
| resolveMockPermission | 函数 | 1508–1541 | 简单 | prototype、mock、permission | 0 | 按 mock 场景解析权限状态，驱动 overlay 的不同表现分支。 |
| updatePaneVisibility | 函数 | 1189–1219 | 简单 | prototype、visibility、navigation | 0 | 根据当前泳道与来源切换面板显隐，避免同屏出现两个内容区。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWireContract.ts](../shared/assistantWireContract.ts.md) | src/shared/assistantWireContract.ts | Assistant Workspace / SkillRunner 侧边栏的跨进程 wire 合约：快照 schema 版本、禁止上线的内部字段清单、publication envelope 与 transcript/delta/permission 键集合、消息类型与 shell/child 动作词表。 |
