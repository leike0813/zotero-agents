# SkillRunner Tab

SkillRunner Tab 用于查看和交互通过 Skill-Runner 后端执行的运行。与 ACP Skills 面向一次性技能执行不同，SkillRunner Tab 更侧重于交互式会话的管理。

## 界面概览

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/sidebar/skillrunner-tab.webp" alt="SkillRunner 面板" title="SkillRunner 面板" loading="lazy" /><figcaption>SkillRunner 面板</figcaption></figure>

```
┌─────────────────────────────────────┐
│  Banner：标题 / requestId / 状态    │
├─────────────────────────────────────┤
│  ← 任务抽屉  │  主内容区   │  详情 → │
│               │  转写视图            │
│  Running      │  计划组件            │
│  └─ backend1  │  提示组件            │
│     └─ task A │  回复区              │
│  Completed    │                     │
│  └─ backend1  │                     │
│     └─ task B │                     │
└─────────────────────────────────────┘
```

## Banner

Banner 显示当前选中任务的信息：

- **标题**：任务的名称或 skill 标识
- **Request ID**：任务的唯一请求标识
- **Status**：运行状态（running / waiting_user / waiting_auth / completed / failed）
- **Backend**：后端信息
- **Engine**：使用的引擎（如 gemini、claude 等）
- **Model**：使用的模型
- **Updated**：最后更新时间
- **取消任务按钮**

## 任务抽屉（左侧）

左侧抽屉显示所有 SkillRunner 任务，分为 Running 和 Completed 两组。每个任务条目显示简要信息、状态指示和归档操作。点击条目切换到该任务的详情视图。

## 主内容区

### 转写视图

SkillRunner 的转写视图使用 **Thinking 聊天模型**，能够智能处理连续的推理过程：

- **thinking 块**：AI 的推理过程以独立的 thinking 块显示
- **工具调用**：显示工具名称、输入摘要和执行状态
- **消息**：助手和用户的对话消息
- **revision**：输出版本变更记录

同样支持 **Plain / Bubble** 两种显示模式。

### 认证工作流

SkillRunner Tab 支持认证工作流，可以在不离开面板的情况下完成后端认证：

**认证触发方式：**

- 执行需要认证的 skill 时自动触发
- 提示组件显示认证请求

**支持的认证方式：**

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| **OAuth 代理** | 通过浏览器完成 OAuth 流程 | 推荐方式，适用于支持 OAuth 的引擎 |
| **认证码输入** | 手动输入认证码或 URL | 引擎生成了认证链接时 |
| **文件导入** | 导入凭证文件 | 已有凭证文件时 |
| **内联 TUI** | 在面板中直接启动终端 | 需要交互式登录时 |

**认证流程示例（OAuth）：**

1. 运行检测到需要认证
2. 提示组件显示"需要认证"及可用认证方式
3. 用户选择 OAuth 代理
4. 浏览器打开 OAuth 页面
5. 用户完成认证
6. 运行自动恢复执行

### 提示组件

| 状态 | 显示内容 |
|------|---------|
| `waiting_user` | 等待用户输入，显示上下文说明和快速选项（如有） |
| `waiting_auth` | 等待认证，显示认证方式选择和输入 |
| `running` | 运行中进度指示 |
| `completed` | 完成状态确认 |
| `error` | 错误信息和排查建议 |

### 回复区

- **文本输入框**：输入回复内容
- **发送/取消按钮**

与 ACP Skills 不同，SkillRunner Tab 的回复区没有 mode/model/reasoning 选择器（这些在后端配置中设定）。

## 详情抽屉（右侧）

| 区域 | 内容 |
|------|------|
| **运行元数据** | 标题、requestId、taskKey、状态、terminal/waiting 标记 |
| **后端信息** | backend、engine、model |
| **更新时间** | 最后活跃时间 |
| **交互信息** | 当前等待的交互信息（如有） |
| **会话摘要** | 历史会话摘要 |
| **版本摘要** | 输出版本变更记录 |

## 相关配置

使用 SkillRunner Tab 前需要先配置 [Skill-Runner 后端](#doc/backends%2Fskill-runner)。
