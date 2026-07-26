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

## 查询决策矩阵

当一个请求可能映射到多个读取面时，使用此矩阵：

| 用户意图 | 首选首次读取 | 仅在以下情况扩展 | 证据边界 |
| --- | --- | --- | --- |
| 识别当前论文或 selection | 当前 context 与 selection | 返回对象是 child、已过期或详情不足 | 当前 pane 事实与有序实时 ref |
| 查找已知文献 | 直接 key/ID lookup，失败后进行有界搜索 | 仍有多个合理候选项 | 所选候选项的确切身份字段 |
| 清点 collection、tag 或 type | 确定性 list | 分页未完成或另行请求 child object | filter、sort、已接受页面、终止 cursor |
| 回答内容问题 | 解析 item 与 attachment，随后读取已交付内容 | 答案需要 note、annotation 或其他 attachment | 已验证文件及 section/page/chunk locator |
| 总结读者活动 | Note 与 annotation | 请求 embedded payload 或可移植 export | Child identity、author/reader 区分、position |
| 说明 topic 或关系 | 与问题匹配的 topic、resolver、graph 或 index 模型 | freshness 或 provenance 影响结论 | Model identity、scope、cursor 与 status |
| 定位生成输出 | Product 或 artifact discovery | 用户需要内容或字节，而非仅 identity | Record/manifest identity，随后是选定 asset 证据 |
| 检查工作是否就绪 | 聚焦 readiness read 或组合 audit | 用户另行请求 remediation | 已声明检查项与有界缺失集合 |

多个行同时适用时，只解析一次身份并复用返回 ref。不得因为较窄结果为空，就把有界查询扩张为全库清单。

## 证据交付合同

对于事实性答案，以能够复现每项实质主张的粒度携带证据记录：

```text
claim: the bounded statement supported by this record
source_kind: live-item | note | annotation | attachment-bytes | derived-model | workflow-artifact
source_identity: stable item/note/attachment/topic/artifact ref
locator: field, page, section, chunk, annotation position, or model query
retrieval_boundary: filters, cursor completion, file checksum, or model scope
interpretation: none, comparison, or explicit agent inference
limitation: unavailable pages, stale status, mixed source levels, or unresolved identity
```

对于清单，一条 query-level 记录可以覆盖分页与 filter，而每个异常 item 单独记录。对于引文或贴近原文的转述，即使最终回复很短，也要保留 source locator。对于以字节为基础的内容，把 checksum 与 size 附在文件证据上，不要在每项主张中重复。对于否定性发现，证据是已经完成的搜索边界，而不是记忆中缺少某个 item。

来源相互冲突时，分别输出记录并说明比较规则。当派生模型指向某篇论文时，把模型结果作为发现证据；凡主张依赖当前书目或文本内容，则使用实时 item 或来源读取。

## 升级与任务交接

只交接尚未解决的操作，并携带已经确立的读取证据：

| 跨越的边界 | 目标任务 | 交接 payload |
| --- | --- | --- |
| 候选发现转为 import 或 attachment 获取 | 文献采集 | 搜索边界、candidate ID、实时重复项检查、请求目标 |
| 事实查询转为精读或比较 | 文献分析 | 已解析 ref、可用来源层级、分析问题、已检查 locator |
| 文献库事实转为 topic/graph/report 构建 | 研究综合 | 有界 paper set、问题、当前派生模型状态、所需输出 |
| 读取结果转为 metadata、tag、collection、note、file 或 Product 变更 | 文献库整理 | 确切实时 target、当前值、proposal effect、修正证据 |
| 用户请求周期性观察或无人值守修复 | Hosted monitoring facet | Watch scope、cadence 或 trigger、alert threshold、允许的 action |

交接不继承写入、workflow submission 或 maintenance 权限。如果目标任务无法保留已经确立的身份，应返回歧义，而不是悄然重新解析。读取本身已经完成、但后续操作受阻时，应交付答案并说明另行受阻的阶段。

## 恢复与易错边界

- 条目无可访问全文时，只有明确标注基于摘要，摘要答案才可使用。
- 附件 handle 过期时，从所属附件请求当前访问，不得保留或猜测本地路径。
- 笔记分块或分页失败时，返回已接受内容和精确恢复位置，不得静默重启。
- 问题跨入 import、repair、writeback 或工作流 submission 时，完成读取证据，并在重新检查权限后把新操作交给 acquisition、curation 或 synthesis。
- 隐私要求隐去附件文本时，引用来源身份与 locator，不暴露不必要内容。
- 缓存常驻 index 找到疑似对象时，将其作为线索，并通过实时读取确认答案。
## 端到端决策轨迹

这些跟踪显示了当用户的措辞、证据或恢复路径不简单时如何应用可执行查询契约。它们是决策的例子，而不是替代的硬性规则。

### Trace 1：“帮助我理解这篇论文”，但没有 selection

用户话语：

> 帮助我理解这篇论文。

释义：

- 该任务可能是有界查询或更深入的分析。
- “本文”取决于当前的选择。
- 仅从对话上下文中无法推断出任何项目身份。
- 不需要改变状态。

第一个动作：

1. 读取当前 Zotero 选择。
2. 如果恰好选择了一个书目项目或一个具有可解析父项的子项，则保留子项和父项身份。
3. 如果选择为空，请要求用户选择或识别纸张。
4. 如果选择了几篇论文，询问是否所有论文都是有意的，以及用户是否想要简单的答案或比较。

不要：

- 在整个文献库中搜索最近提到的标题；
- 选择第一个可见项目；
- 将附件转换为其父附件而不记录该附件；
- 在知道预期目标和结果之前开始深入阅读 workflow。

可能的澄清：

> 我当前没有明确的 Zotero 选择。我应该使用哪篇论文，您想要简洁的答案还是源定位分析？

待处理行为：

- 使用 Runner 待定分支，因为需要具体的身份和结果决策。
- 等待时不要发出业务结果。

无法提供身份时取消的结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "canceled",
  "summary": "Stopped before reading because no unambiguous Zotero paper was selected or identified.",
  "diagnostics": [
    {
      "code": "source_identity_required",
      "message": "Select one paper or provide a stable Zotero item reference."
    }
  ]
}
```

恢复点：

- 在用户回答后重新阅读当前选择。
- 不要重复使用过时的空选择结果。

### Trace 2：“我的文献库没有关于 X 的论文，对吧？”

用户话语：

> 我的文献库没有关于联合多模态检索的论文，对吧？

释义：

- 用户要求给出否定的结论。
- 第一页、缓存索引或模糊标题搜索是不够的。
- 相关范围可能是整个当前库或命名集合。
- 术语可能出现在标题、摘要、标签、注释或全文中；所请求的搜索深度必须是有限的。

澄清/默认：

- 如果没有指定馆藏，请披露当前文献库的使用情况。
- 询问如果全文覆盖会严重改变答案，元数据/摘要搜索是否足够。
- 声明使用的同义词和过滤器。

执行：

1. 解决实时库范围。
2. 运行狭义语义搜索。
3. 完成所有必需的页面。
4. 检查看似合理的匹配，而不是从片段中拒绝它们。
5. 记录最终的cursor/offset完成情况。
6. 区分“搜索字段中没有匹配项”和“不存在相关工作”。

证据记录：

- 文献库身份；
- 过滤器和查询条件；
- 页数和终端分页事实；
- 接受检查的合理候选项；
- 涵盖的源字段；
- 新鲜度时间戳或实时读取的事实。

面向人的答案：

> 完成所有页面后，我在当前库中发现声明的元数据和抽象字段中没有匹配的项目。这并不代表不存在无法访问的全文或外部文献。

完成结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Completed the bounded current-library search and found no matches in the declared metadata and abstract fields.",
  "evidence": [
    {
      "kind": "library-query",
      "ref": {
        "scope": "current-library",
        "pagingComplete": true
      },
      "description": "The exhaustive boundary supporting the negative answer."
    }
  ]
}
```

有惊无险：

- 如果一页后寻呼停止，则返回 `failed` 以及接受的 cursor 并且不声明缺席。

### Trace 3：附件交付中断

用户话语：

> 阅读此 PDF 的结果部分并告诉我主要数字。

释义：

- 答案需要提供全文字节，而不是附件元数据。
- 所选附件和父项目必须均保持可识别。
- 该任务是只读的。

执行：

1. 解析选定的附件。
2. 检查附件元数据并确认可读媒体类型。
3. 请求桥介导的文件传送。
4. 下载到声明的本地artifact路径。
5. 验证校验和和字节数。
6. 只读请求的结果部分并保留页面locators。

失败：

- 文件 handle 在元数据检查后但在验证下载之前过期。

恢复决策：

- 保留附件 ref 和失败的传输诊断。
- 重新获取同一附件的文件访问权限。
- 不要猜测 Zotero 存储路径。
- 请勿用相似的文件名替换其他附件。
- 如果第二次投递失败，则返回`failed`。

失败结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "Could not answer the results-section question because the selected attachment bytes were not successfully delivered and verified.",
  "evidence": [
    {
      "kind": "attachment",
      "ref": {
        "libraryId": 1,
        "key": "ATTACH01"
      },
      "description": "The resolved source attachment; its content was not claimed as read."
    }
  ],
  "diagnostics": [
    {
      "code": "attachment_delivery_failed",
      "message": "File access expired and safe reacquisition did not complete."
    }
  ]
}
```

不安全的替代方案：

- 在未获得用户同意的情况下，根据摘要、先前的摘要或类似命名的本地文件来回答较弱的基础。

## 对话与结果模板

当一个用户决定解除任务障碍时，使用简短的说明：

> 我找到了两个具有该标题的 Zotero 条目。我应该使用2023年的会议论文还是2024年的期刊版本？

当澄清不会实质性改变有界读取时，使用公开的默认值：

> 我将搜索当前库，将任务保持为只读，然后返回对话答案。如果只有元数据或抽象证据可用，我将报告。

当证据不对称时，使用限制优先的措辞：

> 前两项主张得到了全文的支持。第三篇论文仅作为摘要提供，因此我没有比较其实现细节。

使用恢复措辞来命名保留状态：

> 在 cursor 失败之前已接受了三页。我保留了最后接受的cursor，并将从返回的延续中恢复，而不是重复已完成的页面。

不要使用：

- 当事实来自你的解释时，“Zotero 说”；
- 当仅检查元数据时，“我阅读了 PDF”；
- 当搜索边界不完整时，“没有论文”；
- 当Product或artifact未经检查时，“workflow 生产”；
- “图表证明”计算出的关系。

返回之前，确保摘要、内联证据、可选 artifacts 和诊断说明相同的情况。对话答案可以比摘要更丰富，但不能与机器结果相矛盾。

## 扩展查询决策记录

对于复杂的查询，请在工作时保留一份紧凑的记录：

|领域|记录|
| --- | --- |
|用户提问 |精确有界问题|
|范围 |库、集合、选择、主题、运行、Product 或操作 |
|身份证明 |稳定的 refs 和候选分辨率事实 |
|新鲜度|实时读取和派生模型状态 |
|来源深度|元数据、摘要、注释、部分内容或验证字节 |
|寻呼 |过滤器、接受的页面、终端 cursor 和恢复位置 |
|隐私 |需要的内容和故意排除的内容 |
|索赔|直接事实、源文本、派生输出和解释 |
|可交付成果 |对话答案或已验证artifact |
|状态 |已完成、已取消或因故失败 |

该记录是工作记忆，而不是第二个结果信封。仅将相关证据artifact和诊断字段传输到`zotero-library-task.result.v1`。

如果任务移交：

- 进行分析，包括确切来源refs、附件身份、提供的证据级别和问题；
- 综合时，包括已验证的源/模型边界和不受支持的声明；
- 为了管理，包括现场的状态前证据和要求的期望状态，但没有暗示的权威；
- 对于托管监督，包括有限的查询结果和监控标准，而不是发明的时间表。

从交接中删除推测候选项，同时保留解释其被排除原因的诊断信息。
