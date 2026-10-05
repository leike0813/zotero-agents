
# skills_src/topic-synthesis/templates/fragments
> 目录聚合页：11 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [skills_src/topic-synthesis/templates/fragments/execution-contract.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/execution-contract.md.j2.md) | 文件 | 0 | 规定 gate.py 是唯一面向执行代理的 CLI，命令型 stage 只执行 gate 返回的 command，payload 型 stage 必须写入 payload_path 后用 submit_command 提交。 |
| [skills_src/topic-synthesis/templates/fragments/failure-rules.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/failure-rules.md.j2.md) | 文件 | 0 | 规定 gate 返回 error JSON 时立即停止当前技能，并禁止手改 SQLite 或绕过 gate.py 调用内部 helper。 |
| [skills_src/topic-synthesis/templates/fragments/frontmatter.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/frontmatter.md.j2.md) | 文件 | 0 | 生成 Skill 文档 YAML frontmatter 的两行 Jinja2 片段，注入 skill_id 与 description 元数据。 |
| [skills_src/topic-synthesis/templates/fragments/llm-runtime-boundary.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/llm-runtime-boundary.md.j2.md) | 文件 | 0 | 划分 LLM 与脚本/runtime 的职责边界，注入 llm_tasks 与 runtime_tasks 占位，并列出禁止手写 SQLite rows、handoff manifest 等红线。 |
| [skills_src/topic-synthesis/templates/fragments/output-contract.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/output-contract.md.j2.md) | 文件 | 0 | 输出合同小节模板，仅注入 output_contract_body 占位，由各阶段模板提供具体输出结构描述。 |
| [skills_src/topic-synthesis/templates/fragments/product-goals.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/product-goals.md.j2.md) | 文件 | 0 | 说明 Topic Synthesis 的定位是帮助理解概念边界、研究路线与争议缺口而非字段填空，并注入各技能的质量目标。 |
| [skills_src/topic-synthesis/templates/fragments/runtime-state.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/runtime-state.md.j2.md) | 文件 | 0 | 规定 SQLite 只保存 stage state 与必要跨 stage 上下文，业务状态经 SQLite 与 handoff/files 传递而非 prompt 文本。 |
| [skills_src/topic-synthesis/templates/fragments/scope.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/scope.md.j2.md) | 文件 | 0 | 注入技能描述作为范围声明，并指明以包内 SKILL.md、scripts/ 与 assets/schemas/ 为执行合同。 |
| [skills_src/topic-synthesis/templates/fragments/stage-loop.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/stage-loop.md.j2.md) | 文件 | 0 | 定义 gate 驱动的阶段循环：只处理返回的当前 stage、每次执行后重跑 gate，遇到 stage=completed 时输出 output 对象。 |
| [skills_src/topic-synthesis/templates/fragments/strict-stage-order.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/strict-stage-order.md.j2.md) | 文件 | 0 | 要求从 run workspace 启动 gate 并分 needs_payload 真假两条路径执行，禁止跳 stage 或自行拼接 runtime SQLite 路径。 |
| [skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2](../../../../files/skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2.md) | 文件 | 0 | 长片段，说明通过内置 zotero-bridge-cli wrapper skill 选择最小语义命令、完整遍历分页作为无匹配证据、按单一 JSON envelope 处理 stdout，以及优先使用 run workspace 注入的 shim。 |
