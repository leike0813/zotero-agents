# Host Bridge 中文审阅镜像

生成时间：2026-07-23T04:32:15.624Z

本目录按发布面所有权保存中文译文；继承内容只在其所有者目录出现一次。有效组成由下表的继承链和文件数表达。

| 发布面 | 类型 | 继承链 | 自有文件 | 继承文件 | 有效文件 |
| --- | --- | --- | ---: | ---: | ---: |
| `zotero-bridge-cli` | `minimum-core` | `zotero-bridge-cli` | 9 | 0 | 9 |
| `zotero-library-agent` | `generic-agent` | `zotero-bridge-cli` → `zotero-library-agent` | 13 | 9 | 22 |
| `zotero-librarian` | `hosted-agent` | `zotero-bridge-cli` → `zotero-library-agent` → `zotero-librarian` | 6 | 22 | 28 |

## zotero-bridge-cli

- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/connection-and-context.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/connection-and-context.md): 连接、profile、服务身份、当前上下文与 Agent Surface 发现命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/diagnostics.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/diagnostics.md): 诊断、通知、backend 状态与底层能力调用命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/files-products-and-operations.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/files-products-and-operations.md): 文件传输、Product 读取下载及持久 operation receipt 命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library.md): Zotero 条目、笔记、批注、附件、搜索、分页与 readiness 读取命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation.md): 经 Zotero 端审批的条目、标签、collection、笔记与附件变更命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run.md): Zotero 托管 workflow run 的发现、输出、交互、权限与控制命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis.md): 主题、图、索引、resolver、artifact、attention 与派生维护命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow.md): Workflow 发现、合同校验、provider profile、提交及 Agent 自主 handoff 命令。
- [zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md](zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md): Zotero Bridge CLI 的最小完备操作合同，定义身份、调用、审批、handle、验证与安全恢复。

## zotero-library-agent

- [zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md](zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md): 跨查询、采集、分析、综合与整理任务的组合、workflow 所有权、证据交接与恢复模型。
- [zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md](zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md): 19 个正式非调试内建 workflow 的目的、选择、参数、provider 与结果证据目录。
- [zotero-library-agent/skills/zotero-library-agent/SKILL.md](zotero-library-agent/skills/zotero-library-agent/SKILL.md): 有界 Zotero 研究任务的路由、组合、权限、验证与统一结果合同。
- [zotero-library-agent/skills/zotero-library-curation/references/playbook.md](zotero-library-agent/skills/zotero-library-curation/references/playbook.md): 文献库变更分类、批次 proposal、破坏性审阅、文件/Product 与剩余 delta 恢复。
- [zotero-library-agent/skills/zotero-library-curation/SKILL.md](zotero-library-agent/skills/zotero-library-curation/SKILL.md): 对明确 Zotero 元数据、组织、笔记、文件或 readiness 变更进行提议、授权和实时验证。
- [zotero-library-agent/skills/zotero-library-query/references/playbook.md](zotero-library-agent/skills/zotero-library-query/references/playbook.md): 查询决策、身份与分页、附件字节、Synthesis 模型、证据交付与任务交接。
- [zotero-library-agent/skills/zotero-library-query/SKILL.md](zotero-library-agent/skills/zotero-library-query/SKILL.md): 针对当前 Zotero 文献库与派生状态回答有边界问题并返回可追溯证据。
- [zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md](zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md): 搜索计划、候选与重复项记录、获取 readiness、workflow 权限及批次部分结果恢复。
- [zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md](zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md): 把有边界文献需求转化为候选评估或经验证的 Zotero 获取结果。
- [zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md](zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md): 来源证据层级、分析交付模式、比较与矛盾处理、workflow artifact 与证据缺口。
- [zotero-library-agent/skills/zotero-literature-analysis/SKILL.md](zotero-library-agent/skills/zotero-literature-analysis/SKILL.md): 基于已验证 Zotero 来源生成有边界摘要、提取、比较或解释。
- [zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md](zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md): 派生模型选择、新鲜度、maintenance receipt、阶段生命周期与 export 证据。
- [zotero-library-agent/skills/zotero-research-synthesis/SKILL.md](zotero-library-agent/skills/zotero-research-synthesis/SKILL.md): 关联有界来源与派生研究结构，并验证 topic、graph、artifact、Product 或 export。

## zotero-librarian

- [zotero-librarian/README.md](zotero-librarian/README.md): Hermes Zotero Librarian facet 的安装、配置、运行入口与职责边界。
- [zotero-librarian/skills/zotero-librarian/references/automation-policy.md](zotero-librarian/skills/zotero-librarian/references/automation-policy.md): 常驻自动化的 provider、并发、调度、提交权限与交互处理策略。
- [zotero-librarian/skills/zotero-librarian/references/resident-operations.md](zotero-librarian/skills/zotero-librarian/references/resident-operations.md): 一遍式常驻服务命令、输入、输出 receipt 与操作完成条件。
- [zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md](zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md): 本地状态库、缓存新鲜度、原子性、handle 与不确定结果恢复合同。
- [zotero-librarian/skills/zotero-librarian/SKILL.md](zotero-librarian/skills/zotero-librarian/SKILL.md): 7×24 小时 Zotero 文献库监管、任务监控、维护与问答的常驻执行合同。
- [zotero-librarian/SOUL.md](zotero-librarian/SOUL.md): Hermes Zotero Librarian 的角色姿态、证据原则与协作风格。
