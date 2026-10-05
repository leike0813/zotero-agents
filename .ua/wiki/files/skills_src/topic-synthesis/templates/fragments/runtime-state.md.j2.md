
# skills_src/topic-synthesis/templates/fragments/runtime-state.md.j2
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/templates/fragments](../../../../../modules/skills_src/topic-synthesis/templates/fragments.md)
<!-- node: file:skills_src/topic-synthesis/templates/fragments/runtime-state.md.j2 -->

规定 SQLite 只保存 stage state 与必要跨 stage 上下文，业务状态经 SQLite 与 handoff/files 传递而非 prompt 文本。
源码：[skills_src/topic-synthesis/templates/fragments/runtime-state.md.j2](../../../../../../../skills_src/topic-synthesis/templates/fragments/runtime-state.md.j2)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [output-contract.md.j2](output-contract.md.j2.md) | skills_src/topic-synthesis/templates/fragments/output-contract.md.j2 | 输出合同小节模板，仅注入 output_contract_body 占位，由各阶段模板提供具体输出结构描述。 |
