# Host Bridge 中文审阅镜像

生成时间：2026-09-08T20:20:18.272Z

本目录按发布面所有权保存中文译文；继承内容只在其所有者目录出现一次。有效组成由下表的继承链和文件数表达。

| 发布面 | 类型 | 继承链 | 自有文件 | 继承文件 | 有效文件 |
| --- | --- | --- | ---: | ---: | ---: |
| `zotero-bridge-cli` | `minimum-core` | `zotero-bridge-cli` | 135 | 0 | 135 |
| `zotero-library-agent` | `generic-agent` | `zotero-bridge-cli` → `zotero-library-agent` | 13 | 135 | 148 |
| `zotero-librarian` | `hosted-agent` | `zotero-bridge-cli` → `zotero-library-agent` → `zotero-librarian` | 6 | 148 | 154 |

## zotero-bridge-cli

- [zotero-bridge-cli/skills/zotero-bridge-cli/references/command-catalog.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/command-catalog.md): Zotero Bridge 命令目录：按任务族组织全部规范命令的导航索引，用于命令发现与选择。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/list.md): 列出已脱敏的后端 profile 诊断信息
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/backend/status.md): 读取一个脱敏 backend profile 状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/manifest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/manifest.md): 读取已认证的 Zotero Bridge 服务清单
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/diagnose.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/diagnose.md): 诊断 Zotero Bridge 连接 profile 就绪度
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/inspect.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/profile/inspect.md): 检查已脱敏的 Zotero Bridge 连接 profile
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/bridge/status.md): 不经认证检查 Zotero Bridge 服务健康
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/call/index.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/call/index.md): 高级诊断用原始 capability 调用
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/current.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/current.md): 读取当前 Zotero UI 上下文
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/selection/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/context/selection/get.md): 读取所选 Zotero items 的一页精确内容
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/acp-skill-run/reapply-result.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/acp-skill-run/reapply-result.md): 对一个已存在的 ACP skill run 结果重新运行 applyResult
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/persistence.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/persistence.md): 读取仅用于调试的持久化诊断信息
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/status.md): 读取仅调试的 Zotero Bridge 服务运行时状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/cache.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/cache.md): 列出仅调试的 Synthesis sidecar 缓存基础行
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/clean-install-reset.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/clean-install-reset.md): 危险调试操作：重置 Synthesis 安装状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/diff.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/diff.md): 读取仅供调试的 Synthesis DB/cache 差异
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-paper.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-paper.md): 检查一个 debug Synthesis 论文
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-topic.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/inspect-topic.md): 检查一个调试 Synthesis topic
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/operations.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/operations.md): 列出仅 debug 的 Synthesis 显式操作
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/profiler.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/profiler.md): 列出仅用于调试的 Synthesis profiler 计时
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/snapshot.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/synthesis/snapshot.md): 读取一个仅用于调试的 Synthesis 快照
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/tasks.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/debug/tasks.md): 读取仅用于调试的 workflow task 诊断信息
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/download.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/download.md): 下载一个已注册文件 handle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/upload.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/file/upload.md): 通过 Zotero Bridge 上传一个本地文件并返回短时文件 handle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/export.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/export.md): 导出一个 Zotero 条目的阅读器标注
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/annotation/list.md): 列出一个 Zotero 条目的阅读器标注
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/attachments.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/attachments.md): 列出一个 Zotero 条目的子附件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/get.md): 获取一个 Zotero 条目的详细元数据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/notes.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/notes.md): 列出一个 Zotero item 的子 notes
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/search.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/item/search.md): 搜索 Zotero library items
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/export-research-bundle.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/export-research-bundle.md): 导出一个或多个论文作为 research bundle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/items/list.md): 列出紧凑的 Zotero 库 item 摘要
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/get.md): 读取一个 Zotero note 正文块
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payload.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payload.md): 从一个 Zotero note 读取一个内嵌 workflow payload
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payloads.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/note/payloads.md): 列出一个 Zotero note 中嵌入的 workflow payloads
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/audit.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/audit.md): 审计 PDF、源 Markdown 与 literature-analysis artifact 就绪度
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-analysis.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-analysis.md): 列出缺少文献分析生成 artifacts 的 Zotero items
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-markdown.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-markdown.md): 列出缺少同词干 source Markdown 的 Zotero items
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-pdf.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/readiness/missing-pdf.md): 列出缺少 PDF attachment 的 Zotero items
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/saved-searches/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/saved-searches/list.md): 列出一个有源边界的 Saved Search 页
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/snapshot.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/library/snapshot.md): 读取一个固定的 Zotero 全库快照页面
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/add-items.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/add-items.md): 将 Zotero items 添加到一个 collection
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/create.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/create.md): 创建一个 Zotero collection
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/remove-items.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/collection/remove-items.md): 从 collection 移除 Zotero items
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/get-operation.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/get-operation.md): 读取规范 mutation 证据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/attach-file.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/attach-file.md): 将通过 Zotero Bridge 上传的文件附加到 Zotero item
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/update.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/item/update.md): 更新 Zotero item 字段
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/literature-ingest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/literature-ingest.md): 把搜索到的文献导入 Zotero
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/create.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/create.md): 在一个 Zotero item 下创建子笔记
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/update.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/update.md): 更新一个 Zotero note
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/upsert-payload.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/note/upsert-payload.md): Upsert 一个嵌入的 note payload
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/add.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/add.md): 向 Zotero items 添加 tags
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/remove.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/mutation/tag/remove.md): 从 Zotero items 移除 tags
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/focus-zotero.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/focus-zotero.md): 将 Zotero 主窗口带到前台并聚焦。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/open-item.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/open-item.md): 在 Zotero 界面中打开指定条目。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/open-reader-location.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/open-reader-location.md): 在 Reader 中打开指定页、annotation 或 EPUB 位置。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/reveal-items.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/reveal-items.md): 在 Zotero 界面中定位并高亮显示指定条目。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/select-collection.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/select-collection.md): 在 Zotero 界面中选择指定 collection。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/select-library-view.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/select-library-view.md): 在 Zotero 界面中选择库视图（如我的文库/分组）。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/select-saved-search.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/navigation/select-saved-search.md): 在 Zotero 界面中选择指定保存的搜索。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/operation/index.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/operation/index.md): 读取一个持久 Zotero operation receipt
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/download.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/download.md): 下载一个或全部 Dashboard Product assets
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/get.md): 读取一个普通 Dashboard Product
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/list.md): 列出普通 Dashboard Products
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/remove.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/product/remove.md): 通过 Zotero approval 移除一个 Dashboard Product 记录
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/active.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/active.md): 列出轻量级活动 workflow 运行时任务
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/cancel.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/cancel.md): 请求取消一次 workflow run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/get.md): 读取一个 workflow run 状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/list.md): 列出活动与近期的 workflow 运行时任务
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/ack.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/ack.md): 确认 workflow notification inbox 事件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/list.md): 列出 workflow 通知收件箱事件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/wait.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/notification/wait.md): 轮询直到 workflow 通知可用
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/get.md): 读取一个 Zotero 侧 permission request
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/pending.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/permission/pending.md): 列出待处理的 Zotero 侧权限请求
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/recent.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/recent.md): 列出轻量的最近 workflow runtime tasks
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/connect.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/connect.md): 连接一个可恢复的 ACP skill run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/events.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/events.md): 列出一个 skill run 的轻量级生命周期事件
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/get.md): 读取一个具体 skill run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/recent.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/recent.md): 列出近期的具体 skill runs
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/reply.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/skill/reply.md): 回复一个等待中的 ACP skill run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/workflow/recent.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/run/workflow/recent.md): 列出近期 workflow runs
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/describe.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/describe.md): 全局选项可出现在叶命令之前或之后。此叶命令没有结构化 JSON 输入。`--schema` 返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 检查调用契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/identity.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/identity.md): 打印确切的 CLI 构建与命令目录 identity
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/search.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/surface/search.md): 全局选项可出现在叶命令之前或之后。此叶命令没有结构化 JSON 输入。`--schema` 返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 检查调用契约。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/export-filtered.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/export-filtered.md): 把有界的论文 artifacts 导出到 run workspace
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/manifest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/manifest.md): 读取论文 artifact manifest 元数据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/read.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/read.md): 读取所选论文 artifacts
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/resolve-topic-digest.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/artifact/resolve-topic-digest.md): 解析 topic 论文摘要
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/invalidate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/invalidate.md): 使受限 Synthesis 缓存范围失效
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/refresh-reference-sidecar.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/refresh-reference-sidecar.md): 启动 reference-sidecar 刷新
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/cache/status.md): 读取 Synthesis cache 维护状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/concept/query.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/concept/query.md): 查询 Synthesis Concept KB 候选
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-layout.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-layout.md): 读取持久化的引用图布局坐标
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-metrics.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-metrics.md): 读取所选论文的 citation graph metrics
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-slice.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/get-slice.md): 读取一段 Synthesis 引文图
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/overview.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/overview.md): 读取分页的 Synthesis citation graph 概览
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/query-cluster.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/query-cluster.md): 查询一个 topic 作用域的引用图 cluster
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-external-references.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-external-references.md): 从引文图对外部参考文献排名
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-library-papers.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/rank-library-papers.md): 从引文图 metrics 对库内论文排名
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/refresh-metrics.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/refresh-metrics.md): 刷新持久化的引文图复杂指标
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/update.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/graph/update.md): 启动 citation graph 更新
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/library/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/library/get.md): 全局选项可出现在叶命令之前或之后。使用 `--schema` 检查原始结构化输入 schema，而无需加载 profile 或连接 Zotero。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/reference/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/reference/get.md): 全局选项可出现在叶命令之前或之后。使用 `--schema` 检查原始结构化输入 schema，而无需加载 profile 或连接 Zotero。
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/index/status.md): 读取 Synthesis index 维护状态
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/insight/attention-queue.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/insight/attention-queue.md): 读取聚合 graph/artifact/reference attention 条目
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/resolver/resolve.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/resolver/resolve.md): 将 topic resolver 解析为论文集
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/schema/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/schema/get.md): 读取 Synthesis Layer schema 元数据
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/export-research-bundle.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/export-research-bundle.md): 导出一个或多个 Topic 研究捆绑包
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/find-by-paper-ref.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/find-by-paper-ref.md): 按 paper_ref 查找活动的 topic synthesis topics
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-context.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-context.md): 读取一个 topic synthesis 上下文
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-planning-context.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-planning-context.md): 读取库级 topic 规划上下文
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-report.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-report.md): 读取一个 topic synthesis 报告的 markdown 正文
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-review-input.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/get-review-input.md): 从 Synthesis 读取 review workflow 输入
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/synthesis/topic/list.md): 列出既有 topic synthesis topics
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-abandon.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-abandon.md): 放弃一个未消费的 agent run
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply-status.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply-status.md): 读取 agent run 的可审计 apply-back receipt
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-apply.md): 应用已定稿的自有 agent workflow 结果 bundles
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-bundle/inspect.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-bundle/inspect.md): 检查本地 agent handoff 目录
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-renew.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-renew.md): 续约一次未被消费的 agent-run 租约
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-result/validate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-result/validate.md): 根据输出契约校验本地 agent 结果目录
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-run.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/agent-run.md): 准备一个自有 agent workflow handoff bundle
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/defaults.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/defaults.md): 显示保存的 workflow provider profile 候选
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/describe.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/describe.md): 描述 workflow 选择与 workflow 选项
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/list.md): 列出已加载的 workflow
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/describe.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/describe.md): 描述一个后端的 provider profile 契约
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/list.md): 列出已配置的 backend provider profiles
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/refresh.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/refresh.md): 刷新 ACP backend provider catalog
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/validate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/profile/validate.md): 校验并归一化一个后端 provider profile
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/cancel.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/cancel.md): 取消一个仍在待处理的 Zotero 管理 workflow 队列单元
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/list.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/queue/list.md): 列出待处理的 Zotero 受管理 workflow 队列单元
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/requirements.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/requirements.md): 读取 workflow 要求
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submission/get.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submission/get.md): 读取一个活动的 Zotero 受管理 workflow submission
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submit.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/submit.md): 用显式 JSON 输入提交 workflow
- [zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/validate.md](zotero-bridge-cli/skills/zotero-bridge-cli/references/commands/workflow/validate.md): 在不启动执行的情况下校验 workflow 输入
- [zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md](zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md): zotero-bridge-cli Skill 主文档：Zotero Bridge CLI 的完整机制契约，覆盖可执行文件选择、连接、命令发现、调用、效果与审批解读、句柄与恢复。

## zotero-library-agent

- [zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md](zotero-library-agent/skills/zotero-library-agent/references/research-task-model.md): 研究任务模型：请求槽位、任务形态、handoff 记录与证据契约。
- [zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md](zotero-library-agent/skills/zotero-library-agent/references/workflow-catalog.md): workflow 目录：列出内置 workflow 的标识、JSON schema 输入与适用范围。
- [zotero-library-agent/skills/zotero-library-agent/SKILL.md](zotero-library-agent/skills/zotero-library-agent/SKILL.md): zotero-library-agent Skill 主文档：将有界研究请求路由到最小任务 Skill，或在跨边界时编排多 Skill 序列。
- [zotero-library-agent/skills/zotero-library-curation/references/playbook.md](zotero-library-agent/skills/zotero-library-curation/references/playbook.md): 库整理 Playbook：标签规范、去重、附件管理与变更回执。
- [zotero-library-agent/skills/zotero-library-curation/SKILL.md](zotero-library-agent/skills/zotero-library-curation/SKILL.md): zotero-library-curation Skill：元数据、标签、附件与 note 的整理变更。
- [zotero-library-agent/skills/zotero-library-query/references/playbook.md](zotero-library-agent/skills/zotero-library-query/references/playbook.md): 库查询 Playbook：查询类型、分页纪律与证据标准。
- [zotero-library-agent/skills/zotero-library-query/SKILL.md](zotero-library-agent/skills/zotero-library-query/SKILL.md): zotero-library-query Skill：精确执行有界库查询、分页与选择解析。
- [zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md](zotero-library-agent/skills/zotero-literature-acquisition/references/playbook.md): 文献获取 Playbook：检索、去重、纳入边界与获取后处理。
- [zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md](zotero-library-agent/skills/zotero-literature-acquisition/SKILL.md): zotero-literature-acquisition Skill：获取环节的文献搜索与纳入决策。
- [zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md](zotero-library-agent/skills/zotero-literature-analysis/references/playbook.md): 文献分析 Playbook：证据分级、分析工作流与产物格式。
- [zotero-library-agent/skills/zotero-literature-analysis/SKILL.md](zotero-library-agent/skills/zotero-literature-analysis/SKILL.md): zotero-literature-analysis Skill：对选定文献执行有界分析并产出可核实结果。
- [zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md](zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md): 研究综合 Playbook：话题规划、来源边界、分歧保留与导出验证。
- [zotero-library-agent/skills/zotero-research-synthesis/SKILL.md](zotero-library-agent/skills/zotero-research-synthesis/SKILL.md): zotero-research-synthesis Skill：将限定来源集合合成为主张图与综合报告。

## zotero-librarian

- [zotero-librarian/README.md](zotero-librarian/README.md): Zotero Librarian Hermes Profile 的安装与使用说明，面向常驻的 Zotero 库监督与运维场景。
- [zotero-librarian/skills/zotero-librarian/references/automation-policy.md](zotero-librarian/skills/zotero-librarian/references/automation-policy.md): 自动化策略：区分常驻监督与一次性任务、变更审批边界与回滚要求。
- [zotero-librarian/skills/zotero-librarian/references/resident-operations.md](zotero-librarian/skills/zotero-librarian/references/resident-operations.md): 常驻操作参考：索引维护、workflow/run 监督、通知与 maintenance 命令语义。
- [zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md](zotero-librarian/skills/zotero-librarian/references/state-and-recovery.md): 常驻状态与恢复：持久化记录、重启恢复、中断处理与证据保留。
- [zotero-librarian/skills/zotero-librarian/SKILL.md](zotero-librarian/skills/zotero-librarian/SKILL.md): zotero-librarian Skill 主文档：定义常驻 Zotero 库监督、定时运维与库问答的目标、输入与工作流。
- [zotero-librarian/SOUL.md](zotero-librarian/SOUL.md): Zotero Librarian 的人格与工作姿态定义：冷静精确的馆员，强调可核实证据与有界提问。
