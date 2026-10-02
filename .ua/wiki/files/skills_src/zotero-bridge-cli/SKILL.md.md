
# skills_src/zotero-bridge-cli/SKILL.md
所属分层：[项目文档与规范](../../../layers/documentation.md)  
所属目录：[skills_src/zotero-bridge-cli](../../../modules/skills_src/zotero-bridge-cli.md)
<!-- node: document:skills_src/zotero-bridge-cli/SKILL.md -->

Zotero Bridge CLI Skill 的完整 Agent 指令手册，以 24 个小节规定可执行文件与 profile 选择、参数语义、命令发现、输出边界与续接纪律、身份与分页、导航与审批授权、Synthesis 操作边界、硬约束、失败处理与 References 引用。
源码：[skills_src/zotero-bridge-cli/SKILL.md](../../../../../skills_src/zotero-bridge-cli/SKILL.md)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [profile.template.json](profile.template.json.md) | skills_src/zotero-bridge-cli/profile.template.json | Provider profile 模板，规定 schema 标识、协议、endpoint、连接模式与 auth 结构，作为 agent 侧填写连接配置的骨架。 |
| [runner.json](runner.json.md) | skills_src/zotero-bridge-cli/runner.json | Runner 描述文件，声明 Zotero Bridge CLI 的 id、名称、版本、执行模式、输入输出 schema 引用与 entrypoint，供 Skill 运行时发现可执行入口。 |
