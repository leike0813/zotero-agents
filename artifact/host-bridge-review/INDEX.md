# Host Bridge 中文审阅镜像

生成时间：2026-09-06T09:33:03.120Z

本目录按发布面所有权保存中文译文；继承内容只在其所有者目录出现一次。有效组成由下表的继承链和文件数表达。

| 发布面 | 类型 | 继承链 | 自有文件 | 继承文件 | 有效文件 |
| --- | --- | --- | ---: | ---: | ---: |
| `zotero-bridge-cli` | `minimum-core` | `zotero-bridge-cli` | 134 | 0 | 134 |
| `zotero-library-agent` | `generic-agent` | `zotero-bridge-cli` → `zotero-library-agent` | 13 | 134 | 147 |
| `zotero-librarian` | `hosted-agent` | `zotero-bridge-cli` → `zotero-library-agent` → `zotero-librarian` | 6 | 147 | 153 |

## zotero-bridge-cli

- [zotero-bridge-cli/skills/zotero-bridge-cli/references/command-catalog.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/command-catalog.md): Zotero Bridge 命令目录：按任务族导航各 leaf 命令的索引，说明自然语言线索与选择检查。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/list.md): 列出已脱敏的后端 profile 诊断信息
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/status.md): 读取一个已脱敏的后端 profile 状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/manifest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/manifest.md): 读取已认证的 Zotero Bridge 服务清单
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/diagnose.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/diagnose.md): 诊断 Zotero Bridge 连接 profile 的就绪情况
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/inspect.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/inspect.md): 检查已脱敏的 Zotero Bridge 连接 profile
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/status.md): 在无需认证的情况下检查 Zotero Bridge 服务健康状况
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/call/index.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/call/index.md): 高级诊断用原始 capability 调用
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/collection/open.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/collection/open.md): 打开一个 Zotero collection
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/current.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/current.md): 读取当前 Zotero UI context
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/item/open.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/item/open.md): 打开一个 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/note/open.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/note/open.md): 打开一个 Zotero note
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/selection/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/selection/get.md): 读取一页精确选中的 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/selection/open.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/selection/open.md): 将一个或多个 Zotero item 打开为当前选中项
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/acp-skill-run/reapply-result.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/acp-skill-run/reapply-result.md): 为一次已有的 ACP skill run 结果重跑 applyResult
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/persistence.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/persistence.md): 读取仅用于调试的持久化诊断信息
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/status.md): 读取仅用于调试的 Zotero Bridge 服务运行时状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/cache.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/cache.md): 列出仅用于调试的 Synthesis sidecar cache basis 行
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/clean-install-reset.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/clean-install-reset.md): 危险的调试操作：重置 Synthesis 安装状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/diff.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/diff.md): 读取仅用于调试的 Synthesis DB/cache 差异
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-paper.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-paper.md): 检查一个调试用的 Synthesis paper
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-topic.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-topic.md): 检查一个调试用的 Synthesis topic
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/operations.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/operations.md): 列出仅用于调试的 Synthesis 显式 operation
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/profiler.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/profiler.md): 列出仅用于调试的 Synthesis profiler 时间
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/snapshot.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/snapshot.md): 读取一个仅用于调试的 Synthesis 快照
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/tasks.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/tasks.md): 读取仅用于调试的 workflow task 诊断信息
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/download.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/download.md): 下载一个已注册的 file handle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/upload.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/upload.md): 通过 Zotero Bridge 上传一个本地文件并返回一个短期 file handle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/export.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/export.md): 为一个 Zotero item 导出阅读器标注
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/list.md): 列出一个 Zotero item 的阅读器标注
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/attachments.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/attachments.md): 列出一个 Zotero item 的子附件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/get.md): 获取一个 Zotero item 的详细元数据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/notes.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/notes.md): 列出一个 Zotero item 的子笔记
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/search.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/search.md): 搜索 Zotero library item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/export-research-bundle.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/export-research-bundle.md): 将一篇或多篇论文导出为 research bundle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/list.md): 列出简洁的 Zotero library item 摘要
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/get.md): 读取一个 Zotero note 正文片段
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payload.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payload.md): 从一个 Zotero note 读取一个内嵌的 workflow payload
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payloads.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payloads.md): 列出一个 Zotero note 中的内嵌 workflow payload
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/audit.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/audit.md): 审计 PDF、源 Markdown 与 literature-analysis artifact 的就绪情况
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-analysis.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-analysis.md): 列出缺少 literature-analysis 生成 artifact 的 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-markdown.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-markdown.md): 列出缺少同名 stem 源 Markdown 的 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-pdf.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-pdf.md): 列出缺少 PDF 附件的 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/saved-searches/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/saved-searches/list.md): 列出一页受 source 约束的 Saved Search
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/snapshot.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/snapshot.md): 读取一页固定的 Zotero 全 library 快照
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/apply.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/apply.md): 应用一次 Zotero mutation
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/add-items.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/add-items.md): 将 Zotero item 添加到一个 collection
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/create.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/create.md): 创建一个 Zotero collection
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/remove-items.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/remove-items.md): 从一个 collection 移除 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/get-operation.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/get-operation.md): 读取规范化 mutation 的证据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/attach-file.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/attach-file.md): 将通过 Zotero Bridge 上传的文件附加到一个 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/update.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/update.md): 更新 Zotero item 字段
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/literature-ingest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/literature-ingest.md): 将搜索到的文献导入到 Zotero
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/create.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/create.md): 在一个 Zotero item 下创建一条子 note
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/update.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/update.md): 更新一条 Zotero note
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/upsert-payload.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/upsert-payload.md): 插入或更新一个内嵌 note payload
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/preview.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/preview.md): 预览一次 Zotero mutation
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/add.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/add.md): 为 Zotero item 添加 tag
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/remove.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/remove.md): 从 Zotero item 移除 tag
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/operation/index.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/operation/index.md): 读取一条持久的 Zotero operation 回执
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/download.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/download.md): 下载一个或全部 Dashboard Product asset
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/get.md): 读取一个普通 Dashboard Product
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/list.md): 列出普通 Dashboard Product
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/remove.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/remove.md): 通过 Zotero 审批删除一个 Dashboard Product 记录
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/active.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/active.md): 列出轻量的活跃 workflow runtime task
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/cancel.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/cancel.md): 请求取消一次 workflow run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/get.md): 读取一次 workflow run 的状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/list.md): 列出活跃和最近的 workflow runtime task
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/ack.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/ack.md): 确认 workflow notification 收件箱事件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/list.md): 列出 workflow notification 收件箱事件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/wait.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/wait.md): 轮询直至收到 workflow notification
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/get.md): 读取一个 Zotero 侧的 permission 请求
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/pending.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/pending.md): 列出待处理的 Zotero 侧 permission 请求
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/recent.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/recent.md): 列出轻量的最近 workflow runtime task
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/connect.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/connect.md): 连接一个可恢复的 ACP skill run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/events.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/events.md): 列出一个 skill run 的轻量生命周期事件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/get.md): 读取一次具体的 skill run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/recent.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/recent.md): 列出最近的具体 skill run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/reply.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/reply.md): 回复一个等待中的 ACP skill run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/workflow/recent.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/workflow/recent.md): 列出最近的 workflow run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/describe.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/describe.md): 描述一个规范化命令
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/identity.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/identity.md): 打印精确的 CLI 构建与命令目录标识
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/search.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/search.md): 按任务意图搜索规范化命令
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/export-filtered.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/export-filtered.md): 将受限的 paper artifact 导出到 run workspace
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/manifest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/manifest.md): 读取 paper artifact 的 manifest 元数据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/read.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/read.md): 读取选定的 paper artifact
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/resolve-topic-digest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/resolve-topic-digest.md): 解析一个 topic 的 paper digest
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/invalidate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/invalidate.md): 失效一个有约束的 Synthesis cache 范围
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/refresh-reference-sidecar.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/refresh-reference-sidecar.md): 启动一次 reference-sidecar 刷新
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/status.md): 读取 Synthesis cache 的维护状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/concept/query.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/concept/query.md): 查询 Synthesis Concept KB 候选
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-layout.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-layout.md): 读取已持久化的引用图布局坐标
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-metrics.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-metrics.md): 读取所选论文的引用图指标
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-slice.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-slice.md): 读取一个 Synthesis 引用图切片
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/overview.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/overview.md): 读取分页的 Synthesis 引用图概览
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/query-cluster.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/query-cluster.md): 查询一个 topic 范围内的引用图 cluster
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-external-references.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-external-references.md): 基于引用图对外部文献进行排序
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-library-papers.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-library-papers.md): 基于引用图指标对 library 论文进行排序
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/refresh-metrics.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/refresh-metrics.md): 刷新已持久化的引用图复合指标
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/update.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/update.md): 启动一次引用图更新
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/library/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/library/get.md): 读取一个 index 页
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/reference/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/reference/get.md): 读取一个 index 页
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/status.md): 读取 Synthesis index 的维护状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/insight/attention-queue.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/insight/attention-queue.md): 读取聚合的 graph/artifact/reference attention 项
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/resolver/resolve.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/resolver/resolve.md): 将一个 topic resolver 解析为一组 paper
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/schema/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/schema/get.md): 读取 Synthesis Layer 的 schema 元数据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/export-research-bundle.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/export-research-bundle.md): 导出一个或多个 Topic research bundle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/find-by-paper-ref.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/find-by-paper-ref.md): 按 paper_ref 查找活跃的 topic 合成 topic
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-context.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-context.md): 读取一个 topic 合成 context
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-planning-context.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-planning-context.md): 读取整个 library 范围的 topic 规划 context
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-report.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-report.md): 读取一个 topic 合成报告的 markdown 正文
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-review-input.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-review-input.md): 从 Synthesis 读取 review workflow 输入
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/list.md): 列出已存在的 topic 合成 topic
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-abandon.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-abandon.md): 放弃一次未被消费的 agent run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply-status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply-status.md): 读取 agent run 的可审计 apply-back 回执
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply.md): 应用已定稿的自有 agent workflow 结果 bundle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-bundle/inspect.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-bundle/inspect.md): 检查一个本地 agent handoff 目录
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-renew.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-renew.md): 续约一次未被消费的 agent run 租约
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-result/validate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-result/validate.md): 根据输出契约校验本地 agent 结果目录
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-run.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-run.md): 准备一个自有 agent workflow handoff bundle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/defaults.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/defaults.md): 显示已保存的 workflow provider profile 候选
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/describe.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/describe.md): 描述 workflow 选择与 workflow 选项
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/list.md): 列出已加载的 workflow
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/describe.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/describe.md): 描述一个后端的 provider profile 契约
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/list.md): 列出已配置的后端 provider profile
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/refresh.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/refresh.md): 刷新一个 ACP 后端 provider 目录
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/validate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/validate.md): 校验并归一化一个后端 provider profile
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/cancel.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/cancel.md): 取消一个仍待处理的 Zotero 托管 workflow queue 单元
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/list.md): 列出待处理的 Zotero 托管 workflow queue 单元
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/requirements.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/requirements.md): 读取 workflow 要求
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submission/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submission/get.md): 读取一个活跃的 Zotero 托管 workflow 提交
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submit.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submit.md): 使用显式 JSON 输入提交一次 workflow
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/validate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/validate.md): 在不启动执行的情况下校验 workflow 输入
- [zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md](zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md): Zotero Bridge CLI Skill：覆盖可执行选择、profile 配置、命令发现、调用、影响与审批、handle、输出证据与恢复的完整机制契约。

## zotero-library-agent

- [zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md](zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md): 研究任务模型参考文档,定义跨五个有限研究域的决策、任务组合规则、工作流执行归属(Zotero-managed vs self-owned)、agent 移交合同、证据/文件/Product 处理、多阶段研究生命周期以及自然语言任务采集的阶梯(结果/范围/新鲜度/证据深度/状态变更)。
- [zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md](zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md): 内置工作流目录参考文档,提供 14 个 Zotero 插件自带工作流(collection-collector、export-literature-bundle、literature-analysis、create-topic-synthesis 等)的包路径、清单、provider 要求、执行模式、选择合同、必填选项、结果证据与调用输入的完整清单。
- [zotero-library-agent/skills/zotero-library-agent/SKILL.md](zotero-library-agent/skills/zotero-library-agent/SKILL.md): Zotero Library Agent 协调 Skill,负责将有限范围的 Zotero 研究请求路由到五个任务 Skill(query/acquisition/analysis/synthesis/curation)中的一个或编排显式序列,保留身份、证据、权限与跨阶段恢复能力,返回单一可信的 zotero-library-task.result.v1。
- [zotero-library-agent/skills/zotero-library-curation/references/playbook.md](zotero-library-agent/skills/zotero-library-curation/references/playbook.md): 库遴选 Playbook,涵盖变更分类与提议、变更与文件工作流、产品与持久产物、验证与部分结果、批次提议记录、破坏性变更审查、剩余差分恢复以及三个端到端追踪(标签清理、合并重复、不确定附件写入)。
- [zotero-library-agent/skills/zotero-library-curation/SKILL.md](zotero-library-agent/skills/zotero-library-curation/SKILL.md): Zotero 库遴选 Skill,负责安全地检查、提议、应用并实时验证对 Zotero 元数据、标签、收藏、笔记、链接、文件、就绪状态等的有限范围变更,要求显式当前权限与变更后实时验证。
- [zotero-library-agent/skills/zotero-library-query/references/playbook.md](zotero-library-agent/skills/zotero-library-query/references/playbook.md): 库查询 Playbook,覆盖上下文与身份分类、库发现与分页协议、笔记/附件/就绪读取细节、合成模型证据策略、查询决策矩阵、证据交付合同、跨任务升级移交以及三个端到端决策追踪(空选择、负向结论、中断附件投递)。
- [zotero-library-agent/skills/zotero-library-query/SKILL.md](zotero-library-agent/skills/zotero-library-query/SKILL.md): Zotero 库查询 Skill,提供基于当前 Zotero 实时状态的有界只读检索与源支撑回答,包含上下文身份解析、库发现与分页、笔记/附件/就绪读取、合成模型选择、查询完成检查清单与跨任务移交边界。
- [zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md](zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md): 文献获取 Playbook,涵盖搜索边界与候选证据、重复与身份对比、获取与就绪矩阵、工作流与写入权限、搜索计划模板、候选决策记录、批与部分结果矩阵以及三个端到端追踪(近期论文、批量导入集合、重复歧义)。
- [zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md](zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md): Zotero 文献获取 Skill,负责将有限文献需求转化为可追溯的候选评估或经实时验证的获取结果,保留外部来源、Zotero 身份、重复状态与附件就绪性,处理自然语言中"找/收集/获取/导入/准备"的不同意图。
- [zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md](zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md): 文献分析 Playbook,定义源可用性与证据深度阶梯、分析流程、工作流产出分析、交付物与完成证据、分析交付模式、对比与矛盾处理、证据缺失矩阵及三个端到端追踪(异源深度对比、深度阅读混合结果、OCR 中断)。
- [zotero-library-agent/skills/zotero-literature-analysis/SKILL.md](zotero-library-agent/skills/zotero-literature-analysis/SKILL.md): Zotero 文献分析 Skill,基于已验证的 Zotero 来源生成有限范围的摘要、抽取、对比或解读,显式记录证据深度与定位符,区分工作流产出分析与实时文献库状态,不进行写入。
- [zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md](zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md): 研究综合 Playbook,提供综合模型选择矩阵、源与新鲜度纪律、工作流与维护边界、有序综合生命周期、派生模型决策记录、维护前置条件与回执、导出证据矩阵以及三个端到端追踪(引用图谱解读、陈旧主题刷新、合成与导出包)。
- [zotero-library-agent/skills/zotero-research-synthesis/SKILL.md](zotero-library-agent/skills/zotero-research-synthesis/SKILL.md): Zotero 研究综合 Skill,基于已验证来源与派生研究结构关联到问题/主题/论断/图谱/空白/导出,保留源分歧、模型来源、新鲜度与按阶段完成证据,包含直接研究包分支与主题规划器预处理逻辑。

## zotero-librarian

- [zotero-librarian/README.md](zotero-librarian/README.md): Hermes 根 README，介绍 Zotero Librarian 配置的安装、初始化、常驻模型、文档导览与连接配置工作区规则。
- [zotero-librarian/skills/zotero-librarian/references/automation-policy.md](zotero-librarian/skills/zotero-librarian/references/automation-policy.md): 自动化策略：授权矩阵、工作流模式与委派、原生提交与队列监督、提供方配置与并发、Cron 与维护、自然语言自动化决策、原生提交授权生命周期及关注项与升级剧本。
- [zotero-librarian/skills/zotero-librarian/references/resident-operations.md](zotero-librarian/skills/zotero-librarian/references/resident-operations.md): 常驻操作参考：服务契约、配置工作区、操作契约矩阵、索引与文献库问答、工作流目录与运行监督、通知、定时扫描、完成证据与失败，以及每项操作的详细操作卡与恢复示例。
- [zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md](zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md): 状态与恢复参考：状态所有权与模式、配置本地状态边界、新鲜度与原子更新、恢复序列、句柄与不确定结果、安装与配置恢复、当前状态模型、原生提交身份与状态转换、按域恢复序列、不确定效果恢复以及状态重建边界。
- [zotero-librarian/skills/zotero-librarian/SKILL.md](zotero-librarian/skills/zotero-librarian/SKILL.md): 可执行常驻契约：目标、输入、自然语言接入、工作流、常驻路由、硬约束、回执契约、完成、汇报检查单与失败处理。
- [zotero-librarian/SOUL.md](zotero-librarian/SOUL.md): 馆员角色文件，定义 Zotero Librarian 的工作姿态、研究与工作流姿态以及沟通原则。
