
# renderHeader
<!-- node: function:src/workspaceApp.ts:renderHeader -->

渲染 workspace 顶栏：品牌区、视图切换分段控件、主题切换与帮助入口，是页面 chrome 的主要构建点。
类型：函数  
复杂度：复杂  
入边数：1  
标签：ui、rendering、header、workspace  
所属文件：[src/workspaceApp.ts](../../../files/src/workspaceApp.ts.md)
源码：[src/workspaceApp.ts:317](../../../../../src/workspaceApp.ts#L317)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [render](../../../files/src/workspaceApp.ts.md) | src/workspaceApp.ts:467–482 | workspace 页面的顶层渲染入口，读取当前主题与快照后驱动各区域渲染。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [el](el.md) | src/workspaceApp.ts:123–136 | 创建带 class 与文本的 HTML 元素小工具，workspace 全部 DOM 构建的基础原语。 |
| [iconButton](../../../files/src/workspaceApp.ts.md) | src/workspaceApp.ts:156–171 | 构建带图标与无障碍标签的按钮节点，点击时向宿主派发动作。 |
| [renderDocsButton](../../../files/src/workspaceApp.ts.md) | src/workspaceApp.ts:210–228 | 渲染单个帮助文档入口按钮，绑定本地化 label 与宿主跳转动作。 |
| [renderThemeSwitch](../../../files/src/workspaceApp.ts.md) | src/workspaceApp.ts:183–208 | 渲染 Dashboard/Synthesis 主题切换控件，并绑定切换后的宿主动作与主题缓存。 |
| [sendAction](sendAction.md) | src/workspaceApp.ts:107–121 | 通过 postMessage 把用户动作与载荷回传给宿主窗口，是 workspace 页面唯一的出站通道。 |
