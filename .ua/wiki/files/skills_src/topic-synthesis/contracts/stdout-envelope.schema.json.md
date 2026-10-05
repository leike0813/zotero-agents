
# skills_src/topic-synthesis/contracts/stdout-envelope.schema.json
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts](../../../../modules/skills_src/topic-synthesis/contracts.md)
<!-- node: config:skills_src/topic-synthesis/contracts/stdout-envelope.schema.json -->

Skill Runner 标准输出信封的 JSON Schema，用 oneOf 区分成功与失败两种信封形态，约束阶段进程与 runner 之间的输出协议。
源码：[skills_src/topic-synthesis/contracts/stdout-envelope.schema.json](../../../../../../skills_src/topic-synthesis/contracts/stdout-envelope.schema.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [render_topic_synthesis_skills.ts](../renderer/render_topic_synthesis_skills.ts.md) | skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts | topic-synthesis Skill 包的渲染器，把合约与模板批量渲染成可物化的 Skill 目录（含 manifest、prompt 与 schema 资产）。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [stage-guidance.yaml](stage-guidance.yaml.md) | skills_src/topic-synthesis/contracts/stage-guidance.yaml | 各阶段执行指引主文件，为 topic-synthesis 的每个阶段给出 prompt 级操作说明、输入输出要求与失败处理，是 skill 行为语义的单一来源。 |
