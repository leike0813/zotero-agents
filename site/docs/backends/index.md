# 后端配置概览

Zotero Skills 支持三种后端类型，每种后端适用于不同的使用场景。

## 后端类型对比

| 类型 | 协议 | 执行方式 | 适用场景 |
|------|------|---------|---------|
| **ACP 后端** | Agent Client Protocol | 本地子进程 | ACP Chat 对话、ACP Skill 执行 |
| **Skill-Runner** | HTTP API | 本地或远程服务 | 技能和工作流执行 |
| **Generic HTTP** | HTTP | 远程服务 | 调用特定 HTTP API（如 MinerU） |

## 如何选择

- **需要使用 ACP Chat 对话功能？** → [配置 ACP 后端](./acp)
- **需要执行技能和工作流？** → [配置 Skill-Runner](./skill-runner)
- **只需要运行 MinerU 文档解析？** → [配置 Generic HTTP 后端](./generic-http)

所有后端均通过 **[工具 → 后端管理器](backend-manager)** 进行配置。

## 下一步

- [后端管理器使用说明](backend-manager)
- [ACP 后端配置](acp)
- [Skill-Runner 部署与配置](skill-runner)
- [Generic HTTP 后端配置](generic-http)
