# ACP 后端配置

## 什么是 ACP？

ACP（Agent Client Protocol）是一种用于与 Agent 后端通信的协议。Zotero Agents 通过 ACP 协议与本地运行的 Agent 进程（如 Codex、Claude Code、OpenCode 等）通信，实现对话和技能执行。

ACP 后端是**首推**的配置方式——只要本机安装了任意一款支持 ACP 协议的 Agent 工具，即可零额外配置直接使用。

## 不熟悉 Agent？

如果您是第一次接触 Agent 工具，不知道如何选择与安装，可以访问以下网站获取指引与推荐：

**[Agent 使用指引](https://agent.ps5.online)**

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

预设窗口中的 **用 npx 启动** 会把命令切换为 `npx <package>` 形式，并提示需要安装 Node.js 和 npm。Codex、Claude Code、Factory Droid、Pi ACP 和 Amp ACP 默认启用 npx；其它预设默认使用已安装的命令。启用 npx 后，Profile 显示名称会追加 `(npm)` 标识。

不使用 npx 时，预设会启动其命名的可执行文件，该文件必须已安装（例如 `gemini`、`copilot`、`opencode` 或 `kimi`）。少数预设没有 npx 选项，始终使用已安装的命令：Hermes、原生 Cursor（`agent`）、Mistral Vibe、OpenHands、Goose、Junie、Kiro CLI 和 Oh My Pi。Pi ACP 与 Amp ACP 是 adapter，其底层的 Pi 和 Amp CLI 也需要安装并完成鉴权。Oh My Pi 基于 Bun。启用 npx 需要 Node.js 和 npm。

**隔离环境** 仅对支持隔离的 Agent 可用。启用后，插件会在预览中加入隔离目录环境变量或 session 目录参数，并提示需要在该目录中自行管理 Agent 选项配置和鉴权。启用隔离后，Profile 显示名称会追加 `(Isolated)` 标识。

![ACP 预设对话框](/img/docs/backends/backend-manager_ACP-preset.png)

<!-- prettier-ignore -->
| 预设 | 默认命令 | 说明 |
| --- | --- | --- |
| **OpenCode** | `opencode acp` | OpenCode ACP 后端；会注入 `OPENCODE_CONFIG_CONTENT` 以拒绝权限提问，并支持通过 `OPENCODE_CONFIG_DIR` 隔离配置目录 |
| **Codex** | `npx -y @agentclientprotocol/codex-acp@latest` | 面向 OpenAI Codex 的 ACP adapter |
| **Claude Code** | `npx -y @agentclientprotocol/claude-agent-acp@latest` | 面向 Claude Code 的 ACP adapter |
| **Gemini CLI** | `gemini --acp` | Gemini CLI ACP 模式 |
| **Hermes** | `hermes acp` | Hermes Agent ACP 后端 |
| **Qwen Code** | `qwen --acp` | Qwen Code ACP 模式；支持通过 `QWEN_HOME` 隔离配置目录 |
| **GitHub Copilot** | `copilot --acp --stdio` | GitHub Copilot CLI ACP 模式；支持通过 `COPILOT_HOME` 隔离配置目录 |
| **Qoder CLI** | `qoder --acp` | Qoder CLI ACP 模式，支持通过 `QODER_CONFIG_DIR` 隔离配置目录 |
| **Cursor Agent ACP** | `cursor-agent-acp` | Cursor Agent ACP adapter，支持通过 `--session-dir` 隔离 session 目录 |
| **DeepAgents** | `deepagents-acp` | DeepAgents ACP adapter |
| **Auggie** | `auggie --acp` | Auggie ACP 模式 |
| **Kilo** | `kilo acp` | Kilo Code ACP 模式；会注入 `KILO_CONFIG_CONTENT` 以拒绝权限提问，且已实测核心 XDG 路径可隔离 config、data/session/auth/log 和 cache 状态 |
| **Cline** | `cline --acp` | Cline ACP 模式；支持通过 `CLINE_DIR` 隔离配置目录 |
| **CodeBuddy** | `codebuddy --acp` | CodeBuddy ACP 模式；支持通过 `CODEBUDDY_CONFIG_DIR` 隔离配置目录 |
| **Grok** | `grok agent stdio` | Grok agent stdio 模式；支持通过 `GROK_HOME` 隔离 home/config 目录 |
| **Cursor** | `agent acp` | 原生 Cursor ACP 入口，与 Cursor Agent ACP adapter 相互独立；支持通过 `CURSOR_CONFIG_DIR` 隔离配置目录 |
| **Kimi Code** | `kimi acp` | Kimi Code ACP 模式；支持通过 `KIMI_CODE_HOME` 隔离配置目录 |
| **MiniMax Code** | `mcode acp` | MiniMax Code ACP 模式；启用 npx 时会显式选择 `@minimax-ai/code` 中的 `mcode` 可执行入口，隔离使用 `MINIMAX_DATA_DIR` |
| **Mistral Vibe** | `vibe-acp` | Mistral Vibe ACP 模式；支持通过 `VIBE_HOME` 隔离 home/config 目录 |
| **OpenHands** | `openhands acp` | OpenHands ACP 模式；隔离会分别设置持久化根目录和会话存储（`OPENHANDS_PERSISTENCE_DIR` 与 `OPENHANDS_CONVERSATIONS_DIR`） |
| **DeepSeek Harness** | `dsh --profile acp` | DeepSeek Harness ACP 模式；支持通过 `DSH_HOME` 隔离 home/config 目录 |
| **Factory Droid** | `npx -y droid@latest exec --output-format acp-daemon` | Factory Droid ACP 守护模式；通过 `DROID_DISABLE_AUTO_UPDATE` 和 `FACTORY_DROID_AUTO_UPDATE_ENABLED` 关闭 Droid 自动更新 |
| **Goose** | `goose acp` | Goose ACP 模式；支持通过 `GOOSE_PATH_ROOT` 隔离路径根目录 |
| **Junie** | `junie --acp=true` | Junie ACP 模式；支持通过 `JUNIE_HOME` 隔离 home/config 目录 |
| **Kiro CLI** | `kiro-cli acp` | Kiro CLI ACP 模式 |
| **Pi ACP** | `npx -y pi-acp@latest` | Pi ACP adapter；需要 Pi coding agent CLI，并支持通过 `PI_CODING_AGENT_DIR` 隔离配置目录 |
| **Amp ACP** | `npx -y amp-acp@latest` | Amp ACP adapter；需要 Amp CLI，隔离仅通过 `AMP_ACP_STATE_DIR` 迁移 adapter 的 thread/session 状态 |
| **Oh My Pi** | `omp acp` | Oh My Pi ACP 模式；需要 Bun，且仅提供已安装命令入口 |

仅OpenCode、Codex、Claude Code、Gemini CLI、Qwen Code和Hermes Agent经过测试，其余ACP后端的可用性取决于后端实现，本插件不做保证；若遇到问题可以自行调整命令参数及环境变量尝试，以ACP协议和后端官方文档为准。

选择预设后仍可手动修改任何字段。

## 环境变量配置建议

部分 Agent 支持通过环境变量或命令参数实现配置隔离和 session 持久化。启用预设的 **隔离环境** 后，插件会自动注入对应设置；手动配置 Profile 时，可以自行添加：

隔离只迁移已声明的文件系统根目录。Amp ACP 的隔离仅覆盖 adapter 的 thread/session 状态，Amp 配置与凭据仍需独立配置。原生 Cursor 的隔离覆盖 Cursor 配置目录，与 `cursor-agent-acp` adapter 的 session 目录相互独立。Copilot 自身的缓存和 Goose 的 keyring 仍位于注入路径之外。

OpenCode 与 Kilo 预设还会始终注入内联权限配置：分别使用 `OPENCODE_CONFIG_CONTENT` 与 `KILO_CONFIG_CONTENT`，值均为 `{"permission":{"question":"deny"}}`。添加预设后，仍可自行编辑或删除这些值。

<!-- prettier-ignore -->
| 设置 | Agent | 用途 |
| --- | --- | --- |
| `OPENCODE_CONFIG_DIR` | OpenCode | 指定独立配置目录 |
| `CODEX_HOME` | Codex | 指定独立 home/config 目录 |
| `CLAUDE_CONFIG_DIR` | Claude Code | 指定独立配置目录 |
| `GEMINI_CLI_HOME` | Gemini CLI | 指定独立配置目录 |
| `HERMES_HOME` | Hermes Agent | 指定独立 home/config 目录 |
| `QODER_CONFIG_DIR` | Qoder CLI | 指定独立配置目录 |
| `QWEN_HOME` | Qwen Code | 指定独立 home/config 目录 |
| `COPILOT_HOME` | GitHub Copilot | 指定独立配置目录；Copilot 自身的缓存仍位于该路径之外 |
| `CLINE_DIR` | Cline | 指定独立配置目录 |
| `CODEBUDDY_CONFIG_DIR` | CodeBuddy | 指定独立配置目录 |
| `GROK_HOME` | Grok | 指定独立 home/config 目录 |
| `CURSOR_CONFIG_DIR` | Cursor（原生 ACP） | 指定独立配置目录 |
| `KIMI_CODE_HOME` | Kimi Code | 指定独立 home/config 目录 |
| `MINIMAX_DATA_DIR` | MiniMax Code | 指定独立数据目录 |
| `VIBE_HOME` | Mistral Vibe | 指定独立 home/config 目录 |
| `OPENHANDS_PERSISTENCE_DIR`、`OPENHANDS_CONVERSATIONS_DIR` | OpenHands | 分别指定独立持久化根目录及其会话存储（`<root>/conversations`） |
| `DSH_HOME` | DeepSeek Harness | 指定独立 home/config 目录 |
| `GOOSE_PATH_ROOT` | Goose | 指定独立路径根目录；Goose 的 keyring 仍位于该路径之外 |
| `JUNIE_HOME` | Junie | 指定独立 home/config 目录 |
| `PI_CODING_AGENT_DIR` | Pi ACP | 指定 Pi coding agent 的独立配置目录 |
| `AMP_ACP_STATE_DIR` | Amp ACP | 仅迁移 adapter 的 thread/session 状态；Amp 配置与凭据仍需独立配置 |
| `--session-dir <path>` | Cursor Agent ACP | 指定独立 session 持久化目录 |
| `XDG_CONFIG_HOME`、`XDG_DATA_HOME`、`XDG_CACHE_HOME` | Kilo | 分别指定独立的 XDG 配置、数据/session/auth/log 和缓存根目录。该结论覆盖已实测的核心状态路径，但不等于证明所有 Kilo 子命令或插件都不会访问全局目录。 |

## 免费模型方案

部分引擎提供 **免费模型访问** — 适合无需任何付费即可开始：

| 引擎                      | 免费方案            | 说明                                                                                                                                       |
| ------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kilo Code**             | Auto Free 模式      | Kilo Code 内置 Auto Free 模式，自动将每个请求路由到合适的免费模型。在 Kilo Code 设置中启用即可 — 无需 API key                              |
| **OpenCode Zen**          | 内置免费模型        | [OpenCode Zen](https://opencode.ai/zen) 版本内置免费模型，无需 API 订阅                                                                    |
| **OpenCode + OpenRouter** | OpenRouter 免费模型 | 配置 OpenCode 使用 [OpenRouter](https://openrouter.ai/) 并选择免费层模型（如 Gemini 2.5 Flash、DeepSeek V3）。需要免费注册 OpenRouter 账号 |

### 免费方案的局限性

免费模型对于日常使用足够，但请注意以下限制：

| 限制                | 说明                                                                               |
| ------------------- | ---------------------------------------------------------------------------------- |
| **速率限制**        | 请求可能被限流 — 通常每分钟 5–20 次请求，取决于提供商负载。批量处理会明显变慢      |
| **并发限制**        | 通常限制为单个并发请求。同时运行多个工作流可能排队或失败                           |
| **模型可用性**      | 免费模型池在高峰期可能耗尽。可能遇到"模型不可用"或"容量已满"的错误                 |
| **模型轮换**        | 提供商可能不提前通知就更换免费模型（升级或降级）。不同运行之间输出质量可能有所波动 |
| **无 SLA / 可靠性** | 免费层不提供服务可用性保证。服务可能临时不可用或停止提供                           |

> 如果需要可靠的批量处理或正式使用，建议考虑付费方案如 [OpenCode Go](https://opencode.ai/go?ref=SZDFT9GZKW)（$10/月）或 Coding Plan（百炼、智谱等）。单篇论文的成本与节省的时间相比微不足道。

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
