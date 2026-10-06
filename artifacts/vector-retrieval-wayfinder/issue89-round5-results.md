# #89 第五轮：SQLite mmap 对照

2026-10-05 完成。mmap 在 2k 的配对中位节省为 **34.07%**，24／24 对查询都更快；按预定条件继续做 10k／25k 少量确认，节省分别为 **13.26%／8.69%**。大规模 mmap 查询仍约 3.7／9.9 秒，高于 2.5 秒最低线。这次改进不足以让当前串行精确全扫描覆盖大规模性能要求。

实验复用第三轮三个普通 SQLite 库、冻结的 `qwen3-embedding:4b`／MRL 1024 float32 向量与查询。两路线直接调用原 `rust_document_scan`，仅改变连接级 `mmap_size`，没有修改距离计算、范数、聚合容器、SQL 硬范围或候选集合。baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。

计划见 [第五轮计划](issue89-round5-plan.md)，原始脱敏采样、配对统计与独立内存结果见 [JSON](issue89-round5-results.json)，入口为 [round5-mmap.rs](issue89/round5-mmap.rs)。本轮只新增这四项工件及忽略目录中的临时 adapter／runner。未修改生产代码、schema、依赖、真实库或既有未提交文件，未提交或切换分支；#89 保持开放。

## 延迟与扩测条件

全部查询完整遍历 eligible 片段，先按文献取最佳片段，再取 k=100。默认与 mmap 使用同一只读库、相同 cache_size 和 page_size，各有独立 read transaction。读探针、逐位核验和每路线一次预热先执行，正式样本另计时间；不清系统缓存、不调整其它主机任务。

2k 轮换 12 条查询，各出现两次，每个查询第二次反转路线顺序，共 24 对。配对中位节省至少 10%、且至少 18／24 对更快时才扩测，这是预先记录的实验预算规则，不是生产验收标准。实测 24／24 对更快、最小配对节省仍为 244.83 ms，满足扩测条件。

| 规模 | 片段／文献含 Topic | 查询对数 | 默认中位，ms | mmap 中位，ms | 配对中位节省 | 更快的配对 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2k | 248,806／2,004 | 24 | 830.65 | 552.36 | 34.07% | 24／24 |
| 10k | 1,239,322／10,004 | 4 | 4,241.66 | 3,701.59 | 13.26% | 4／4 |
| 25k | 3,097,688／25,004 | 4 | 10,753.62 | 9,870.31 | 8.69% | 4／4 |

2k 默认／mmap 的 nearest-rank P95 为 857.17／575.35 ms。表中中位数采用偶数样本两个中间值的均值，JSON 另保留 nearest-rank P50。配对比例是每对节省比例的中位数，不由表中两个中位数相除得到。

10k／25k 只选冻结查询序号 0、1，各正反顺序一次，不能据四对样本判断 P95 或生产负载的稳定性。10k mmap 范围为 3,645.24–3,736.86 ms，25k 为 9,706.89–10,068.01 ms；这八次查询全部高于最低线。正式样本的本进程 `read_bytes` 和 major faults 增量均为零，这是采样时的计数结果，不是对所有系统 I/O 的证明。

## 上限、读取与缓存

SQLite 3.53.2 的实际编译选项为 `DEFAULT_MMAP_SIZE=0`、`MAX_MMAP_SIZE=0x7fff0000`。默认路线明确设置 0；mmap 路线请求最大值后读回 **2,147,418,112 字节**，没有调高全局配置、改编译选项或重新编译依赖。`PRAGMA mmap_size` 是允许映射的上限，`/proc/self/maps` 与 smaps 才给出实际映射及驻留证据。

| 规模 | 库大小，GiB | 实际映射虚拟范围 | 占文件比例 |
| --- | ---: | ---: | ---: |
| 2k | 1.131 | 1,214,525,440 字节，覆盖全文件 | 100% |
| 10k | 5.644 | 2,147,418,112 字节，文件前缀 | 35.44% |
| 25k | 14.127 | 2,147,418,112 字节，文件前缀 | 14.16% |

覆盖比例只描述文件范围，不表示同等比例的向量行或计算被加速。大规模收益缩小与部分映射相符，但查询数、负载和布局也不同，本轮没有隔离这些因素的独立贡献。

2k 仅遍历身份和 BLOB 首尾的读探针：默认两次为 577.14／508.26 ms，mmap 为 257.36／256.99 ms。正式查询默认每次读取系统调用的中位数为 280,036，mmap 为 51；默认 `rchar` 约 1.030 GB，mmap 约 35.6 KB，后者包含 `/proc` 探针本身。mmap 避开了许多显式读取调用，但没有消除逐行 BLOB 交付、float64 cosine 和文献聚合成本。

25k 的前四个读取探针仍发生大量物理读取：默认为 30.88／24.12 秒，mmap 为 27.60／24.29 秒；不能拿这些不同缓存阶段的时间当作冷态配对收益。mmap 首个探针还记录了 95 次 major faults。经过后续逐位验证和预热，正式采样的读取计数才停止增长。说明“已经预热”不能直接等同于“系统缓存已命中”；`rchar` 不涵盖 mmap 缺页读取，也不能代替 `read_bytes` 与缺页计数。

25k 中途资源快照的 MemAvailable 约 35.3 GiB，所见 cgroup ancestor 的 memory.max／memory.high 均无上限，未记录 high／max／OOM 事件。它只排除了当时明确的 cgroup 上限，不能据此解释持续读取的全部原因。私有快照保留，不改主机设置。

## 独立进程的内存与首遍观察

主计时进程同时持有两个连接，mmap 页会继续驻留，不能把它的总 RSS 分摊给默认路线。另对每规模、每路线启动独立进程，记录连接准备和两次查询；这些进程复用此前已读取的文件页缓存，第一遍仅表示该进程首次查询，不是受控冷启动。

| 规模 | 默认匿名 RSS，KiB | mmap 匿名 RSS，KiB | mmap 文件 RSS，KiB | 数据库映射驻留，KiB |
| --- | ---: | ---: | ---: | ---: |
| 2k | 2,608 | 556 | 1,124,684 | 1,120,380 |
| 10k | 2,572 | 2,764 | 2,101,164 | 2,096,940 |
| 25k | 2,572 | 2,764 | 2,101,260 | 2,096,956 |

表中取独立进程第二次查询后的观察。文件 RSS 包含其它映像，最后一列仅属于数据库映射。mapped size、RSS 和 PSS 分开记录；mmap 将文件页计入进程 RSS，并未创建相同大小的匿名向量副本，总物理工作集不能由两路线 RSS 差值直接推算。

2k mmap 独立进程两次查询为 681.26／527.00 ms，默认为 900.08／865.16 ms。10k mmap 为 4,091.81／3,840.12 ms，25k 为 10,381.67／10,058.98 ms。连接准备各约 0.27–0.33 ms，不含查询中的映射触页成本；完整原始数据见 JSON。

## 精确性、验证与边界

两连接按 stable id 同步读取，逐行比较文献／片段身份及完整 BLOB，再以未改动的参照计算 float32 距离并比较 bits；同时核验所有文献的最佳片段和最终排序。2k 检查全部 12 查询，10k／25k 各检查两条，共 **11,659,692 次距离比较、94,064 个查询＋文献赢家**，全部一致。

正式 32 对 top-100 结果逐项核验，另核验 16 对 top-25 查询，均通过。排序仍是 `(distance, stable id)`，没有距离容差替代逐位比较，也没有 SIMD、分组累加、量化或近似候选。验证只涉及固定库和全范围；生产来源核验、并发变化和维护生命周期由后续验收承接。

新增读模式行为检查先失败后通过，覆盖 mmap 有效值、同分、多片段文献、完整／短结果以及拒绝写入；连同原参照自测，Rust **16 项通过**。Release build 使用已有依赖缓存和 `--offline --locked`；rustfmt edition 2024、Prettier 与公开结构脱敏检查通过。独立审查确认数值／配对逻辑；本次数据库参数均为规范化绝对路径且无空白，符合当前 `/proc` 路径匹配边界。

各 profile 用时约 75／121／403 秒，独立内存进程共约 64 秒，均在单次 10 分钟上限内。主机为非独占 Xeon E5-2680 v4／SATA SSD，load average 和阶段 I/O 保留；没有重跑第三轮每路线 30 次、两个 k 的大规模全套测量。语料仍由 86 篇文献和 4 个 Topic 扩容，副本只证明压力负载。

当前数据支持把 mmap 保留为读取优化候选，但大规模精确路线仍缺少达标证据。下一步应按已确认的引擎决议准备近似检索对照，分别检查向量召回、文献聚合结果及硬范围；内容质量、maintenance 恢复、空间峰值与七平台交付继续保持开放。

## 复现

在仓库根运行。临时 Cargo adapter 复用原 build.rs、固定 C 源和 lock，bin 指向本轮入口；`ISSUE89_DATABASE` 使用无空白的规范化绝对路径，输出均为全新文件。2k 的参数为 `24 12`；大规模为 `4 2`。memory 模式的第一个数字为 mmap 开关，每次自行执行两次查询。

```bash
CARGO_TARGET_DIR="$ISSUE89_BUILD" cargo +nightly-2026-07-25 test --offline --locked --manifest-path "$ISSUE89_ROUND5/build/Cargo.toml"
CARGO_TARGET_DIR="$ISSUE89_BUILD" cargo +nightly-2026-07-25 build --release --offline --locked --manifest-path "$ISSUE89_ROUND5/build/Cargo.toml"
"$ISSUE89_BUILD/release/issue89-round5-mmap" profile "$ISSUE89_DATABASE" "$ISSUE89_QUERIES_1024" "$ISSUE89_FRESH_PROFILE" 24 12
"$ISSUE89_BUILD/release/issue89-round5-mmap" memory "$ISSUE89_DATABASE" "$ISSUE89_QUERIES_1024" "$ISSUE89_FRESH_MEMORY_DEFAULT" 0 12
"$ISSUE89_BUILD/release/issue89-round5-mmap" memory "$ISSUE89_DATABASE" "$ISSUE89_QUERIES_1024" "$ISSUE89_FRESH_MEMORY_MMAP" 1 12
rustfmt +nightly-2026-07-25 --edition 2024 --config skip_children=true --check artifacts/vector-retrieval-wayfinder/issue89/round5-mmap.rs
node node_modules/prettier/bin/prettier.cjs --check artifacts/vector-retrieval-wayfinder/issue89-round5-plan.md artifacts/vector-retrieval-wayfinder/issue89-round5-results.md artifacts/vector-retrieval-wayfinder/issue89-round5-results.json
```

本机位置、日志、执行与汇总脚本在新的 `.scaffold/test/issue89-round5-20261005/`。公开 JSON 不含查询文本、正文、标题、作者、原始身份或机器路径，原有大型数据库及各轮工件全部保留。
