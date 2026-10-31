# #89 第二轮：1024 维的成本与内容质量

执行日期：2026-10-04 至 2026-10-05。使用上轮只读副本中相同的 86 篇文献、4 个 Topic、12,646 个无重叠片段和 12 条中英配对查询。正文、标题、作者、查询、身份和原始数据库留在忽略目录；公开工件仅含统计。本轮没有修改生产源码、依赖或来源库，也没有提交代码。[#89](https://github.com/leike0813/zotero-agents/issues/89) 保持开放。

目前证据支持继续用 **0.6B／1024 作为低端硬件参考，4B／1024 作为质量对照**。1024 维的空间和扫描收益已经测到；0.6B 的编码收益在本机也很明确，但内容审查提示了潜在质量代价。补测显示 sqlite-vec 无预筛选原始 KNN 的 p50 有约 12–14% 优势；当前验证路径的完整聚合、双表空间、建库和精确排序限制仍未解决。普通 SQLite＋Rust 值得优先继续验证，生产引擎仍须更大规模及业务集成证据。

## 维度与模型分别改变了什么

三个候选保存未量化的小端 float32 向量，统一余弦。0.6B 重新编码，原生 1024 维；4B／1024 对上轮固定的 2560 维文档和查询取前 1024 维、用 float64 重新 L2 归一化，再保存 float32。4B／2560 是同一旧向量基线，本轮用优化后的同一检索程序重新计时。

模型支持这些维度及 MRL：[0.6B 模型卡](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)、[4B 模型卡](https://huggingface.co/Qwen/Qwen3-Embedding-4B)。维度是本轮明确的实验配置。小模型实际制品为 GGUF Q8_0、约 639 MB；4B 为 Q4_K_M、约 2.497 GB。这是两个实际可用候选的比较，参数规模、权重量化均有不同，不能把差异全部归因于参数规模。

| 相同 12,646 片段 | 0.6B／1024 | 4B／1024 | 4B／2560 |
| --- | ---: | ---: | ---: |
| 向量净字节 | 51,798,016 | 51,798,016 | 129,495,040 |
| sqlite-vec 双表 DB 字节 | 116,465,664 | 116,465,664 | 295,571,456 |
| 双表建库秒数 | 10.62 | 10.83 | 28.74 |
| Rust 完整聚合 p95，k=25，ms | 50.69 | 44.85 | 125.25 |
| Rust 完整聚合 p95，k=100，ms | 52.66 | 56.29 | 124.21 |

1024 维减少 **60% 向量净空间**。同一 4B 模型，完整文献聚合 p50 由约 104–105 ms 降至约 41 ms，p95 降至约 45–56 ms。这是本轮相同程序、串行运行的实测，不能拿上轮旧程序和不同负载的数值直接计算优化倍数。相同维度下，0.6B 与 4B 的本地距离扫描成本接近。

输出降维减少保存、传输和后续距离计算的工作；**不能按维度比例推算模型推理提速**。本轮 4B／1024 的文档向量来自缓存，硬件请求则实际调用 4B 并请求 1024 输出。[固定版本 Ollama 的 EmbedHandler](https://github.com/ollama/ollama/blob/v0.34.1/server/routes.go)在生成 embedding 后处理输出维度。

## 编码的实际成本

四段相同全文共 4791 字符、1260 token；单查询 25 token。每个模型、工作负载、设备先暖机一次，再正式测 8 次。下表为墙钟中位数，单位 ms；8 个样本不作为稳定 p95 证据。

| 设备 | 0.6B 四段全文 | 4B 四段全文 | 0.6B 单查询 | 4B 单查询 |
| --- | ---: | ---: | ---: | ---: |
| 本机 Tesla P4 | 502.99 | 2252.54 | 16.34 | 35.50 |
| 本机 CPU，num_gpu=0 | 5706.20 | 23365.50 | 24.02 | 67.30 |
| 用户提供的 RTX4090 端点 | 202.76 | 277.28 | 50.87 | 42.02 |

P4 和 CPU 的全文小批请求中，0.6B 约快 4 倍。CPU 单查询可以较快，但全文编码慢，宜作为后台建库参考；不能用短查询速度推断全库编码速度。4090 **存在其他 GPU 任务，用户已确认**，0.6B 单查询并未更快；这些数据只描述当时端点，不代表显卡的独占性能或模型的固定性能排序。

上下文统一为 4096，硬件测试 num_thread=14、num_batch 使用默认值；CPU 分配 VRAM=0 已核实。GPU 上服务报告 0.6B 分配约 2.37 GB、4B 约 4.37 GB；包含运行时及上下文，不能当作模型文件大小。暖机全文请求墙钟分别为 P4 2.48／6.76 秒、CPU 7.98／30.85 秒、4090 5.57／6.97 秒，不混入正式样本；单次暖机也不是冷启动分布。

0.6B 完成全部 12,646 片段编码：527 批、24 输入／完整批、3,260,491 token，请求墙钟累计 685.14 秒，批次 p50=1314.22 ms、p95=1580.00 ms；查询批另耗 382.49 ms。此前慢速探测使用不同运行条件，部分结果保留但未复用到正式向量。外部 GPU 负载及模型加载状态改变，尚无证据把那次异常归因于 num_batch；也不与上轮 4B 全库耗时计算显卡或模型的固定倍数。

## 相关文献与可用正文要分别检查

gpt-6-luna 先冻结不完整的盲标，再审阅三个候选各 12 条查询的 Top-3，共 108 个结果位置。父文献按 0／1／2 分别表示偶然提及、实质相关、直接原始解释；片段独立评分，2 表示正文或摘要本身有相关解释，1 可包含主题相近或派生内容，0 表示无可用内容。本次评分偏好原始解释，不等同于所有业务场景的质量标准。表中只报告计数，**不是准确率、Recall 或 NDCG，也不是人工金例验收**。

| 每候选 36 个结果位置 | 0.6B／1024 | 4B／1024 | 4B／2560 |
| --- | ---: | ---: | ---: |
| 父文献被评为相关，grade≥1 | 25 | 31 | 29 |
| 片段自身有解释性内容，grade=2 | 9 | 14 | 15 |
| 最佳片段仅参考条目 | 23 | 16 | 13 |
| 文献相关、最佳片段仅参考条目 | 15 | 14 | 9 |

两个经核实的原始来源在三个候选的中英查询排名完全相同，一个意图都是第 1 名，另一个都是第 2 名。只看这两例或 Top-5 交集，会漏掉片段质量的差异。4B／1024 与 2560 的差距不足以在这个样本上证明优劣；0.6B 的较低内容计数则提醒我们，低端参考配置不能直接升级为质量已达标的默认配置。

一个查询意图的 18 个结果位置中，15 个父文献相关，但仅 1 个最佳片段有解释性内容，13 个最佳片段来自参考条目。另一个意图只返回 1 个相关父文献，同时具有已知语料覆盖缺口，不能把三模型一起缺少某类原始论文当作模型一致失败。各意图覆盖不均、同文献和中英重复位置并非独立样本，一两个计数差异不用于模型排序。

**下一项质量调查应检查参考区及引用分析投影如何参与召回和正文取证。** 当前“每篇最高分片段”容易把别篇论文的参考条目当作该篇的最佳证据。尚未执行过滤、降权或重排实验；具体策略应经同一语料的受控对照后再决定，不能先假定排除全部引用内容就正确。

## 数值一致性与 sqlite-vec 的边界

真实规模使用 10 个范围、k=25／100，每 `(范围,k,路线)` 30 次，轮换固定的 12 查询。Rust 参照以 float64 累加余弦、转换为 float32，按距离和稳定行身份排序。sqlite-vec 的距离内核以 float32 累加；距离容差 1e-4 不允许不同身份和顺序被算作相同。

0.6B／1024 和 4B／2560 的 20 组范围/k 比较通过；4B／1024 有 7 组比较未通过。全范围诊断定位到同一查询的两个片段，参照距离差仅 0.000000298，float32 内核把它们交换排序；k=25／100 各有两个位置不同。全范围完整文献聚合仍一致。这是原型的数值路线差异，不能判为模型相关性失败，也没有放宽身份契约来记为通过。

修正了上轮同分测试路径：eligible≤4096 时，vec0 取全部 eligible 再在参照数值规则下排序；较大集合则明确 unsupported，使用已经独立计时的 Rust 精确扫描。**有限超采样、捕获同分边界以及本次结果恰好相同，都不能证明较大范围的参照 Top-k 精确性。** 原始 KNN 与候选带重排只作为探索数据；完整文献聚合也不使用片段 Top-k 冒充全范围聚合。

原型全范围的原始 vec0 KNN p95：1024 维约 50–53 ms，2560 维约 144–153 ms；Rust 片段扫描分别约 47–56 ms 和 126–140 ms。但这条 KNN 仍带 `rowid IN (SELECT 完整范围)`，全范围枚举行 ID 的成本也在其中，不能据此断言扩展内核没有性能收益。普通表标量函数的完整聚合慢于当前 Rust 路线。只证明了这些原型路径的情况，不证明扩展的所有实现都不可行。

## 2k 密集全文压力

压力将 86 篇文献的真实切分向量复制为新测试身份，Topic 保持 4 个，共 248,806 片段。它测试距离、聚合、同分和空间成本，不证明 2000 篇独立文献的相关性。

0.6B／1024 的 2k、k=25／100、每路线 30 样本已完成，数值／身份／聚合比较均通过。Rust 完整聚合 p95=984.40／1041.32 ms，满足 2.5 秒最低要求，但 k=100 略超 1 秒目标；片段 p95=966.52／1137.98 ms。sqlite-vec 标量完整聚合 p95=1836.94／1645.27 ms；原始 KNN p95=1058.16／1145.57 ms，仍是数值规则不同的探索路线。

普通 SQLite 表实测建库 37.72 秒、DB=1,214,525,440 字节（约 1.13 GiB）；sqlite-vec 双表建库 217.52 秒、DB=2,251,816,960 字节（约 2.10 GiB）。双表约占 1.85 倍空间、建库约耗 5.77 倍时间。Rust 查询在双表库中的普通 BLOB 表上执行；普通表独立运行只测了建库和空间，不能把它记为另一轮已测查询。

4B／1024 同样完成，两组 k 的比较通过。Rust 片段 p95=862.96／1066.29 ms，完整聚合 p95=1135.28／1080.47 ms；标量完整聚合 p95=1463.00／1616.32 ms，原始 KNN p95=909.23／1121.98 ms。双表建库 233.37 秒、空间与 0.6B 相同；两次完整 benchmark 的进程 VmHWM 约 116 MiB。两组均满足 2.5 秒最低要求，1 秒目标尚不能稳定保证。4B 压力测试未重现真实规模的排序差异，不抹去已经保存的真实规模反例，也不证明有限候选路径精确。

0.6B 压力测试前后的本机 1 分钟 load average 为 7.67→15.48，4B 为 15.48→22.81，背景负载明显变化。相同维度下的 p95 差异不能解释为模型带来的扫描速度差异。

当前 2k 精确扫描已经接近或越过 1 秒目标，扩展路线也尚未满足全范围精确性；依照本轮先诊断再扩容的方案，停止在真实规模和 2k。**10k／25k 本轮未测，#89 的规模验收仍未完成。** 后续应先决定是否继续优化精确路线，再测更大规模；不能将复制压力或线性估算当作更大真实库的测量。

## 全范围 KNN 的补测

最后复核发现全范围无需关系预筛选。以已完成的 0.6B／1024、2k 库及固定查询补测，每 k 各 30 样本，依次计时 Rust 扫描、原型带预筛选 KNN、无预筛选 KNN，没有重新编码、建库或与其它本票性能任务重叠。

| k | Rust p50／p95 ms | 带预筛选原始 KNN p50／p95 ms | 无预筛选原始 KNN p50／p95 ms |
| --- | ---: | ---: | ---: |
| 25 | 808.27／1026.61 | 821.60／915.24 | 691.29／772.33 |
| 100 | 825.59／1396.11 | 886.04／1047.10 | 728.82／917.58 |

无预筛选 p50 比 Rust 约快 12–14%；p95 的更大差距包含背景负载及尾部波动，不用它宣称固定提速倍数。两种 KNN 与参照的身份集合在本次 60 样本相同；这里只检查集合，不能当作稳定顺序、参照距离或全局精确性的证明，也不能抹去既有反例。此补测只适用于无筛选全范围，不许可删除库、tag、collection 等真实硬条件。

补测复用相同 bundled SQLite／静态扩展、查询 BLOB 及 `rust_scan`、`vec0_knn_raw`；无预筛选路线仅把原型 SQL 换为以下语句。参数依次是固定查询 float32 BLOB、k=25／100；仍在外层按 distance／rowid 排序，每组轮换同一 12 查询 30 次。没有更改正式基准的查询函数：

```sql
WITH knn AS MATERIALIZED (
  SELECT rowid, distance, document_id
  FROM vectors_vec
  WHERE embedding MATCH ? AND k = ?
  ORDER BY distance
)
SELECT rowid, distance, document_id
FROM knn
ORDER BY distance, rowid;
```

## 可复现条件与剩余证据

本机 Xeon E5-2680 v4、14 核／28 逻辑 CPU、62 GiB RAM，测量时约 34–36 GiB 可用，8 GiB swap 已满；保留现有机器任务。Ollama 本机 0.34.1、远端 0.34.2，两端各模型制品 digest 一致。工具链为已有 nightly-2026-07-25、rusqlite 0.40.1、bundled SQLite 3.53.2、sqlite-vec v0.1.9 固定 commit `e9f598abfa0c06b328d8fe5da9c3760cce74be10`。上游 C 编译警告保留，未安装依赖。

编码、编译、硬件测试和检索正式测量串行，不与本票其它重任务重叠；不声称独占主机。没有驱逐 OS 页缓存，路线顺序可能预热后续读取。RSS 是进程 VmHWM，不能代表 SQLite／OS 总缓存；最终 WAL=0 不说明建库、staging 或备份的峰值。

本轮真实规模原始 JSON 生成后，仅纠正了 selected_route 标签及精确性说明；查询算法未改。公开 JSON 按实际 recorded fallback 输出路由，不把 materialized_engine=vec0 当作查询使用 vec0。ingest-only 首次探测因场景校验顺序在建库后拒绝，已修复；之后完成建库的结果因临时 wrapper 未处理 null correctness 而中断，保留该结果并继续查询，不重复覆盖或伪造计时。

实验入口为 [round2.py](issue89/round2.py)，语料、向量转换和检查复用 [corpus.py](issue89/corpus.py)，本地路线为 [benchmark.rs](issue89/benchmark.rs)。从仓库根目录，以私有上轮工件和全新忽略目录运行：

```bash
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round2.py prepare --previous "$ISSUE89_PREVIOUS" --root "$ISSUE89_ROUND2"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round2.py embed --root "$ISSUE89_ROUND2" --endpoint "$ISSUE89_REMOTE" --batch 24
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round2.py quality --root "$ISSUE89_ROUND2"
```

`ISSUE89_PREVIOUS` 指向上轮私有工件，`ISSUE89_ROUND2` 必须是 `.scaffold/test/` 下全新目录，两个端点由本机测试者提供。Rust 构建使用 [build-harness.sh](issue89/build-harness.sh)；已有构建目录则直接使用其 Cargo.toml。已运行的 binary 必须等退出后再重新构建。生产基线为 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。

完成向量准备后，硬件与检索逐项运行，输出采用新文件名：

```bash
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round2.py hardware --root "$ISSUE89_ROUND2" --endpoint "$ISSUE89_LOCAL" --label p4 --samples 8
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round2.py hardware --root "$ISSUE89_ROUND2" --endpoint "$ISSUE89_LOCAL" --label cpu --cpu --samples 8
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/round2.py hardware --root "$ISSUE89_ROUND2" --endpoint "$ISSUE89_REMOTE" --label 4090 --samples 8
ISSUE89_SCOPES=all "$ISSUE89_BENCH" "$ISSUE89_ROUND2/small-1024/manifest.json" "$ISSUE89_ROUND2/real-small.json" 86 30 vec0
ISSUE89_SCOPES=all "$ISSUE89_BENCH" "$ISSUE89_ROUND2/large-1024/manifest.json" "$ISSUE89_ROUND2/real-large.json" 86 30 vec0
ISSUE89_SCOPES=all "$ISSUE89_BENCH" "$ISSUE89_ROUND2/baseline-2560.json" "$ISSUE89_ROUND2/real-baseline.json" 86 30 vec0
ISSUE89_SCOPES=ingest-only "$ISSUE89_BENCH" "$ISSUE89_ROUND2/small-1024/manifest.json" "$ISSUE89_ROUND2/build-rust-2000.json" 2000 30 rust
ISSUE89_SCOPES=all-only "$ISSUE89_BENCH" "$ISSUE89_ROUND2/small-1024/manifest.json" "$ISSUE89_ROUND2/pressure-small.json" 2000 30 vec0
ISSUE89_SCOPES=all-only "$ISSUE89_BENCH" "$ISSUE89_ROUND2/large-1024/manifest.json" "$ISSUE89_ROUND2/pressure-large.json" 2000 30 vec0
```

`ISSUE89_BENCH` 是本次构建出的 release binary，真实测量不与编译重叠。数学与行为检查：`corpus.py test` 的 5 项及 `cargo +nightly-2026-07-25 test --release --offline --manifest-path .scaffold/test/issue89-repro-build/Cargo.toml` 的 15 项通过，Ruff 检查及格式检查、Rust 格式检查、Shell 语法检查通过。脱敏结构和汇总值见 [公开 JSON](issue89-round2-results.json)。

人工内容质量、更多语言和交叉语言、完整范围组合、[#88](https://github.com/leike0813/zotero-agents/issues/88) 的生产来源与正式内容核验、实际 Repository 并发、maintenance 发布／恢复生命周期、staging/WAL/备份峰值，以及 [#90](https://github.com/leike0813/zotero-agents/issues/90) 的七平台交付仍缺实际证据。隔离 benchmark 不能关闭 #89。
