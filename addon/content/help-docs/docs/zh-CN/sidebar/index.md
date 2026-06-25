# 侧边栏概览

## 什么是侧边栏？

侧边栏是 Zotero Agents 提供的便捷操作面板，悬浮在 Zotero 主窗口右侧。它允许您在不离开当前工作上下文的情况下与后端交互，查看运行状态，管理技能执行。

## 打开方式

- **工具栏按钮**：点击 Zotero 工具栏中的侧边栏切换按钮
- **菜单**：**工具 → 打开侧边栏**
- **Dashboard 操作**：在 Dashboard 中点击"打开/关闭侧边栏"

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_sidebar.webp" alt="侧边栏工具栏按钮" title="侧边栏工具栏按钮" loading="lazy" /><figcaption>侧边栏工具栏按钮</figcaption></figure>

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_sidebar_glow.webp" alt="侧边栏待回复提示状态" title="侧边栏待回复提示状态" loading="lazy" /><figcaption>侧边栏待回复提示状态</figcaption></figure>

## 架构说明

侧边栏采用 **iframe 架构**：三个 Tab 各自加载独立的 HTML 页面作为子 iframe，通过 postMessage 与插件主进程通信。这种设计确保 Tab 之间互不干扰，每个面板有独立的渲染上下文。

在工作台（Workspace）模式下，三个 Tab 集成在统一的容器中；在旧版模式下，各面板也可以直接嵌入到 Zotero 的库面板和阅读器面板中。

## 三个 Tab

| Tab | 功能 | 适用场景 |
|-----|------|---------|
| **ACP Chat** | 与 ACP 后端进行对话，以当前条目为上下文 | 阅读文献时提问、辅助写作 |
| **ACP Skills** | 监控和管理 ACP 后端执行的技能运行 | 查看运行进度、检查结果、处理权限请求 |
| **SkillRunner** | 查看和交互 SkillRunner 后端的运行 | 管理交互式运行、处理认证 |

## 界面说明

### Tab 切换

侧边栏顶部是 Tab 栏，点击即可在三个面板间切换。切换后上一个 Tab 的状态会被保留。

### 宽度调整

侧边栏宽度可以通过拖动左边框自由调整，满足不同内容的显示需求。

### 通用组件

所有 Tab 共享以下通用 UI 组件：

- **Banner**：顶部信息栏，显示当前选中的项目信息和操作按钮
- **转写视图**：对话或运行记录的主体区域，支持 Plain/Bubble 两种显示模式
- **回复区**：底部的输入区域，用于发送消息或回复
- **抽屉面板**：左右两侧可展开的详细信息面板
- **提示组件**：在需要用户交互时显示的提示信息
- **计划组件**：多步骤计划的可视化进度

## 各 Tab 快速入口

- [ACP Chat 使用](#doc/sidebar%2Facp-chat) — 与后端的对话交互
- [ACP Skills](#doc/sidebar%2Facp-skills) — 管理 ACP 技能运行
- [SkillRunner Tab](#doc/sidebar%2Fskillrunner-tab) — 管理 SkillRunner 运行

## 相关页面

- [Dashboard 介绍](#doc/dashboard) — 中央监控和任务管理
