# Rust 候选评分与精确重排：有界最终批次结果

2026-10-06。[验证 Rust 范围内候选评分与精确重排（有界最终批次）](https://github.com/leike0813/zotero-agents/issues/91#issuecomment-6010051020)已发表resolution并结票，结论为**限定推荐：本批2k、10k的八个配置通过；25k查询证据不足**。

25k矩阵构建、旧／新矩阵共存检查及真实备份已完成，但完整44查询oracle的准备触及600秒上限。runner终止该子进程并停止批次，25k四个查询配置均未运行。没有将准备超时解释为候选算法、召回或P95不达标，也没有延长时限或调参补跑。目标25k尚未得到查询验证，不能据本批完成最终生产选型。

## 固定输入与实现

[执行计划](issue91-plan.md)和[执行前冻结评论](https://github.com/leike0813/zotero-agents/issues/91#issuecomment-6009393857)记录已批准门槛。固定源码基线为`84b3028dba8f5f3b8437f3aa237bf0fec2e68820`，查询16 GiB、构建／替换32 GiB、保留磁盘128 GiB；准备及查询子进程均以600秒限时。

输入恢复见[重建与迁移记录](issue91-recovery.md)。**旧12条原文重新编码，另32条重新起草并在编码前冻结；这是2026-10-06的新44查询批次，不是已删除第十轮查询的历史复现。**文档向量没有重新embedding。三个压力档沿用原86篇文献向量复制新身份，加原4个Topic，共248806／1239322／3097688片段，1024维float32；不代表真实独立2k／10k／25k文献。

[隔离Rust入口](issue91.rs)复用原`issue89/benchmark.rs`的校验、顺序float64余弦及稳定身份聚合。单线程标准库八路float32内积直接评分eligible行，固定6400候选；eligible≤4096完整精确。原向量从SQLite实际取回后按顺序float64 dot／norm重算为float32，每对象取最佳片段，再取Top100／25。oracle只用于计时返回后的核验，不能进入execute或决定预算。

每请求重新准备范围，类内并集、类间交集；冻结metadata与SQLite membership index结果另与原始EXISTS SQL、索引SQL核对。范围anchor只从原12646行按固定规则取得。该冻结只读投影不承担生产动态basis或来源失效语义。

工具链为`rustc 1.99.0-nightly (da86f4d07 2026-07-24)`／`nightly-2026-07-25`，缓存`rusqlite=0.40.1`、bundled SQLite 3.53.2、`serde_json=1.0.150`，离线release构建；本批内核不使用Faiss、sqlite-vec、外部BLAS、手写平台SIMD或fast-math。主机为Linux x86_64、Xeon E5-2680 v4，非独占；输入和工件在NFS4，未清OS缓存。不能与旧SATA／Faiss采样作受控提速比较，也不能将首次进程请求称为真正冷盘。

## 查询结果

每配置独立进程，额外首次请求和一次预热后采44×3=132次；P95为升序第126项。八个完成配置共1056次正式请求。质量仅统计首轮44条，即352个查询／配置组合，仍只有44条不同查询；重复计时和复制语料不构成独立质量样本。

| 压力档 | 范围 | eligible／对象 | P50 ms | P95 ms | 最大值 ms | 结论 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| 2k | all | 248806／2004 | 134.561 | 153.450 | 176.123 | 通过 |
| 2k | intersection | 46813／185 | 80.844 | 104.853 | 116.149 | 通过 |
| 2k | union_intersection | 69198／231 | 95.276 | 121.740 | 159.584 | 通过 |
| 2k | topic_section | 77／4 | 1.525 | 1.710 | 2.503 | 通过 |
| 10k | all | 1239322／10004 | 535.909 | 602.913 | 655.869 | 通过 |
| 10k | intersection | 235603／929 | 274.003 | 318.293 | 352.992 | 通过 |
| 10k | union_intersection | 348384／1161 | 337.127 | 388.392 | 426.533 | 通过 |
| 10k | topic_section | 77／4 | 11.228 | 14.486 | 15.064 | 通过 |
| 25k | 四个范围 | 未测 | — | — | — | oracle准备超时 |

八个配置每条首轮查询的对象Recall@25／100、最佳片段覆盖及获胜片段身份召回，宏平均与最差值均为100%。满足首档完整覆盖100%和扩档宏平均≥99%、最差≥95%要求；没有用tie-aware指标替代严格身份。所有完成配置的P95同时满足2.5秒最低线和1秒目标。

正式请求共核对**5,089,128次候选距离bits，差异0**；候选内获胜身份和顺序与oracle一致，三轮候选池身份／距离稳定，范围核验错误0。两个窄范围每次完整重排77片段，Top25／100均以实际4个可用对象为分母。自检保留同分、空／跨库、多对多范围、非法输入与多片段对象的小预算遗漏反例。

这些是相对完整向量oracle的覆盖，未评估人工相关性、证据质量或语料泛化。6400仅是本次固定验证参数；旧1600预算反例依然有效，本批成功不将6400确立为任意语料或生产默认值。

## 初始化与请求计时边界

检索时间包含每请求范围准备、查询归一化、评分／选择及合法性核验、SQLite实际取数、契约重算、聚合和候选临时缓冲释放。返回pool、Top100和eligible留给离线核验，返回数据的释放不算请求cleanup。查询embedding、矩阵／metadata／oracle加载、额外首次请求、预热和后置核验均单列。

| 压力档／范围 | 矩阵加载 ms | metadata ms | oracle加载 ms | 首次请求 ms | 预热 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2k all | 1405.499 | 194.484 | 377.788 | 149.003 | 134.840 |
| 2k intersection | 1397.592 | 183.156 | 55.339 | 124.038 | 81.191 |
| 2k union_intersection | 1474.960 | 189.131 | 55.100 | 90.957 | 90.186 |
| 2k topic_section | 1395.832 | 185.590 | 55.603 | 2.479 | 2.308 |
| 10k all | 42325.733 | 1033.545 | 1916.104 | 933.086 | 536.656 |
| 10k intersection | 30457.063 | 963.488 | 290.481 | 2037.810 | 305.837 |
| 10k union_intersection | 6918.631 | 925.966 | 280.067 | 550.521 | 328.262 |
| 10k topic_section | 6700.368 | 922.949 | 274.044 | 12.716 | 12.451 |

10k全范围正式阶段中位为范围准备2.359、评分／选择493.615、实际取数／重排40.559、聚合0.456、cleanup约0.001 ms；两个组合过滤的范围准备中位138.505／156.916 ms。分段中位不能保证相加等于总中位。完整逐配置阶段统计、132次原顺序总耗时和44条首轮质量保存于[公开统计JSON](issue91-results.json)，没有剔除异常值。

常驻矩阵加载仍是实际成本，窄范围也加载全库矩阵。上述P95适用于准备就绪后的隔离流程，不能覆盖首次使用、embedding或生产来源／协议开销。

## 构建、替换、备份及资源

矩阵逐行从SQLite读取，经顺序float64 L2归一化转float32构造并保存；替换检查在同一进程持有旧／新矩阵，逐坐标bits核对一致后保存staging。三档各保留正式矩阵、staging、矩阵备份和实际SQLite备份；隔离文件构建不等于生产原子发布。

| 压力档 | 矩阵净字节 | 构建CLI s／RSS GiB | 替换CLI s／RSS GiB | 数据库备份 s | 矩阵备份 s | oracle准备 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2k | 1019109376 | 33.941／0.970 | 14.302／1.919 | 12.354 | 9.941 | 复用恢复工件，恢复成本52.80 s |
| 10k | 5076262912 | 167.433／4.748 | 213.043／9.476 | 103.709 | 88.357 | runner 280.516 s，完整 |
| 25k | 12688130048 | 436.081／11.837 | 470.968／23.654 | 265.117 | 219.323 | runner 600.260 s，超时 |

CLI表中耗时来自内部计时，runner墙钟另存JSON：25k构建437.257、替换473.072秒。替换内部“constructed_ms”包含旧矩阵加载；总时间另包含完整一致性核对、写出和sync。每次扩大规模的MemAvailable预检均通过，预算不是物理内存预留。

完成配置的查询进程峰值最高约**5.05 GiB**，包含矩阵、metadata、oracle、SQLite缓存、核验记录及临时缓冲；不能当作净请求或生产进程峰值。构建／替换最高约**23.65 GiB**。`/proc`每0.1秒观察RSS／VmHWM，同时保存进程内VmHWM；读数有近似性，两者的小幅差异保留在原始记录和公开JSON。

批次结束时三组目录合计**103067940674字节，约95.99 GiB**，包含旧三档输入、恢复文件、全部新矩阵／staging／备份、完整及部分oracle、构建输出、日志和当时已有payload。低于128 GiB；这是逻辑文件大小快照，后续小型报告payload单列留存，不等于NFS实际占用或Btrfs物理释放量。目录为迁移后的`issue89-round3-qrbctjv3/`、恢复会话`issue91-20261006T032556Z/`及本批`issue91-final-20261006/`，均在`/mnt/HotData/tmp`。

25k oracle最后完成query index 32，即**33／44条**，留下420519936字节部分文件，完整预期545193088字节；SIGTERM停止后已确认该子进程退出。部分oracle保留作诊断，未用于质量或P95统计。停因是准备墙钟限时，查询RSS、范围或候选算法没有因此判失败。

## 验证与交接

Rust行为自检先因同分身份选择失败，再实现后通过。runner正式运行前增加完整精确范围的检查，复现后两轮空质量字段访问错误，修正为只检查首轮；自检通过。所有修正在执行前冻结前完成，正式批次定向修正／重测次数为0。

离线release构建、Rust自检、rustfmt、runner自检、Ruff lint／format和公开Markdown／JSON格式检查通过。独立核验1056条正式记录的索引覆盖、P95第126项、中位与极值、阶段和、候选预算、bits检查计数、首轮质量统计、资源上限及八项已测／四项未测划分通过。恢复阶段历史SQLite fixture在NFS清理时报错的记录仍在恢复报告，未改写为通过。

新增资产为本报告、统计JSON、`issue91.rs`及`issue91-run.py`，并补全既有计划／恢复记录的当前状态；实验源码与查询快照、构建manifest／lock、原始配置／输出／watch receipt在HotData保留。工件未提交。生产代码、来源库、schema、依赖、Git历史与分支没有修改。

本批为[选定本地向量引擎与持久化方案](https://github.com/leike0813/zotero-agents/issues/84)提供限定规模证据，父票保持开放，最终方向仍需用户确认。25k、真实独立文献与人工相关性、动态basis／source／maintenance、并发及七平台生产交付尚未验收；不自动启动下一轮或引入另一个引擎。

## 复现命令

需保留迁移后的三档只读库和新冻结查询。`--root`使用新空目录，输出拒绝覆盖；源码位置须与独立Cargo manifest中的bin路径一致。runner固定复用本次恢复输入和原Rust oracle。

```bash
final_root=/mnt/HotData/tmp/issue91-final-20261006
CARGO_TARGET_DIR="$final_root/build/target" TMPDIR="$final_root" cargo +nightly-2026-07-25 build --release --offline --locked --manifest-path "$final_root/build/Cargo.toml"
"$final_root/build/target/release/issue91-final" --self-test
TMPDIR="$final_root" PYTHONPYCACHEPREFIX="$final_root/pycache" uv run --project="$HOME/.ar" --locked --no-sync -- python artifacts/vector-retrieval-wayfinder/issue91-run.py --self-test
TMPDIR="$final_root" PYTHONPYCACHEPREFIX="$final_root/pycache" uv run --project="$HOME/.ar" --locked --no-sync -- python artifacts/vector-retrieval-wayfinder/issue91-run.py --binary "$final_root/build/target/release/issue91-final" --root "$ISSUE91_FRESH_ROOT"
rustfmt +nightly-2026-07-25 --edition 2024 --config skip_children=true --check artifacts/vector-retrieval-wayfinder/issue91.rs
uv run --project="$HOME/.ar" --locked --no-sync -- ruff check artifacts/vector-retrieval-wayfinder/issue91-run.py
uv run --project="$HOME/.ar" --locked --no-sync -- ruff format --check artifacts/vector-retrieval-wayfinder/issue91-run.py
node node_modules/prettier/bin/prettier.cjs --check artifacts/vector-retrieval-wayfinder/issue91-plan.md artifacts/vector-retrieval-wayfinder/issue91-recovery.md artifacts/vector-retrieval-wayfinder/issue91-results.md artifacts/vector-retrieval-wayfinder/issue91-results.json
```
