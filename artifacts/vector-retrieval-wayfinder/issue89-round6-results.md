# #89 第六轮：HNSW 候选、硬范围与文献聚合

2026-10-05 完成。HNSW 的宽范围查询显示出继续验证的价值，但**固定片段候选预算不能保证文献聚合召回，搜索中限制返回身份也不能保证窄范围召回**。2k 全范围、1600 候选的对象 Recall@25 为 99.33%，Recall@100 为 93.17%，后者最差查询只有 60%；指定单篇文献时，12 个查询全部没有召回候选。当前不能据此选定生产引擎或接受召回损失。

本轮按用户“继续试验”执行，baseline 为 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。新增 [计划](issue89-round6-plan.md)、[Rust 参照导出](issue89/round6-oracle.rs)、[ANN 入口与行为自测](issue89/round6-ann.py)、本报告及 [公开统计与计时 JSON](issue89-round6-results.json)。未修改生产代码、schema、依赖、真实库或已有用户改动，未提交或切换分支；#89 的生产验收缺口继续保留。

## 实验对象与口径

共享环境已有 faiss-cpu **1.13.2／AVX2**，无需安装依赖。使用 HNSWFlat、M=16、efConstruction=100、随机种子 89、单线程建图和查询；float32 向量及查询另作 float32 L2 归一化，以 inner product 生成候选。查询使用 `SearchParametersHNSW` 与 `IDSelectorBatch`，与“全局候选后过滤”对照。能力与实现来源：[查询参数和 selector 文档](https://github.com/facebookresearch/faiss/wiki/Setting-search-parameters-for-one-query)、[固定版本 HNSW 源码](https://github.com/facebookresearch/faiss/blob/v1.13.2/faiss/impl/HNSW.cpp)。Faiss 仅作为现成的算法实验工具，没有进入 Rust workspace 或生产依赖。

语料仍为冻结的 4B／MRL 1024、无重叠片段与 12 个中英配对查询。小语料直接读取第三轮 2k 普通库的首 12,646 行，它们对应原 86 篇文献及 4 个 Topic；复制压力集读取全部 248,806 行，对应 2000 篇测试文献身份及原 4 个 Topic。小语料的 Topic 身份使用该压力库内的测试身份，内容与向量未改变。没有重建大库，也没有运行 10k／25k 全套。

精确 oracle 直接复用 `benchmark.rs`：float64 顺序累计 dot 与 norm，输出 float32 距离，按 `(distance, stable id)` 排序；对象聚合先对全部 eligible 片段取每个文献／Topic 的最佳片段，再取 Top-k。Python 重排实际从 SQLite 读取候选向量，以 float64 顺序累计重新计算距离，逐位核对 Rust。预计算距离矩阵仅用于质量比较，不用它冒充重排耗时。

小语料检查 **151,752** 次距离，压力集检查 **2,985,672** 次，合计 **3,137,424 次全部逐位一致**。计时中的候选重排另逐位核验。ANN 候选生成本身仍有 float32 归一化／距离内核差异与图搜索近似损失，本轮未把两者贡献单独拆开。

Recall 是相对精确向量排序的身份覆盖，按每条查询计算后取 12 条查询的宏平均，**不是人工相关性准确率**。对象包含文献和 Topic。小语料 k=100 时 eligible 对象只有 90，分母为 90；返回不足不能通过缩小分母消失。best-fragment coverage 另检查 exact Top-k 对象的最佳片段是否进入候选；对象身份命中不代表最佳证据命中。

## 全范围结果：片段与对象召回不能互换

表中采用搜索中限制身份、实际有效 efSearch；同一索引上的不同候选预算没有重新建图。小语料还保留 `(100,64)` 与 `(100,1024)` 两档筛查，effective efSearch 不低于候选数，全部结果见 JSON。

| 语料 | 候选／有效 efSearch | 片段 Recall@25 | 对象 Recall@25 | 对象 Recall@100 | 对象 @100 最差查询 | 查询阶段中位，ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 原始小语料 | 100／256 | 100% | 41.00% | 11.39% | 6.67% | 5.62 |
| 原始小语料 | 400／400 | 100% | 96.33% | 35.74% | 21.11% | 17.17 |
| 原始小语料 | 1600／1600 | 100% | 99.33% | 71.30% | 63.33% | 48.90 |
| 2k 复制压力 | 100／256 | 99.33% | 95.67% | 35.67% | 23.00% | 27.79 |
| 2k 复制压力 | 400／400 | 99.33% | 98.33% | 62.08% | 23.00% | 40.60 |
| 2k 复制压力 | 1600／1600 | 99.67% | 99.33% | 93.17% | 60.00% | 72.64 |

2k 的 1600 候选片段 Recall@100 为 **99.92%**，对象最佳片段覆盖 @100 为 **92.58%**。对象 Recall@25 最差为 96%；对象 Recall@100 的损失更大，不能只报告 Top25 的均值。

加入完全精确的片段候选截断对照：先取 exact 片段 Top-N，再聚合对象，排除图搜索和浮点内核的影响。小语料的 exact Top100 片段只能覆盖对象 Top25 的 **41.33%**；exact Top1600 片段也只能覆盖对象 Top100 的 **71.76%**。2k 的 exact Top1600 片段对象 Recall@100 为 **96.92%**，ANN 为 93.17%。因此候选预算本身就会遗漏对象，增加 efSearch 或精确重排无法单独解决。

压力集的对象 Top25 看起来比小语料更容易，是复制结构造成的观察，不能当作规模增大后质量更好。2k Top100 的片段／对象边界常有 23–24 个完全同分身份；另报仅允许完全相同 float32 边界距离互换的 tie-aware 召回。它不能替代严格身份指标，也不能把漏掉的更近对象解释成同分。

## 硬范围：合法结果与范围内召回分别验证

质量矩阵覆盖 15 个范围：全范围、单库、全文、分析、类型、itemRefs、标签、集合、交集、Topic、Topic section、显式空 itemRefs、显式空来源类别、不存在的库及不相交范围。相同类别内多个值取并集，不同类别取交集。全部范围来自同一只读 reader transaction；显式空范围保持空。

所有非控制 ANN 路线的已返回候选均通过范围断言：小语料检查 **286,209** 个、压力集检查 **246,509** 个，越界即停止评测。JSON 的零违规表示断言通过，空返回不提供正向隔离证据。本语料只有一个实际测试库，跨库并集／交集仅有合成行为自测，不构成真实跨库验收。

| 2k 范围 | eligible 片段／对象 | 1600 候选片段 Recall@25 | 对象 Recall@25 | exact 小范围取数＋重排中位，ms | 一次范围准备，ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 单篇 itemRefs | 154／1 | 0% | 0% | 3.01 | 187.14 |
| 稀有标签 | 211／188 | 0.67% | 0.67% | 6.01 | 253.29 |
| 全部 Topic | 1997／4 | 74.67% | 79.17% | 55.10 | 78.79 |
| Topic section | 77／4 | 34.67% | 56.25% | 1.52 | 86.99 |

单篇范围在三档候选预算下，12 查询全部返回零候选。稀有标签在 1600 档有 10 查询返回零、其余每次只有 1 个。合法的空结果仍然可以严重漏召回。仅全局候选后过滤通常更差，例如 2k 的 Topic section 在 1600 档对象 Recall@25 只有 **18.75%**。

exact fallback 对 eligible 不超过 4096 的范围完整读取、计算并聚合，结果与完整 oracle 一致；原始 ANN 指标仍单列，没有被 fallback 覆盖。这是实验范围内的对照条件，4096 尚未被选为生产阈值。表中 exact 时间不含范围准备，不能把 3 ms 写成完整请求延迟。

主矩阵选择最稀标签和最稀集合时交集为空，因此另加载同一保存索引补测两个非空组合，预算 400、efSearch=1600。小语料交集为 2030 片段／8 对象，类别内并集再交集为 3002／10；2k 对应 46,813／185 和 69,198／231。2k 两者的搜索中限制身份对象 Recall@25 分别为 **78%／92%**，全局后过滤为 **30.67%／62.67%**。即使范围并不极小，过滤召回也不能由全范围结果推断。所有返回项仍通过硬范围检查。

## 时间、空间与资源边界

正式查询计时每配置／计时范围为 12 查询 × 3 轮，共 36 样本，查询次序轮换。先执行质量搜索预热，再采样；不清缓存，不独占主机。查询阶段包括参数和 selector 构造、HNSW、SQLite 候选读取、实际距离重算、逐位验证和对象聚合。SQL eligible 集合准备单列；embedding、网络、来源 owner 验证、索引加载和业务协议不在查询阶段内。本轮不是生产 P95 验收。

2k／1600 的 ANN 阶段中位 **31.34 ms**，取数＋重排＋聚合中位 **41.30 ms**，总中位 **72.64 ms**；各阶段中位不保证相加等于总中位。全范围 SQL eligible 准备另测 **249.99 ms**，单库 269.89 ms、全文 222.19 ms。不能省略这些成本来和第五轮完整精确查询宣称等价提速；也没有逐次测量包含范围准备的端到端配对。

| 语料 | 读取输入，ms | 归一化，ms | 建图，s | 序列化索引大小 | 建图后 RSS | 进程 VmHWM |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 小语料 | 94.27 | 24.18 | 3.84 | 53,625,666 字节，51.14 MiB | 100.19 MiB | 207.09 MiB |
| 2k | 4054.38 | 2737.91 | 157.80 | 1,055,003,138 字节，0.983 GiB | 1.044 GiB | 2.940 GiB |

RSS 和 VmHWM 属于完整 harness，包含输入、归一化副本、图、oracle、验证临时数组与分配器保留；VmHWM 是进程累计峰值，不是索引独占内存。2k 构建阶段同时持有约三份向量负载，查询结束 RSS 为 1.080 GiB，其中匿名 RSS 1.056 GiB。保存文件包含额外向量副本和图，原普通库约 1.131 GiB 仍保留，空间不能与 SQLite mmap 的共享文件页混淆；未测重建／备份峰值，也未由 2k 外推 25k 的容量或延迟。

## 工具修正与验证

初次小语料测量发现 `params.sel = IDSelectorBatch(...)` 的 SWIG setter 会转移 selector 所有权，而 SearchParameters 不负责销毁该指针。本轮在隔离进程复现：构造 60 次 248,806-ID selector 后，总 RSS 从 43,392 升至 736,340 KiB。采用 Faiss 自带 kwargs 构造器，其 ownership-preserving wrapper 保持 selector 活到搜索结束并释放，见 [固定版本 Python wrapper](https://github.com/facebookresearch/faiss/blob/v1.13.2/faiss/python/class_wrappers.py)。修改只在实验入口，没有改共享安装。

修正后独立进程匿名 RSS 初始 22,176 KiB，第 60 次为 45,204，第 120 次仍为 45,204。初期增量包含分配器保留，不能要求回到初始值。停止尚在准备阶段的旧压力进程，复用其已完成的 Rust 距离导出重新运行；小语料的正式计时和内存也重新采样。上文数据全部来自修正后的运行，旧采样未混入。

行为自测先失败后通过，覆盖稳定同分、多片段聚合、短结果、严格／tie-aware 指标、空范围、SQL 并集／交集、HNSW selector、越界拒绝及非法向量。原 Rust 参照 **15 项自测通过**；全部距离逐位验证通过；保存后重载的 400 候选身份每语料 12 查询一致，合计 **24 次重载比较通过**。这只是冻结加速文件的读回验证，不构成事务发布、取消、崩溃恢复或生产来源核验。

修正后的主进程小语料约 **27.74 秒**、2k 约 **344.86 秒**；各次均在 10 分钟上限内。Rust 导出分别约 0.62／10.29 秒，导出包含文件写入，不能当作查询计时。主机仍为非独占 Xeon E5-2680 v4／SATA SSD。Ruff、rustfmt、Prettier 和公开结构脱敏检查通过；固定 sqlite-vec C 源的既有编译警告保留，没有修改上游源码。

## 后续判断

当前最值得验证的是内部选择策略：小 eligible 范围走精确扫描，宽范围走能适应对象聚合需求的候选生成；过滤策略需要在不同选择性下单独评估。单纯增加 efSearch、固定 4×／16× overfetch 或全局候选后过滤，都没有足够证据成为通用默认。也需要继续压低范围查询／eligible 枚举成本，才能判断完整请求延迟。

下一轮应对生产适配候选（例如既有研究中的 Rust HNSW 路线）验证过滤、增量与对象候选扩展，并考虑对照能在 eligible 子集内工作的其它索引策略。先保留本轮 oracle，使用独立查询／真实独立文献扩大质量验证，再确认可接受召回损失。Faiss 的结果不证明另一实现的延迟、资源或召回，也不能据此加入生产依赖。

人工内容金例、多语言泛化、真实业务并发、来源版本核验、maintenance 恢复、staging／备份峰值、七平台构建和许可证治理继续保持开放。

## 复现

在仓库根执行。私有位置与原始完整逐查询结果位于 `.scaffold/test/issue89-round6-20261005/`；公开 JSON 保留全部组合的脱敏统计、全范围逐查询指标和原始正式计时，候选身份仅保留私有文件。原始 `real` 目录包含首次工具采样，正式结果为 `real-owned`／`pressure-owned`；补测入口 `supplement.py` 从正式保存索引读取，不重新建图。

```bash
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round6-ann.py --self-test
CARGO_TARGET_DIR="$ISSUE89_BUILD" cargo +nightly-2026-07-25 test --offline --locked --manifest-path "$ISSUE89_ROUND6/build/Cargo.toml"
CARGO_TARGET_DIR="$ISSUE89_BUILD" cargo +nightly-2026-07-25 build --release --offline --locked --manifest-path "$ISSUE89_ROUND6/build/Cargo.toml"
"$ISSUE89_BUILD/release/issue89-round6-oracle" "$ISSUE89_DATABASE" "$ISSUE89_QUERIES_1024" "$ISSUE89_FRESH_ORACLE" 248806 1024 12
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round6-ann.py --database "$ISSUE89_DATABASE" --queries "$ISSUE89_QUERIES_1024" --oracle "$ISSUE89_FRESH_ORACLE" --output "$ISSUE89_FRESH_OUTPUT" --private "$ISSUE89_FRESH_DIRECTORY" --rows 248806
uv run --project="$HOME/.ar" --locked -- ruff check artifacts/vector-retrieval-wayfinder/issue89/round6-ann.py
uv run --project="$HOME/.ar" --locked -- ruff format --check artifacts/vector-retrieval-wayfinder/issue89/round6-ann.py
rustfmt +nightly-2026-07-25 --edition 2024 --config skip_children=true --check artifacts/vector-retrieval-wayfinder/issue89/round6-oracle.rs
node node_modules/prettier/bin/prettier.cjs --check artifacts/vector-retrieval-wayfinder/issue89-round6-plan.md artifacts/vector-retrieval-wayfinder/issue89-round6-results.md artifacts/vector-retrieval-wayfinder/issue89-round6-results.json
```

`ISSUE89_FRESH_DIRECTORY` 应为全新的私有输出目录，小语料把行数改为 12646；Rust 导出拒绝覆盖已有输出。私有 runner 设置超时，不建议直接重用已有采样目录。没有清理旧大型数据库和用户工件。
