
# skills_src/topic-synthesis/contracts/stage-guidance.yaml
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts](../../../../modules/skills_src/topic-synthesis/contracts.md)
<!-- node: config:skills_src/topic-synthesis/contracts/stage-guidance.yaml -->

各阶段执行指引主文件，为 topic-synthesis 的每个阶段给出 prompt 级操作说明、输入输出要求与失败处理，是 skill 行为语义的单一来源。
源码：[skills_src/topic-synthesis/contracts/stage-guidance.yaml](../../../../../../skills_src/topic-synthesis/contracts/stage-guidance.yaml)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [gate.py](../runtime/topic_synthesis_runtime/common/gate.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py | topic-synthesis 运行时通用 gate 命令行入口，读取阶段 payload、交给数据库模块校验后以 JSON 输出 gate 结果。 |
| [render_topic_synthesis_skills.ts](../renderer/render_topic_synthesis_skills.ts.md) | skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts | topic-synthesis Skill 包的渲染器，把合约与模板批量渲染成可物化的 Skill 目录（含 manifest、prompt 与 schema 资产）。 |
| [stages.yaml](stages.yaml.md) | skills_src/topic-synthesis/contracts/stages.yaml | skill 目录与阶段依赖的声明式清单，定义每个 skill 的标识、依赖阶段与执行顺序，供工作流编排与阶段状态机使用。 |
