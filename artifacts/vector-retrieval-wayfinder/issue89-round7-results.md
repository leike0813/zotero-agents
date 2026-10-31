# #89 第七轮：范围准备、候选扩展与精确回退

2026-10-05 完成。本轮找到了两项可继续推进的优化：复用现有 membership index 可以大幅减少窄范围准备成本；逐步扩展候选可以补回宽范围的对象召回。但过滤交集仍漏项，排除已发现对象的搜索还会漏掉这些对象更好的片段，**当前没有满足所有范围的 ANN 默认策略**。

基于用户继续试验的授权执行，baseline 为 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。新增 [计划](issue89-round7-plan.md)、[实验入口与自测](issue89/round7-adaptive.py)、本报告和 [公开结果 JSON](issue89-round7-results.json)。复用第六轮的正式 HNSW 文件、Rust 距离矩阵及距离重算函数，没有重建索引或运行 10k／25k，没有修改生产代码、schema、依赖、真实库或用户已有改动，没有提交或切换分支。

## 实验口径

输入仍为冻结的 4B／MRL 1024、12 个中英配对查询。小语料有 12,646 片段、86 篇文献及 4 个 Topic；2k 压力集有 248,806 片段、2000 个文献身份及原 4 个 Topic。压力集复制原文献改变身份，不是 2000 篇独立真实文献；查询也没有扩充，结果只说明这些冻结输入上的行为。Recall 相对完整精确向量排序，不能解释成人工相关性准确率。对象包含文献和 Topic，分母为 `min(k, eligible 对象数)`，短结果不缩小分母。

沿用 Faiss 1.13.2、HNSWFlat／M=16／efConstruction=100／单线程，以归一化 float32 的 inner product 生成候选。候选从 SQLite 实际读取，最多 128 个 BLOB 一批，以 float64 顺序累计 dot／norm，输出 float32 距离。聚合按距离及稳定身份排序，先取每个对象的最佳候选，再取 Top-k。停止条件不接收 Rust oracle；oracle 只在计时结束后验证。

正式查询每配置 12 查询 × 3 次，轮换查询次序并先预热，共 66 个配置、2376 次执行。质量宏平均只使用每查询第一次结果，即 12 条相关查询，不能把三次重复当作独立质量样本。时间表报告 36 个样本的中位数，包含每次范围准备、对象计数、selector、ANN、候选取数、实际重算和聚合；不包含 oracle 核验、离线指标、embedding、来源 owner 核验、索引／投影加载或业务协议。本轮没有生产端到端或 P95 结论。

## 范围准备：先修 SQL 访问方式

比较原逐行 correlated EXISTS、改写为 `id IN (SELECT row_id ... value IN (...))` 的 SQL，以及冻结 metadata 投影。改写只使用既有 `(value,row_id)` index，不建新索引。单篇条件的查询计划从主表前缀扫描加逐行子查询，变为 membership index 的 value 查找加主键取行；这是减少工作量的依据。[SQLite 官方查询规划说明](https://www.sqlite.org/optoverview.html)

投影一次读取六个 int64 字段：id、document、library、kind、type、section。标量条件用数组，成员关系仍每次从 SQLite value index 读取，不缓存 eligible 结果、不复制正文或向量。投影与全部查询共用同一只读 reader transaction，因而这里只验证冻结快照；动态 basis、失效和 owner 验证尚未实现。不能把这份实验数组当作新的生产事实源。

| 2k 范围 | eligible 片段／对象 | 原 SQL 中位，ms | 索引 SQL 中位，ms | 冻结投影中位，ms |
| --- | ---: | ---: | ---: | ---: |
| 全范围 | 248806／2004 | 248.088 | 259.365 | 1.643 |
| 全文 | 221749／1788 | 226.044 | 243.542 | 3.587 |
| 非空多条件交集 | 46813／185 | 206.961 | 105.159 | 115.949 |
| 类别内并集再交集 | 69198／231 | 395.943 | 137.033 | 130.131 |
| 单篇 itemRefs | 154／1 | 168.699 | 0.242 | 0.238 |
| 稀有标签 | 211／188 | 178.069 | 0.819 | 0.313 |
| 全部 Topic | 1997／4 | 76.608 | 76.427 | 1.740 |
| Topic section | 77／4 | 76.080 | 75.625 | 2.653 |

每条准备路线各采样三次，完整样本及空范围见 JSON。小语料单篇原 SQL 为 9.378 ms、改写后 0.271 ms；稀有标签为 7.827→0.060 ms。没有把投影的效果归给 SQL 改写：全范围 SQL 本身未变快；较大成员交集仍要枚举大量身份，投影也未普遍胜过索引 SQL。

投影加载小语料 39.817 ms、607,008 字节；2k 为 909.642 ms、11,942,688 字节。它们是一次性成本和数组负载，加载期间的 Python 临时对象另计进进程峰值。SQL 计时来自共享 Python 的 SQLite **3.45.1**，复用的 Rust oracle 使用 bundled **3.53.2**；本轮没有证明改写在 Rust 生产连接上有相同延迟。

## Bitmap selector 的独立配对对照

在 all 和 intersection 两个范围，固定 1600 候选／efSearch=1600，仅更换 Batch 与 Bitmap selector；各范围 36 对，交替执行次序。小语料和 2k 共 **144 对候选身份及顺序完全一致**。

| 语料／范围 | Batch 中位，ms | Bitmap 中位，ms | 配对节省比例中位 |
| --- | ---: | ---: | ---: |
| 小语料／all | 6.359 | 4.702 | 26.07% |
| 小语料／intersection | 4.877 | 4.513 | 8.81% |
| 2k／all | 32.257 | 5.429 | 83.58% |
| 2k／intersection | 9.767 | 4.260 | 57.85% |

这里只包含 selector 构造及图搜索，不含范围准备与重排。比例按每对计算后取中位，与两列中位的比值不必相同；小语料交集有一次 Bitmap 稍慢。不能把完整查询收益都归因于 Bitmap。

Bitmap 以 little bit order 打包，数组活到同步搜索返回；沿用 kwargs 参数构造器保持 selector 所有权。审查提出构造器长度可能应为位数，核对固定版本源码后排除：`n` 是 bitmap 数组的字节长度，判定为 `id / 8 < n`，当前传 `len(bitmap)` 正确。跨字节行为自测及配对身份对照实际通过。[Faiss 1.13.2 selector 定义](https://github.com/facebookresearch/faiss/blob/v1.13.2/faiss/impl/IDSelector.h)、[官方查询参数说明](https://github.com/facebookresearch/faiss/wiki/Setting-search-parameters-for-one-query)

## 候选扩展：数量完整仍可能遗漏正确对象

四种路线均累计候选，只重算新增片段：fixed 固定 1600；count 按 `400→1600→6400→16384` 扩展，凑够目标对象数即停；stable 使用同样预算，连续三个快照的有序 Top-k **获胜片段身份**相同才提前停；diverse 最多四轮、每轮 400 候选／efSearch=1600，下一轮排除已发现对象的全部片段。stable 的条件比只比较对象身份更严格，仍是启发式。diverse 的最后预算 400 不代表总候选预算只有 400，实际轮次和候选累计量见 JSON。

| 语料／Top-k | 路线 | 对象 Recall 宏平均 | 最差查询 | 最佳片段覆盖 | 完整查询流程中位，ms |
| --- | --- | ---: | ---: | ---: | ---: |
| 小语料／25 | fixed | 99.33% | 96% | 99.33% | 61.393 |
| 小语料／25 | count | 98.67% | 96% | 98.33% | 16.211 |
| 小语料／25 | stable | 100% | 100% | 100% | 280.150 |
| 小语料／25 | diverse | 99.33% | 96% | 99.33% | 44.655 |
| 2k／25 | fixed | 99.33% | 96% | 99.33% | 52.732 |
| 2k／25 | count | 99.00% | 96% | 99.00% | 22.569 |
| 2k／25 | stable | 100% | 100% | 100% | 196.374 |
| 2k／25 | diverse | 99.33% | 96% | 99.33% | 66.077 |
| 2k／100 | fixed | 93.17% | 60% | 92.58% | 51.569 |
| 2k／100 | count | 96.17% | 60% | 95.67% | 54.489 |
| 2k／100 | stable | 100% | 100% | 100% | 567.868 |
| 2k／100 | diverse | 93.83% | 60% | 93.25% | 71.686 |

这是 all 范围；fulltext 与所有其它范围在 JSON 中。最佳片段覆盖检查完整 oracle Top-k 对象的最佳片段是否进入累计候选，不只检查对象身份。2k／100 的 fixed 有 3 个查询返回不足，count 和 diverse 均凑齐数量，最差对象召回却仍为 60%。返回数不能证明结果正确。

小语料 k=100 只有 90 对象，按有界条件走完整精确扫描：12,646 行全部重算聚合，对象召回与最佳片段覆盖均 100%，中位 **414.992 ms**。它没有使用 oracle 读分数，也不是 ANN 扩展的成果。该耗时包含 Python 分批距离重算，不能当成 Rust 精确引擎性能。

2k／25 的 stable 有 10 查询因稳定停止，2 个达到预算上限；2k／100 有 7 个稳定停止、5 个到上限，11 个查询最终请求 16384 候选。all 上的 100% 是本组输入的观察，不是停止条件的完整性证明。`eligible_budget` 仅表示请求预算达到 eligible 行数，也不证明图搜索实际访问或返回了全部行。

## 过滤交集仍是未解决问题

| 2k 范围／Top-k | 路线 | 对象 Recall 宏平均 | 最差查询 | 最佳片段覆盖 | 中位，ms |
| --- | --- | ---: | ---: | ---: | ---: |
| 交集／25 | fixed | 78.33% | 0% | 56.67% | 138.724 |
| 交集／25 | stable | 98.67% | 92% | 98.67% | 434.332 |
| 交集／100 | fixed | 52.17% | 0% | 30.17% | 137.632 |
| 交集／100 | count | 88.67% | 62% | 68.33% | 204.238 |
| 交集／100 | stable | 95.42% | 71% | 86.42% | 415.871 |
| 并集再交集／100 | fixed | 54.25% | 19% | 40.25% | 174.939 |
| 并集再交集／100 | stable | 95.33% | 68% | 93.00% | 608.629 |

扩大候选明显改善，但上限 16384 下仍不足。交集／100 的 stable 全部到预算上限，其中 2 查询仍返回不足；并集再交集／100 虽全都凑齐数量，最差召回只有 68%。这些范围没有走小范围精确回退，失败没有被回退指标覆盖。

diverse 也未解决。2k 交集／25 的对象召回与最佳片段覆盖为 **78.33%／56.67%**，与 fixed 相同。查询序号 9 在三快照稳定后停止，对象召回 92%，最佳片段覆盖 **0%**；并集再交集／25 的查询序号 9 对象召回 100%，最佳片段覆盖只有 92%。排除已发现对象会阻止补回这些对象更好的片段，排名稳定不能排除候选之外的错误。本轮还加入一个最小行为反例：两对象都命中时，遗漏其中一个更好片段仍可使覆盖只有 50%。

## 窄范围精确回退

回退条件为 eligible 行数 ≤4096，或 eligible 对象数 ≤k 且行数 ≤16384。后者覆盖小语料 k=100；工作量保持有界，避免少对象但大量片段时无上限扫描。两阈值属于实验配置，没有选为生产默认。

| 2k 范围 | 完整精确输入片段／对象 | Top25 总中位，ms | Top100 总中位，ms |
| --- | ---: | ---: | ---: |
| 单篇 itemRefs | 154／1 | 3.446 | 3.086 |
| 稀有标签 | 211／188 | 5.006 | 5.045 |
| 全部 Topic | 1997／4 | 37.022 | 36.721 |
| Topic section | 77／4 | 3.161 | 3.161 |

所有非空精确配置的对象召回、最佳片段覆盖均 100%，显式空 itemRefs 返回空并不进入 ANN。本表已包含每次范围准备，与第六轮仅重排阶段的窄范围时间口径不同，不直接相除宣称提速。

## 验证、资源与结论边界

两份输入的全部范围在原 SQL、索引 SQL、冻结投影之间身份及顺序一致；类别内并集、类别间交集、显式空与跨库逻辑另有合成行为自测。实际测试库仍只有一个，不能声称完成真实跨库验收。范围条件的 anchor SQL 没有显式前缀上限；本轮核实选中的首个 anchor 在原始前缀内，没有改变小语料范围。未来换输入应显式绑定范围。

正式候选距离逐位比较：小语料 **2,153,616** 次、2k **4,216,521** 次，合计 **6,370,137** 次全部匹配 Rust oracle。这是三轮重复执行的比较次数，包含重复身份，不是新增独立样本或全库唯一距离数。计时后的获胜片段身份顺序检查全部通过；所有已返回候选通过硬范围断言。零违规不等于未漏召回。

| 语料 | 已保存索引加载，ms | 最终 RSS，KiB | 进程 VmHWM，KiB |
| --- | ---: | ---: | ---: |
| 小语料 | 52.560 | 112600 | 116172 |
| 2k | 870.225 | 1120768 | 1131760 |

内存属于整个 Python harness，包含图、oracle、metadata、结果与分配器保留，不是索引独占内存；没有重测建图、备份、staging 峰值。主进程小语料约 88.27 秒，2k 约 278.81 秒，均在 10 分钟上限内。没有独占主机或清缓存，配置先后执行造成的环境差异仍存在。索引文件不在 SQLite transaction 内，其一致性依赖复用第六轮冻结输入及本轮核验，生产发布与生命周期问题仍未解决。

入口自测、Ruff lint／format、Prettier、统计一致性及公开结构脱敏检查通过。独立审查确认停止逻辑不接收 oracle、精确路线完整读取并聚合、diverse 保留旧候选、Bitmap 存活到同步搜索结束。未重新运行没有变更的 Rust oracle 测试；第六轮的 Rust 参照证据继续复用。

建议保留窄范围精确路线和现有索引 SQL 改写作为后续生产适配候选；不采用“凑够即停”或排除已发现对象作为质量保证。下一轮优先用不同的 eligible 子集搜索策略对照本轮过滤失败，或在已安装／既有原型中寻找能直接在子集工作的实现，而非继续只加全局图的候选预算。再引入独立查询和真实独立文献，验证对象聚合与最佳证据；Rust 引擎、动态来源、维护并发、人工金例和七平台仍开放。

## 复现

在仓库根使用共享环境；上一轮私有目录需保有 locations 文件、正式保存的图和 Rust 距离矩阵。输出使用全新文件，不覆盖既有采样。本次有界 runner 和原始脱敏轨迹保存在 `.scaffold/test/issue89-round7-20261005/`。

```bash
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round7-adaptive.py --self-test
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round7-adaptive.py --previous "$ISSUE89_PREVIOUS" --corpus real --output "$ISSUE89_FRESH_REAL"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round7-adaptive.py --previous "$ISSUE89_PREVIOUS" --corpus pressure --output "$ISSUE89_FRESH_PRESSURE"
uv run --project="$HOME/.ar" --locked -- ruff check artifacts/vector-retrieval-wayfinder/issue89/round7-adaptive.py
uv run --project="$HOME/.ar" --locked -- ruff format --check artifacts/vector-retrieval-wayfinder/issue89/round7-adaptive.py
node node_modules/prettier/bin/prettier.cjs --check artifacts/vector-retrieval-wayfinder/issue89-round7-plan.md artifacts/vector-retrieval-wayfinder/issue89-round7-results.md artifacts/vector-retrieval-wayfinder/issue89-round7-results.json
```
