
# skills_src/topic-synthesis/templates/fragments/execution-contract.md.j2
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/templates/fragments](../../../../../modules/skills_src/topic-synthesis/templates/fragments.md)
<!-- node: file:skills_src/topic-synthesis/templates/fragments/execution-contract.md.j2 -->

规定 gate.py 是唯一面向执行代理的 CLI，命令型 stage 只执行 gate 返回的 command，payload 型 stage 必须写入 payload_path 后用 submit_command 提交。
源码：[skills_src/topic-synthesis/templates/fragments/execution-contract.md.j2](../../../../../../../skills_src/topic-synthesis/templates/fragments/execution-contract.md.j2)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [llm-runtime-boundary.md.j2](llm-runtime-boundary.md.j2.md) | skills_src/topic-synthesis/templates/fragments/llm-runtime-boundary.md.j2 | 划分 LLM 与脚本/runtime 的职责边界，注入 llm_tasks 与 runtime_tasks 占位，并列出禁止手写 SQLite rows、handoff manifest 等红线。 |
