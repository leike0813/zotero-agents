# Zotero 桥接命令目录

当您知道用户想要在 Zotero 中执行什么操作但还不知道规范命令时，请使用此目录。它是详细命令参考的导航层，而不是它们的替代品。

## 发现序列

1. 用 Zotero 术语重申所请求的结果：对象、范围、新鲜度、可交付成果以及状态是否可能改变。
2. 找到下面的匹配任务系列并检查其自然语言线索。
3. 从紧凑索引中选择一个或多个候选规范命令。
4. 如果映射仍然不明确，请运行 `zotero-bridge surface search --intent <plain-language intent>`。
5. 与`zotero-bridge surface describe '<canonical command>' --json`确认实时命令契约。
6. 在构建 argv 或有效负载之前，请阅读链接的详细命令参考。
7. 解析完所需的身份、输入通道、权限、恢复路径后才执行。

## 如何阅读索引

- 命令名称和单行用途有助于发现。
- 详细参考包含 argv、绑定、调用与结果 schema、分页、效果、approval、handle、目标、别名和恢复。
- 目录中出现的命令不能证明当前 Zotero 实例已连接、workflow 可用或请求的写入已获得授权。
- `surface search` 返回候选者；它不会选择正确的命令或授权执行。
- `surface describe` 是所选命令的实时权限。如果它与静态指导不同，请遵循实时 descriptor并报告不匹配情况。
- 使用拥有所请求效果的最小语义命令。不要仅仅因为低级路径显得较短而将其替换为 `call` 或 `debug`。

## 跨越家庭的请求

许多用户请求需要一个有序的序列而不是一个命令。明确每个家庭的界限：

- 在阅读“本文”或“这些项目”之前先解决当前的上下文问题。
- 在提出写入变更之前阅读并验证身份。
- 在附加已发布file handle之前上传字节。
- 提交前验证 workflow。
- 仅监视提交返回的键入运行handle。
- 终端运行后验证 Products、artifacts、下载的字节或实时 Zotero 状态。
- 在提出维护操作之前诊断过时的 Synthesis 模型。

不要让较早的读取、候选列表、验证结果或已完成的运行意味着稍后状态更改的权限。

## 连接、检查当前选择或发现功能

使用此系列建立实时 Zotero 连接，检查用户在 UI 中引用的内容，并发现当前的命令契约。

自然语言提示：

- 这个项目，这些论文，当前的收藏，或者选择的内容。
- Zotero 可以做到这一点吗？存在哪个命令，或者需要什么输入。
- 连接、profile、端点、身份验证或桥接可用性。

选择候选命令后，请阅读[连接和上下文命令参考](commands/connection-and-context.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge bridge backend list` |列出经脱敏的 backend profile 诊断 |
| `zotero-bridge bridge backend status` |读取经脱敏的 backend profile 状态 |
| `zotero-bridge bridge manifest` |阅读经过身份验证的 Zotero Bridge 服务清单 |
| `zotero-bridge bridge profile diagnose` |诊断 Zotero Bridge profile准备情况 |
| `zotero-bridge bridge profile inspect` |检查编辑后的 ​​Zotero Bridge 连接 profile |
| `zotero-bridge bridge status` |无需身份验证即可检查 Zotero Bridge 服务运行状况 |
| `zotero-bridge context collection open` |打开一个 Zotero 收藏 |
| `zotero-bridge context current` |读取当前 Zotero UI 上下文 |
| `zotero-bridge context item open` |打开一项 Zotero 条目 |
| `zotero-bridge context note open` |打开 Zotero 笔记 |
| `zotero-bridge context selection get` |阅读所选 Zotero 条目摘要 |
| `zotero-bridge context selection open` |打开一个或多个 Zotero 条目作为活动选择 |
| `zotero-bridge surface describe` |描述一个规范命令 |
| `zotero-bridge surface identity` |打印准确的 CLI 构建和命令目录标识 |
| `zotero-bridge surface search` |按任务意图搜索规范命令 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。

## 查找、检查、翻阅或导出库内容

将此系列用于当前的 Zotero 条目、集合、注释、附件、准备情况、快照和有界导出。

自然语言提示：

- 我的文献库、收藏或当前的研究集中有什么。
- 查找有关某个主题的论文、检查一项或列出其子项。
- 阅读笔记、附件、注释、准备情况或分页快照。

选择候选命令后，请阅读[文献库命令参考](commands/library.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge library annotation export` |导出一项 Zotero 条目的读者注释 |
| `zotero-bridge library annotation list` |列出一项 Zotero 条目的读者注释 |
| `zotero-bridge library item attachments` |列出一项 Zotero 条目的子附件 |
| `zotero-bridge library item get` |获取一项 Zotero 条目的详细元数据 |
| `zotero-bridge library item notes` |列出一项 Zotero 条目的子注释 |
| `zotero-bridge library item search` |搜索 Zotero 文献库条目 |
| `zotero-bridge library items list` |列出紧凑的 Zotero 文献库条目摘要|
| `zotero-bridge library note get` |读取 Zotero 笔记正文分块 |
| `zotero-bridge library note payload` |从 Zotero 笔记中读取一个嵌入的 workflow 有效负载 |
| `zotero-bridge library note payloads` |列出一个 Zotero 笔记中嵌入的 workflow 有效负载 |
| `zotero-bridge library readiness audit` |审核 PDF、来源 Markdown 和文献分析 artifact 准备情况 |
| `zotero-bridge library readiness missing-analysis` |列出缺少 缺少文献分析生成的项目 artifacts |
| `zotero-bridge library readiness missing-markdown` |列出缺少同源 Markdown 的 Zotero 的项目 |
| `zotero-bridge library readiness missing-pdf` |列出缺少 PDF 附件的 Zotero 条目 |
| `zotero-bridge library snapshot` |同步 Zotero 库元数据快照页面 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。

## 预览并应用显式 Zotero 数据更改

仅在目标身份和所需状态具体且当前请求授权经过审查的写入变更后才使用此家族。

自然语言提示：

- 更改元数据、标签、集合、注释、链接或附件。
- 预览写入、应用批准的有效负载或检查写入变更状态。
- 合并、删除、重新链接或覆盖已知的 Zotero 对象。

选择候选命令后，请阅读[写入变更命令参考](commands/mutation.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge mutation apply` |应用 Zotero 写入变更 |
| `zotero-bridge mutation collection add-items` |将 Zotero 项添加到集合 |
| `zotero-bridge mutation collection create` |创建 Zotero 集合|
| `zotero-bridge mutation collection remove-items` |从集合中删除 Zotero 项 |
| `zotero-bridge mutation item attach-file` |将通过 Zotero Bridge 上传的文件附加到 Zotero 条目 |
| `zotero-bridge mutation item update` |更新 Zotero 项目字段|
| `zotero-bridge mutation literature-ingest` |将搜索到的文献收录到 Zotero |
| `zotero-bridge mutation note create` |在一项 Zotero 条目下创建子注释 |
| `zotero-bridge mutation note update` |更新一则 Zotero 笔记|
| `zotero-bridge mutation note upsert-payload` |更新插入一个嵌入式注释负载 |
| `zotero-bridge mutation preview` |预览 Zotero 写入变更 |
| `zotero-bridge mutation tag add` |为 Zotero 项目添加标签 |
| `zotero-bridge mutation tag remove` |从 Zotero 条目中删除标签 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。

## 移动字节、检查 Products 或遵循持久操作

当 Zotero 对象或 workflow 结果命名必须传输或验证的文件、Product、资产或长时间运行的操作时，请使用此系列。

自然语言提示：

- 上传或下载文件时不会混淆路径和file handle。
- 检查Product或取回其申报的资产之一。
- 使用其持久的receipt恢复或验证操作。

选择候选命令后，请阅读[文件、Product 与 operation命令参考](commands/files-products-and-operations.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge file download` |下载一份注册file handle |
| `zotero-bridge file upload` |通过 Zotero Bridge 上传一个本地文件并返回一个短暂的file handle |
| `zotero-bridge operation get` |阅读一篇持久的 Zotero 操作receipt|
| `zotero-bridge product download` |下载一项或全部 Dashboard Product 资源 |
| `zotero-bridge product get` |阅读一份普通仪表板Product |
| `zotero-bridge product list` |列出正常仪表板Products |
| `zotero-bridge product remove` |通过 Zotero 审批删除1条DashboardProduct记录 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。

## 发现、验证、提交或应用 workflow

使用此系列检查实时 workflow 合约，验证选择和 provider 输入，提交支持的执行，或应用 agent 拥有的结果。

自然语言提示：

- 使用已安装的 workflow 进行分析、采集、合成或管理。
- 检查 workflow 选项、provider profile、选择或准备情况。
- 提交、检查artifacts或应用agent拥有的结果。

选择候选命令后，请阅读[workflow 命令参考](commands/workflow.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge workflow agent-abandon` |放弃未消耗的 agent 运行 |
| `zotero-bridge workflow agent-apply` |应用最终的Agent 自主 workflow 结果包 |
| `zotero-bridge workflow agent-apply-status` |阅读 agent 运行的可审核申请返回 receipt |
| `zotero-bridge workflow agent-bundle inspect` |检查本地 agent 切换目录 |
| `zotero-bridge workflow agent-renew` |续订未使用的 agent 运行租约 |
| `zotero-bridge workflow agent-result validate` |根据输出合约验证本地 agent 结果目录 |
| `zotero-bridge workflow agent-run` |准备一个自有的agentworkflow交接包 |
| `zotero-bridge workflow describe` |描述 workflow 选择和 workflow 选项 |
| `zotero-bridge workflow list` |列表已加载 workflows |
| `zotero-bridge workflow profile describe` |描述一份 backend 的 provider profile 合约 |
| `zotero-bridge workflow profile list` |列出已配置的 backend provider 配置文件 |
| `zotero-bridge workflow profile validate` |验证并标准化一个 backend provider profile |
| `zotero-bridge workflow queue cancel` |取消一个仍处于 pending 状态的 Zotero-managed workflow queue unit |
| `zotero-bridge workflow queue list` |列出 pending 的 Zotero-managed workflow queue units |
| `zotero-bridge workflow requirements` |阅读 workflow 要求|
| `zotero-bridge workflow submission get` |读取一个活动的 Zotero-managed workflow submission |
| `zotero-bridge workflow submit` |提交带有显式 JSON 输入的 workflow |
| `zotero-bridge workflow validate` |验证 workflow 输入而不开始执行 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。

## 监控、交互或取消 workflow 运行

在 workflow 返回类型化运行 handle 并且任务需要当前状态、提示、通知、结果或取消后使用此系列。

自然语言提示：

- 这个 workflow 在做什么，完成了吗，或者它需要什么。
- 回答运行提示、确认通知或取消运行。
- 检查最终结果证据，而不将终止视为输出证据。

选择候选命令后，请阅读[运行命令参考](commands/run.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge run active` |列出轻量级活动 workflow 运行时任务 |
| `zotero-bridge run cancel` |请求取消 workflow 运行 |
| `zotero-bridge run get` |阅读一篇 workflow 运行状态 |
| `zotero-bridge run list` |列出活动的和最近的 workflow 运行时任务 |
| `zotero-bridge run notification ack` |确认 workflow 通知收件箱事件 |
| `zotero-bridge run notification list` |列出 workflow 通知收件箱事件 |
| `zotero-bridge run notification wait` |轮询直至 workflow 通知可用 |
| `zotero-bridge run permission get` |阅读一份 Zotero 端权限请求 |
| `zotero-bridge run permission pending` |列出待处理的 Zotero 端权限请求|
| `zotero-bridge run recent` |列出最近的轻量级 workflow 运行时任务 |
| `zotero-bridge run skill connect` |连接到可恢复的 ACP Skill run |
| `zotero-bridge run skill events` |列出一项Skill run的轻量级生命周期事件 |
| `zotero-bridge run skill get` |阅读一项具体的Skill run |
| `zotero-bridge run skill recent` |列出最近的具体Skill run |
| `zotero-bridge run skill reply` |回复等待的 ACP Skill run |
| `zotero-bridge run workflow recent` |列出最近的 workflow 运行 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。

## 检查或维护Synthesis主题、索引、图表和artifacts

将此系列用于插件的派生研究结构，包括主题上下文、sidecar 索引、引文图、解析器状态、注意力队列和导出。

自然语言提示：

- 主题上下文、综合报告、图表关系、度量或证据差距。
- 索引状态、候选解析器、新鲜度或维护receipts。
- 导出或检查合成artifact，不要将其与实时库事实混淆。

选择候选命令后，请阅读[Synthesis 命令参考](commands/synthesis.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge synthesis artifact export-filtered` |将装订纸artifacts导出到运行工作区 |
| `zotero-bridge synthesis artifact manifest` |阅读论文 artifact 清单元数据 |
| `zotero-bridge synthesis artifact read` |阅读所选论文artifacts |
| `zotero-bridge synthesis artifact resolve-topic-digest` |解决主题论文摘要 |
| `zotero-bridge synthesis cache invalidate` |使受约束的 Synthesis 缓存范围无效 |
| `zotero-bridge synthesis cache refresh-reference-sidecar` |开始参考边车刷新 |
| `zotero-bridge synthesis cache status` |阅读Synthesis缓存维护状态 |
| `zotero-bridge synthesis concept query` |查询Synthesis 概念知识库候选 |
| `zotero-bridge synthesis graph get-layout` |读取持久引用图布局坐标 |
| `zotero-bridge synthesis graph get-metrics` |阅读所选论文的引文图表指标 |
| `zotero-bridge synthesis graph get-slice` |阅读 Synthesis 引文图切片 |
| `zotero-bridge synthesis graph overview` |阅读分页的 Synthesis 引文图概述 |
| `zotero-bridge synthesis graph query-cluster` |查询主题范围的引文图集群 |
| `zotero-bridge synthesis graph rank-external-references` |对引文图中的外部引用进行排名 |
| `zotero-bridge synthesis graph rank-library-papers` |根据引文图指标对文献库论文进行排名 |
| `zotero-bridge synthesis graph refresh-metrics` |刷新持久引用图复杂指标 |
| `zotero-bridge synthesis graph update` |开始更新引文图 |
| `zotero-bridge synthesis index library get` |阅读索引页 |
| `zotero-bridge synthesis index reference get` |阅读索引页 |
| `zotero-bridge synthesis index status` |阅读Synthesis索引维护状态 |
| `zotero-bridge synthesis insight attention-queue` |阅读汇总图/artifact/参考注意事项 |
| `zotero-bridge synthesis resolver resolve` |将主题解析器解析为论文集 |
| `zotero-bridge synthesis schema get` |阅读Synthesis 图层架构元数据 |
| `zotero-bridge synthesis topic find-by-paper-ref` |通过 paper_ref | 查找活跃主题综合主题
| `zotero-bridge synthesis topic get-context` |阅读一个主题综合上下文 |
| `zotero-bridge synthesis topic get-report` |阅读一篇主题综合报告 Markdown 正文 |
| `zotero-bridge synthesis topic get-review-input` |阅读来自 Synthesis 的评论 workflow 输入 |
| `zotero-bridge synthesis topic list` |列出现有主题综合主题 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。

## 诊断网桥或进行高级原始调用

仅当语义命令表面无法诊断问题或明确需要精确的低级功能调用时才使用此系列。

自然语言提示：

- 收集不可用或不一致表面的有界诊断报告。
- 检查原始能力行为，同时保留正常的权限边界。
- 避免使用诊断作为语义验证的捷径。

选择候选命令后，请阅读[诊断命令参考](commands/diagnostics.md)。它包含确切的 argv、schema、effect、approval、handles 和恢复合同。

|规范命令 |目的|
| --- | --- |
| `zotero-bridge call` |高级诊断原始能力调用|
| `zotero-bridge debug acp-skill-run reapply-result` |为一项现有 ACP Skill run结果重新运行 applyResult |
| `zotero-bridge debug persistence` |阅读仅调试持久性诊断 |
| `zotero-bridge debug status` |读取仅调试 Zotero Bridge 服务运行时状态 |
| `zotero-bridge debug synthesis cache` |列出仅调试的 Synthesis sidecar 缓存基础行 |
| `zotero-bridge debug synthesis clean-install-reset` |危险调试操作：重置Synthesis安装状态 |
| `zotero-bridge debug synthesis diff` |阅读仅调试Synthesis DB/缓存差异 |
| `zotero-bridge debug synthesis inspect-paper` |检查一张调试Synthesis论文 |
| `zotero-bridge debug synthesis inspect-topic` |检查一个调试Synthesis主题 |
| `zotero-bridge debug synthesis operations` |列出仅调试的 Synthesis 显式操作 |
| `zotero-bridge debug synthesis profiler` |列出仅调试的 Synthesis 探查器时序 |
| `zotero-bridge debug synthesis snapshot` |读取仅调试的 Synthesis 快照 |
| `zotero-bridge debug tasks` |读取仅调试 workflow 任务诊断 |

选型检查：

- 将用户请求的结果、对象类型、新鲜度和状态更改边界与该系列相匹配。
- 如果有几个命令仍然可行，请使用 `zotero-bridge surface search --intent <plain-language intent>` 来缩小候选范围。
- 在构造调用之前使用 `zotero-bridge surface describe '<canonical command>' --json` 确认所选命令。
- 执行前请阅读链接的详细参考资料；紧凑索引不是 argv 或approval 合同。


## 竣工检查

在离开目录之前，您必须知道：

- 确切的规范命令或有序命令序列；
- 拥有每个命令的详细参考；
- 第一个命令所需的活动对象、选择、handle或 workflow 身份；
- 该操作是只读、准备提案还是更改状态；
- 可以进行批准的地方；
- 什么证据证明完成；
- 其中handle或实时读取可防止中断后不安全的重播。

如果其中任何一个仍然未知，请继续发现或向用户询问材料缺失的决定。不要从用户的措辞中猜测命令语法。
