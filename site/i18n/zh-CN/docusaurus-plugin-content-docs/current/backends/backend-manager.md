# 后端管理器

后端管理器是管理所有后端配置的统一对话页面。通过管理员可以添加、编辑、删除和验证后端连接。

## 打开方式

- **菜单**：**工具 → 后端管理器**

## 界面布局

```
┌─────────────────────────────────────────────────┐
│  后端管理器                          [取消] [保存] │
├─────────────────────────────────────────────────┤
│  [ACP] [SkillRunner] [Generic HTTP]              │
├─────────────────────────────────────────────────┤
│  ACP                                   [添加 ACP] │
│                                                 │
│  ┌─ 显示名称: [________]  ─┐                    │
│  │  命令:     [________]    │                    │
│  │  参数:     参数编辑器     │                    │
│  │  环境变量:  环境变量编辑器 │  [移除]           │
│  └──────────────────────────┘                    │
│                                                 │
│  ┌─ 显示名称: [________]  ─┐                    │
│  │  ...                     │  [移除]           │
│  └──────────────────────────┘                    │
└─────────────────────────────────────────────────┘
```

## 总体操作

### Tab 切换

对话顶部有三个 Tab：**ACP**、**SkillRunner**、**Generic HTTP**。点击 Tab 切换到对应类型的后端配置区。每个 Tab 下列出该类型的所有已配置后端。

### 添加后端

点击某个 Tab 下的 **添加** 按钮，在该类型下新增一个空白配置行。填写字段后点击右下角的 **保存** 生效。

### 编辑后端

直接在配置行中修改字段。未保存的修改不会生效。

### 删除后端

点击配置行内的 **移除** 按钮删除该后端。删除操作在保存后生效。

### 保存与取消

| 按钮 | 位置 | 作用 |
|------|------|------|
| **保存** | 对话框右下角 | 保存所有变更并关闭对话框 |
| **取消** | 对话框右下角（保存旁） | 放弃所有未保存的变更并关闭对话框 |

关闭对话框前如果有未保存的变更，会提示确认。

---

## ACP Tab

ACP 后端是本地运行的 Agent 子进程。配置中指定启动命令，插件负责管理进程的生命周期。

![ACP 后端配置页面](/img/docs/backends/backend-manager_ACP.png)

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| **显示名称** | 是 | 后端的显示名称，用于在 Dashboard 和侧边栏中标识此后端 |
| **命令** | 是 | 启动 ACP 后端的命令（如 `opencode acp`） |
| **参数** | 否 | 命令的附加参数，通过参数编辑器逐条添加 |
| **环境变量** | 否 | 额外的环境变量，通过环境变量编辑器逐条添加（键值对） |

### ACP 预设

ACP Tab 上方有一个 **从预设中添加** 按钮。点击后会打开预设配置窗口：左侧选择 Agent 工具，右侧显示启动选项、提示信息和只读配置预览。点击 **确认** 后，插件按预览内容添加一个普通 ACP 配置行；点击 **取消** 不会修改当前配置。

预设窗口提供两个选项：

- **用 npx 启动**：勾选后使用 `npx <package>` 形式启动，并显示"需要安装 Node.js 和 npm"的提示及 Node.js 官网链接。Codex 和 Claude Code 默认勾选，因为它们依赖 ACP adapter；其它 Agent 默认不勾选。启用 npx 后，Profile 显示名称会追加 `(npm)` 标识。
- **隔离环境**：仅对支持隔离的 Agent 可用。勾选后会在预览中加入对应环境变量或 session 目录参数，并提示需要在该隔离目录中自行管理 Agent 选项配置和鉴权。启用隔离后，Profile 显示名称会追加 `(Isolated)` 标识。

![ACP 预设对话框](/img/docs/backends/backend-manager_ACP-preset.png)

预览区只读，包含 Profile ID、显示名称、命令、参数、环境变量和 Agent Family。添加后的配置行仍可按普通 ACP 后端继续编辑。

内建预设的默认命令：

| 预设 | 默认命令 | 说明 |
|------|------|------|
| **OpenCode** | `opencode acp` | OpenCode ACP 后端，支持通过 `OPENCODE_CONFIG_DIR` 隔离配置目录 |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | 面向 OpenAI Codex 的 ACP adapter |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | 面向 Claude Code 的 ACP adapter |
| **Gemini CLI** | `gemini --experimental-acp` | Gemini CLI ACP 模式 |
| **Hermes** | `hermes acp` | Hermes Agent ACP 后端 |
| **Qwen Code** | `qwen --acp --experimental-skills` | Qwen Code ACP 模式 |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub Copilot CLI ACP 模式 |
| **Qoder CLI** | `qodercli --acp` | Qoder CLI ACP 模式，支持通过 `QODER_CONFIG_DIR` 隔离配置目录 |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor Agent ACP adapter，支持通过 `--session-dir` 隔离 session 目录 |
| **DeepAgents** | `deepagents-acp` | DeepAgents ACP adapter |
| **Auggie** | `auggie --acp` | Auggie ACP 模式 |
| **Kilo** | `kilo acp` | Kilo Code ACP 模式 |
| **Cline** | `cline --acp` | Cline ACP 模式 |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy ACP 模式 |
| **Grok** | `grok agent stdio` | Grok agent stdio 模式 |

仅OpenCode、Codex、Claude Code、Gemini CLI、Qwen Code和Hermes Agent经过测试，其余ACP后端的可用性取决于后端实现，本插件不做保证；若遇到问题可以自行调整命令参数及环境变量尝试，以ACP协议和后端官方文档为准。

选择预设后仍可手动修改任何字段。

### 操作按钮

| 按钮 | 作用 |
|------|------|
| **刷新运行时选项** | 重新探测此后端的模型列表、模式列表等运行时能力 |

### 参数编辑器

**添加参数**：点击添加按钮，输入参数内容。
**移除参数**：点击参数旁的移除按钮。

### 环境变量编辑器

**添加环境变量**：点击添加按钮，填写键（Key）和值（Value）。
**移除环境变量**：点击变量旁的移除按钮。

---

## SkillRunner Tab

SkillRunner 后端通过 HTTP API 与 Skill-Runner 服务通信，支持本地和远程两种部署模式。

![SkillRunner 后端配置页面](/img/docs/backends/backend-manager_skillrunner.png)

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| **显示名称** | 是 | 后端的显示名称 |
| **Base URL** | 是 | Skill-Runner 服务的地址（如 `http://127.0.0.1:29813`） |
| **认证方式** | 否 | 选择 `none`（无认证）或 `bearer`（Bearer Token 认证） |
| **认证令牌** | 否 | Bearer Token（仅当认证方式为 bearer 时填写） |
| **超时时间** | 否 | 请求超时时间（毫秒） |

### 操作按钮

| 按钮 | 作用 |
|------|------|
| **打开管理 UI** | 打开 Skill-Runner 内置的 Web 管理界面 |
| **刷新模型缓存** | 刷新此后端的模型列表缓存 |

---

## Generic HTTP Tab

Generic HTTP 后端用于向任意 HTTP 服务发送请求，主要用于调用外部 API（如 MinerU 文档解析服务）。

![Generic HTTP 后端配置页面](/img/docs/backends/backend-manager_generic-HTTP.png)

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| **显示名称** | 是 | 后端的显示名称 |
| **Base URL** | 是 | HTTP 服务的基础地址 |
| **认证方式** | 否 | 选择 `none` 或 `bearer` |
| **认证令牌** | 否 | Bearer Token（仅当认证方式为 bearer 时填写） |
| **超时时间** | 否 | 请求超时时间（毫秒） |

## 后端能力探测

保存后端后，插件会在后台自动探测后端能力：

- **ACP**：检测命令可用性、连接初始化、模型列表、模式列表，计算配置指纹以检测后续改动
- **SkillRunner**：检测 API 可用性、引擎列表、模型列表
- **Generic HTTP**：检测 HTTP 端点可达性

探测结果在 Dashboard 和侧边栏中以后端状态指示显示。

## 下一步

配置完成后，您可以：

- 在 [ACP Chat](../sidebar/acp-chat) 或 [ACP Skills](../sidebar/acp-skills) 中使用 ACP 后端
- 通过 [SkillRunner Tab](../sidebar/skillrunner-tab) 管理 SkillRunner 运行
- 在 [Workflow 列表](../workflows/) 和 [Dashboard](../dashboard) 中使用配置好的后端执行任务
