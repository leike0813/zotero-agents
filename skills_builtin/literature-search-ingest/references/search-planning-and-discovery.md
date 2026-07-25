# 检索规划与发现

本参考用于阶段 10、20 和 30。它深化模式路由、引导式信息收集、本地覆盖、高召回发现、累计候选、去重、候选分层和范围审核。

## 规划原则

1. 先理解用户目标，再选择搜索策略。
2. 阶段 10 批准前只读取本地 Zotero/Synthesis 上下文，不执行外部发现。
3. 搜索计划必须同时说明纳入方向和排除边界。
4. 语言提示扩大覆盖，不构成语言过滤器。
5. `searchBreadth` 改变覆盖范围，不改变候选身份和证据门槛。
6. 发现阶段追求召回，入库阶段追求可验证性；两者不能混为一层。
7. 每轮发现都在累计候选集上合并，不因某轮未命中而丢失早期有效候选。
8. 阶段 30 的批准对象是直接作品身份，不是搜索结果页面或模糊主题。

## 模式路由

### `auto`

根据 `query` 和本地上下文形成推荐简报：

- 空白或不完整意图：进入 guided intake；
- 主题、方法、对象或覆盖空白：推荐 `topic_expansion`；
- 已知论文、citekey、item、Topic 或项目：推荐 `paper_seed_expansion`；
- DOI、ISBN、PMID、arXiv、精确标题：推荐 `targeted_ingest`。

含有论文标题不一定代表 targeted ingest。若用户要求“以此为起点找相关工作”，应采用 seed expansion。

### `guided`

guided 适用于目标尚未形成可执行查询的情况。它是独立检索模式，completed 结果保留 `guided`，不强制映射到其他模式。

### `topic_expansion`

围绕主题本体、同义词、方法、对象、应用、地区、语言和本地覆盖空白建立 query lanes。优先覆盖用户问题所需证据，而不是追求无边界的相似论文数量。

### `paper_seed_expansion`

先验证种子直接作品身份，再使用：

- references；
- citations；
- related works；
- 作者和研究团队；
- 数据集、项目和方法名称；
- preprint、会议和期刊版本关系。

扩展候选不能借用种子的身份或 identifier。

### `targeted_ingest`

只核验指定直接作品，搜索范围服务于身份、metadata、PDF 和本地重复判断。不要加入“可能感兴趣”的相关论文。

## 引导式信息收集

优先从用户已有陈述推导以下内容：

- 研究对象或学科；
- 核心问题、假设或知识空白；
- 关注的方法、材料、场景或应用；
- 时间、地区、语言和文献类型；
- 已知种子、必须包含或必须排除的工作；
- 希望补足的 Zotero/Synthesis 覆盖。

只有缺失内容会改变查询、来源或纳入标准时才提问。例如：

- “你关注病害识别算法，还是完整检测系统？”会改变方法和应用 lanes；
- “是否纳入学位论文？”会改变地区数据库和机构库；
- “未知年代范围”通常可以先使用宽范围，不必形成等待。

达到以下最低条件即可停止提问：

- 能写出一句明确研究目标；
- 能列出至少一个核心 query lane；
- 能说明明显排除边界；
- 能选择适用来源类别。

## 本地覆盖检查

在阶段 10 使用只读查询检查：

- 精确 identifier 和标准化标题重复；
- 目标 collection 中的已有记录；
- Synthesis Topic、文献注册表、索引和相关工件；
- 可复用种子、citekey、item id、collection ref 或 Topic ref；
- 本地 metadata/PDF 缺口。

本地覆盖摘要包含：

```json
{
  "summary": "本地库已有通用视觉检测论文，但缺少隧道衬砌中文工程研究。",
  "existingIdentifiers": ["10.0000/example"],
  "reusableSeeds": ["zotero://select/library/items/ABC123"],
  "gaps": ["中文学位论文", "真实隧道工程数据"]
}
```

本地记录可以作为重复判断和种子，但外部 metadata 仍需从适用权威来源核验。

## 检索方案

阶段 10 检索方案应紧凑且可执行：

```json
{
  "searchMode": "guided",
  "objective": "查找用于隧道衬砌病害识别的计算机视觉研究",
  "scope": {
    "dateRange": "2018-present",
    "languageHints": ["zh-CN", "en"],
    "literatureTypes": ["journalArticle", "conferencePaper", "thesis"],
    "regions": ["China"]
  },
  "queryLanes": ["core", "multilingual", "gap"],
  "sourceLanes": ["regional", "cross-domain metadata", "institutional repositories"],
  "inclusion": ["直接研究隧道衬砌病害识别或检测"],
  "exclusion": ["仅讨论通用目标检测且无隧道应用"],
  "stopConditions": ["适用 lanes 完成且新高相关候选趋于饱和"]
}
```

方案中的查询是策略示例，不需要穷举所有后续关键词。用户批准的是方向、边界和来源组成。

## 发现通道

### Core lane

组合对象、问题、方法和应用：

- 对象 + 问题；
- 对象 + 方法；
- 问题 + 数据/评价；
- 对象 + 方法 + 工程场景。

### Multilingual lane

生成：

- 原语言和英文术语；
- 简繁体、地区词汇和脚本变体；
- 常见缩写与全称；
- 学术术语与工程术语；
- 经过核验的翻译或音译。

不要把机器翻译标题当作作品正式题名。

### Seed lane

围绕种子的 references、citations、作者、数据集、项目、方法和版本关系搜索。每个发现仍须建立自己的直接作品身份。

### Gap lane

只补足本地覆盖或阶段 30 明确提出的缺口。gap lane 应能说明“为什么该查询可能补足缺口”。

### Identifier lane

对 DOI、ISBN、PMID、arXiv 等进行精确检索，用于定位记录、消歧和发现权威落地页。

### Version lane

检查 title/author/identifier 变化以及 preprint、会议、期刊、学位论文、报告、章节的材料关系。版本 lane 的目标是正确区分，而不是自动合并。

## 来源组合

优先级按问题和学科调整，但不要把单一索引当作完整覆盖。跨学科检索至少考虑：

- Crossref、OpenAlex、Semantic Scholar、Google Scholar 或等价的公开学术索引；
- 出版商、期刊、会议、学位授予机构、作者或项目权威页面；
- 机构仓储、学位论文仓储、图书馆目录、参考文献和引用图谱等长尾来源。

按领域补充适用来源：

- 生物医学：PubMed、Europe PMC、期刊页面和临床/机构仓储；
- 预印本和技术报告：arXiv、领域仓储、项目页面和最终发表着陆页；
- 图书和章节：ISBN 注册库、图书馆目录、出版商页面和章节/馆藏记录；
- 中国大陆：China DOI、公开可访问的 CNKI/Wanfang metadata、PDC、官方期刊/会议/出版商页面、学位授予机构和机构仓储；
- 繁体中文及区域来源：Airiti Library、TSSCI、台湾学位论文仓储、期刊、大学和图书馆来源。

对于中文文章，优先使用 China DOI 和官方出版记录；对于学位论文，优先使用学位授予机构或其仓储；对于图书，优先使用出版商和图书馆目录。公开网络搜索用于补充发现和定位未索引页面，不能单独承担关键身份事实。

来源记录需要说明它实际支持的事实，例如 original title、authors、year、container、identifier、material type 或 landing URL。搜索摘要和弱聚合器仅提供 lead。

## 多语言与地区覆盖

语言覆盖不是把一个英文查询翻译若干次。需要考虑：

- 学科术语在不同地区的正式名称；
- 人名和机构名的原脚本、罗马化和译名；
- 本地期刊、学位论文和机构库的检索习惯；
- DOI 之外的地区 identifier；
- 中文简繁体、日文汉字/假名、欧洲语言词形等变体。

每个适用的语言或地区 lane 至少使用一个相关学术索引，再使用一个权威出版记录、机构仓储、图书馆目录或其他长尾来源。来源失败要记录状态，并尝试承担相同证据角色的替代来源；不能把未尝试的 lane 计入覆盖。

发现记录保留来源原文。若原文题名可确认，候选展示和后续 metadata 优先保留原文题名。

## 发现轮次记录

每轮至少记录：

```json
{
  "round": 1,
  "queryAttempts": [
    {
      "lane": "core",
      "query": "隧道衬砌 病害 智能识别",
      "source": "regional scholarly index",
      "status": "completed",
      "resultCount": 8
    }
  ],
  "newCandidateIds": ["doi:10.0000/example"],
  "updatedCandidateIds": [],
  "uncoveredGaps": ["繁体术语"],
  "stopReason": "scope_review_requested"
}
```

状态可用 `completed`、`unavailable` 或 `error`。不可用和错误本身是审计事实，不要伪装成零结果。

新轮次只合并：

- 新发现的直接作品；
- 对同一 candidate 的新 identifier、权威来源或字段证据；
- 有证据的 tier、版本或重复状态变化。

## 候选身份与去重

### 稳定 candidate id

优先次序：

1. 规范化 DOI；
2. ISBN、PMID、arXiv 等材料适用强 identifier；
3. 权威来源记录 id；
4. 规范化原文标题 + 主要创建者/机构 + 年份 + material version。

candidate id 在当前运行中保持稳定。发现更强 identifier 时，可以将现有 identity 映射到同一直接作品，但必须保留来源和合并理由。

### 去重判断

强合并证据包括：

- 相同规范 identifier；
- 权威来源明确链接同一记录；
- 标题、完整 creators、年份和材料版本高度一致；
- 出版记录明确说明同一版本。

以下情况不能仅凭相似标题合并：

- conference paper 与 journal extension；
- preprint 与经过大幅修改的正式版；
- thesis 与衍生 article；
- book 与 chapter；
- dataset、protocol、correction、editorial 与研究论文。

## 候选分层

### `ready`

- 可追溯的直接作品身份；
- 足够的题名、创建者/机构、年份和材料类型；
- 至少一个权威来源；
- 版本冲突已解决；
- 能进入阶段 40 的进一步 metadata/PDF 研究。

### `needs_curation`

- 直接作品可追溯；
- 某些 identifier、创建者、日期、容器或版本细节仍需权威来源补足；
- 缺口是可解决的，不是身份本身未知。

### `lead_only`

- 只有搜索摘要、引用片段或弱聚合器；
- 标题过于模糊；
- 作品/材料身份冲突；
- 无法建立权威落地页或基本 bibliographic record。

`lead_only` 可以用于下一轮查询，不可在阶段 30 批准入库。

## 候选文件

每个去重后的 candidate 都立即写入 `runtime/candidates/` 下的一个 JSON
object。新 discovery evidence 更新同一直接作品的原文件，不创建第二个文件。
文件名使用当前运行内稳定的顺序编号，例如 `candidate-0001.json`；文件内容
至少包含 `candidateId`、`title`、`tier` 和 `payloadPath`。

```json
{
  "candidateId": "doi:10.5555/example",
  "title": "隧道衬砌病害智能识别研究",
  "tier": "ready",
  "creators": ["张三", "李四"],
  "year": "2024",
  "container": "隧道建设",
  "language": "zh-CN",
  "materialType": "journalArticle",
  "materialVersion": "published",
  "identifiers": {"doi": "10.5555/example"},
  "landingUrl": "https://doi.org/10.5555/example",
  "discoverySources": [
    {"source": "China DOI", "url": "https://doi.org/10.5555/example"}
  ],
  "missingFields": [],
  "payloadPath": "runtime/payloads/candidate-0001.json"
}
```

candidate 文件是 Stage 30 的表格来源和 Stage 40 的研究输入，不是 Host
ingest payload。Stage 30 直接读取这些文件投影候选表格，并将用户选择解析为
candidate ids；Stage 40 将获批 candidate 文件路径传给 subagent。`payloadPath`
由主代理预分配，subagent 读取它并将合格论文的单篇 Host payload 写入该路径。

## 广度与停止条件

### Broad

只有在以下条件都满足时才完成：

- 所有适用的 core、多语言、seed、gap、identifier 和 version lanes 都已实际尝试；
- 每个关键语言或地区都使用了至少一个学术索引和一个权威或长尾来源；
- 计划中的每个来源角色都已尝试，或已记录不可用原因并尝试等价角色的替代来源；
- 种子引用、参考文献和概念扩展在适用时均已尝试；
- 连续的有实质意义的 query/source 组合未产出新的相关直接作品，或已达到用户明确的限制；
- 未解决的覆盖缺口已列入范围审核。

### Balanced

完成 core、适用的 multilingual/seed lane、至少一个宽泛索引和一个权威或长尾来源，并处理明显版本冲突。每个已声明的关键语言或地区至少有一条实际来源尝试。

### Quick

执行最高信号 identifier/core 查询和最高价值的多语言或种子 lane，并使用一个权威或宽泛来源角色。可以保留未覆盖的 lanes，但要明确当前结果是初步范围，不能声称穷尽覆盖。

合理停止原因包括：

- 所有适用 lanes 已完成；
- 连续补检只产生已知重复；
- 新结果不再改变高相关候选集；
- 剩余来源不可用且 fallback 已尝试；
- 用户需要先审核当前范围；
- targeted record 已被精确定位或确定不可解析。

## 范围审核

阶段 30 表格应展示：

- candidate id；
- 文献标题；
- 作者；
- 候选分层（`ready`/`needs_curation`/`lead_only`）；
- year、container（如果有）；
- 条目类型（`materialType`）；
- language（初步判定）；
- identifiers（如果有）。

用户可以：

- 批准入库全部的 candidates（`all`，包含分层为 `ready` 和 `needs_curation` 的候选）；
- 批准入库来源清晰的全部 candidates（`evidenced`，仅包含分层为 `ready` 的候选）
- 批准明确 candidate ids；
- 用自由文本提示候选集；
- 排除候选；
- 请求扩大搜索范围的新 discovery round；
- 提出候选与用户意图的 gap，请求针对 gap 的新 discovery round；
- 取消。

批准后只能研究这些直接作品。若阶段 40 发现身份不符，结果是该 candidate `not_attempted`，不是用另一个作品替换。

## 示例与反例

### 正确：累计补检

第一轮发现 12 个候选，用户要求补充繁体中文来源。第二轮新增 3 个、更新 2 个来源；原 12 个候选继续保留，并再次呈现累计集合。

### 正确：精确 targeted ingest

用户提供 DOI。发现阶段核验 DOI、题名、材料类型、本地重复和权威落地页，只呈现该记录。

### 拒绝：用弱线索批准入库

搜索摘要只有截断题名和未知作者。它保持 `lead_only`，用于继续检索，不能进入批准范围。

### 拒绝：把相关论文合并为同一候选

两篇论文共享数据集和作者，但标题、年份和 DOI 不同。它们是独立 candidate。

### 拒绝：补检丢弃早期候选

新一轮只返回新增项而忽略早期累计集合。范围审核必须展示合并后的完整候选集。
