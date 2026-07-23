# Host Bridge 中文审阅镜像

生成时间：2026-07-23T07:51:38.462Z

本目录按发布面所有权保存中文译文；继承内容只在其所有者目录出现一次。有效组成由下表的继承链和文件数表达。

| 发布面 | 类型 | 继承链 | 自有文件 | 继承文件 | 有效文件 |
| --- | --- | --- | ---: | ---: | ---: |
| `zotero-bridge-cli` | `minimum-core` | `zotero-bridge-cli` | 10 | 0 | 10 |
| `zotero-library-agent` | `generic-agent` | `zotero-bridge-cli` → `zotero-library-agent` | 13 | 10 | 23 |
| `zotero-librarian` | `hosted-agent` | `zotero-bridge-cli` → `zotero-library-agent` → `zotero-librarian` | 6 | 23 | 29 |

## zotero-bridge-cli

- [zotero-bridge-cli/skills/zotero-bridge-cli/references/command-catalog.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/command-catalog.md): 按自然语言意图导航全部规范命令，并将候选命令映射到唯一的详细参考分区。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/connection-and-context.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/connection-and-context.md): 连接、身份、能力发现和当前 Zotero 上下文命令的完整机器契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/diagnostics.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/diagnostics.md): 底层诊断、调试和 raw call 命令的适用边界与恢复信息。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/files-products-and-operations.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/files-products-and-operations.md): 文件传输、Product、artifact 与 operation 的身份、生命周期、验证和恢复契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library.md): 文献库条目、笔记、附件、annotation、readiness 与 snapshot 的读取命令契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation.md): Zotero 写入变更的预览、approval、执行、receipt 与验证命令契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run.md): Zotero 托管 run、Skill、permission、notification 和事件命令契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis.md): Synthesis topic、graph、index、resolver、artifact 与维护 operation 命令契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow.md): workflow 发现、校验、提交、Agent 自主 handoff 与 apply-back 命令契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md](zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md): 从用户操作意图到精确 CLI 调用、approval、typed handle、证据与安全恢复的最小完备合同。

## zotero-library-agent

- [zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md](zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md): 复杂研究请求的路由、跨任务组合、workflow 所有权、证据 handoff 和完整决策轨迹。
- [zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md](zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md): 全部内建非调试 workflow 的用途、调用方式、selection、provider、参数和结果证据目录。
- [zotero-library-agent/skills/zotero-library-agent/SKILL.md](zotero-library-agent/skills/zotero-library-agent/SKILL.md): 把自然语言研究目标路由为一个或多个有限任务，并返回统一的机器可验证结果。
- [zotero-library-agent/skills/zotero-library-curation/references/playbook.md](zotero-library-agent/skills/zotero-library-curation/references/playbook.md): 文献库整理、冲突、批量写入、文件与 Product 路径、部分结果及恢复的深入 playbook。
- [zotero-library-agent/skills/zotero-library-curation/SKILL.md](zotero-library-agent/skills/zotero-library-curation/SKILL.md): 从自然语言整理请求生成受证据和 approval 约束的 Zotero 变更并验证结果。
- [zotero-library-agent/skills/zotero-library-query/references/playbook.md](zotero-library-agent/skills/zotero-library-query/references/playbook.md): 上下文、分页、笔记、附件、readiness、Synthesis 查询和否定结论的深入 playbook。
- [zotero-library-agent/skills/zotero-library-query/SKILL.md](zotero-library-agent/skills/zotero-library-query/SKILL.md): 将自然语言问题转换为有边界的实时 Zotero 读取并给出来源支撑的答案。
- [zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md](zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md): 候选发现、来源评估、去重、ingest、附件、批次结果和恢复的深入 playbook。
- [zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md](zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md): 将收集文献的自然语言请求转换为可审阅、可追溯且受 approval 约束的 acquisition 任务。
- [zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md](zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md): 证据层级、提取、引文、比较、版本、OCR、workflow artifact 和缺口恢复的深入 playbook。
- [zotero-library-agent/skills/zotero-literature-analysis/SKILL.md](zotero-library-agent/skills/zotero-literature-analysis/SKILL.md): 根据请求的来源深度执行有边界文献分析，并返回可定位证据和明确限制。
- [zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md](zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md): 综合模型、claim matrix、证据覆盖、分歧、派生状态、维护和恢复的深入 playbook。
- [zotero-library-agent/skills/zotero-research-synthesis/SKILL.md](zotero-library-agent/skills/zotero-research-synthesis/SKILL.md): 将自然语言综合目标转换为有来源约束、可验证且区分派生状态的研究产物。

## zotero-librarian

- [zotero-librarian/README.md](zotero-librarian/README.md): Hermes 驻留文献库 facet 的安装、CLI 配置、服务入口、计划提交和 cron 边界。
- [zotero-librarian/skills/zotero-librarian/references/automation-policy.md](zotero-librarian/skills/zotero-librarian/references/automation-policy.md): 驻留自动化的授权矩阵、workflow 计划生命周期、并发、定时任务和人工升级策略。
- [zotero-librarian/skills/zotero-librarian/references/resident-operations.md](zotero-librarian/skills/zotero-librarian/references/resident-operations.md): 驻留服务每个子命令的输入、状态影响、receipt、端到端操作卡和失败恢复。
- [zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md](zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md): SQLite 状态所有权、不可变 workflow 计划、entry 状态机、新鲜度与不确定结果恢复。
- [zotero-librarian/skills/zotero-librarian/SKILL.md](zotero-librarian/skills/zotero-librarian/SKILL.md): 将自然语言监管请求路由为一次性驻留操作，并约束计划、提交、cron、receipt 和实时验证。
- [zotero-librarian/SOUL.md](zotero-librarian/SOUL.md): Hermes 文献馆员的表达姿态、证据纪律、权限意识和长期监管原则。
