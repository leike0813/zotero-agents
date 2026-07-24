# 元数据解析

在第 40 阶段主代理审阅中使用本参考文档。它定义了如何将单篇论文的原始
调研结果转化为针对同一篇已批准作品本身的、有证据支撑的 Zotero 元数据决策，
而非一个看似合理但实际不同的替代结果。当 worker 结果信息不足或存在矛盾时，
本参考文档还指导执行一次小范围的有界修复搜索。
静态 worker 提示仍保留在 `SKILL.md` 中；不要将本参考文档作为
第二份 worker 协议附加，也不要将其各节转化为 worker 可见的阶段。

## 调研交接与规范审阅边界

主代理首先执行 `prepare_agent_batches`，然后在等待之前启动所有
缺少结果的单篇论文任务。每个 worker 仅写入其纯数据规格所指定的
扁平 `result.json` 后退出。该文件可能包含标题、创建者姓名、日期、标识符、URL 和备注，
但它属于不可信的调研材料，而非规范的元数据载荷。

主代理负责语义边界。它读取原始结果、核实已批准的候选身份、
在必要时检查引用的来源 URL、在关键信息缺失时执行小范围的有界修复搜索，
并向 gate 指定的路径写入一份正式的 `researchReviewPayload`。
只有正式的 `metadata` 成员在 schema 和运行时验证后才能成为规范状态。
Worker 永远不会调用 gate、运行 finalizer、提交审阅、写入 `runtime/payloads/`，
也不会接收 Zotero 变更命令或 Host receipt 路径。

所有中间文件保留在 runner 工作区内。Worker 规格和原始结果
存放在 `runtime/agent-batches/batch-NNN/` 下；主代理审阅和运行时生成的规范载荷
存放在 `runtime/payloads/` 下；Host receipt 存放在 `runtime/host/` 下。
不要将工作重定向到 `/tmp`、主目录、缓存目录或其他任务目录。
如果 worker 无法写入其结果路径，它可以直接返回相同的扁平 JSON 对象；
主代理可在审阅前将该对象写入声明的路径。

全部结果就绪屏障仅意味着每个 worker 都已终止并完成了原始交接。
它不接受元数据。主代理审阅仍然按 gate 顺序逐个处理已批准的候选，
以确保规范投影的确定性。
格式错误的 worker JSON、不支持的键、弱来源和矛盾信息由主代理修复或拒绝，
而非通过 worker 侧的 schema/finalizer 循环发送。

## 解析顺序

1. 规范化每个候选标识符。
2. 查询该标识符的权威注册中心或直接来源页面。
3. 检查该作品本身的出版商、仓库、图书馆或发布机构记录。
4. 比对标题、创建者、日期、类型、容器、版本和材料版本。
5. 使用二级索引来佐证事实并识别冲突。
6. 如果没有标识符可以解析，则使用原始文字形式的标题和独立佐证执行标题路径。
7. 主代理为该候选发出恰好一份正式的 `qualified` 或 `not_attempted` 元数据审阅。

搜索摘要和模型知识可以建议查询方向。它们不被接受为元数据证据。

## 标识符规范化

| 标识符 | 规范形式 | 拒绝或需调查的情况 |
| --- | --- | --- |
| DOI | 小写后缀，不含 `doi:`、解析器 URL、查询参数或周围标点 | 语法无效、解析目标不相关，或存在标题/类型/版本冲突 |
| ISBN | 不含分隔符的有效 ISBN-10 或 ISBN-13 | 校验位无效、ISBN 对应的是容器而候选是章节，或版本不同 |
| PMID | 仅十进制标识符 | 记录描述的是被引作品而非候选本身 |
| arXiv | 规范类别/id 或数字 id；保留版本号作为材料证据 | 已发表文章在未明确进行版本判断的情况下被视为同一条目 |

标识符接受要求：

- 候选、证据、匹配对象和 `metadata.identifiers` 之间精确规范化相等；
- 来自权威的作品本身证据；
- 标题、作品类型或版本中不存在未解决的材料冲突；
- `match.method: "identifier"` 以及匹配的 `normalized_identifier`。

精确的标识符不授权从不同的容器、勘误、审阅、数据集或衍生出版物中复制元数据。

## 标题路径接受

仅当所有条件均满足时使用 `match.method: "title"`：

- 权威原始标题规范化后指向同一作品本身；
- 着陆 URL 代表该作品；
- 至少两个独立的佐证信号一致，例如有序的创建者、年份、发布机构、容器、文档类型或特征性副标题；
- 不存在材料版本冲突；
- `corroborating_signals` 列出了实际使用的信号。

同一个弱聚合器的副本重复提供的两个值不构成独立信号。
翻译标题匹配加上一条搜索摘要是不够的。

当无法建立强身份时，应发出 `not_attempted` 而非猜测。

## 证据角色

### 权威证据

示例：

- 该作品本身的 DOI、ISBN、PMID 或 arXiv 注册记录；
- 出版商或期刊文章页面；
- 预印本、学位论文、报告或机构出版物的官方仓库记录；
- 标准或报告的发布机构；
- 学位论文的大学目录或论文仓库；
- 图书或版本的出版商或国家图书馆记录。

至少有一个 `qualified` 载荷的证据条目必须使用 `role: "authoritative"`。

### 次要证据

跨领域索引、引文数据库、图书馆聚合器、项目页面和作者主页可以佐证或揭示冲突。
其事实必须归属于所检查的确切 URL。

### 弱证据

搜索摘要、抓取的引文页面、无归属的参考文献列表和模型回忆仅可作为查询线索。
它们不能使记录获得 `qualified` 资格。

每条证据记录来源、直接 URL、角色、原因和观察到的具体事实。
当有助于区分原始文本、翻译文本或容器文本时，在 `raw_title` 中保留来源原始措辞。

## 作品本身与相关记录

在映射字段之前先对记录进行分类：

- **作品本身与容器：** 期刊、会议录、图书、丛书或仓库页面不是文章、论文、章节或学位论文。
- **版本：** 不同的 ISBN、修订声明、出版商或版本号可能表示不同的书目对象。
- **预印本与文章：** 链接两者关系，但当发表状态、标识符、分页或实质版本不同时，保留独立的条目身份。
- **学位论文与文章：** 共享的标题片段和作者身份不能合并学位论文和衍生文章。
- **图书与章节：** 章节标题放入 `metadata.title`；图书放入所选条目类型语义匹配的标量字段。
- **勘误、数据集、协议或评论：** 不要用它们替代其所引用的作品。

如果解析发现了不同的作品，使用 `reason: "identity_not_verified"` 并说明可用记录不是已批准的作品本身。
如果关系是真实的但材料版本仍未解决，使用 `reason: "material_conflict_unresolved"`。

## Zotero 类型与字段角色

选择能描述作品本身的最精确的受支持 Zotero 条目类型：

| 作品本身 | 典型 `itemType` | 重要字段角色 |
| --- | --- | --- |
| 期刊文章 | `journalArticle` | 标题、出版物标题、卷、期、页码、日期 |
| 会议论文 | `conferencePaper` | 论文标题、会议录标题、会议名称、地点、日期 |
| 图书 | `book` | 书名、版本、出版商、地点、日期、ISBN |
| 图书章节 | `bookSection` | 章节标题、书名、页码、出版商、编辑 |
| 学位论文 | `thesis` | 论文标题、类型、大学、地点、日期 |
| 报告 | `report` | 报告标题、报告编号、机构、地点、日期 |
| 预印本 | 受支持的预印本类型或语义最接近的 Host 类型 | 仓库、版本、日期、arXiv id |

`metadata.title` 是唯一的正式主标题字段，指代作品本身。
不要提供 `metadata.originalTitle`、`metadata.fields.title` 或 `containers` 对象：
这些不属于本 ingest 载荷合约。
将有证据支撑的期刊、图书、会议录、会议、大学、机构、丛书、仓库、出版商或地点
直接映射到与所选 `itemType` 语义匹配的标量字段。

运行时根据规范字段名白名单对字段名进行严格验证。
它不会动态调用 Zotero 的 `ItemFields`。该白名单不证明语义适当性：
代理仍必须省略角色不适合所选条目类型的字段，
而非使用看似诱人但不兼容的字段名。不要将任意来源键复制到 `fields` 中。

## 标题与原始语言

从直接权威记录中确定原始出版语言，而非从索引页面的语言推断。

- `metadata.title` 是作品的权威出版标题。
- `metadata.fields.title` 无效；确定性 ingest 准备会将 `metadata.title` 投射到 `paper.fields.title`。
- `alternateTitles` 包含带有明确角色的翻译、罗马化、缩写或另行出版的替代形式。
- 有证据支撑的容器或发布事实使用相关的标量字段，例如 `publicationTitle`、`bookTitle`、`proceedingsTitle`、`conferenceName`、`university` 或 `institution`，仅在其适合所选 `itemType` 时使用。

对于中文：

- 保留权威的简体或繁体形式，以出版时为准；
- 不要将一种字形规范化为另一种作为主标题；
- 仅当来源确实以替代形式提供另一种字形时才记录；
- 永远不要通过拼接中文和英文来创建双语主标题。

对阿拉伯文、西里尔文、天城文、日文、韩文及其他非拉丁文字记录应用相同的原始文字规则。
罗马化有助于匹配，但不能替代主标题。

## 创建者完整性

创建者是有序的书目数据。

仅当权威来源验证了完整的有序列表时才使用 `creatorCompleteness: "complete"`。此时：

- 不应拆分的机构名或原生名称使用 `{"creatorType": "...", "name": "..."}`；
- 可靠分段的个人姓名可以使用 `firstName` 和 `lastName`；
- 不要将罗马化的创建者混入原生文字列表中，除非权威记录发布了完全相同的表示形式。

对于中文或其他原生文字作品，如果完整的原生创建者列表无法验证：

- 将 `creatorCompleteness` 设为 `incomplete`；
- 将 `creators` 设为 `[]`；
- 添加警告码 `native_creator_names_unverified`；
- 将 `needs_curation` 设为 `true`。

永远不要将经过验证的部分列表当作完整列表写入。
永远不要用翻译或罗马化的姓名替代缺失的原生姓名，仅仅是为了避免空数组。

## 标识符与 URL 角色

- 所有 DOI 值仅放入 `metadata.identifiers.doi`。
- 不要将 DOI 放入 `metadata.fields.DOI` 或 `metadata.fields.doi`。
- 不要将 ISBN 放入 `metadata.fields.ISBN`。
- 不要在 `metadata.fields.extra` 中放置 `DOI:` 行、其他标识符编码或自由格式的后备元数据；`extra` 在正式审阅中无效。
- Host 为受支持的条目类型写入原生 DOI 字段，仅在条目类型没有原生 DOI 字段时使用 Extra。
- ISBN、PMID 和 arXiv 值使用其命名的标识符键。
- `landingUrl` 是稳定的作品本身页面。
- PDF URL 由单独的正式 PDF 审阅确定，不得从元数据着陆页面推断。

## 适配 literature-metadata-search 输出

`literature-metadata-search` 有自己更丰富的元数据合约。将其输出视为需要适配的证据，
而非可以逐字复制的正式载荷。其对 `abstractNote` 的使用在两个合约中均有效，
但其 `originalTitle`、`containers`、`fields.title`、标识符字段和创建者完整性值
必须规范化为本 Skill 更窄的 ingest 结构。

在写入正式的主代理元数据审阅之前，应用以下转换：

| 元数据搜索来源 | 正式 ingest 目标 | 所需判断 |
| --- | --- | --- |
| `originalTitle.value` | `metadata.title` | 优先使用权威的原始出版标题。 |
| 无原始标题时的来源 `fields.title` | `metadata.title` | 仅在有作品本身证据支持时使用。 |
| 原始/来源标题值冲突 | 无自动目标 | 视为需人工整理或 `not_attempted`；不要静默选择。 |
| `fields.abstractNote` | `metadata.fields.abstractNote` | 仅保留有证据支撑的摘要；不要将其重命名为 `abstract`。 |
| `fields.DOI`、`fields.doi`、`fields.ISBN`、PMID 或 arXiv 值 | `metadata.identifiers` | 规范化并保持标识符类型明确。 |
| `containers` 角色/值条目 | 与条目类型兼容的标量字段 | 期刊 → `publicationTitle`、图书 → `bookTitle`、会议录 → `proceedingsTitle`、会议 → `conferenceName`、机构 → `institution`，仅在有匹配证据时映射。 |
| `creatorCompleteness: "unknown"` | `creatorCompleteness: "incomplete"`，`creators: []` | 保留整理备注；本 ingest 合约不接受 `unknown`。 |
| `fields.extra` | 无直接目标 | 省略；不要通过 Extra 传递元数据或标识符。 |

适配器不会扩展本 Skill 的 schema。特别是，不要发出 `metadata.originalTitle`、`metadata.containers`、`metadata.fields.title` 或 `creatorCompleteness: "unknown"`。
在正式证据中保留来源 URL 和事实，以便运行时审计适配结果。
主代理仅在 gate 签发的审阅载荷中应用此映射，不修改来源 Skill 自身的输出。

## Qualified 载荷

以下标识符路径示例在结构上是完整的：

```json
{
  "status": "qualified",
  "metadata": {
    "itemType": "journalArticle",
    "title": "隧道衬砌病害智能识别研究",
    "language": "zh-CN",
    "script": "Hans",
    "alternateTitles": [
      {
        "value": "Intelligent Recognition of Tunnel Lining Defects",
        "role": "translated",
        "language": "en",
        "script": "Latn"
      }
    ],
    "fields": {
      "date": "2024",
      "language": "zh-CN",
      "publicationTitle": "隧道工程学报",
      "abstractNote": "基于视觉模型识别隧道衬砌病害的研究。"
    },
    "creatorCompleteness": "incomplete",
    "creators": [],
    "identifiers": {
      "doi": "10.5555/tunnel.001"
    },
    "landingUrl": "https://doi.org/10.5555/tunnel.001"
  },
  "evidence": [
    {
      "source": "中国 DOI",
      "url": "https://doi.org/10.5555/tunnel.001",
      "role": "authoritative",
      "facts": ["identifier", "original_title", "publication_year"]
    }
  ],
  "corroborating_signals": [
    "规范化的 DOI 与原始中文标题匹配。"
  ],
  "curation_notes": [
    "完整的中文创建者列表未经验证。"
  ]
}
```

对于标题路径载荷，将标识符映射留空，并包含至少两个具体的 `corroborating_signals`。
运行时自行判断接受的记录使用的是标识符优先路径还是标题路径，以及 `needs_curation` 的值。

## Not-attempted 载荷

使用稳定的原因码并保留已检查的证据：

```json
{
  "status": "not_attempted",
  "reason": "identity_not_verified",
  "message": "原始标题匹配，但创建者和出版物类型无法得到佐证。",
  "evidence": [
    {
      "source": "跨领域索引",
      "url": "https://example.org/record/ambiguous-work",
      "role": "secondary",
      "facts": ["title_only"]
    }
  ]
}
```

合法的 `reason` 值为：

- `identity_not_verified`；
- `material_conflict_unresolved`；
- `authoritative_metadata_unavailable`；
- `tool_unavailable`。

`not_attempted` 是候选元数据的终态结果。它不会触发替换提示，也不会阻塞对其他已批准候选的处理。

## 示例与反例

### 接受：权威的中文记录

DOI 注册中心和期刊着陆页在中文标题、DOI、年份、类型和完整的有序中文创建者列表上一致。
将中文标题存为主标题，英文标题存为 `translated`，创建者存为有序的单字段名称。

### 接受但需整理：创建者无法验证

中文标题和 DOI 是权威的，但可用页面显示不一致或缩略的作者列表。
保留中文标题，使用空的创建者列表，添加所需警告，并以 `needs_curation: true` 继续。

### 拒绝：英文翻译覆盖中文标题

英文索引翻译了中文标题。将该翻译用作 `metadata.title` 会更改原始书目身份。
仅将其保留在 `alternateTitles` 中；确定性 ingest 准备（而非调研 worker）会写入 `paper.fields.title`。

### 拒绝：部分创建者列表

搜索页面显示第一作者后跟"et al."。写入该一位作者并将完整性标记为 `complete` 会制造虚假数据。
使用完整或空规则。

### 拒绝：弱聚合器

引文聚合器提供了标题、年份和一个类似 DOI 的字符串，但没有直接着陆证据。
它可以引导进一步查询；不能成为 `qualified` 的唯一权威。

### 拒绝：材料冲突

候选是会议论文，而解析的 DOI 属于一篇标题相似的后续期刊文章。
记录 `material_conflict_unresolved` 或 `identity_changed`；不要替换已授权的作品。

### 拒绝：DOI 放入 `extra`

载荷包含 `fields.extra: "DOI: 10.5555/example"`。将规范化的值移至 `identifiers.doi`。
如果存在另一个 DOI 表示形式冲突，宁可失败也不要静默选择其一。

### 拒绝：`abstract` 被当作 Zotero ingest 字段

上游页面将其摘要标记为"Abstract"，载荷写入了 `metadata.fields.abstract`。
该字段名在本合约中无效，否则只会在 Host 变更时才失败。
当摘要有权威且有用时，使用规范的 `metadata.fields.abstractNote`；否则省略。
不要为了填充字段而凭空编造或翻译摘要。
