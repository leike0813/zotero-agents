# 文献库查询操作手册

## 上下文与身份

读取前先对请求分类：

| 请求形式 | 首先解析 | 身份证据 |
| --- | --- | --- |
| “这篇论文”“这些笔记”“所选条目” | 当前 Zotero 上下文与 selection | 有序返回的对象 ref 与当前 pane 事实 |
| 已知 key、library ID、分类、topic、Product、run 或 artifact | 直接实时查询 | 确切返回标识符与对象类型 |
| 标题、引文、作者短语、标签或自然语言描述 | 有边界的候选搜索 | 搜索边界加候选 ref；再读取所选对象详情 |
| 按分类/标签/类型获取完整清单 | 确定性 list | filter 与每个已接受页面 |

区分笔记和附件身份与其父条目。只有下游操作声明需要父条目输入时，才归一到顶层父条目。导航到已知对象会改变可见 Zotero 上下文，但不是元数据变更，也不能验证猜测的标识符。

当前 selection 为空且问题依赖它时，请求明确目标。问题不依赖 UI 上下文时，按声明的文献库 scope 继续。返回 ref 过期时，重新读取上下文或搜索候选项；不得仅凭标题相似性选择替代对象。

## 文献库发现与分页

使用按相关性排序的 search 获取有限候选集。用户请求分类/标签/类型清单或穷尽式有界枚举时，使用确定性 list 操作。选定稳定候选项后才获取条目详情。snapshot 适合构建本地元数据镜像，不适合断言某一条目的最新字段。

记录 filter、公开时的排序依据、结果上限、已接受 item ref 和 cursor 状态。沿每个必要 `nextCursor` 或 offset 继续直至完成。查询有意在穷尽前设限时，说明哪些内容未遍历。中断时保留已接受页面，从最后 cursor 恢复，且不得再次合并前一页面。

只有边界明确且分页完成时，空结果才有意义。搜索候选项只能支持“这可能匹配”；详细元数据需要当前条目读取。比较时解析每个被比较对象，并使用对等字段或 locator，使缺失数据可见，而非静默补全。

## 笔记、附件与 readiness

解析父条目后，将子笔记和附件作为独立集合读取。笔记正文可能分块：沿返回的 offset/limit 继续，直至请求部分完整。嵌入式笔记 payload 需要先发现 payload，再选择明确的 payload ID/type；不得从笔记 HTML 推断结构化 payload。

结构化批注记录使用 annotation list；请求证据需要可移植时使用 export。保留返回的 page、position、quote、comment、color 或其他 locator。读取批注不产生编辑批注的权限。

附件元数据与字节是不同证据。保留可访问附件签发的文件 handle，并遵循其下载合同。分析或引用交付字节前验证 checksum 和字节数。若无法访问，报告附件记录和结构化原因，不得直接读取 Zotero 存储。

对缺少 PDF、source Markdown 或文献分析 artifact 使用聚焦 readiness 读取；问题需要组合多项检查时使用 combined audit。Readiness 识别缺失材料，但不获取、转换、分析、附加或修复。对于“所选论文中哪些缺 PDF”，解析并归一所选父条目，在支持时把 audit 限定到这些条目，并返回缺失集合，不启动修复。

## Synthesis 与答案证据

选择与问题匹配的派生模型：

- topic list 和 paper membership 确立 topic scope；
- topic context、report 和 review input 呈现同一 topic 的不同视图；
- graph overview、slice、layout、metrics、query cluster 与 ranking 回答不同 graph 问题；
- library/reference index 提供派生记录和显式分页；
- resolver 将声明的 selector 转换为有边界的论文集合；
- artifact manifest 发现文件，artifact read 公开所选内容，filtered export 交付字节；
- attention queue 对审阅候选项排序，但不授权行动；
- concept 与 schema 读取公开类型化语义模型，而非原始书目搜索。

记录 topic ID、paper ref、graph/index cursor 完成状态、resolver selector 与 combine mode、artifact 名称/checksum 及 model/schema 身份。graph edge 或 cluster 可能只是计算结构，而非因果主张。派生视图可能过期时，在得出新鲜度敏感结论前检查其状态；不得仅因查询为空就启动维护。

用最小充分证据集构建答案。分别标明直接 Zotero 事实、引用来源文本、插件派生状态和自身推断。简洁答案中，一条 evidence 可支持一项实质主张；比较时必须携带每个被比较来源及其 locator 或已检查字段。

## 恢复与易错边界

- 条目无可访问全文时，只有明确标注基于摘要，摘要答案才可使用。
- 附件 handle 过期时，从所属附件请求当前访问，不得保留或猜测本地路径。
- 笔记分块或分页失败时，返回已接受内容和精确恢复位置，不得静默重启。
- 问题跨入 import、repair、writeback 或工作流 submission 时，完成读取证据，并在重新检查权限后把新操作交给 acquisition、curation 或 synthesis。
- 隐私要求隐去附件文本时，引用来源身份与 locator，不暴露不必要内容。
- 缓存常驻 index 找到疑似对象时，将其作为线索，并通过实时读取确认答案。
