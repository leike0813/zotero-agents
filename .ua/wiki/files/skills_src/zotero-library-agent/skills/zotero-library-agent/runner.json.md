
# skills_src/zotero-library-agent/skills/zotero-library-agent/runner.json
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/zotero-library-agent/skills/zotero-library-agent](../../../../../modules/skills_src/zotero-library-agent/skills/zotero-library-agent.md)
<!-- node: config:skills_src/zotero-library-agent/skills/zotero-library-agent/runner.json -->

zotero-library-agent 的任务运行器清单，声明执行模式、输出 schema 与最终 JSON 结果契约（含 __SKILL_DONE__ 传输标记语义）。
源码：[skills_src/zotero-library-agent/skills/zotero-library-agent/runner.json](../../../../../../../skills_src/zotero-library-agent/skills/zotero-library-agent/runner.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [task-runner.template.json](../../shared/task-runner.template.json.md) | skills_src/zotero-library-agent/shared/task-runner.template.json | Skill 任务运行器配置模板（zotero-library-task.runner-template.v1），以占位符定义 id/名称、执行模式、输出 schema 路径与 Runner 提示词契约。 |

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [SKILL.md](SKILL.md.md) | skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md | 库级总控 Skill 指令：把有界的 Zotero 研究请求路由到最小可用的专项 Skill，或协调多个 Skill 序列并保持 identity、evidence 与 authority 边界。 |
