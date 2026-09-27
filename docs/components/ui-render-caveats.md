# UI 渲染与环境限制 (UI Rendering Caveats)

## Zotero 弹窗中的原生控件失效问题

通过 `DialogHelper` / `window.openDialog` 唤起的插件弹窗（载入 `.html` 并以非 remote 的 `iframe type="content"` 承载），存在极具破坏性的**原生控件失效问题**。

### 问题现象

在这类弹窗（如 Workflow Settings 对话框、Backend Manager 对话框）中使用原生 HTML `<select>` 标签，绝大部分情况下点击下拉框**没有任何响应**，无法弹出选项列表。

### 问题根因

这并非前端代码的事件冒泡（`event.stopPropagation`）被错误拦截所致。其根本原因在于 **Zotero 的安全模型和 XUL 窗口架构限制**：

1. 原生 `<select>` 的下拉弹窗（Popup）是由操作系统或浏览器底层直接绘制的置顶（Top-level）原生窗口，其 DOM 层级超越了当前的 iframe。
2. Zotero 限制了由插件生成的非信任层级对话框或特定类型 iframe（非 remote 的 `type="content"`）向外索要系统级 Popup 会话的权限。
3. 因此，底层渲染引擎直接吞掉了点击唤起原生下拉框的请求。

### 禁令的适用范围

禁令**只适用于 DialogHelper/openDialog 弹窗 + 非 remote `iframe type="content"`** 这一类页面，目前即 Workflow Settings 对话框与 Backend Manager 对话框。

Zotero 主窗口 tab 与侧边栏的 `browser type="content"`（含 `remote="true"`）不受此限制，原生 `<select>` 在其中大量正常使用，例如 Dashboard 主页内联表单、Synthesis 的 RegistrySelect、侧边栏的 SelectControl。这些页面继续直接使用原生控件，不要为它们引入自定义下拉组件。

### 解决方案：使用纯 DOM 重写的 Custom Select 组件

在禁令范围内的弹窗页面中，**禁止使用原生 `<select>` 标签**。所有需要下拉选择的地方，必须使用基于纯 HTML 节点和 CSS 模拟的 Preact 受控组件。

**核心组件位置**：

- `src/shared/customSelect.tsx` — `CustomSelect`（单选）与 `CustomMultiSelect`（多选）
- `addon/content/components/custom-select.css` — `.custom-select*` class 契约的唯一样式事实源

**设计特点**：

- **完全基于 DOM 流**：生成的 `.custom-select-menu` 是一个绝对定位的 `div`，完全挂载在当前页面的 DOM 树内，不诉求系统级 Popup；空间不足时以 `.open-up` 向上翻转。
- **受控组件**：父级持有值，通过 `onChange` 接收变更；`CustomMultiSelect` 采用 apply-on-close 语义，菜单打开期间的勾选只改内部草稿，关闭菜单时才以新数组触发一次 `onChange`。
- **防止文字截断撑破布局**：自带 `text-overflow: ellipsis`，能在超长选项文本时自动截断，不破坏页面整体的高度与宽度。
- **实例级 outside-click**：菜单打开时才在 `document` 上挂监听、关闭时摘除；点击页面其他位置（包括另一个下拉）会自动收起当前菜单。

**使用规范**：

弹窗页面的 Region 组件直接 `import { CustomSelect, CustomMultiSelect } from "../../shared/customSelect"`（dashboard 页面的 import 边界允许 `src/shared/**`），并在页面 HTML 的 head 中以 `<link>` 引入 `../components/custom-select.css`。DOM class 契约（`.custom-select`、`.custom-select-trigger`、`.custom-select-menu`、`.custom-select-option` 等）由 CSS 文件与组件共同冻结，不得更改。
