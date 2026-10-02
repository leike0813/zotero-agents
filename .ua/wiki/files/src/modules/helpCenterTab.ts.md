
# src/modules/helpCenterTab.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/helpCenterTab.ts -->

帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。
源码：[src/modules/helpCenterTab.ts](../../../../../src/modules/helpCenterTab.ts)

## 符号（7）
<!-- node: function:src/modules/helpCenterTab.ts:createHelpCenterBrowser -->
<!-- node: function:src/modules/helpCenterTab.ts:installDirectHelpCenterBridge -->
<!-- node: function:src/modules/helpCenterTab.ts:installHelpCenterBridge -->
<!-- node: function:src/modules/helpCenterTab.ts:openHelpCenterTab -->
<!-- node: function:src/modules/helpCenterTab.ts:resolveHelpCenterPageUrl -->
<!-- node: function:src/modules/helpCenterTab.ts:scheduleHelpCenterBridge -->
<!-- node: function:src/modules/helpCenterTab.ts:writeHelpCenterBridgeTarget -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createHelpCenterBrowser | 函数 | 87–106 | 简单 | ui、xul-injection、help-center | 1 | 创建承载帮助页面的 XUL browser 元素并设置跨版本兼容的基础属性。 |
| installDirectHelpCenterBridge | 函数 | 158–174 | 简单 | bridge、host-communication、lifecycle | 1 | 在 frame 加载完成后立即尝试安装帮助中心 bridge，兼容同步可用的 frame 环境。 |
| installHelpCenterBridge | 函数 | 218–249 | 中等 | bridge、entry-point、lifecycle | 1 | 帮助中心 bridge 的统一安装入口，绑定 frame 加载事件并注册延迟重试定时器。 |
| openHelpCenterTab | 函数 | 251–308 | 中等 | entry-point、ui、tab、help-center | 0 | 在指定 Zotero 窗口中打开或复用帮助中心标签页，创建 browser 元素、加载页面并安装宿主 bridge。 |
| resolveHelpCenterPageUrl | 函数 | 69–85 | 简单 | url、help-center、utility | 0 | 把帮助中心的相对页面路径解析为基于插件根目录的绝对 URL。 |
| scheduleHelpCenterBridge | 函数 | 200–216 | 简单 | bridge、scheduling、lifecycle | 1 | 以延迟重试方式调度 bridge 安装，应对 frame 内容窗口尚未就绪的时序问题。 |
| writeHelpCenterBridgeTarget | 函数 | 141–156 | 简单 | bridge、host-communication、help-center | 0 | 把宿主能力对象写入页面内可访问的全局位置，供帮助页面调用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [docsUrl.ts](../utils/docsUrl.ts.md) | src/utils/docsUrl.ts | 帮助中心文档链接构造：按用户 locale 选择 GitHub Pages 或本地站点基址，处理 zh-CN 前缀拼接与 debug 模式下的本地回退。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [workspaceTab.ts](workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| openHelpCenterTab | 函数 | 251–308 | 在指定 Zotero 窗口中打开或复用帮助中心标签页，创建 browser 元素、加载页面并安装宿主 bridge。 |
