
# skills_src/topic-synthesis/templates/topic-synthesis-core-enrichment/SKILL.md.j2
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/templates/topic-synthesis-core-enrichment](../../../../../modules/skills_src/topic-synthesis/templates/topic-synthesis-core-enrichment.md)
<!-- node: file:skills_src/topic-synthesis/templates/topic-synthesis-core-enrichment/SKILL.md.j2 -->

topic-synthesis 核心富化 Skill 的 SKILL.md 生成模板，组装范围、目标、执行合同与阶段循环等共享片段。
源码：[skills_src/topic-synthesis/templates/topic-synthesis-core-enrichment/SKILL.md.j2](../../../../../../../skills_src/topic-synthesis/templates/topic-synthesis-core-enrichment/SKILL.md.j2)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [failure-rules.md.j2](../fragments/failure-rules.md.j2.md) | skills_src/topic-synthesis/templates/fragments/failure-rules.md.j2 | 规定 gate 返回 error JSON 时立即停止当前技能，并禁止手改 SQLite 或绕过 gate.py 调用内部 helper。 |
| [frontmatter.md.j2](../fragments/frontmatter.md.j2.md) | skills_src/topic-synthesis/templates/fragments/frontmatter.md.j2 | 生成 Skill 文档 YAML frontmatter 的两行 Jinja2 片段，注入 skill_id 与 description 元数据。 |
| [output-contract.md.j2](../fragments/output-contract.md.j2.md) | skills_src/topic-synthesis/templates/fragments/output-contract.md.j2 | 输出合同小节模板，仅注入 output_contract_body 占位，由各阶段模板提供具体输出结构描述。 |
| [scope.md.j2](../fragments/scope.md.j2.md) | skills_src/topic-synthesis/templates/fragments/scope.md.j2 | 注入技能描述作为范围声明，并指明以包内 SKILL.md、scripts/ 与 assets/schemas/ 为执行合同。 |
| [stage-loop.md.j2](../fragments/stage-loop.md.j2.md) | skills_src/topic-synthesis/templates/fragments/stage-loop.md.j2 | 定义 gate 驱动的阶段循环：只处理返回的当前 stage、每次执行后重跑 gate，遇到 stage=completed 时输出 output 对象。 |
