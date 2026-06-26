# ACP 后端配置

## 什么是 ACP？

ACP（Agent Client Protocol）是一种用于与 Agent 后端通信的协议。Zotero Agents 通过 ACP 协议与本地运行的 Agent 进程（如 Codex、Claude Code、OpenCode 等）通信，实现对话和技能执行。

ACP 后端是**首推**的配置方式——只要本机安装了任意一款支持 ACP 协议的 Agent 工具，即可零额外配置直接使用。

## 为什么首选 ACP？

- **零配置负担**：无需额外部署服务，直接用本机已有的 Agent 工具
- **自动进程管理**：插件在配置中指定启动命令，自动管理 Agent 进程的生命周期
- **多 Agent 支持**：同时配置多个不同 Agent 后端，按需切换
- **配置隔离**：部分 Agent（如 OpenCode、Codex）支持通过环境变量隔离配置目录和 session 持久化目录

## 配置方法

1. 确保本机已安装至少一个支持 ACP 的 Agent CLI 工具
2. 打开 **工具 → [后端管理器](backend-manager)**
3. 切换到 **ACP** Tab
4. 点击 **从预设中添加** 选择你的 Agent 工具，或点击 **添加 ACP** 手动配置
5. 填写以下字段：
   - **显示名称**：一个友好的名称（如"我的 OpenCode"）
   - **命令**：启动 ACP 后端的命令（预设自动填充，也可手动修改）
   - **参数**：命令的附加参数（可选）
   - **环境变量**：额外的环境变量（可选，用于配置隔离等）
6. 点击右下角 **保存**

### 连接验证

保存后，插件会自动探测后端的能力：
- 检查命令是否存在
- 连接并初始化
- 获取可用的模型、模式列表
- 计算配置指纹以检测后续改动

如果探测失败，检查 Agent CLI 是否正确安装以及命令格式是否正确。

## 支持的 Agent 预设

插件提供了多个内建预设。点击 **从预设中添加** 后，在左侧选择 Agent 工具，右侧会显示启动选项和只读配置预览。

预设窗口中的 **用 npx 启动** 会把命令切换为 `npx <package>` 形式，并提示需要安装 Node.js 和 npm。Codex 和 Claude Code 默认启用 npx，因为它们依赖 ACP adapter；其它 Agent 默认使用裸命令。

**隔离环境** 仅对支持隔离的 Agent 可用。启用后，插件会在预览中加入隔离目录环境变量，并提示需要在该目录中自行管理 Agent 选项配置和鉴权。

| 预设 | 默认命令 | 说明 |
|------|------|------|
| **Codex** | `npx @zed-industries/codex-acp@latest` | OpenAI 官方 Coding Agent |
| **Claude Code** | `npx @agentclientprotocol/claude-agent-acp@latest` | Anthropic 官方 CLI |
| **OpenCode** | `opencode acp` | 通用 Agent 框架，支持环境变量隔离 |
| **Gemini CLI** | `gemini --experimental-acp` | Google Gemini |
| **Hermes** | `hermes acp` | Hermes Agent |
| **Qwen Code** | `qwen --acp --experimental-skills` | 通义千问 Code |

选择预设后仍可手动修改任何字段。

## 环境变量配置建议

部分 Agent 支持通过环境变量实现配置隔离和 session 持久化，在环境变量编辑器中添加即可：

| 环境变量 | Agent | 用途 |
|---------|-------|------|
| `OPENCODE_CONFIG` | OpenCode | 指定独立配置目录 |
| `CODEX_HOME` | Codex | 指定独立配置目录 |
| `CLAUDE_CONFIG_DIR` | Claude Code | 指定独立配置目录 |
| `GEMINI_CLI_HOME` | Gemini CLI | 指定独立配置目录 |
| `HERMES_HOME` | Hermes | 指定独立配置目录 |

## 请求类型

ACP 后端支持两种请求类型：
- `acp.prompt.v1` — 对话交互（ACP Chat）
- `acp.skill.run.v1` — 技能执行（ACP Skills）

同一个 ACP 后端可以同时用于对话和技能运行。

## 会话管理

- 每个后端可以有多个会话（conversations），会话持久化存储在插件数据库中
- 不同 ACP 后端可以同时运行，互不干扰
- 可在 [ACP Chat](../sidebar/acp-chat) 中管理会话

## 下一步

配置完成后，您可以：
- 在 [侧边栏 ACP Chat](../sidebar/acp-chat) 中与后端对话
- 在 [Dashboard](../dashboard) 中查看 ACP skill run
- 在 [Workflow 列表](../workflows/) 中使用 ACP 后端执行任务
