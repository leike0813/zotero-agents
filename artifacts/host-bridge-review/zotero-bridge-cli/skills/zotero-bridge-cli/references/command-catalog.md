# Zotero Bridge 命令目录

当你清楚用户想在 Zotero 中做什么但还不知道规范命令时使用本 catalog。它是详细命令参考的导航层，而不是替代品。

## 发现顺序

1. 用 Zotero 术语重述请求结果：对象、作用域、新鲜度、交付物，以及状态是否可能改变。
2. 在下方找到匹配的 task 族，并检查其自然语言线索。
3. 从紧凑 index 选择一个或多个候选规范命令。
4. 若映射仍不明确，运行 `zotero-bridge surface search --intent <plain-language intent>`。
5. 用 `zotero-bridge surface describe '<canonical command>'` 确认实时命令契约。
6. 构造 argv 或 payload 前阅读链接的详细命令参考。
7. 只在解析出所需身份、输入通道、authority 与恢复路径后执行。

## 如何阅读 index

- 命令名与一行式用途有助于发现。
- 详细参考拥有 argv、bindings、调用与结果 schemas、分页、效果、approval、handles、targets、别名与恢复。
- 出现在 catalog 中的命令并不证明当前 Zotero 实例已连接、某个 workflow 可用，或所请求的写入已授权。
- `surface search` 返回候选；它不选择正确命令，也不授权执行。
- `surface describe` 是所选命令的实时权威。若它与静态指引不同，遵循实时描述符并报告不一致。
- 使用拥有所请求影响的最小语义命令。不要仅仅因为底层路径看起来更短就用 `call` 或 `debug` 替换它。

## 跨族请求

许多用户请求需要有序序列而非单个命令。保持每个系列边界显式：

- 在读取“this paper”或“these items”之前解析当前上下文。
- 提出 mutation 前读取并核实身份。
- 附加签发的 file handle 前上传字节。
- 提交前验证 workflow。
- 只监控提交返回的类型化 run 句柄。
- 终态 run 后验证 Products、artifacts、下载字节或实时 Zotero 状态。
- 在提出 maintenance 操作前诊断过期的 Synthesis 模型。

不要让较早的读取、候选列表、验证结果或已完成的 run 暗示后续状态改变的权限。

## 文件、Product 与操作身份模型

文件传输、Product 检查与操作恢复可出现在同一任务中，但其标识符不可互换。

- 本地路径标识 agent 已可用的字节。
- `fileId` 标识 bridge 中介的传输访问，可能过期或被消耗。
- Product ID 标识 Zotero 插件 Product 记录，而非其某个 asset。
- Product asset 有其自身的声明角色、媒体类型、大小、校验和与交付路由。
- operation ID 标识持久的状态变更或 maintenance operation 及其 receipt。
- workflow artifact 在通过该契约下载或应用之前，仍归其 workflow 或请求契约所有。
- Zotero attachment 是实时库状态，必须通过 library 或 mutation surface 读取。

从属主命令返回的 identity 出发。不要把看似绝对的 Zotero 路径变成本地路径、从 Product 推断 `fileId`，或把 operation ID 当 run handle 用。

下载前，识别拥有这些字节的 attachment、Product asset、artifact 或 operation；取得其声明的传输指令；必要时选择绝对本地目标；检查覆盖与校验和预期；然后只下载一次并验证结果。上传前，解析本地文件，识别之后将消费它的语义 operation，上传时不把路径当作 Zotero 证据，保留返回的 handle 与完整性字段，且仅在该 handle 用于声明的下一条命令。仅上传不会在 Zotero 中附加或持久化字节，仅下载也不能证明 Product 或 workflow 结果完整。

对每个候选命令，选择前检查 `outputBoundary`。cursor 命令要求在不变准则下完整遍历续读；offset 命令要求有序文本重建；limit 命令可能需要更窄的 selector；file 命令要求 handle 下载与完整性验证；fixed 命令仅在其声明的硬界限内完整。`surface search` 仅返回精简候选，因此使用 `surface describe` 或链接的命令卡获取这些详情。

选择 asset 前先检查 Product。确认其身份与产出 workflow，检查状态与已声明 assets，按角色与媒体类型而非猜测的文件名选择，保留大小与校验和，通过当前契约请求交付，并独立核实下载的字节。没有期望 Product 的终态 workflow 不是成功的输出交付；缺少必需 asset 不是完整的交付物；下载的 Product 不会自动成为 Zotero attachment 或 note。

当前一条命令返回 operation receipt 时，先一起解读 `stateChange`、`handleConsumption` 与 `retryable`，再重复任何操作。状态未变只允许声明的安全延续；状态已变要求在下一次写入前实时读取；状态未知要求检查 receipt 与目标。已消耗或未知的 handle 不得重放。绝不用新的 submission、upload、mutation 或 maintenance 调用替换未知 receipt。

对于 workflow Product，验证终态 run 契约，检查声明的 Product，选择所需 asset，通过其当前 handle 下载，验证校验和与字节，并单独报告缺失的预期 asset。要附加本地 artifact，请验证父级与当前附件、上传字节、保留已签发的 `fileId`、预览确切的附件变更、获取当前 approval、应用一次并重新读取附件。要恢复被中断的 maintenance，保留 operation ID 与范围，读取持久 receipt，检查受影响的实时状态，将已完成、失败、未尝试与无法验证的对象分开，并只构造 receipt 允许的残余动作。

过期的文件访问必须从所有者处重新获取。校验和不匹配不得用作证据。缺失的 Product 资产必须上报而不是替换。未知的 operation 状态会阻止重放。已消耗的 handle 必须从其所有者处重新获取。仅当命令显式支持续传时，部分传输才可复用。完成证据：对于传输是已校验的本地字节，对于 Product 是已检查的必需资产，对于 operation 是持久 receipt 加实时状态。

## 连接、检查当前选择或发现 capabilities

用本命令族建立实时 Zotero 连接、检查用户在 UI 中指向的内容，并发现当前命令契约。

自然语言提示：

- 此 item、这些论文、当前 collection，或选中的是什么。
- Zotero 能否做到、存在哪个命令，或它需要什么输入。
- 连接、profile、端点、认证或 bridge 可用性。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge bridge backend list` | 列出脱敏的 backend profile 诊断 | [打开卡片](commands/bridge/backend/list.md) |
| `zotero-bridge bridge backend status` | 读取一个脱敏 backend profile 状态 | [打开卡片](commands/bridge/backend/status.md) |
| `zotero-bridge bridge manifest` | 读取已认证的 Zotero Bridge 服务 manifest | [Open card](commands/bridge/manifest.md) |
| `zotero-bridge bridge profile diagnose` | 诊断 Zotero Bridge 连接 profile 的就绪状态 | [Open card](commands/bridge/profile/diagnose.md) |
| `zotero-bridge bridge profile inspect` | 检查已脱敏的 Zotero Bridge 连接 profile | [Open card](commands/bridge/profile/inspect.md) |
| `zotero-bridge bridge status` | 不经认证检查 Zotero Bridge 服务健康 | [打开卡片](commands/bridge/status.md) |
| `zotero-bridge context current` | 读取当前 Zotero UI 上下文 | [打开卡片](commands/context/current.md) |
| `zotero-bridge context selection get` | 读取一页精确选定的 Zotero items | [打开卡片](commands/context/selection/get.md) |
| `zotero-bridge surface describe` | 描述一个规范命令 | [打开卡片](commands/surface/describe.md) |
| `zotero-bridge surface identity` | 打印确切的 CLI 构建与命令 catalog 身份 | [打开卡片](commands/surface/identity.md) |
| `zotero-bridge surface search` | 按任务意图搜索规范命令 | [打开卡片](commands/surface/search.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 查找、检查、翻页或导出库内容

用本命令族处理当前 Zotero items、collections、notes、attachments、就绪度、快照与有界导出。

自然语言提示：

- 我的 library、collection 或当前研究集里有什么。
- 查找关于 topic 的论文、检查一个 item 或列出其子级。
- 读取 notes、attachments、annotations、就绪度或分页快照。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge library annotation export` | 导出一个 Zotero item 的阅读器 annotations | [打开卡片](commands/library/annotation/export.md) |
| `zotero-bridge library annotation list` | 列出一个 Zotero item 的阅读器标注 | [Open card](commands/library/annotation/list.md) |
| `zotero-bridge library item attachments` | 列出一个 Zotero item 的子 attachments | [打开卡片](commands/library/item/attachments.md) |
| `zotero-bridge library item get` | 获取一个 Zotero item 的详细元数据 | [打开卡片](commands/library/item/get.md) |
| `zotero-bridge library item notes` | 列出一个 Zotero item 的子 notes | [打开卡片](commands/library/item/notes.md) |
| `zotero-bridge library item search` | 搜索 Zotero library items | [Open card](commands/library/item/search.md) |
| `zotero-bridge library items export-research-bundle` | 将一篇或多篇论文导出为 research bundle | [打开卡片](commands/library/items/export-research-bundle.md) |
| `zotero-bridge library items list` | 列出简洁的 Zotero library item 摘要 | [Open card](commands/library/items/list.md) |
| `zotero-bridge library note get` | 读取一个 Zotero note 正文块 | [打开卡片](commands/library/note/get.md) |
| `zotero-bridge library note payload` | 从 Zotero note 读取一个内嵌 workflow payload | [打开卡片](commands/library/note/payload.md) |
| `zotero-bridge library note payloads` | 列出一个 Zotero note 中的内嵌 workflow payload | [Open card](commands/library/note/payloads.md) |
| `zotero-bridge library readiness audit` | 审计 PDF、source Markdown 与文献分析 artifact 的就绪状态 | [打开卡片](commands/library/readiness/audit.md) |
| `zotero-bridge library readiness missing-analysis` | 列出缺少文献分析生成 artifact 的 Zotero items | [打开卡片](commands/library/readiness/missing-analysis.md) |
| `zotero-bridge library readiness missing-markdown` | 列出缺少同名 stem 源 Markdown 的 Zotero items | [Open card](commands/library/readiness/missing-markdown.md) |
| `zotero-bridge library readiness missing-pdf` | 列出缺少 PDF 附件的 Zotero items | [Open card](commands/library/readiness/missing-pdf.md) |
| `zotero-bridge library saved-searches list` | 列出源受限的 Saved Search 页 | [打开卡片](commands/library/saved-searches/list.md) |
| `zotero-bridge library snapshot` | 读取一个固定的 Zotero 全库快照页 | [打开卡片](commands/library/snapshot.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 导航 Zotero 用户界面

用本命令族做显式 UI 导航，同时保留可移植引用与捕获的 Zotero 窗口边界。

自然语言提示：

- 聚焦 Zotero，选择库视图、collection 或已保存搜索。
- 在 Zotero 界面中 reveal 或打开已知 item。
- 在 Reader 中打开精确页、annotation 或 EPUB 位置。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge navigation focus-zotero` | navigation focus-zotero | [Open card](commands/navigation/focus-zotero.md) |
| `zotero-bridge navigation open-item` | navigation open-item | [打开卡片](commands/navigation/open-item.md) |
| `zotero-bridge navigation open-reader-location` | navigation open-reader-location | [打开卡片](commands/navigation/open-reader-location.md) |
| `zotero-bridge navigation reveal-items` | navigation reveal-items | [Open card](commands/navigation/reveal-items.md) |
| `zotero-bridge navigation select-collection` | navigation select-collection | [Open card](commands/navigation/select-collection.md) |
| `zotero-bridge navigation select-library-view` | navigation select-library-view | [Open card](commands/navigation/select-library-view.md) |
| `zotero-bridge navigation select-saved-search` | navigation select-saved-search | [Open card](commands/navigation/select-saved-search.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 预览并应用显式 Zotero 数据变更

仅当目标身份与期望状态具体且当前请求授权已审查的 mutation 时使用本命令族。

自然语言提示：

- 更改元数据、tags、collections、notes、链接或 attachments。
- 预览写入、应用已批准 payload 或检查 mutation 状态。
- 合并、删除、relink 或覆盖已知 Zotero 对象。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge mutation collection add-items` | 将 Zotero items 添加到 collection | [打开卡片](commands/mutation/collection/add-items.md) |
| `zotero-bridge mutation collection create` | 创建一个 Zotero collection | [Open card](commands/mutation/collection/create.md) |
| `zotero-bridge mutation collection remove-items` | 从 collection 移除 Zotero items | [打开卡片](commands/mutation/collection/remove-items.md) |
| `zotero-bridge mutation get-operation` | 读取规范变更证据 | [Open card](commands/mutation/get-operation.md) |
| `zotero-bridge mutation item attach-file` | 将通过 Zotero Bridge 上传的文件附加到 Zotero item | [打开卡片](commands/mutation/item/attach-file.md) |
| `zotero-bridge mutation item update` | 更新 Zotero item 字段 | [打开卡片](commands/mutation/item/update.md) |
| `zotero-bridge mutation literature-ingest` | 将搜索到的文献 ingest 到 Zotero | [打开卡片](commands/mutation/literature-ingest.md) |
| `zotero-bridge mutation note create` | 在一个 Zotero item 下创建子笔记 | [Open card](commands/mutation/note/create.md) |
| `zotero-bridge mutation note update` | 更新一个 Zotero note | [Open card](commands/mutation/note/update.md) |
| `zotero-bridge mutation note upsert-payload` | 更新一个嵌入的 note payload | [Open card](commands/mutation/note/upsert-payload.md) |
| `zotero-bridge mutation tag add` | 向 Zotero items 添加 tags | [Open card](commands/mutation/tag/add.md) |
| `zotero-bridge mutation tag remove` | 从 Zotero items 移除 tags | [打开卡片](commands/mutation/tag/remove.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 移动字节、检查 Products 或跟踪持久 operations

当 Zotero 对象或 workflow 结果指名必须传输或验证的文件、Product、asset 或长运行 operation 时，使用此族。

自然语言提示：

- 上传或下载文件时，不要混淆路径与 file handle。
- 检查 Product 或取回其声明的 asset 之一。
- 使用其持久 receipt 恢复或验证 operation。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge file download` | 下载一个已注册的文件 handle | [打开卡片](commands/file/download.md) |
| `zotero-bridge file upload` | 通过 Zotero Bridge 上传一个本地文件并返回一个短期 file handle | [Open card](commands/file/upload.md) |
| `zotero-bridge operation get` | 读取一个持久 Zotero 操作 receipt | [打开卡片](commands/operation/index.md) |
| `zotero-bridge product download` | 下载一个或全部 Dashboard Product asset | [打开卡片](commands/product/download.md) |
| `zotero-bridge product get` | 读取一个普通 Dashboard Product | [Open card](commands/product/get.md) |
| `zotero-bridge product list` | 列出常规 Dashboard Products | [打开卡片](commands/product/list.md) |
| `zotero-bridge product remove` | 通过 Zotero approval 移除一个 Dashboard Product 记录 | [打开卡片](commands/product/remove.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 发现、验证、提交或应用 workflow

使用此族检查实时 workflow 契约、验证选择与 provider 输入、提交受支持的执行，或应用 agent 拥有的结果。

自然语言提示：

- 使用已安装 workflow 进行分析、获取、synthesis 或整理。
- 检查 workflow options、provider profile、选择或就绪状态。
- 提交、检查 artifacts 或应用 Agent 拥有的结果。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge workflow agent-abandon` | 放弃一个未消费的 agent run | [打开卡片](commands/workflow/agent-abandon.md) |
| `zotero-bridge workflow agent-apply` | 应用已定稿的自有 agent workflow 结果 bundles | [打开卡片](commands/workflow/agent-apply.md) |
| `zotero-bridge workflow agent-apply-status` | 读取 agent run 的可审计 apply-back receipt | [打开卡片](commands/workflow/agent-apply-status.md) |
| `zotero-bridge workflow agent-bundle inspect` | 检查本地 agent handoff 目录 | [打开卡片](commands/workflow/agent-bundle/inspect.md) |
| `zotero-bridge workflow agent-renew` | 续约一次未被消费的 agent-run 租约 | [Open card](commands/workflow/agent-renew.md) |
| `zotero-bridge workflow agent-result validate` | 根据输出契约校验本地 agent 结果目录 | [Open card](commands/workflow/agent-result/validate.md) |
| `zotero-bridge workflow agent-run` | 准备自有 agent workflow handoff bundle | [打开卡片](commands/workflow/agent-run.md) |
| `zotero-bridge workflow defaults` | 显示已保存的 workflow provider profile 候选 | [打开卡片](commands/workflow/defaults.md) |
| `zotero-bridge workflow describe` | 描述 workflow 选择与 workflow 选项 | [Open card](commands/workflow/describe.md) |
| `zotero-bridge workflow list` | 列出已加载 workflows | [打开卡片](commands/workflow/list.md) |
| `zotero-bridge workflow profile describe` | 描述一个 backend 的 provider profile 契约 | [打开卡片](commands/workflow/profile/describe.md) |
| `zotero-bridge workflow profile list` | 列出已配置的 backend provider profiles | [打开卡片](commands/workflow/profile/list.md) |
| `zotero-bridge workflow profile refresh` | 刷新 ACP backend provider 目录 | [打开卡片](commands/workflow/profile/refresh.md) |
| `zotero-bridge workflow profile validate` | 验证并规范化一个 backend provider profile | [打开卡片](commands/workflow/profile/validate.md) |
| `zotero-bridge workflow queue cancel` | 取消一个仍在待处理的 Zotero 管理 workflow 队列单元 | [Open card](commands/workflow/queue/cancel.md) |
| `zotero-bridge workflow queue list` | 列出待处理的 Zotero 管理 workflow 队列单元 | [Open card](commands/workflow/queue/list.md) |
| `zotero-bridge workflow requirements` | 读取 workflow 要求 | [Open card](commands/workflow/requirements.md) |
| `zotero-bridge workflow submission get` | 读取一个活动的 Zotero 管理 workflow 提交 | [Open card](commands/workflow/submission/get.md) |
| `zotero-bridge workflow submit` | 使用显式 JSON 输入提交 workflow | [Open card](commands/workflow/submit.md) |
| `zotero-bridge workflow validate` | 在不启动执行的情况下校验 workflow 输入 | [Open card](commands/workflow/validate.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 监视、交互或取消 workflow run

当 workflow 已返回类型化 run handle，且任务需要当前状态、提示、通知、结果或取消时，使用本系列。

自然语言提示：

- 该 workflow 在做什么、是否完成，或它需要什么。
- 回答 run prompt、确认 notification 或取消 run。
- 检查终态结果证据，而不把终止当作输出证明。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge run active` | 列出轻量级活动 workflow 运行时任务 | [Open card](commands/run/active.md) |
| `zotero-bridge run cancel` | 请求取消一个 workflow run | [打开卡片](commands/run/cancel.md) |
| `zotero-bridge run get` | 读取一次 workflow run 状态 | [Open card](commands/run/get.md) |
| `zotero-bridge run list` | 列出活跃与最近的 workflow runtime tasks | [Open card](commands/run/list.md) |
| `zotero-bridge run notification ack` | 确认 workflow notification inbox 事件 | [打开卡片](commands/run/notification/ack.md) |
| `zotero-bridge run notification list` | 列出 workflow notification inbox 事件 | [打开卡片](commands/run/notification/list.md) |
| `zotero-bridge run notification wait` | 轮询直至有 workflow notification 可用 | [打开卡片](commands/run/notification/wait.md) |
| `zotero-bridge run permission get` | 读取一个 Zotero 侧权限请求 | [打开卡片](commands/run/permission/get.md) |
| `zotero-bridge run permission pending` | 列出待处理的 Zotero 侧 permission 请求 | [Open card](commands/run/permission/pending.md) |
| `zotero-bridge run recent` | 列出轻量级近期 workflow 运行时任务 | [打开卡片](commands/run/recent.md) |
| `zotero-bridge run skill connect` | 连接一个可恢复的 ACP skill run | [Open card](commands/run/skill/connect.md) |
| `zotero-bridge run skill events` | 列出一个 skill run 的轻量生命周期事件 | [打开卡片](commands/run/skill/events.md) |
| `zotero-bridge run skill get` | 读取一次具体的 skill run | [Open card](commands/run/skill/get.md) |
| `zotero-bridge run skill recent` | 列出近期具体 skill run | [打开卡片](commands/run/skill/recent.md) |
| `zotero-bridge run skill reply` | 回复一个等待中的 ACP skill run | [打开卡片](commands/run/skill/reply.md) |
| `zotero-bridge run workflow recent` | 列出最近的 workflow runs | [Open card](commands/run/workflow/recent.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 检查或维护 Synthesis topics、indexes、graphs 与 artifacts

将本命令族用于插件的派生研究结构，包括 topic 上下文、sidecar 索引、引文图、resolver 状态、attention 队列与导出。

自然语言提示：

- topic 上下文、synthesis 报告、graph 关系、指标或证据缺口。
- index 状态、resolver 候选、新鲜度或维护 receipts。
- 导出或检查 synthesis artifact，不要把它与实时库真相混淆。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge synthesis artifact export-filtered` | 将有界论文 artifact 导出到 run workspace | [打开卡片](commands/synthesis/artifact/export-filtered.md) |
| `zotero-bridge synthesis artifact manifest` | 读取论文 artifact manifest 元数据 | [打开卡片](commands/synthesis/artifact/manifest.md) |
| `zotero-bridge synthesis artifact read` | 读取所选论文 artifacts | [Open card](commands/synthesis/artifact/read.md) |
| `zotero-bridge synthesis artifact resolve-topic-digest` | 解析一个 topic 的 paper digest | [Open card](commands/synthesis/artifact/resolve-topic-digest.md) |
| `zotero-bridge synthesis cache invalidate` | 失效一个有约束的 Synthesis cache 作用域 | [Open card](commands/synthesis/cache/invalidate.md) |
| `zotero-bridge synthesis cache refresh-reference-sidecar` | 启动一次 reference-sidecar 刷新 | [打开卡片](commands/synthesis/cache/refresh-reference-sidecar.md) |
| `zotero-bridge synthesis cache status` | 读取 Synthesis cache 维护状态 | [Open card](commands/synthesis/cache/status.md) |
| `zotero-bridge synthesis concept query` | 查询 Synthesis Concept KB 候选 | [Open card](commands/synthesis/concept/query.md) |
| `zotero-bridge synthesis graph get-layout` | 读取持久化的引文图布局坐标 | [打开卡片](commands/synthesis/graph/get-layout.md) |
| `zotero-bridge synthesis graph get-metrics` | 读取所选论文的引用图指标 | [Open card](commands/synthesis/graph/get-metrics.md) |
| `zotero-bridge synthesis graph get-slice` | 读取一个 Synthesis 引用图切片 | [Open card](commands/synthesis/graph/get-slice.md) |
| `zotero-bridge synthesis graph overview` | 读取分页的 Synthesis 引文 graph 概览 | [Open card](commands/synthesis/graph/overview.md) |
| `zotero-bridge synthesis graph query-cluster` | 查询 topic 范围的引文图簇 | [打开卡片](commands/synthesis/graph/query-cluster.md) |
| `zotero-bridge synthesis graph rank-external-references` | 从引文图对外部参考文献排名 | [打开卡片](commands/synthesis/graph/rank-external-references.md) |
| `zotero-bridge synthesis graph rank-library-papers` | 按引文 graph 指标为库论文排名 | [Open card](commands/synthesis/graph/rank-library-papers.md) |
| `zotero-bridge synthesis graph refresh-metrics` | 刷新持久化的引文图复杂指标 | [打开卡片](commands/synthesis/graph/refresh-metrics.md) |
| `zotero-bridge synthesis graph update` | 启动一次引文图更新 | [打开卡片](commands/synthesis/graph/update.md) |
| `zotero-bridge synthesis index library get` | 读取一页 index | [打开卡片](commands/synthesis/index/library/get.md) |
| `zotero-bridge synthesis index reference get` | 读取一页 index | [打开卡片](commands/synthesis/index/reference/get.md) |
| `zotero-bridge synthesis index status` | 读取 Synthesis index 维护状态 | [打开卡片](commands/synthesis/index/status.md) |
| `zotero-bridge synthesis insight attention-queue` | 读取聚合的 graph/artifact/reference attention 条目 | [Open card](commands/synthesis/insight/attention-queue.md) |
| `zotero-bridge synthesis resolver resolve` | 将 topic resolver 解析为论文集合 | [Open card](commands/synthesis/resolver/resolve.md) |
| `zotero-bridge synthesis schema get` | 读取 Synthesis Layer schema 元数据 | [Open card](commands/synthesis/schema/get.md) |
| `zotero-bridge synthesis topic export-research-bundle` | 导出一个或多个 Topic research bundles | [Open card](commands/synthesis/topic/export-research-bundle.md) |
| `zotero-bridge synthesis topic find-by-paper-ref` | 按 paper_ref 查找活动的 topic synthesis topics | [Open card](commands/synthesis/topic/find-by-paper-ref.md) |
| `zotero-bridge synthesis topic get-context` | 读取一个 topic 综合 context | [Open card](commands/synthesis/topic/get-context.md) |
| `zotero-bridge synthesis topic get-planning-context` | 读取库范围的 topic 规划上下文 | [打开卡片](commands/synthesis/topic/get-planning-context.md) |
| `zotero-bridge synthesis topic get-report` | 读取一个 topic synthesis report 的 markdown 正文 | [打开卡片](commands/synthesis/topic/get-report.md) |
| `zotero-bridge synthesis topic get-review-input` | 从 Synthesis 读取审阅 workflow 输入 | [Open card](commands/synthesis/topic/get-review-input.md) |
| `zotero-bridge synthesis topic list` | 列出已有的 topic synthesis topics | [Open card](commands/synthesis/topic/list.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。

## 诊断 bridge 或做高级原始调用

仅当语义命令面无法诊断问题，或明确需要精确的低层 capability 调用时，才使用本族。

自然语言提示：

- 为不可用或不一致的 surface 收集有界诊断报告。
- 在保留正常授权边界的同时检查原始 capability 行为。
- 避免把 diagnostics 当作绕过语义校验的捷径。

从下方选择一个命令，然后阅读其链接的命令卡片。每张卡片都包含精确的 argv、schemas、示例、effects、approval、handles 与恢复契约。

| 规范命令 | 用途 | 命令卡片 |
| --- | --- | --- |
| `zotero-bridge call` | 高级诊断用原始 capability 调用 | [Open card](commands/call/index.md) |
| `zotero-bridge debug acp-skill-run reapply-result` | 为一个现有 ACP skill run 结果重新运行 applyResult | [打开卡片](commands/debug/acp-skill-run/reapply-result.md) |
| `zotero-bridge debug persistence` | 读取仅供调试的持久化诊断 | [Open card](commands/debug/persistence.md) |
| `zotero-bridge debug status` | 读取仅 debug 的 Zotero Bridge 服务运行时状态 | [打开卡片](commands/debug/status.md) |
| `zotero-bridge debug synthesis cache` | 列出仅用于调试的 Synthesis sidecar cache 基础行 | [打开卡片](commands/debug/synthesis/cache.md) |
| `zotero-bridge debug synthesis clean-install-reset` | 危险 debug operation：重置 Synthesis 安装状态 | [打开卡片](commands/debug/synthesis/clean-install-reset.md) |
| `zotero-bridge debug synthesis diff` | 读取仅用于调试的 Synthesis DB/cache 差异 | [打开卡片](commands/debug/synthesis/diff.md) |
| `zotero-bridge debug synthesis inspect-paper` | 检查一个调试 Synthesis paper | [打开卡片](commands/debug/synthesis/inspect-paper.md) |
| `zotero-bridge debug synthesis inspect-topic` | 检查一个 debug Synthesis topic | [打开卡片](commands/debug/synthesis/inspect-topic.md) |
| `zotero-bridge debug synthesis operations` | 列出仅用于调试的 Synthesis 显式 operations | [打开卡片](commands/debug/synthesis/operations.md) |
| `zotero-bridge debug synthesis profiler` | 列出仅调试的 Synthesis profiler 计时 | [打开卡片](commands/debug/synthesis/profiler.md) |
| `zotero-bridge debug synthesis snapshot` | 读取仅供调试的 Synthesis 快照 | [Open card](commands/debug/synthesis/snapshot.md) |
| `zotero-bridge debug tasks` | 读取仅用于调试的 workflow task 诊断 | [打开卡片](commands/debug/tasks.md) |

选择检查：

- 将用户请求的结果、对象类型、时效性与状态改变边界匹配到这一族。
- 若仍有多个命令看似可行，使用 `zotero-bridge surface search --intent <plain-language intent>` 收窄候选范围。
- 构造调用前，使用 `zotero-bridge surface describe '<canonical command>'` 确认所选命令。
- 执行前阅读链接的详细参考；精简索引不是 argv 或 approval 契约。


## 完成检查

离开 catalog 之前，你必须知道：

- 确切的规范命令或有序命令序列；
- 拥有每个命令的详细引用；
- 首条命令所需的实时对象、选择、句柄或 workflow 身份；
- 动作是只读、准备提议还是改变状态；
- approval 可在何处发生；
- 什么证据证明完成；
- 哪个 handle 或实时读取能在中断后防止不安全重放。

若其中任何一项仍然未知，继续发现或询问用户缺失的决定性材料。不要根据用户措辞猜测命令语法。
