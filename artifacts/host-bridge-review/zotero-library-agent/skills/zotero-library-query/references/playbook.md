# 库查询 Playbook

## 上下文与 identity

读取前对请求分类：

| 请求形式 | 首次解析 | 身份证据 |
| --- | --- | --- |
| “这篇论文”、“这些 notes”、“所选 items” | 当前 Zotero context 与选择 | 有序返回的对象 refs 与当前 pane 事实 |
| 已知 key、库 ID、collection、topic、Product、run 或 artifact | 直接实时查找 | 返回的确切标识符与对象种类 |
| 标题、引用、作者短语、tag 或自然语言描述 | 有界候选搜索 | 搜索边界加候选 refs；对所选对象做详情读取 |
| 按 collection/tag/type 的完整清单 | 确定性列表 | 筛选器与每个接受的页面 |

让 note 与 attachment 身份与其父 items 区分开。仅为声明父输入的后续操作规范化为顶层父级。导航到已知对象会改变可见 Zotero context，但不是元数据 mutation，也不验证猜测的身份。

当前选择为空时，若问题依赖它则要求显式目标。若问题独立于 UI context，按其声明的 library 作用域继续。返回的 ref 过期时，重新读取 context 或搜索候选；绝不只凭标题相似选择替代。

## 库发现与分页

对有限的候选集使用相关性排序搜索。当用户请求 collection/tag/type 清单或穷举的有界枚举时，使用确定性列表操作。仅在选定稳定候选后才获取 item 详情。快照适合构建本地元数据镜像，不适合断言单个 item 的最新字段。

记录筛选、排序/排名依据（若已暴露）、结果上界、已接受 item ref 与 cursor 状态。继续每个必需的 `nextCursor` 或 offset 直到完成。若查询在穷尽前有意受限，说明未遍历的内容。中断时保留已接受的页，并从最后一个 cursor 恢复，而不再次合并上一页。

空结果只有在有显式边界与完成的分页时才有意义。搜索候选可以支持“可能匹配”；详细元数据需要当前 item 读取。对于比较，解析每个被比较对象，并使用等价字段或定位符，使缺失数据可见而不是被静默估算。

## Notes、attachments 与就绪状态

在解析其 parent 后，将子 note 与 attachment 作为独立集合读取。Note 正文可能分块：沿返回的 offset/limit 继续，直至请求的部分完整。内嵌 note payload 需要先发现 payload，再选择显式的 payload ID/类型；不要从 note HTML 推断结构化 payload。

当所需证据必须可移植时，使用 annotation 列表记录结构化 annotation 记录并导出。保留 page、position、quote、comment、color 或其他返回的定位符。Annotation 读取不会产生编辑 annotation 的权限。

Attachment 元数据与字节是不同的证据。保留可访问 attachment 的已签发 file handle 并遵循其下载契约。在分析或引用交付的字节前核实校验和与字节数。若访问不可用，报告 attachment 记录与结构化原因，而不直接读取 Zotero 存储。

对缺失 PDF、源 Markdown 或 literature-analysis artifact 使用聚焦的就绪读取；当问题需要多项检查一起完成时使用合并审计。就绪只识别缺失材料，不获取、转换、分析、附加或修复它。对于“所选论文缺少 PDF”，解析并规范化所选父级，受支持时把审计约束到它们，并返回缺失集合而不开始补救。

## Synthesis 与答案证据

选择与问题匹配的派生模型：

- topic 列表与论文成员关系确立 topic 范围；
- topic context、report 与 review 输入暴露同一 topic 的不同视图；
- graph overview、slice、layout、metrics、query cluster 与 rankings 回答不同的 graph 问题；
- library/reference indexes 提供派生记录与显式分页；
- resolver 将声明选择器转换为有界论文集；
- artifact manifest 发现文件，artifact read 暴露所选内容，过滤导出交付字节；
- attention queue 对审阅候选排序，但不授权行动；
- concept 与 schema 读取暴露类型化语义模型，而非原始书目搜索。

记录 topic IDs、论文 refs、graph/index cursor 完成情况、resolver selectors 与组合模式、artifact 名称/校验和，以及 model/schema 身份。graph 边或簇可以是计算出的结构，而非因果论断。若派生视图可能过期，在得出对新鲜度敏感的结论前检查其状态；不要仅仅因为查询为空就发起 maintenance。

从最小充分证据集构建答案。把直接 Zotero 事实、引用的源文本、派生的插件状态与你的推断分开标注。对简洁答案，一条证据条目可支持一条实质主张；对比较，携带每个被比较来源及其 locator 或已检查字段。

## 查询决策矩阵

请求可合理映射到多个读取面时使用此矩阵：

| 用户意图 | 首选首次读取 | 仅在以下情况扩展 | 证据边界 |
| --- | --- | --- | --- |
| 识别当前论文或选择 | 当前上下文与选择 | 返回对象是子项、过期或细节不足 | 当前窗格事实加有序的实时引用 |
| 查找已知作品 | 直接 key/ID 查找，未命中则有界搜索 | 多个候选仍有可能 | 所选候选的确切身份字段 |
| 清点一个 collection、tag 或类型 | 确定性列表 | 分页不完整或子对象被单独请求 | 过滤器、排序、已接受页、终态 cursor |
| 回答内容问题 | item 与附件解析，然后交付内容 | 答案需要 notes、annotations 或其他附件 | 已验证文件加 section/页/块定位符 |
| 总结读者活动 | Notes 与 annotations | 请求了内嵌 payload 或可移植导出 | 子项 identity、作者/读者区分、位置 |
| 解释一个 topic 或关系 | 匹配问题的 Topic、resolver、graph 或 index 模型 | 新鲜度或出处影响结论 | 模型身份、范围、cursor 与状态 |
| 定位生成的输出 | Product 或 artifact 发现 | 用户需要内容或字节而非身份 | 记录/manifest 身份，随后是所选资源证据 |
| 检查工作是否就绪 | 聚焦的就绪度读取或组合审计 | 用户单独请求补救 | 声明的检查与有界的缺失集 |

当多行适用时，解析身份一次并复用返回的 refs。不要仅仅因为更窄的结果为空，就把有界查询扩展成库级清单。

## 证据交付契约

对事实性答案，携带复现每条实质主张所需粒度的证据记录：

```text
claim: the bounded statement supported by this record
source_kind: live-item | note | annotation | attachment-bytes | derived-model | workflow-artifact
source_identity: stable item/note/attachment/topic/artifact ref
locator: field, page, section, chunk, annotation position, or model query
retrieval_boundary: filters, cursor completion, file checksum, or model scope
interpretation: none, comparison, or explicit agent inference
limitation: unavailable pages, stale status, mixed source levels, or unresolved identity
```

对清单类查询，一条查询级记录可覆盖分页与过滤器，而每个异常 item 有自己的 note。对引文或近似转述，即使最终回答很短也要保留源定位符。对字节支持的内容，将校验和与大小附到文件证据上，而不是在每个声明上重复。对否定发现，证据是完成的搜索边界，而非记住的 item 缺席。

当来源不一致时，发出独立记录并说明比较规则。当派生模型指向某篇论文时，将模型结果当作发现证据，对依赖当前书目或文本内容的声明使用实时 item 或源读取。

## 升级与 handoff

只交接未解决的操作，并携带已确立的读取证据：

| 越过边界 | 目标任务 | Handoff 载荷 |
| --- | --- | --- |
| 候选发现变为 import 或 attachment 获取 | 文献获取 | 搜索边界、候选 ID、实时重复检查、请求的目标 |
| 事实查询变为细读或比较 | 文献分析 | 已解析 refs、可用源级别、分析性问题、已检查定位符 |
| 库事实成为 topic/graph/report 构建 | 研究 synthesis | 有界论文集、问题、当前派生模型状态、所需输出 |
| 读取结果变为 metadata、tag、collection、note、file 或 Product 变更 | Library 策展 | 精确实时目标、当前值、拟议效果、修正证据 |
| 用户请求周期性观察或不看护的补救 | 托管监控分面 | 监视范围、节奏或触发器、告警阈值、允许的操作 |

handoff 不继承写入、workflow 提交或维护权限。若目标任务无法保持已确立的身份，返回含混而非静默地重新解析。当读取本身完成但后续操作受阻时，交付答案并描述单独受阻的阶段。

## 恢复与接近命中

- 若 item 无可用全文，仅当标注为基于 abstract 时，abstract 答案才可能有用。
- 若 attachment handle 过期，从其所属 attachment 请求当前访问，而不是保留或猜测本地路径。
- 若 note 分块或分页失败，返回已接受内容与精确续读位置，而不是悄悄重启。
- 若问题跨入 import、修复、写回或 workflow 提交，完成读取证据并将新操作交给获取、策展或合成，带一次新的权限检查。
- 若隐私要求保留 attachment 文本，在不暴露不必要内容的情况下引用源身份与定位符。
- 若缓存的常驻 index 找到可能的对象，将其用作线索并用实时读取确认答案。
## 端到端决策轨迹

这些轨迹展示在用户措辞、证据或恢复路径不直接时如何应用可执行查询契约。它们是决策示例，不是另立的硬性规则。

### Trace 1："帮我理解这篇论文"且无选择

用户表述：

> 帮我理解这篇论文。

解读：

- 任务可能是有界 query 或更深的 analysis。
- "这篇论文"依赖实时的当前选择。
- 仅凭对话 context 不能推断任何 item 身份。
- 不请求状态更改。

第一个动作：

1. 读取当前 Zotero 选择。
2. 若恰好选择一个书目 item 或一个带可解析父项的子项，同时保留子项与父项身份。
3. 若选择为空，请用户选择或识别论文。
4. 若选中多篇论文，询问是否全部有意，以及用户想要简单答案还是比较。

禁止：

- 在整个库中搜索最近提到的标题；
- 选择第一个可见 item；
- 不记录 attachment 就把它变成父对象；
- 在意图对象与成果已知前就启动深度阅读 workflow。

可能的澄清：

> 我没有明确的当前 Zotero 选择。应该用哪篇论文，你想要简洁答案还是定位到源的分析？

待处理行为：

- 使用 Runner pending 分支，因为需要具体的身份与结果决定。
- 等待时不发出业务结果。

无法提供 identity 时的已取消结果：

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

续读点：

- 用户回答后重新读取当前选择。
- 不要复用过期的空选择结果。

### Trace 2：“我的 library 里没有关于 X 的论文，对吧？”

用户表述：

> 我的库没有关于联邦多模态检索的论文，对吗？

解读：

- 用户要求否定结论。
- 第一页、缓存 index 或模糊标题搜索都不够。
- 相关范围可能是整个当前库或一个命名 collection。
- 词项可出现在标题、摘要、tags、notes 或全文中；请求的搜索深度必须有界。

澄清/默认：

- 若未指定 collection，披露使用的是当前库。
- 若全文覆盖会实质改变答案，询问元数据/摘要搜索是否足够。
- 声明所用的同义词与过滤器。

执行：

1. 解析实时库范围。
- 2. 运行窄语义搜索。
3. 完成所有必需页面。
4. 检查可能的匹配，而不是仅凭片段拒绝它们。
5. 记录最终的 cursor/offset 完成。
6. 区分“在所搜字段中无匹配”与“不存在相关工作”。

证据记录：

- 库身份；
- 筛选与查询词；
- 页数与终态分页事实；
- 已检查的看似可行候选；
- 覆盖的源字段；
- 新鲜度时间戳或实时读取事实。

面向人类的回答：

> 完成所有页后，我在当前库的已声明元数据与摘要字段中未找到匹配 item。这并不确立在不可访问的全文或外部文献中的缺失。

已完成结果：

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

接近命中：

- 若分页只走了一页就停下，返回带已接受 cursor 的 `failed`，不要断言不存在。

### Trace 3：中断的 attachment 交付

用户表述：

> 阅读这份 PDF 的结果部分，告诉我主要数字。

解读：

- 答案要求已交付的全文字节，而非 attachment 元数据。
- 所选 attachment 与父 item 都必须保持可识别。
- 该 task 是只读的。

执行：

1. 解析所选 attachment。
- 2. 检查 attachment 元数据并确认可读媒体类型。
- 3. 请求 bridge 中介的文件投递。
- 4. 下载到声明的本地 artifact 路径。
5. 验证校验和与字节数。
6. 只读取请求的结果部分并保留页定位符。

失败：

- 文件句柄在元数据检查后、已验证下载前过期。

恢复决策：

- 保留 attachment 引用与失败的传输 diagnostic。
- 从同一 attachment 重新获取文件访问。
- 不要猜测 Zotero 存储路径。
- 不要用相似文件名的另一 attachment 替代。
- 若第二次交付失败，返回 `failed`。

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

不安全替代：

- 未经用户同意更弱的依据就基于摘要、先前 digest 或名称相似的本地文件回答。

## 对话与结果模式

当一个用户决策即可解除任务阻塞时，使用简短澄清：

> 我找到两个具有该标题的 Zotero items。应该使用 2023 年会议论文还是 2024 年期刊版本？

当澄清不会实质改变有界读取时，使用已披露的默认值：

> 我将搜索当前 library，保持任务只读，并返回对话式答案。若仅有元数据或 abstract 证据可用，我会报告。

证据不对称时使用限制优先的措辞：

> 前两个论断有已交付全文支持。第三篇论文仅以摘要形式可用，因此我没有比较其实现细节。

使用指明已保留状态的恢复措辞：

> cursor 失败前已接受三页。我保留了最后接受的 cursor，并将从返回的续读处续读，而不重复已完成的页。

请勿使用：

- 当事实来自你的解读时用“Zotero 说”；
- 仅检查了元数据却称"我读了 PDF"；
- 在搜索边界不完整时断言 "there are no papers"（没有论文）；
- 在未检查 Product 或 artifact 时声称"workflow 产生了它"；
- 对计算出的关系称 "the graph proves"（graph 证明）。

返回前，确保摘要、内联证据、可选 artifacts 与诊断讲述同一故事。对话式回答可以比摘要更丰富，但不能与机器结果矛盾。

## 扩展查询决定记录

对于复杂查询，工作时保持一份紧凑记录：

| 字段 | 记录 |
| --- | --- |
| 用户问题 | 确切的有界问题 |
| 范围 | 库、collection、选择、topic、run、Product 或 operation |
| 身份证据 | 稳定 refs 与候选解析事实 |
| 新鲜度 | 实时读取与派生模型状态 |
| 源深度 | 元数据、摘要、note、部分内容或已验证字节 |
| 分页 | 筛选、已接受页、终态 cursor 与恢复位置 |
| 隐私 | 所需内容与刻意排除的内容 |
| 声明 | 直接事实、源文本、派生输出与解释 |
| 交付物 | 对话回答或已验证 artifact |
| 状态 | 已完成、已取消或带原因失败 |

此记录是工作记忆，不是第二个结果信封。只将相关证据、artifact 与诊断字段转入 `zotero-library-task.result.v1`。

若任务交接：

- 交给 analysis 时，包含精确来源 refs、附件身份、交付的证据级别与问题；
- 转交给 synthesis 时，包含已验证的源/model 边界与不支持的论断；
- 对策展，纳入实时变更前证据与请求的期望状态，但不隐含权限；
- 交给托管监督时，包含有限查询结果与监控标准，而非臆造的计划。

从 handoff 中删除推测性候选，同时保留解释其被排除原因的诊断。
