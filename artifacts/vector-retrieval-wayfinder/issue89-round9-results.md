# #89 第九轮：免建子集图的动态 Flat 候选

2026-10-05 完成。**直接计算常驻矩阵内 eligible 行的 float32 分数，可以省掉每请求的子集向量复制和临时 Flat 构造。**固定 6400 候选后实际精确重排，本轮全范围中位 340 ms，两个过滤交集中位 253／289 ms；12 个冻结查询的 Top25／100 对象召回、最佳片段覆盖均为 100%。代价是常驻约 972 MiB 的全库 normalized 向量，不能把这条路线写成无准备、无额外内存或全范围精确搜索。

用户授权继续测试，baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。新增 [计划](issue89-round9-plan.md)、[入口与行为自测](issue89/round9-flat.py)、本报告及 [公开统计 JSON](issue89-round9-results.json)。复用第六轮 HNSW 中的向量、SQLite 和 Rust oracle，没有重建 HNSW、重新 embedding 或运行 10k／25k，没有修改生产代码、schema、依赖、真实库和用户既有改动，没有提交或切换分支。

## 输入与三条路线

仍是冻结的 4B／MRL 1024、12 个中英配对查询，压力集复制原 86 篇文献改变身份，含 248,806 片段、2000 文献身份及原 4 个 Topic，不是独立真实 2k 文献。测试 all（248806 行／2004 对象）、intersection（46813／185）、union_intersection（69198／231）。all 混合文献和 Topic 只是实验全集，不构成任何一个公共搜索入口的验收。

范围条件沿用第八轮，anchor 限于原始 12,646 行；每进程的 metadata 与全部 SQLite 读取共用冻结只读 transaction。各正式请求重新枚举 eligible，和原 SQL、索引 SQL 的身份及顺序核对一致。metadata 是冻结实验投影，没有实现动态 basis、source owner 或失效检查。

三条候选路线均固定 6400，实际返回 `min(6400,eligible)`，拒绝重复和越界：

- `sqlite_flat`：每请求从 SQLite 分批读取原始 float32，校验／归一化，填入子集数组，再创建 IndexFlatIP、add 和 search。这个进程不加载全库 Flat。
- `resident_copy`：加载一次全库 Flat，每请求 reconstruct eligible 向量到子集数组，再创建 IndexFlatIP、add 和 search。
- `resident_subset`：加载一次全库 Flat，对 eligible 行直接调用 compute_distance_subset；按 float32 inner product 降序、全局行身份升序选择 6400，不复制子集向量。

前两条使用 Flat 的 heap top-k，第三条自己排序全部 eligible 分数；内核和同分截断规则不完全相同，不能先假设候选身份或分数 bits 等价。全部返回候选再从 SQLite 实际取数，以顺序 float64 dot／norm 重算 float32 余弦距离，按距离及稳定身份聚合 Top100，Top25 为其前缀。Rust oracle 只在计时后校验，既不参与候选选择，也不提供重排分数。

Faiss 的 compute_distance_subset 在 inner-product 模式调用逐标签计算，不承担过滤或 top-k；脚本在 SWIG 调用前检查标签维度、int64、连续性、升序、唯一及上下界，随后检查分数有限。**这仍是 float32 候选生成，不是契约的全 eligible 精确余弦搜索。**[Faiss 1.13.2 IndexFlat 实现](https://github.com/facebookresearch/faiss/blob/v1.13.2/faiss/IndexFlat.cpp)

## 查询时间：物化工作不能被省略

每路线独立进程，按 SQLite→常驻复制→直接指定行的固定顺序串行运行；各范围预热一次，每查询正式三次并轮换次序，共 9 配置、324 次正式执行。质量只取每查询第一轮，即 12 条相关查询；三次重复是计时样本。下面各格为 36 个样本的中位数。

| 范围 | SQLite 临时构造，ms | 常驻矩阵复制子集，ms | 常驻矩阵直接指定行，ms |
| --- | ---: | ---: | ---: |
| 全范围 | 3366.706 | 1368.298 | 340.005 |
| 过滤交集 | 841.081 | 455.272 | 252.598 |
| 并集再交集 | 1145.676 | 576.499 | 288.590 |

三个范围、三条路线，每查询的对象 Recall@25／100、完全同分边界可互换的 tie-aware 召回、最佳片段覆盖和获胜片段身份召回均为 100%；没有短对象结果或范围违规。这些指标相对完整 Rust 向量排名，不是人工相关性准确率，也没有证明其它查询、同分边界或语料会有相同覆盖。

总时间包括每请求范围准备、向量物化／校验／归一化、临时索引创建及 add、候选计算／选择、范围检查、候选实际取数和重算、Top100 聚合及显式释放。全库加载、metadata 初始化、共享查询归一化、预热、oracle 比较及离线指标不在请求时间内。结果 pool、Top100 和 eligible 作为输出留给离线核验；没有把返回数据的释放算作请求清理。

| 全范围阶段 | SQLite 临时构造，ms | 常驻复制，ms | 直接指定行，ms |
| --- | ---: | ---: | ---: |
| 范围准备 | 0.293 | 0.292 | 0.289 |
| 物化／校验／归一化 | 2301.391 | 312.957 | 0.637 |
| 临时 Flat 创建／add／输入数组释放 | 666.508 | 660.707 | 约 0 |
| 候选评分／选择 | 92.957 | 89.973 | 113.162 |
| 范围检查＋取数＋实际重算 | 213.892 | 215.386 | 221.922 |
| 聚合 | 1.408 | 1.416 | 1.411 |
| 候选临时索引和缓冲释放 | 75.681 | 70.510 | 0.002 |

分段中位不保证相加等于总中位。`materialize_ms` 还包含 eligible 参数检查；直接路线虽然没有向量物化，仍有约 0.64 ms 的该阶段开销。`search_ms` 包含局部身份映射或直接分数排序；`rescore_ms` 包含候选数量／范围检查；这些不是纯 kernel 时间。提前释放输入向量数组计在临时 Flat 阶段，其它候选索引和缓冲在 cleanup 阶段显式释放。

两个交集的直接路线范围准备中位为 110.815／131.609 ms，候选评分／选择为 20.443／30.197 ms，实际取数／重算阶段为 119.341／121.307 ms。省掉大数组后，范围枚举和契约一致重排仍是主要工作，不能只报 20–30 ms 作为请求延迟。

JSON 保留相同查询／重复序号的路线时间差。它们来自固定顺序独立进程，没有交替采样，主机非独占且没有清缓存；因此只报告观察，不把差值称为因果配对、生产 P95 或已达正式延迟门槛。和第八轮的不同采样也不直接计算提速比。

## 内存：少复制仍需常驻全库

全库向量负载为 **1,019,109,376 B，971.898 MiB**；独立 Flat 文件为 1,019,109,421 B。两个常驻进程都承担这份 C++ 向量存储，没有 HNSW 图；SQLite 进程的 resident vector payload 为 0。

| 范围 | 两条物化路线在 add 时同时活着的子集数组＋Flat 向量负载 | 直接路线的分数数组 |
| --- | ---: | ---: |
| 全范围 | 2038218752 B，1943.797 MiB | 995224 B，0.949 MiB |
| 过滤交集 | 383492096 B，365.727 MiB | 187252 B，0.179 MiB |
| 并集再交集 | 566870016 B，540.609 MiB | 276792 B，0.264 MiB |

这是显式数据负载，不是完整 allocator 峰值。常驻复制路线还要加上全库 971.898 MiB；直接路线仍有排序、IDs、metadata、返回结果和分批 f64 重算缓冲，不能写成零请求内存。

全部正式范围计时结束后，另对每范围的查询序号 0 运行一次未计入正式样本的阶段 RSS 探针。全范围 add 时采到的 RSS，SQLite 路线为 2,074,940 KiB，常驻复制为 3,073,036 KiB；大数组及临时索引显式释放后分别为 87,428／1,082,580 KiB。RSS 返回到近似基线支持释放确实发生，但不保证分配器归还每一页。

直接路线的全范围探针 RSS 增量读到 0，交集约 3548 KiB、并集再交集约 136 KiB。**0 表示阶段采样没有读到增长，不表示没有分配**，已预热的分配器可以复用内存；上述分数及排序数组实际存在。探针只采查询 0、几个阶段边界，不能当成完整生命周期或所有查询的独立内存上界。

| 路线 | 加载后 RSS，KiB | 最终 RSS，KiB | 最终读到的进程 VmHWM，KiB |
| --- | ---: | ---: | ---: |
| SQLite 临时构造 | 75228 | 86404 | 2077120 |
| 常驻复制子集 | 1070064 | 1082580 | 3071288 |
| 常驻直接指定行 | 1070060 | 1082672 | 1097972 |

这些是整个独立 harness，包含 metadata、oracle、Python、SQLite、预热、全部请求及后置探针。`/proc` 阶段 RSS 与 VmHWM 是近似读数；例如常驻复制探针的最大 RSS 比最终 VmHWM 略高，不把单个读数视为精确 allocator 计量。内核文档说明 RSS 统计存在异步处理，精确瞬时视图需要更昂贵的 smaps 扫描。[Linux 内核 proc 文档](https://docs.kernel.org/filesystems/proc.html)

## 一次性输入成本与工具修正

从既有 HNSW.storage 导出 Flat：原图加载 1079.715 ms、导出 588.915 ms、重载 Flat 857.118 ms、坐标核验 5712.088 ms，进程约 8.73 秒。这次核验同时持有原 HNSW 和重载 Flat 两份 C++ 向量存储，VmHWM 为 **2,088,276 KiB**，并非只有一份矩阵；逐块核验没有再建立第二份全库 NumPy ndarray。

重载 Flat 的全部 **254,777,344 个坐标**分别与原图、SQLite 分批校验／归一化结果逐位一致。每个参照各比较一次，不把两个参照的比较次数称为独立语料量。该导出文件只用于隔离实验，未实现生产构造、发布、basis 核验或失效。

常驻复制／直接进程的 Flat 加载为 **1113.276／803.638 ms**，metadata 加连接初始化为 **571.306／562.257 ms**；SQLite 路线后者为 **622.740 ms**。查询读取及归一化作为共享冻结输入处理放在正式计时外，没有单独计时。冷启动还需承担这些成本，340 ms 不能冒充冷启动完整请求。

初次 SQLite 采样把内存探针放在各范围之间，可能影响后续范围的缓存状态。独立审查指出后，入口将探针移到所有正式计时之后，并显式释放候选距离／ID 数组、子集分数和临时 Flat 后再结束请求计时。SQL 路线重新采样为 `sqlite_flat_checked`；原采样只保留私有，不进入上文统计或 324 次正式执行计数。正式三路线都使用修正后的入口，系统缓存仍未清理。

另补上显式 int64 contiguous 检查和步长视图反例。共享 Faiss 的 swig_ptr 本身也会拒绝非连续数组；没有把静态审查提出的越界推测写成实际发生过的内存错误。同分策略及 float32 内核差异继续按三条实际策略说明，不因质量相同声称候选逐位等价。

## 验证与仍开放的项目

正式三路线各检查 691,200 次候选距离，合计 **2,073,600 次全部逐位匹配 Rust oracle**；候选数均为 6400，候选合法、无重复，获胜片段顺序与参照一致，各路线的三轮候选及获胜身份稳定。跨路线没有保存候选身份对照，质量相同不证明候选集合相同。

入口自测先失败后通过，复用原范围、距离和聚合行为检查，并覆盖指定行评分、排序方向、完全同分按身份、空／单行选择、非法／重复／越界／非连续标签、非有限分数、无效预算、SQL 缺行／错误维度／零向量，以及三路线的空范围和小集合。未新增镜像内部守卫的故障注入测试，不把此轮自测称为所有错误分支的验收。

Ruff lint／format、Prettier、公开脱敏和 324 次计时／质量统计一致性检查通过。无变化的 Rust oracle 未重复构建或重测。正式进程约 **210.32／97.90／40.31 秒**，均在 10 分钟上限内；SQL 被排除的旧采样约 254.55 秒，未混用。Python SQLite 3.45.1、Faiss 1.13.2／单线程，Rust oracle 继续使用第六轮参照。

本轮支持继续验证常驻 normalized 向量上的指定行候选评分，并显示每请求复制大矩阵的成本。它不证明浮点候选排序是精确参照，不确定生产内存预算，也不能由 2k 外推 10k／25k。冻结长 reader transaction 没有测试维护和写入争用，文件快照不等于 canonical source 核验。

下一轮应先加入独立查询，检查固定候选预算能否继续覆盖对象和最佳证据，再考虑 Rust 等效实现及常驻／mmap 存储取舍；不再只对同 12 查询做微调。人工相关性、真实独立文献、多语言泛化、动态 basis／来源、增量／maintenance、并发和七平台继续开放，本轮不选定引擎、不新增公共接口或缓存 owner。

## 复现

在仓库根使用共享 uv 环境。第六轮私有输入需保有普通 SQLite、正式图和 Rust 距离矩阵；所有输出使用新文件，不覆盖现有工件。下面的 Flat 导出只执行一次，SQLite 路线不会读入它。每个正式路线在独立进程中执行。

```bash
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round9-flat.py --self-test
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round9-flat.py --previous "$ISSUE89_PREVIOUS" --export-flat "$ISSUE89_FRESH_FLAT" --output "$ISSUE89_FRESH_EXPORT_RESULT"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round9-flat.py --previous "$ISSUE89_PREVIOUS" --route sqlite_flat --flat-file "$ISSUE89_FRESH_FLAT" --output "$ISSUE89_FRESH_SQLITE_RESULT"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round9-flat.py --previous "$ISSUE89_PREVIOUS" --route resident_copy --flat-file "$ISSUE89_FRESH_FLAT" --output "$ISSUE89_FRESH_COPY_RESULT"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round9-flat.py --previous "$ISSUE89_PREVIOUS" --route resident_subset --flat-file "$ISSUE89_FRESH_FLAT" --output "$ISSUE89_FRESH_SUBSET_RESULT"
uv run --project="$HOME/.ar" --locked -- ruff check artifacts/vector-retrieval-wayfinder/issue89/round9-flat.py
uv run --project="$HOME/.ar" --locked -- ruff format --check artifacts/vector-retrieval-wayfinder/issue89/round9-flat.py
node node_modules/prettier/bin/prettier.cjs --check artifacts/vector-retrieval-wayfinder/issue89-round9-plan.md artifacts/vector-retrieval-wayfinder/issue89-round9-results.md artifacts/vector-retrieval-wayfinder/issue89-round9-results.json
```

本次带超时、进程组清理的 runner、原始采样、后置内存探针、汇总和统计校验保存在 `.scaffold/test/issue89-round9-20261005/`。没有清理旧大型库或向量工件。
