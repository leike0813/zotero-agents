
# skills_src/zotero-bridge-cli/runner.json
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[skills_src/zotero-bridge-cli](../../../modules/skills_src/zotero-bridge-cli.md)
<!-- node: config:skills_src/zotero-bridge-cli/runner.json -->

Runner 描述文件，声明 Zotero Bridge CLI 的 id、名称、版本、执行模式、输入输出 schema 引用与 entrypoint，供 Skill 运行时发现可执行入口。
源码：[skills_src/zotero-bridge-cli/runner.json](../../../../../skills_src/zotero-bridge-cli/runner.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [output.schema.json](output.schema.json.md) | skills_src/zotero-bridge-cli/output.schema.json | Zotero Bridge CLI 输出的 JSON Schema，声明输出为无结构化约束的任意对象，边界由运行时与 SKILL.md 指令兜底。 |

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [SKILL.md](SKILL.md.md) | skills_src/zotero-bridge-cli/SKILL.md | Zotero Bridge CLI Skill 的完整 Agent 指令手册，以 24 个小节规定可执行文件与 profile 选择、参数语义、命令发现、输出边界与续接纪律、身份与分页、导航与审批授权、Synthesis 操作边界、硬约束、失败处理与 References 引用。 |
