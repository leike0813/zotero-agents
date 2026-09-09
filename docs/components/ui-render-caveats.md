# UI 渲染与环境限制 (UI Rendering Caveats)

## Zotero 7 XUL 弹窗限制与原生控件失效问题

在为 Zotero 7 开发插件时，如果使用通过 `Window.openDialog` 或类似方法唤起内置 Web 窗口（通常是载入 `.html` 文件并使用 iframe/browser 承载），会遇到极具破坏性的**原生控件失效问题**。

### 问题现象

在插件触发的弹窗（如 Task Dashboard、Workflow Settings）中，如果使用原生的 HTML `<select>` 标签，绝大部分情况下点击该下拉框**没有任何响应**，无法弹出选项列表。

### 问题根因

这并非前端代码的事件冒泡（`event.stopPropagation`）被错误拦截所致。其根本原因在于 **Zotero 7 的安全模型和 XUL 窗口架构限制**：
1. 原生 `<select>` 的下拉弹窗（Popup）是由操作系统或浏览器底层直接绘制的置顶（Top-level）原生窗口，其 DOM 层级超越了当前的 iframe。
2. Zotero 7 限制了由插件生成的非信任层级对话框或特定类型 iframe (`type="content"`) 向外索要系统级 Popup 会话的权限。
3. 因此，底层渲染引擎直接吞掉了点击唤起原生下拉框的请求。

### 解决方案：使用纯 DOM 重写的 Custom Select 组件

为了绕过这一限制，在项目中我们**绝对禁止在任何弹窗面板中使用原生 `<select>` 标签**。
所有需要下拉选择的地方，都必须使用我们基于纯 HTML 节点和 CSS 模拟的 `custom-select` 组件。

**核心组件位置**：
- `addon/content/dashboard/custom-select.js`
- `addon/content/dashboard/custom-select.css`

**设计特点**：
- **完全基于 DOM 流**：生成的 `.custom-select-menu` 是一个绝对定位的 `div`，它完全挂载在当前页面的 DOM 树内，不诉求系统级 Popup。
- **防止文字截断撑破布局**：自带 `text-overflow: ellipsis`，能在超长选项文本时自动截断，不破坏页面整体的高度与宽度。
- **全局单例响应**：监听了 `document` 层级的 click，点击页面其他空白处会自动收起下拉框。

**使用规范**：
在任何新的前端 HTML 页面中，务必在 head/body 引入上述两个依赖文件，并在 JS 中调用顶层暴露的 `window.createCustomSelect(options, currentValue, onChange)` 进行渲染。
