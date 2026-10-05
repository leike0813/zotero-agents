
# sendAction
<!-- node: function:src/workspaceApp.ts:sendAction -->

通过 postMessage 把用户动作与载荷回传给宿主窗口，是 workspace 页面唯一的出站通道。
类型：函数  
复杂度：中等  
入边数：3  
标签：ui、messaging、host-bridge、workspace  
所属文件：[src/workspaceApp.ts](../../../files/src/workspaceApp.ts.md)
源码：[src/workspaceApp.ts:107](../../../../../src/workspaceApp.ts#L107)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [renderDocsButton](../../../files/src/workspaceApp.ts.md) | src/workspaceApp.ts:210–228 | 渲染单个帮助文档入口按钮，绑定本地化 label 与宿主跳转动作。 |
| [renderHeader](renderHeader.md) | src/workspaceApp.ts:317–392 | 渲染 workspace 顶栏：品牌区、视图切换分段控件、主题切换与帮助入口，是页面 chrome 的主要构建点。 |
| [renderThemeSwitch](../../../files/src/workspaceApp.ts.md) | src/workspaceApp.ts:183–208 | 渲染 Dashboard/Synthesis 主题切换控件，并绑定切换后的宿主动作与主题缓存。 |

## 调用

该符号没有记录对外调用。
