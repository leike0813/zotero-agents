
# skills_src/topic-synthesis/templates/fragments/strict-stage-order.md.j2
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/templates/fragments](../../../../../modules/skills_src/topic-synthesis/templates/fragments.md)
<!-- node: file:skills_src/topic-synthesis/templates/fragments/strict-stage-order.md.j2 -->

要求从 run workspace 启动 gate 并分 needs_payload 真假两条路径执行，禁止跳 stage 或自行拼接 runtime SQLite 路径。
源码：[skills_src/topic-synthesis/templates/fragments/strict-stage-order.md.j2](../../../../../../../skills_src/topic-synthesis/templates/fragments/strict-stage-order.md.j2)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [stage-loop.md.j2](stage-loop.md.j2.md) | skills_src/topic-synthesis/templates/fragments/stage-loop.md.j2 | 定义 gate 驱动的阶段循环：只处理返回的当前 stage、每次执行后重跑 gate，遇到 stage=completed 时输出 output 对象。 |
