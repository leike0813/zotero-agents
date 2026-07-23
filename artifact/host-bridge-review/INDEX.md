# Host Bridge 中文审阅镜像

生成时间：2026-07-23T03:01:11.394Z

本目录按发布面所有权保存中文译文；继承内容只在其所有者目录出现一次。有效组成由下表的继承链和文件数表达。

| 发布面 | 类型 | 继承链 | 自有文件 | 继承文件 | 有效文件 |
| --- | --- | --- | ---: | ---: | ---: |
| `zotero-bridge-cli` | `minimum-core` | `zotero-bridge-cli` | 2 | 0 | 2 |
| `zotero-library-agent` | `generic-agent` | `zotero-bridge-cli` → `zotero-library-agent` | 12 | 2 | 14 |
| `zotero-librarian` | `hosted-agent` | `zotero-bridge-cli` → `zotero-library-agent` → `zotero-librarian` | 6 | 14 | 20 |

## zotero-bridge-cli

- [zotero-bridge-cli/skills/zotero-bridge-cli/references/command-reference.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/command-reference.md): 源码生成的完整 CLI 命令清单，逐命令列明 argv、schema、分页、effect、approval、handle、恢复与目标。
- [zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md](zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md): Zotero Bridge CLI 的最小完备执行合同，覆盖身份、连接、调用、文件、工作流、Synthesis 与安全恢复。

## zotero-library-agent

- [zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md](zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md): 五类研究任务的路由、组合、两种工作流所有权、Agent handoff、证据与多阶段恢复模型。
- [zotero-library-agent/skills/zotero-library-agent/SKILL.md](zotero-library-agent/skills/zotero-library-agent/SKILL.md): 有边界 Zotero 研究任务的总协调合同，负责路由、跨阶段证据、权限与恢复。
- [zotero-library-agent/skills/zotero-library-curation/references/playbook.md](zotero-library-agent/skills/zotero-library-curation/references/playbook.md): 策展变更分类、proposal、文件回写、Product、验证及部分结果的完整操作手册。
- [zotero-library-agent/skills/zotero-library-curation/SKILL.md](zotero-library-agent/skills/zotero-library-curation/SKILL.md): 规划、批准、执行并实时验证有边界 Zotero 文献库变更的完备合同。
- [zotero-library-agent/skills/zotero-library-query/references/playbook.md](zotero-library-agent/skills/zotero-library-query/references/playbook.md): 上下文身份、发现分页、笔记附件、readiness、Synthesis 与答案证据的查询手册。
- [zotero-library-agent/skills/zotero-library-query/SKILL.md](zotero-library-agent/skills/zotero-library-query/SKILL.md): 依据当前 Zotero 状态回答有边界且有来源依据问题的完备查询合同。
- [zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md](zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md): 搜索边界、候选 provenance、重复身份、获取 readiness、工作流权限与部分恢复手册。
- [zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md](zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md): 发现、评估并经批准获取 Zotero 文献的完备任务合同。
- [zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md](zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md): 来源证据层级、分析流程、工作流产物、交付物与混合可用性恢复手册。
- [zotero-library-agent/skills/zotero-literature-analysis/SKILL.md](zotero-library-agent/skills/zotero-literature-analysis/SKILL.md): 基于已验证 Zotero 来源执行摘要、提取、比较与解释的完备分析合同。
- [zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md](zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md): 综合模型、新鲜度、工作流维护边界、有序研究生命周期与恢复手册。
- [zotero-library-agent/skills/zotero-research-synthesis/SKILL.md](zotero-library-agent/skills/zotero-research-synthesis/SKILL.md): 围绕问题、topic、graph、gap 或 export 生成可追溯综合的完备任务合同。

## zotero-librarian

- [zotero-librarian/README.md](zotero-librarian/README.md): Hermes 托管发布面的安装、常驻模型、权限边界及文档入口。
- [zotero-librarian/skills/zotero-librarian/references/automation-policy.md](zotero-librarian/skills/zotero-librarian/references/automation-policy.md): 常驻自动化的权限矩阵、工作流所有权、提交、并发、cron、维护与交互政策。
- [zotero-librarian/skills/zotero-librarian/references/resident-operations.md](zotero-librarian/skills/zotero-librarian/references/resident-operations.md): 全部常驻服务命令、receipt、索引问答、run、通知、定时 pass 与失败语义。
- [zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md](zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md): 常驻数据库的唯一所有权、新鲜度、原子更新、handle、不确定结果及安装恢复。
- [zotero-librarian/skills/zotero-librarian/SKILL.md](zotero-librarian/skills/zotero-librarian/SKILL.md): Hermes 的完备常驻执行合同，负责持续监管、问答、计划提交、监控及委托路由。
- [zotero-librarian/SOUL.md](zotero-librarian/SOUL.md): Zotero 馆员在判断、沟通、研究交接与克制维护方面的角色姿态。
