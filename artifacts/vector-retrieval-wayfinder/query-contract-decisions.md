# 搜索接口与结果契约决议

本文件汇总[语义检索、混合排序与证据返回契约](https://github.com/leike0813/zotero-agents/issues/83)中已确认的当前要求，供[v0.9.0 搜索基础工程](https://github.com/leike0813/zotero-agents/issues/88)实施及增强分支承接。它是规划文档；生产 DTO、schema 和 OpenSpec 仍由对应工程变更持有。示例表达已确认行为，不表示当前源码已经具有这些能力。

调查基线为 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`，规划分支为 `dev-refactor`。基础工程先在 dev 交付实际非向量能力，增强分支随后使用相同调用契约接入向量。embedding provider 的具体契约与索引空间策略由[独立决策票](https://github.com/leike0813/zotero-agents/issues/81)承接。

## 公共能力及 owner

| 能力 | 语义 owner / 服务入口 | Workflow Host | 返回单位 |
|---|---|---|---|
| 文献搜索 | Broker `library.searchItems` | `host.library.searchItems` | 一篇文献 |
| 文献来源证据搜索 | SynthesisClient 根方法 `searchEvidence` | `host.synthesis.searchEvidence` | 一个可定位且已核验的来源片段 |
| Topic 结构搜索 | SynthesisClient `topics.search` | `host.synthesis.topics.search` | 一个 canonical Topic |
| Topic 结构读取 | 现有 SynthesisClient `topics.getContext` | 补充显式投影 `host.synthesis.topics.getContext` | 现有指定视图 |

Broker 保留文献搜索语义、Host 范围和原始文献事实；文献搜索的向量增强复用 Synthesis 检索服务。Retrieval Application 位于已有 Synthesis Rust runtime，持有派生表示、索引与查询；来源读取和内容版本核验归原 source owner。配置、凭据和 embedding 网络适配沿用已确认的 Host / reverse Host 职责。

证据语料是 Library 文献来源，服务 owner 是 Synthesis。canonical Topic 综合内容由独立 Topic 搜索承载，不属于 Evidence。Topic 搜索后的结构读取使用既有 getContext 契约，getReport 保留报告正文读取语义。

list/search 分离：list 负责确定性筛选及稳定身份枚举，search 负责内容匹配和相关性排序。listItems / traverseItems 使用可选 `filter?: string`，未传、空串或纯空白均不施加该字面过滤；保留单库 libraryId、源端 predicate 和完整遍历语义。消费同一筛选的 readiness 等投影同步命名。topics.list 当前无 query，不为对称性增加 filter；snapshot 保留原契约。

## 搜索输入与范围

三个入口均使用必填字符串 query。空白拒绝；按多语言内容查询处理，至少一个有效查询单元匹配可进入词法候选，按查询覆盖、短语和匹配字段排序。query 不解释为 SQL、正则或引擎查询语法。公共引用起点已撤回；文献/Topic 引用用于身份读取、明确范围及结果归属。

| 参数 | 已确认规则 |
|---|---|
| limit | 每页，默认 25，最大 100 |
| maxResults | 每轮，默认 100，最大 500 |
| cursor | 不透明续页游标 |
| libraryIds | Library 搜索可选；一项单库，多项显式跨库，空数组拒绝 |
| collectionRef、tag、itemType | Library 的并列硬条件 |
| itemRefs | Library 搜索可选完整 PortableItemRef 集合；空数组是明确空范围 |
| sourceKinds | Library 可选来源类别；未传全部已纳入类别，多项并集，空数组为空来源范围 |
| sections | Topic 搜索可选实际具名结构；未传搜索定义及已纳入综合内容 |

超出已确认上限明确拒绝，不静默截断输入。结果上限按各入口的返回单位计算。

Library 未明确库范围时，在初始请求捕获当前库；无法确定唯一当前库则要求显式指定。仅 collectionRef 可由其所属库确定范围；同时提供 libraryIds 时，集合必须属于声明范围。itemRefs 与库、集合、标签、类型条件取交集，按完整身份去重，不自动开启跨库，结果不按引用输入顺序排列。跨库副本保留完整身份，不按 DOI 或标题合并。

Topic 搜索范围为当前 Synthesis 数据根内 canonical Topics，与 topics.list 的对象范围一致。Topic 不按来源文献推定所属库，不接收 Library 的库/集合/标签条件；跨库来源或无来源论文的 Topic 按自身内容参与搜索。

调用方可读取 Topic 当前保存的来源论文集合，再传入 Library 搜索的 itemRefs。此操作不重跑 resolver，不纳入未采纳的 Discovery 候选或子 Topic 来源。

## 内容覆盖与结果单位

Library sourceKinds 使用共享定义：

- metadata：元数据及摘要。
- fulltext：已有 Markdown 全文。
- analysis：已确认纳入的 digest / 分析产物。

排除普通手写笔记、PDF 批注/高亮、对话笔记及直接原始 PDF 输入。搜索不自动解析 PDF、生成缺失分析或进行 OCR / 图像理解。生成分析保留实际产物类型，不能标成论文原文。

结构化 Markdown 保留表头与数据行的关系；公式搜索已有公式文本/LaTeX 及周边说明，首版不承诺数学等价匹配。图片搜索已有图题、替代文字及周边说明。

文献按完整库及 item 身份聚合，一篇文献占一个位置。最强少量支撑片段可解释匹配，不累计长文所有片段优势。无法可靠定位的内容可辅助文献召回，但不能作为可引用证据片段返回。

Topic 按 Topic 聚合，一个 Topic 占一个位置，返回实际命中 section 和简短匹配说明。section 使用现有 canonical/schema 事实源，例如 claims、debates；不增加通用内容块身份或机械拆分为多个搜索方法。Topic 摘录保留综合内容身份。

## 公共返回与故障

三个入口共享以下语义，results 元素分别使用各自结果类型：

| 字段 | 已确认含义 |
|---|---|
| results | 按相关性排列的结果 |
| status | completed、limited、unavailable |
| method | 本轮实际采用的词法、向量或混合检索 |
| coverage | 实际材料范围和缺失；Library 按来源类别，Topic 按 section |
| issues | 有界结构化问题说明 |
| nextCursor | 不透明续页游标，无续页为 null |
| hasMore | 本轮有界结果是否还有下一页 |
| total | 仅能准确确定范围内全部命中数时为数字，否则 null |

结果数量使用 results.length。候选数量、maxResults 或页大小不能作为全范围命中总数。

正常完成可零命中，表示在声明范围与可用来源中完成了本轮搜索。实际预算不足、读取失败等导致不完整时为 limited，可返回已确认结果；零条受限结果不能冒充正常无匹配。没有可执行方法为 unavailable。全文/分析材料本就缺失时，可搜索其他可用材料并说明覆盖，不因此把整个请求标为不可用。

第一页可回退到独立可执行的词法方法。词法正常完成而向量增强不可用时，可以是 completed / lexical，并通过 issues 说明增强不可用。调用方无需选择检索模式。后续页保持初始方法与依据，不能悄悄换结果集；无效参数或游标依据失效沿用既有错误契约。

Library 结果不附文献 stale。Topic 搜索不附或推断业务 freshness，不为搜索计算依赖状态；调用方按需从 Topic owner 读取。派生表示落后属于检索依据/覆盖问题，来源版本不匹配属于片段核验问题，游标依据变化属于续页错误。

按 [索引生命周期 Q3](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980181939)，确认被索引内容变化时，仅暂停受影响来源的旧片段参与检索，更新成功后恢复；失败不重新启用已知过期片段。其它来源及可独立搜索当前材料的词法方法继续可用，通过 coverage / issues 说明向量覆盖缺口。标签、收藏夹等只改变筛选范围而被编码文本未变时，不暂停或重新编码。

## 证据正文与位置

searchEvidence 在同一调用内召回候选，通过原 source owner 有界读取并核验版本和范围，直接返回命中片段完整正文。正式正文以来源读取时核验成功的内容为准；整篇来源按需复用现有读取能力。没有新增公共 readEvidence。

| 字段 | 已确认含义 |
|---|---|
| itemRef | 所属文献完整 { libraryId, key } |
| content、format | 经核验的完整片段正文及文本格式 |
| source | 来源类别与具体身份，分析附实际产物类型 |
| sourceVersion | 本次核验使用的来源内容版本依据 |
| location | 该版本来源中的字段/结构位置及文本范围 |

元数据/摘要定位具体字段；Markdown 定位实际附件及原始正文；分析定位具体产物及内部位置。复用已有引用和来源模型，远程 DTO 不携带本地路径，定位也不授予写入权限。标题/行号可作阅读提示，不推测 PDF 页码。

文本范围为从零开始的 [start, end)，按 UTF-16 code unit 计数，边界保持 Unicode 字符完整。范围绑定指定 sourceVersion 下的来源文本，不是检索清洗表示的偏移；清洗/归一化保留原文映射。来自其他位置的表格标题等上下文分别标明范围，不把拼接内容标为连续原文。内部字节读取和 Rust/TypeScript 换算不改变其他现有读取契约。

sourceVersion 由原 source owner 提供，调用方按不透明值使用，复用已有内容版本依据。附件 item revision 不能代替文件正文版本。未核验片段不作为正式正文返回；来源变化、缺失或读取失败按 limited / unavailable、coverage / issues 及续页依据规则表达。

现有 artifacts.readPaperArtifacts 的 markdown 字段不表示其已有原始 Markdown 全文读取能力。基础工程需复用及补齐实际来源读取，不能仅提供 DTO 或新增平行文件服务。

## 排序、分页与 embedding

词法与向量分别产生相关性排名，初版采用等权 RRF，k=60；文献先按文献聚合排名再融合。词法同分保持同等贡献，完整身份仅作最终稳定排序，不用身份顺序伪造词法相关性。首版不引入全文 BM25 或 reranker。结果顺序、排名及匹配说明表达相关性，不提供跨方法通用分数；原始分数仅诊断使用。

硬范围内搜索及取 top-k；内部候选预算不足明确 limited。初始页固定 query、条件、实际方法、排序及相应依据；cursor 绑定这一轮。hasMore 只针对本轮有限结果，不表示全库全部匹配已枚举。

达到调用方指定的 maxResults 属于正常完成，与内部预算不足导致 limited 区分。

查询向量仅匹配同模型兼容且已就绪的索引。索引绑定模型 ID 和自身编码要求，不绑定某套服务连接。后台使用模型要求的配对 query/document 编码，核对模型身份、维度及影响表示的设置；前缀可不同，仅维度相同不能证明兼容。没有兼容就绪索引时按独立可执行方法回退并说明增强不可用，新旧向量不混用。

query 接收各种语言，不加语言白名单、模型参数或向量模式。中英文及跨语言查询作为主要验收；实际模型由用户配置。服务配置可保存多套，当前数据根只使用一个生效模型及一套正式索引。按 [模型 ID 身份 Q12 修订](https://github.com/leike0813/zotero-agents/issues/81#issuecomment-5979907505)，模型身份以生效模型 ID 与索引记录匹配判断，不要求固定版本证明。同 ID 下未改变响应形状的服务端模型替换不保证可检测。

保存新服务配置不立即切换。按 [索引绑定模型、连接独立](https://github.com/leike0813/zotero-agents/issues/81#issuecomment-5979918636)，同模型的兼容服务切换或地址变化复用已有索引；模型 ID、维度或影响表示的编码设置变化才通过重建切换。按 [生命周期 Q5](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980407180)，整体重建期间语义/向量检索整体不可用，不使用旧模型/旧索引继续向量查询或增量编码；可独立执行的词法方法继续使用，并说明增强不可用。成功后一起切换模型及编码设置与索引并清理旧索引；按 [Q6](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980431165)，发布前失败或取消保留已完成构建工作，语义检索仍不可用，用户重试完成并整体发布后恢复。按 [Q10](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980565013)，成功发布后的旧数据清理失败不关闭新索引语义检索，用户只重试清理。以后切回旧模型需重建，不维护逐模型历史索引。重建空间纳入维护预算，不足时明确报告并保留旧索引。

按 [同模型服务 fallback Q13](https://github.com/leike0813/zotero-agents/issues/81#issuecomment-5979965295)，用户指定主服务及有序备用服务；查询每个服务最多一次，共用整次查询时间预算，全部失败或预算耗尽后按独立词法方法回退，无可执行方法时为 unavailable。fallback 对公共 search 调用方透明。删除连接保留索引，恢复同模型兼容服务后可复用仍就绪的索引。

## 代表性调用与预期结果

以下 PortableItemRef 和库号均为示意身份，不对应真实文献。

```typescript
host.library.searchItems({
  query: "跨语言检索",
  libraryIds: [1, 2],
  sourceKinds: ["metadata", "fulltext"],
  limit: 25,
});

host.synthesis.searchEvidence({
  query: "retrieval evaluation",
  libraryIds: [1],
  itemRefs: [{ libraryId: 1, key: "EXAMPLE1" }],
  sourceKinds: ["fulltext"],
});

host.synthesis.topics.search({
  query: "存在争议的结论",
  sections: ["claims", "debates"],
});
```

| 场景 | 可观察结果 |
|---|---|
| 双库文献匹配 | results 按文献返回，保留完整身份并统一排名；total 无法准确确定时为 null |
| 指定论文全文证据命中 | results 返回已核验完整片段正文、实际附件来源、版本及原始文本范围 |
| 同一 Topic 多 section 命中 | 一个 Topic 结果，附实际命中 sections；可通过 getContext semantic 视图读取完整结构 |
| itemRefs 为 [] | 明确空范围，completed 且 results 为空，不扩展到全库 |
| Markdown 尚不存在，metadata 可搜索 | 搜索可完成；coverage 说明实际材料与缺失，结果不伪造全文证据 |
| 词法正常完成，向量不可用 | completed / lexical，issues 说明增强不可用 |
| 来源核验读取失败 | limited，返回其他成功核验结果并说明受限；不能用 completed 零命中掩盖失败 |
| 没有可执行方法 | unavailable，说明原因，与正常无匹配区分 |
| 初始页依据在续页时失效 | 既有错误契约报告不可续页，需要重新查询，不自动更换方法或结果集 |

## 已确认依据与待承接事项

- [服务 owner 纠正](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979038445)、[Topic 搜索 Q22](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979080340)、[getContext 投影 Q23](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979096878)。
- [库范围 Q19/Q20](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5978923901)、[itemRefs Q24](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979308803)、[分页及来源筛选 Q25/Q26](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979330411)。
- [直接返回正文 Q27](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979394785)、[来源字段 Q28](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979417734)、[位置计量 Q29](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979434714)。
- [公共返回 Q30](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979460381)、[向量兼容 Q31](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5979472295)。
- [结构化 Markdown Q11/Q12](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5978471528)、[排序、分数及界限 Q13–Q15](https://github.com/leike0813/zotero-agents/issues/83#issuecomment-5978484485)。

#88 根据实际来源模型落实具体 DTO / schema、范围解析、非向量查询、来源读取与核验、投影、必要行为测试和 OpenSpec。coverage / issues 等嵌套结构仍需与实际生产路径对齐，不用假字段冒充已存在能力。

[provider 与配置票已完成](https://github.com/leike0813/zotero-agents/issues/81#issuecomment-5979998325)：服务端点、多套连接保存、索引绑定模型、同模型兼容服务切换免重建、有界 fallback、删除连接保留索引、模型变化重建及完整响应校验已确认。具体 DTO/schema 由后续 OpenSpec 承接；#83 继续开放，待索引生命周期、引擎等依赖与必要契约承接完成后按决策地图流程收敛；本文不授权生产代码修改、提交或分支操作。
