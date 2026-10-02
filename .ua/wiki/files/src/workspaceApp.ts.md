
# src/workspaceApp.ts
所属分层：[页面与交互界面](../../layers/ui-surface.md)  
所属目录：[src](../../modules/src.md)
<!-- node: file:src/workspaceApp.ts -->

Assistant Workspace 页面入口，初始化侧边栏/工作区 UI 控制器并注册宿主交互与事件绑定。
源码：[src/workspaceApp.ts](../../../../src/workspaceApp.ts)

## 符号（13）
<!-- node: function:src/workspaceApp.ts:el -->
<!-- node: function:src/workspaceApp.ts:iconButton -->
<!-- node: function:src/workspaceApp.ts:normalizeWorkspaceLabels -->
<!-- node: function:src/workspaceApp.ts:render -->
<!-- node: function:src/workspaceApp.ts:renderDocsButton -->
<!-- node: function:src/workspaceApp.ts:renderHeader -->
<!-- node: function:src/workspaceApp.ts:renderThemeSwitch -->
<!-- node: function:src/workspaceApp.ts:renderWorkspacePanel -->
<!-- node: function:src/workspaceApp.ts:sendAction -->
<!-- node: function:src/workspaceApp.ts:updateWorkspaceLocalizedText -->
<!-- node: function:src/workspaceApp.ts:updateWorkspaceSidebarAttention -->
<!-- node: function:src/workspaceApp.ts:updateWorkspaceSidebarToggleState -->
<!-- node: function:src/workspaceApp.ts:updateWorkspaceVisibility -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [el](../../symbols/src/workspaceApp.ts/el.md) | 函数 | 123–136 | 简单 | ui、dom、utility、factory | 3 | 创建带 class 与文本的 HTML 元素小工具，workspace 全部 DOM 构建的基础原语。 |
| iconButton | 函数 | 156–171 | 中等 | ui、dom、button、accessibility | 1 | 构建带图标与无障碍标签的按钮节点，点击时向宿主派发动作。 |
| normalizeWorkspaceLabels | 函数 | 86–101 | 中等 | ui、normalization、localization、workspace | 0 | 把宿主下发的 label 文案对象规范化为完整的 WorkspaceShellLabels，缺项回退到默认英文。 |
| render | 函数 | 467–482 | 简单 | ui、entry-point、rendering、workspace | 0 | workspace 页面的顶层渲染入口，读取当前主题与快照后驱动各区域渲染。 |
| renderDocsButton | 函数 | 210–228 | 简单 | ui、documentation、rendering、localization | 1 | 渲染单个帮助文档入口按钮，绑定本地化 label 与宿主跳转动作。 |
| [renderHeader](../../symbols/src/workspaceApp.ts/renderHeader.md) | 函数 | 317–392 | 复杂 | ui、rendering、header、workspace | 1 | 渲染 workspace 顶栏：品牌区、视图切换分段控件、主题切换与帮助入口，是页面 chrome 的主要构建点。 |
| renderThemeSwitch | 函数 | 183–208 | 中等 | ui、theme、rendering、workspace | 1 | 渲染 Dashboard/Synthesis 主题切换控件，并绑定切换后的宿主动作与主题缓存。 |
| renderWorkspacePanel | 函数 | 394–430 | 中等 | ui、rendering、panel、workspace | 1 | 按选中视图渲染 workspace 主面板容器与占位区域，区分 dashboard 与 synthesis。 |
| [sendAction](../../symbols/src/workspaceApp.ts/sendAction.md) | 函数 | 107–121 | 中等 | ui、messaging、host-bridge、workspace | 3 | 通过 postMessage 把用户动作与载荷回传给宿主窗口，是 workspace 页面唯一的出站通道。 |
| updateWorkspaceLocalizedText | 函数 | 254–286 | 中等 | ui、localization、i18n、dom-update | 0 | 按当前语言批量刷新 workspace DOM 上的所有本地化文案节点，避免整体重建。 |
| updateWorkspaceSidebarAttention | 函数 | 288–300 | 简单 | ui、sidebar、attention、dom-update | 0 | 根据等待任务计数更新侧边栏的 attention 徽标与文案，是高频轻量更新路径。 |
| updateWorkspaceSidebarToggleState | 函数 | 302–315 | 简单 | ui、sidebar、state-sync、accessibility | 0 | 同步侧边栏展开/折叠状态与按钮 aria-pressed、class 等表现态。 |
| updateWorkspaceVisibility | 函数 | 432–465 | 中等 | ui、state-sync、visibility、rendering | 0 | 按快照切换 dashboard 与 synthesis 面板的可见性与激活 class，不重建 DOM。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [selectionContextSchema.ts](schemas/selectionContextSchema.ts.md) | src/schemas/selectionContextSchema.ts | Selection Context 的 JSON Schema 定义，约束 Broker 锁定选择上下文的数据结构。 |
