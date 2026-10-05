
# skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/templates/fragments](../../../../../modules/skills_src/topic-synthesis/templates/fragments.md)
<!-- node: file:skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2 -->

长片段，说明通过内置 zotero-bridge-cli wrapper skill 选择最小语义命令、完整遍历分页作为无匹配证据、按单一 JSON envelope 处理 stdout，以及优先使用 run workspace 注入的 shim。
源码：[skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2](../../../../../../../skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [llm-runtime-boundary.md.j2](llm-runtime-boundary.md.j2.md) | skills_src/topic-synthesis/templates/fragments/llm-runtime-boundary.md.j2 | 划分 LLM 与脚本/runtime 的职责边界，注入 llm_tasks 与 runtime_tasks 占位，并列出禁止手写 SQLite rows、handoff manifest 等红线。 |
