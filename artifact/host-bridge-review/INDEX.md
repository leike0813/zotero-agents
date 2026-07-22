# Host Bridge 审阅镜像

> 生成时间：2026-07-22
> 本目录包含 Host Bridge 三个发布面的中文翻译镜像，供人工审阅。
> 每次执行 `/host-bridge-review-mirror` 会完全替换本目录内容。

---

## 发布面 1：CLI Wrapper（cli-wrapper）

Host Bridge CLI 包装器 Skill，定义了 `zotero-bridge` CLI 的命令入口、调用约定、输出契约和命令手册。

源目录：`skills_builtin/zotero-bridge-cli/`

| 文件 | 说明 |
|------|------|
| `SKILL.md` | Skill 主入口，运行时命令入口和 CLI 版本检查指引 |
| `references/agent-guidance.md` | Agent 调用指引，命令族选择和 MCP 使用说明 |
| `references/control-invariants.md` | 控制面不变量，approval/handle/retry 语义约束 |
| `references/host-bridge-cli.md` | 完整 capability 参考，含公开能力表和 CLI 映射 |
| `references/identity-and-connection.md` | CLI 身份识别和连接检查指引 |
| `references/invocation-and-json-input.md` | 调用约定和 JSON 输入格式说明 |
| `references/output-and-recovery.md` | 输出信封、错误处理和恢复策略 |
| `references/terminology.md` | 术语表 |
| `references/commands/connectivity-context.md` | 命令手册：连接性和上下文 |
| `references/commands/diagnostics.md` | 命令手册：诊断和调试 |
| `references/commands/library-items.md` | 命令手册：文献条目操作 |
| `references/commands/library-notes-attachments-readiness.md` | 命令手册：笔记、附件和就绪检查 |
| `references/commands/mutations-files-products.md` | 命令手册：变更、文件和产品 |
| `references/commands/synthesis-graph.md` | 命令手册：Synthesis 引用图谱 |
| `references/commands/synthesis-index-resolver-insights.md` | 命令手册：Synthesis 索引、解析器和洞察 |
| `references/commands/synthesis-topics-artifacts.md` | 命令手册：Synthesis 主题和产物 |
| `references/commands/workflows-and-runs.md` | 命令手册：workflow 和 run 控制 |

---

## 发布面 2：Library Agent（library-agent）

Zotero Library Agent 独立 Skill 包，定义了 Agent 如何通过 evidence-based 工作流操作 Zotero 文献库。

源目录：`skills_builtin/zotero-library-agent/`

| 文件 | 说明 |
|------|------|
| `README.md` | 包说明和安装指引 |
| `SKILL.md` | Skill 主入口，任务路由和执行策略 |
| `references/control-invariants.md` | 控制面不变量 |
| `references/evidence-handoff.md` | 证据交接契约，输入输出 schema |
| `references/helper-script-contract.md` | 辅助脚本 `zotero_library_agent.py` 的调用契约 |
| `references/host-bridge.md` | Host Bridge 能力参考 |
| `references/task-routing.md` | 任务路由指引，场景到命令的映射 |
| `references/terminology.md` | 术语表 |
| `references/workflow-execution.md` | workflow 执行策略和模式选择 |
| `references/journeys/agent-owned-handoff.md` | 旅程：Agent 自有交接执行 |
| `references/journeys/concrete-writeback.md` | 旅程：具体写回操作 |
| `references/journeys/current-context-and-library-read.md` | 旅程：当前上下文和文献库读取 |
| `references/journeys/host-owned-workflow.md` | 旅程：Host 自有 workflow 提交 |
| `references/journeys/notes-attachments-and-readiness.md` | 旅程：笔记、附件和就绪检查 |
| `references/journeys/products-and-files.md` | 旅程：产物和文件管理 |
| `references/journeys/research-lifecycle.md` | 旅程：研究生命周期 |
| `references/journeys/synthesis-research-context.md` | 旅程：Synthesis 研究上下文 |

---

## 发布面 3：Librarian Profile（librarian-profile）

Zotero Librarian Hermes Profile，定义了驻馆 Agent 的人格、技能、定时任务和服务脚本。

源目录：`profiles/hermes/zotero-librarian/`

| 文件 | 说明 |
|------|------|
| `README.md` | Profile 说明和安装方式 |
| `SOUL.md` | Agent 人格定义和操作姿态 |
| `skills/zotero-librarian/SKILL.md` | 主 Skill 入口，启动流程和工具选择 |
| `skills/zotero-librarian/references/common-tasks.md` | 常见任务指引 |
| `skills/zotero-librarian/references/control-invariants.md` | 控制面不变量 |
| `skills/zotero-librarian/references/host-bridge.md` | Host Bridge 能力参考（含 CLI 命令表和 workflow 目录） |
| `skills/zotero-librarian/references/library-maintenance.md` | 文献库维护指引 |
| `skills/zotero-librarian/references/maintenance-and-recovery.md` | 维护和故障恢复 |
| `skills/zotero-librarian/references/monitoring-and-notifications.md` | 监控和通知指引 |
| `skills/zotero-librarian/references/operating-principles.md` | 操作原则 |
| `skills/zotero-librarian/references/output-and-recovery.md` | 输出和恢复策略 |
| `skills/zotero-librarian/references/profile-script-contracts.md` | Profile 脚本调用契约 |
| `skills/zotero-librarian/references/resident-index.md` | 驻留本地索引使用指引 |
| `skills/zotero-librarian/references/scheduled-jobs.md` | 定时任务说明 |
| `skills/zotero-librarian/references/terminology.md` | 术语表 |
| `skills/zotero-librarian/references/workflow-execution-policy.md` | Workflow 执行策略 |
| `skills/zotero-librarian/references/workflows.md` | 内置 workflow 目录参考 |
| `skills/zotero-librarian/references/commands/connectivity-context.md` | 命令手册：连接性和上下文 |
| `skills/zotero-librarian/references/commands/diagnostics.md` | 命令手册：诊断和调试 |
| `skills/zotero-librarian/references/commands/library-items.md` | 命令手册：文献条目操作 |
| `skills/zotero-librarian/references/commands/library-notes-attachments-readiness.md` | 命令手册：笔记、附件和就绪检查 |
| `skills/zotero-librarian/references/commands/mutations-files-products.md` | 命令手册：变更、文件和产品 |
| `skills/zotero-librarian/references/commands/synthesis-graph.md` | 命令手册：Synthesis 引用图谱 |
| `skills/zotero-librarian/references/commands/synthesis-index-resolver-insights.md` | 命令手册：Synthesis 索引、解析器和洞察 |
| `skills/zotero-librarian/references/commands/synthesis-topics-artifacts.md` | 命令手册：Synthesis 主题和产物 |
| `skills/zotero-librarian/references/commands/workflows-and-runs.md` | 命令手册：workflow 和 run 控制 |
| `skills/zotero-workflow-agent-runner/SKILL.md` | Workflow Agent Runner Skill 入口 |
| `skills/zotero-workflow-agent-runner/references/agent-run-playbook.md` | Agent 自有执行 playbook |

---

## 统计

- **cli-wrapper**：17 个文件
- **library-agent**：17 个文件
- **librarian-profile**：28 个文件
- **合计**：62 个文件
