# 后端配置概览

Zotero Agents 支持三种后端类型，每种后端适用于不同的使用场景。

## 如何选择

### 🥇 首选：ACP 后端

如果你的本机已经安装了任意一款支持 ACP 协议的 Agent 工具（Codex、Claude Code、OpenCode、Hermes Agent、OpenClaw、Qwen Code 等），直接使用 ACP 后端即可。**零额外配置负担**——只需在后端管理器中从预设列表选择对应的 Agent，插件自动管理进程生命周期。

部分 Agent（如 OpenCode、Codex）还支持通过环境变量隔离配置目录和 session 持久化目录，方便管理多个工作上下文。

→ [ACP 后端配置](./acp)

### 🥈 第二选择：Docker 部署 Skill-Runner

如果你需要**后台持续运行**的能力（Zotero 关闭后任务继续执行，下次启动时恢复或直接获取结果），或有局域网内自建服务器的条件，推荐使用 Docker 部署 Skill-Runner 作为常驻服务。

Docker 部署的 Skill Runner 独立于 Zotero 运行，支持多用户共享、Web 管理 UI、引擎管理等功能。

→ [Skill-Runner 部署与配置](./skill-runner)

### 🥉 仅应急：一键部署本地 Skill-Runner

仅适合**完全不了解如何安装配置 Agent 工具、也不会使用 Docker** 的用户。一键部署会随插件自动启停——关闭 Zotero 即终止所有任务，无法后台执行。如果你具备安装 Agent 或 Docker 的能力，请优先选择上述两种方案。

→ [Skill-Runner 部署与配置：托管本地模式](./skill-runner#托管本地模式推荐)

### Generic HTTP

用于调用特定 HTTP API（如 MinerU 文档解析服务），不涉及 AI 模型执行。按需配置即可。

→ [Generic HTTP 后端配置](./generic-http)

## 后端类型对比

| 类型 | 协议 | 执行方式 | 推荐度 | 适用场景 |
|------|------|---------|--------|---------|
| **ACP 后端** | Agent Client Protocol | 本地子进程 | 🥇 首选 | 本机有 ACP Agent 工具，零配置负担 |
| **Skill-Runner（Docker）** | HTTP API | 常驻服务 | 🥈 推荐 | 需要后台持续执行、局域网共享 |
| **Skill-Runner（一键部署）** | HTTP API | 随插件启停 | 🥉 应急 | 完全不会安装 Agent / Docker |
| **Generic HTTP** | HTTP | 远程服务 | 按需 | 调用特定 HTTP API（如 MinerU） |

所有后端均通过 **[工具 → 后端管理器](backend-manager)** 进行配置。

## 下一步

- [ACP 后端配置](acp)
- [Skill-Runner 部署与配置](skill-runner)
- [Generic HTTP 后端配置](generic-http)
- [后端管理器使用说明](backend-manager)
