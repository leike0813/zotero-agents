# Host Bridge Terminology

Use this reference when a user uses Chinese shorthand, domain abbreviations, or artifact names that could map to multiple Host Bridge concepts. Prefer these canonical meanings unless the user explicitly defines a different context.

| Term | Canonical meaning |
| --- | --- |
| Provider | The workflow runtime family that interprets provider-specific options, such as ACP. |
| Backend | A configured concrete connection or executable instance selected by `backendId` for a provider. |
| Provider profile | An external agent's request-level preset that combines a backend selection with non-sensitive provider-specific `providerOptions`. Host Bridge validates and applies it only to that request; it does not store or manage it. |

| 中文别名 | Canonical term | 含义 | 不要混淆 | 推荐入口 |
| --- | --- | --- | --- | --- |
| 图谱、引文图谱、citation graph | Synthesis citation graph | Synthesis 持久化的文献引用关系和图指标视图。 | 不等同于普通知识图谱、UI 示意图、topic map、概念网络。 | `zotero-bridge synthesis graph ...` |
| 主题、topic | Synthesis topic | Synthesis 中围绕一组文献、概念和证据组织的研究主题。 | 不等同于 Zotero tag、collection、workflow id。 | `zotero-bridge synthesis topic ...` |
| 文献、paper、item | Zotero top-level regular item | Zotero 库中的顶层常规条目，通常用 `libraryId:itemKey` 或 paper ref 引用。 | 不等同于 PDF attachment、note、annotation。 | `zotero-bridge library item get ...` 或 `zotero-bridge library items list ...` |
| PDF 原文、原文 PDF | Zotero PDF attachment | 文献条目下的 PDF 附件。 | 不等同于 landing URL、网页附件、source Markdown。 | `zotero-bridge library readiness missing-pdf ...` |
| Markdown 原文、source Markdown、md 原文 | Source Markdown attachment | 与 best PDF 同 filename stem 的 `.md` 或 `.markdown` 附件。 | 不等同于 digest note、任意 Markdown 文件、agent 本地临时文件。 | `zotero-bridge library readiness missing-markdown ...` |
| 文献分析三工件、三件套、analysis artifacts | Literature analysis generated artifacts | 文献分析生成的 `digest`、`references`、`citation-analysis` 三个 generated notes/markers。 | 不等同于 workflow 输出 bundle、source Markdown、topic synthesis artifact。 | `zotero-bridge library readiness missing-analysis ...` |
| digest、摘要工件 | Literature digest note/artifact | `literature-analysis` 生成的 digest note 或 artifact。 | 不等同于 sha256 digest、checksum、topic digest id。 | `zotero-bridge library note payloads ...` 或 `zotero-bridge synthesis artifact ...` |
| references、参考文献工件 | Literature references artifact | `literature-analysis` 生成的 references note/artifact。 | 不等同于 skill package 的 `references/` 目录、普通引用列表文本。 | `zotero-bridge library note payloads ...` 或 `zotero-bridge synthesis artifact ...` |
| citation analysis、引用分析 | Citation analysis artifact | `literature-analysis` 生成的引用语义分析工件。 | 不等同于 Synthesis citation graph；前者是单篇分析工件，后者是跨文献图谱。 | `zotero-bridge library note payloads ...` |
| Artifacts column、工件列 | Zotero Artifacts column | Zotero item tree 中的轻量存在性图标列。 | 不验证工件内容质量，不读取完整 payload。 | Zotero UI 或 `zotero-bridge library readiness ...` |
| library readiness、readiness 查询 | Library readiness audit | 基于 Artifacts column 规则和 PDF 检测的只读缺失发现。 | 不是自动修复，不会 fetch PDF、转换 Markdown 或运行 workflow。 | `zotero-bridge library readiness audit ...` |
| annotation、高亮、批注 | Zotero reader annotation | Zotero PDF reader 的 annotation/highlight/comment 数据。 | 不等同于 Zotero note、generated analysis note。当前 CLI 只读/导出 annotation。 | `zotero-bridge library annotation list|export ...` |
| workflowRunId | Workflow run handle | Host Bridge 拥有的一次 workflow 编排运行句柄。 | 不等同于 `skillRunId`，不能作为 reply/connect 目标。 | `zotero-bridge run get <workflowRunId>` |
| skillRunId | Skill run handle | workflow 内某个具体 skill/backend run 的外部稳定句柄。 | 不等同于 workflow run；reply/connect 必须显式使用它。 | `zotero-bridge run skill get|reply|connect <skillRunId>` |
| agentRunId | Agent-owned handoff handle | `workflow agent-run` 返回的 apply-back 会话句柄。 | 不等同于 Host-owned `workflowRunId`，不会被 `run active` 监控。 | `zotero-bridge workflow agent-apply <agentRunId> ...` |
| agentRequestId | Agent-owned request handle | agent-owned handoff 中单个请求的 result bundle 目标。 | 不等同于 backend request id 或 skill run id。 | `zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` |
| notification inbox、通知收件箱 | Run notification inbox | workflow/skill-run lifecycle event 的轻量 inbox。 | 不是 transcript、watch stream、cursor event log，也不是交互目标。 | `zotero-bridge run notification list|wait|ack ...` |
| fileId、文件句柄 | Host Bridge file handle | Host Bridge upload/download 的 opaque short-lived handle。 | 不等同于本地路径、Zotero attachment path、URL。 | `zotero-bridge file download ...` 或 `zotero-bridge file upload ...` |
| mutation、writeback、写回 | Approval-gated Zotero mutation | 通过 preview/apply 或 mutation-backed semantic command 进行的 Zotero 写操作。 | 不等同于 context navigation、readiness 查询、annotation export。 | `zotero-bridge mutation preview|apply ...` |
| navigation、定位、打开 | Zotero UI navigation | 把 Zotero UI 带到指定 item、note、collection 或 selection。 | 不是写回，不授权 metadata、note、tag 或附件变更。 | `zotero-bridge context ... open ...` |
| cache invalidate、缓存失效 | Approval-gated cache maintenance | 受限 enum scope 的 Synthesis cache invalidation。 | 不等同于 raw DB reset、文件删除、graph metrics repair。 | `zotero-bridge synthesis cache invalidate ...` |
| refresh metrics、刷新图指标 | Citation graph metrics repair | 重新计算已存在 citation graph 的 metrics。 | 不重建 citation graph，不等同于 cache invalidate。 | `zotero-bridge synthesis graph refresh-metrics ...` |
