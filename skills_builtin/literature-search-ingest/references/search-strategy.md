# 多来源、多语言检索策略

## Query lanes

| lane | 目标 | 典型查询 |
|---|---|---|
| `core` | 覆盖研究问题的主要表达 | 核心概念、术语组合、标题短语 |
| `multilingual` | 找到原语言及地区数据库中的文献 | 原文术语、地区译名、繁简体变体、英文对照词 |
| `seed` | 从已知文献扩展 | 作者、参考文献、被引文献、相似作品、项目与数据集 |
| `gap` | 填补已有结果中的结构性空白 | 缺失年份、方法、地区、文献类型、研究对象 |

语言变体用于增加召回。保留每个命中的原始文字；不得把机器翻译或罗马化字符串写回原文题名、作者、期刊、会议、学校或出版社字段。

## Source families

- 跨学科索引：Crossref、OpenAlex、Semantic Scholar、Google Scholar 或可用的等价学术索引。
- 原始出版来源：出版社、期刊、会议、作者、实验室和项目官网。
- 领域来源：PubMed/Europe PMC、arXiv 及任务相关的领域数据库。
- 长尾来源：机构仓储、学位论文库、图书馆目录、参考文献表和引文网络。
- 简体中文：China DOI、知网、万方、PDC、期刊/会议/出版社官网、授予单位与机构仓储。
- 繁体中文：Airiti Library、TSSCI、台湾博硕士论文知识加值系统、大学仓储、期刊官网和图书馆目录。

来源选择应服从查询的学科、文献类型、语言和地区。无法访问某一来源时记录缺口并使用同族替代来源，不把来源不可用解释成文献不存在。

## Breadth profiles

- `broad`：执行全部适用 query lane；每个关键语言/地区至少使用一个索引来源和一个原始或长尾来源；在新来源和 gap 查询不再产生新的高相关候选后停止。
- `balanced`：完成 core、适用 multilingual/seed，再以一轮 gap 检查结构性缺口；高产来源连续重复时停止。
- `quick`：完成 core 和最相关 multilingual 或 seed lane；用于形成首轮可选集，不声称检索穷尽。

停止时记录实际查询、来源、失败、去重数量和 stop reason。数量上限只是界面分批展示手段，不是搜索停止依据。

## Candidate evidence

- 强身份键：规范化 DOI、PMID、arXiv、ISBN。
- 弱身份键：Unicode 规范化的原文题名 + 年份 + 第一作者/机构作者 + 载体。
- 发现证据：来源名称、命中 URL、query lane、命中时元数据和检索时间。
- 匹配证据：identifier 一致、题名/作者/年份/载体相符、版本关系或冲突字段。

早期去重只合并明显同一记录。存在 material conflict 时保持分离并标记待核验，不能为了形成整洁候选表而丢弃记录。

## Discovery tiers

- `ready`：可用显式 item type、合法字段和结构化 creators 安全落库。
- `needs_curation`：可以安全创建，但缺字段、存在非身份冲突、作者结构不完整或 item type 只能保守确定；落库后进入 metadata curation。
- `lead_only`：身份、来源或类型仍不足以创建可靠 Zotero 条目；只用于后续扩展。

英文元数据更完整不代表更权威。对中文及其他非英文文献，原文来源的题名、作者和载体优先作为展示与落库值；英文译名只能作为 alternate/matching evidence。
