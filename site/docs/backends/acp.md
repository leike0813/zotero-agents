# ACP 后端配置

## 什么是 ACP？

ACP（Agent Client Protocol）是一种用于与 Agent 后端通信的协议。Zotero Skills 通过 ACP 协议与本地运行的 Agent 进程通信，实现对话和技能执行。

ACP 后端是一个**本地子进程**——您在配置中指定一个命令，插件会自动启动并管理该进程。

## 配置方法

1. 打开 **工具 → [后端管理器](backend-manager)**
2. 切换到 **ACP** Tab
3. 点击 **添加 ACP**（或从 **Add from Preset** 下拉菜单选择预置）
4. 填写以下字段：
   - **显示名称**：一个友好的名称（如"我的 OpenCode"）
   - **命令**：启动 ACP 后端的命令（如 `npx opencode-ai@latest acp`）
   - **参数**：命令的附加参数（可选，通过参数编辑器添加）
   - **环境变量**：额外的环境变量（可选，通过环境变量编辑器添加）
5. 点击右下角 **保存**

### 连接验证

保存后，插件会自动探测后端的能力：

- 检查命令是否存在
- 连接并初始化
- 获取可用的模型、模式列表
- 计算配置指纹以检测后续改动

如果探测失败，检查命令是否正确安装以及命令格式是否正确。

## 内置预设

插件提供了 6 个内建预设，可以直接从 **Add from Preset** 下拉菜单选择：

| 预设 | 命令 | 说明 |
|------|------|------|
| **OpenCode** | `npx opencode-ai@latest acp` | 通用 Agent 框架 |
| **Codex** | `npx codex acp` | Coding agent |
| **Claude Code** | `npx @anthropic-ai/claude-code acp` | Anthropic 官方 CLI |
| **Gemini CLI** | `npx @google/gemini-cli acp` | Google Gemini |
| **Hermes** | `npx hermes acp` | Hermes Agent |
| **Qwen Code** | `qwen-code acp` | 通义千问 Code |

## 注意事项

- ACP 后端使用**本地子进程**方式运行，不需要填写 base URL
- 每个后端可以有多个会话（conversations），会话持久化存储在插件数据库中
- 不同 ACP 后端可以同时运行
- 后端支持两种请求类型：`acp.prompt.v1`（对话）和 `acp.skill.run.v1`（技能执行）

## 下一步

配置完成后，您可以：

- 在 [侧边栏 ACP Chat](../sidebar/acp-chat) 中与后端对话
- 在 [Dashboard](../dashboard) 中查看 ACP skill run
