# Host Bridge 术语

当用户使用中文简称、领域缩写或可能映射到多个 Host Bridge 概念的制品名称时，参考本文档。除非用户显式定义了不同的上下文，否则优先使用以下规范含义。

| 术语 | 规范含义 |
| --- | --- |
| Provider | 解释 provider 特定选项的 workflow 运行时族，如 ACP。 |
| Backend | 由 provider 的 `backendId` 选择的已配置的具体连接或可执行实例。 |
| Provider profile | 外部 Agent 的请求级预设，将 backend 选择与非敏感的 provider 特定 `providerOptions` 组合。Host Bridge 仅对该请求进行验证和应用；不存储或管理它。 |

| 中文别名 | 规范术语 | 含义 | 不要混淆 | 推荐入口 |
| --- | --- | --- | --- | --- |
| 图谱、引文图谱、citation graph | Synthesis citation graph | Synthesis 持久化的文献引用关系和图指标视图。 | 不等同于普通知识图谱、UI 示意图、topic map、概念网络。 | `zotero-bridge synthesis graph ...` |
| 主题、topic | Synthesis Topic | Synthesis 中围绕一组文献、概念和证据组织的研究主题。 | 不等同于 Zotero tag、collection、workflow id。 | `zotero-bridge synthesis topic ...` |
| 文献、paper、item | Zotero 顶层常规条目 | Zotero 库中的顶层常规条目，通常用 `libraryId:itemKey` 或 paper ref 引用。 | 不等同于 PDF attachment、note、annotation。 | `zotero-bridge library item get ...` 或 `zotero-bridge library items list ...` |
| PDF 原文、原文 PDF | Zotero PDF 附件 | 文献条目下的 PDF 附件。 | 不等同于 landing URL、网页附件、source Markdown。 | `zotero-bridge library readiness missing-pdf ...` |
| Markdown 原文、source Markdown、md 原文 | Source Markdown 附件 | 与 best PDF 同 filename stem 的 `.md` 或 `.markdown` 附件。 | 不等同于 digest note、任意 Markdown 文件、Agent 本地临时文件。 | `zotero-bridge library readiness missing-markdown ...` |
| 文献分析三工件、三件套、analysis artifacts | 文献分析生成的制品 | 文献分析生成的 `digest`、`references`、`citation-analysis` 三个 generated notes/markers。 | 不等同于 workflow 输出包、source Markdown、topic synthesis 制品。 | `zotero-bridge library readiness missing-analysis ...` |
| digest、摘要工件 | 文献 digest note/制品 | `literature-analysis` 生成的 digest note 或制品。 | 不等同于 sha256 digest、checksum、topic digest id。 | `zotero-bridge library note payloads ...` 或 `zotero-bridge synthesis artifact ...` |
| references、参考文献工件 | 文献参考文献制品 | `literature-analysis` 生成的 references note/制品。 | 不等同于 Skill 包的 `references/` 目录、普通引用列表文本。 | `zotero-bridge library note payloads ...` 或 `zotero-bridge synthesis artifact ...` |
| citation analysis、引用分析 | 引用分析制品 | `literature-analysis` 生成的引用语义分析制品。 | 不等同于 Synthesis citation graph；前者是单篇分析制品，后者是跨文献图谱。 | `zotero-bridge library note payloads ...` |
| Artifacts column、工件列 | Zotero Artifacts 列 | Zotero 条目树中的轻量存在性图标列。 | 不验证制品内容质量，不读取完整 payload。 | Zotero UI 或 `zotero-bridge library readiness ...` |
| library readiness、readiness 查询 | 文献库就绪状态审计 | 基于 Artifacts 列规则和 PDF 检测的只读缺失发现。 | 不是自动修复，不会获取 PDF、转换 Markdown 或运行 workflow。 | `zotero-bridge library readiness audit ...` |
| annotation、高亮、批注 | Zotero 阅读器标注 | Zotero PDF 阅读器的 annotation/highlight/comment 数据。 | 不等同于 Zotero note、生成的分析 note。当前 CLI 只读/导出标注。 | `zotero-bridge library annotation list|export ...` |
| workflowRunId | Workflow 运行 handle | Host Bridge 拥有的一次 workflow 编排运行句柄。 | 不等同于 `skillRunId`，不能作为 reply/connect 目标。 | `zotero-bridge run get <workflowRunId>` |
| skillRunId | Skill 运行 handle | workflow 内某个具体 skill/backend run 的外部稳定句柄。 | 不等同于 workflow run；reply/connect 必须显式使用它。 | `zotero-bridge run skill get|reply|connect <skillRunId>` |
| agentRunId | Agent 拥有的交接 handle | `workflow agent-run` 返回的 apply-back session 句柄。 | 不等同于 Host 拥有的 `workflowRunId`，不会被 `run active` 监控。 | `zotero-bridge workflow agent-apply <agentRunId> ...` |
| agentRequestId | Agent 拥有的请求 handle | Agent 拥有的交接中单个请求的 result bundle 目标。 | 不等同于 backend request id 或 skill run id。 | `zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` |
| notification inbox、通知收件箱 | 运行通知收件箱 | workflow/skill-run 生命周期事件的轻量收件箱。 | 不是 transcript、watch stream、cursor 事件日志，也不是交互目标。 | `zotero-bridge run notification list|wait|ack ...` |
| fileId、文件句柄 | Host Bridge 文件 handle | Host Bridge 上传/下载的不透明短生命周期 handle。 | 不等同于本地路径、Zotero 附件路径、URL。 | `zotero-bridge file download ...` 或 `zotero-bridge file upload ...` |
| mutation、writeback、写回 | 需 Approval 的 Zotero 变更 | 通过 preview/apply 或 mutation 支持的语义命令进行的 Zotero 写操作。 | 不等同于上下文导航、就绪状态查询、标注导出。 | `zotero-bridge mutation preview|apply ...` |
| navigation、定位、打开 | Zotero UI 导航 | 将 Zotero UI 带到指定条目、笔记、集合或选择。 | 不是写回，不授权元数据、笔记、标签或附件变更。 | `zotero-bridge context ... open ...` |
| cache invalidate、缓存失效 | 需 Approval 的缓存维护 | 受限 enum scope 的 Synthesis 缓存失效。 | 不等同于原始数据库重置、文件删除、图谱指标修复。 | `zotero-bridge synthesis cache invalidate ...` |
| refresh metrics、刷新图指标 | 引文图谱指标修复 | 重新计算已存在的引文图谱的指标。 | 不重建引文图谱，不等同于缓存失效。 | `zotero-bridge synthesis graph refresh-metrics ...` |
