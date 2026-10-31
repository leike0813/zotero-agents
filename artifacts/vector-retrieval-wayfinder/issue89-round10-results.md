# #89 第十轮：新查询与候选预算

2026-10-05 完成。**新增的 32 条查询，在三个固定预算和三个范围下，Top25／100 对象召回、最佳片段覆盖和获胜片段身份召回均为 100%。**主检验预算 6400 的请求中位为 239／258／298 ms，支持继续验证常驻矩阵的指定行候选路线。1600 在本轮也全部通过，但前轮已有该预算的失败，不能因此降低生产预算。

Baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。新增 [计划](issue89-round10-plan.md)、[入口与行为自检](issue89/round10-holdout.py)、本报告及 [公开统计 JSON](issue89-round10-results.json)。生产代码、schema、依赖、真实库和用户已有改动保持原状态，没有提交或切换分支。

用户已同意结束开放式探索，后续以[选型收束结论](vector-engine-selection-conclusion.md)的范围及停止条件为准。本文保留第十轮测量与当时的后续建议，不再据开放项自动追加试验。

## 查询与固定输入

查询由 gpt-6-luna 起草，作者不读取私有语料或候选结果。中文、英文各 16 条，共 14 类，包括图学习、校准、因果推断、异常检测、时间序列、扩散、隐私、公平性、主动学习、科学计算、检索评估、优化与联邦学习，以及两条预期无关领域查询。它们未沿用旧 12 条主题，也没有制作互译配对；2026-10-05 06:52:06 UTC 冻结，早于嵌入、oracle 和候选测试，之后没有按结果筛选或改写。

这里的“新查询”指未参与前轮预算选择的自撰查询，不代表统计独立或真实用户分布。无关领域查询同样只比较向量排名，未确认语料中没有相关内容，不作为相关性负例。公开 JSON 保留序号、语言和类别；查询文本、私有输入和逐次采样留在 gitignore 内。

沿用 Qwen3-Embedding 4B、原指令前缀、2560 维输出、num_ctx=4096、truncate=false；随后取前 1024 维，以 float64 L2 归一化后转 float32。新查询分 8 批嵌入，合计 1345 tokens、10.036 秒；观测到的模型摘要出现在原冻结输入的模型记录中。此项只是实验来源观测，没有新增生产版本绑定门禁。[Ollama embed 文档](https://docs.ollama.com/api/embed)

文档向量沿用第九轮已逐坐标核验的 Flat 文件，不重建、不重新嵌入。仍是原 86 篇文献复制身份形成的压力集，含 248806 片段、2000 文献身份与原 4 个 Topic，并非真实独立 2k 文献。三个范围为 all（248806 行／2004 对象）、intersection（46813／185）、union_intersection（69198／231）；all 混合对象只用于隔离实验，不构成公共入口验收。

## 质量与时间

预先固定 1600／6400／16384，预算和路由均不读取 oracle。每请求重新准备 eligible，调用常驻 Flat 的 compute_distance_subset，以 float32 inner product 降序、全局行身份升序取候选，再从只读 SQLite 实际取向量，按顺序 float64 余弦转 float32 重排、聚合 Top100。Top25 为聚合排名的前缀；浮点候选生成仍不能称作契约的全范围精确搜索。

每范围／预算预热一次，32 查询各正式执行两次，第二次反转预算顺序并轮转查询顺序，共 **576 次请求、288 个第一轮查询配置**。这些配置共享 32 条查询和同一语料，不能称为 288 条独立查询。各格为 64 次正式计时的中位数。

| 范围 | 1600 候选，ms | 6400 候选，ms | 16384 候选，ms |
| --- | ---: | ---: | ---: |
| 全范围 | 144.154 | 238.687 | 436.402 |
| 过滤交集 | 163.459 | 258.183 | 446.904 |
| 并集再交集 | 196.727 | 297.946 | 489.488 |

九个配置、每条查询的片段 Recall@25／100、对象严格身份召回、完全同分边界可互换的 tie-aware 召回、最佳片段覆盖和获胜片段身份召回，最低值均为 **1.0**；没有短结果或范围违规。对象边界仍可有最多 24 个完全同分身份，片段边界最多 72 个；严格身份指标也通过，未用宽容指标替换它。

这只是相对完整 Rust 向量排名的覆盖，未评估人工相关性、无关查询拒绝、正文证据质量或语料泛化。质量只统计第一轮。私有第二轮记录附带的是第一轮缓存指标，第二轮实际重新核验候选距离和身份稳定性；公开 JSON 明确 `quality_source_repeat=0`，不重复计入质量样本。

总时间覆盖范围准备、指定行评分／排序、候选合法性核验、SQLite 取数与实际重算、聚合和候选临时数组释放。返回 pool、Top100、eligible 留给离线核验。查询嵌入／归一化、矩阵加载、metadata、预热、oracle 和离线质量计算不在请求时间内。

| 6400 预算阶段 | 全范围，ms | 过滤交集，ms | 并集再交集，ms |
| --- | ---: | ---: | ---: |
| 范围准备 | 0.285 | 111.201 | 134.798 |
| 候选评分／选择及合法性核验 | 113.776 | 22.215 | 32.559 |
| 实际取数／契约重算 | 122.403 | 120.462 | 125.432 |
| 聚合 | 1.440 | 1.393 | 1.438 |
| 候选临时数组释放 | 0.001 | 0.001 | 0.001 |

分段中位不保证相加等于总中位。全范围评分仍约 113 ms；预算从 1600 升到 16384，重算中位从 31.147 升到 312.367 ms。更多预算在本轮没有增加正确覆盖，却增加了 SQLite 读取和契约重算工作。

第九轮全范围 6400 为 340 ms，本轮为 239 ms；实际取数／重算阶段从约 222 降到 122 ms。查询、访问位置、缓存与主机负载没有做受控配对，不能归因于算法优化。代码复用同一评分和重算方法，主机非独占、未清缓存，本轮也不宣称生产 P95。

## 为什么不能改用 1600

本轮 1600 候选已包含 232–655 个全范围对象，两个交集最少也包含 115 个；它们恰好覆盖本轮所有 Top100 的最佳片段。这说明新增查询对片段过度集中的压力有限。

[第八轮](issue89-round8-results.md) 的旧查询在并集再交集范围，即便使用 Rust 排名精确截取前 1600 片段，对象 Top100 宏平均也只有 **74.58%**，最差 **36%**。这是片段预算与对象聚合之间的已知缺口，不依赖 HNSW 或 float32 候选误差。本轮成功没有消除该反例，也没有证明 6400 对其它语料或查询足够。下一步应使用真实独立文献和更强的对象证据集中反例，而非继续在这 32 条上调小预算。

## 输入成本、内存与核验

新 Rust oracle 共计算 32 × 248806 个距离，内部导出时间 27.037 秒，runner 墙钟 27.930 秒；候选程序墙钟 **204.692 秒**，均在 10 分钟上限内。正式请求共核对 **4,681,728 次候选距离 bits，全部匹配**；每次候选内的获胜排序匹配 oracle，两次候选与获胜身份稳定，范围投影与原 SQL、索引 SQL 身份一致。oracle 在计时前读入并检查有限性，但 execute 不引用它，所有该次距离核验和指标计算在计时返回后进行。

全库 Flat 加载 **1182.983 ms**，metadata 和连接初始化 **608.008 ms**。常驻向量负载仍为 **1,019,109,376 B，971.898 MiB**；metadata 为 11,942,688 B，oracle 为 31,847,168 B。指定行评分没有复制 eligible 向量，但每请求仍有分数、IDs、排序和分批 float64 重算缓冲。

加载所有核验输入后的 RSS 为 **1,089,460 KiB**，最终 RSS／读到的 VmHWM 为 **1,118,160 KiB**。它们属于整个 Python／SQLite harness，包含约 30.37 MiB 的 oracle、metadata、缓存和分配器保留；本轮没有分阶段内存探针，不能当成独占请求峰值或生产进程预算。/proc RSS 是近似观测，限制沿用 [第九轮说明](issue89-round9-results.md)。

自检先因缺少执行入口失败，实现后通过；复用既有范围、距离、非法标签和 SQLite 边界检查，新增代表性小预算反例：前两片段来自同一对象，虽片段数够，却漏掉另一个对象的最佳证据；增大预算后恢复，空范围与无效预算也检查。Ruff、格式检查、公开脱敏、计时阶段和统计一致性检查通过。未重建或重复测试未变化的 Rust exporter。

这轮增加了对新查询的算法覆盖证据，仍不选择生产引擎。真实独立文献、人工相关性、多语言完整验收、动态 basis／来源、增量／maintenance、并发和七平台继续开放。后续可以验证 Rust 等效候选实现与常驻／mmap 成本，但需保持候选与精确重排的语义区别。

## 复现

新查询与向量、Rust oracle、带超时的 runner、原始结果及汇总脚本保存在 `.scaffold/test/issue89-round10-20261005/`；第九轮 Flat 和第六轮输入继续复用。重新采样必须使用新输出文件，不覆盖现有工件。

```bash
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round10-holdout.py --self-test
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round10-holdout.py --private "$ISSUE89_QUERY_INPUT" --previous "$ISSUE89_ROUND6_INPUT" --flat-file "$ISSUE89_ROUND9_FLAT" --output "$ISSUE89_FRESH_RESULT"
uv run --project="$HOME/.ar" --locked -- ruff check artifacts/vector-retrieval-wayfinder/issue89/round10-holdout.py
uv run --project="$HOME/.ar" --locked -- ruff format --check artifacts/vector-retrieval-wayfinder/issue89/round10-holdout.py
node node_modules/prettier/bin/prettier.cjs --check artifacts/vector-retrieval-wayfinder/issue89-round10-plan.md artifacts/vector-retrieval-wayfinder/issue89-round10-results.md artifacts/vector-retrieval-wayfinder/issue89-round10-results.json
```
