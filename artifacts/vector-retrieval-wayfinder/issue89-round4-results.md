# #89 第四轮：读取与计算成本拆分

2026-10-05 完成。复用第三轮 2k 文献＋4 Topic 的普通 SQLite 库，248,806 个 1024 维 float32 向量，以及冻结的 12 条 `qwen3-embedding:4b` 查询；没有重新编码或建库。生产 baseline 为 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。

本轮最清楚的结果是：即使物理读为零，SQLite 读取路线仍比连续内存中的相同精确计算慢约 0.55 秒。范数缓存和 HashMap 的配对收益很小且方向不稳定，当前没有理由据此增加持久化范数列或更换生产聚合容器。内存路线用于诊断，约 1 GiB 的驻留成本和预加载时间也必须计入。

计划见 [第四轮计划](issue89-round4-plan.md)，完整脱敏计时及配对统计见 [JSON](issue89-round4-results.json)，入口为 [round4-profile.rs](issue89/round4-profile.rs)。本轮仅新增这四个工件；生产代码、schema、依赖和真实库未修改，也未提交或切换分支。既有 `CONTEXT.md` 改动保留，#89 保持开放。

## 成本对照

六条路线统一全范围、完整遍历后按文献取最佳片段，再取 k=100。各 24 次，12 条查询各出现两次；第二次完整反转路线顺序。每条路线在六个位置各出现四次，配对位置之和均为五，汇总脚本已检查。各路线只改变输入读取方式、范数取得方式或聚合容器中的一项，没有把片段 Top-k 当作文献 Top-k。

| 路线 | P50，ms | P95，ms | 24 次物理读取 |
| --- | ---: | ---: | ---: |
| SQLite，参照 | 856.34 | 932.52 | 0 |
| SQLite，缓存向量平方范数 | 846.06 | 933.02 | 0 |
| SQLite，HashMap 聚合 | 856.75 | 912.72 | 0 |
| 连续内存，参照 | 307.06 | 331.32 | 0 |
| 连续内存，缓存向量平方范数 | 296.80 | 336.67 | 0 |
| 连续内存，HashMap 聚合 | 306.03 | 341.81 | 0 |

缓存的是按原顺序以 float64 累加的平方范数，查询仍执行原 dot 顺序、sqrt 和除法，最后转为 float32 距离。HashMap 与 BTreeMap 使用相同的最佳片段比较和最终 `(distance, stable id)` 排名，没有依赖容器遍历顺序。

P50 的差值容易混入不同样本的位置与负载，下面另外比较同一查询、同一轮的配对差。正数表示候选节省时间；这些是描述性统计，24 对样本不构成显著性证明。

| 单变量候选 | 更快的配对数 | 配对中位节省，ms | 配对中位节省比例 |
| --- | ---: | ---: | ---: |
| SQLite，范数缓存 | 13／24 | 3.80 | 0.45% |
| SQLite，HashMap | 8／24 | -9.63 | -1.16% |
| 连续内存，范数缓存 | 15／24 | 3.23 | 1.05% |
| 连续内存，HashMap | 12／24 | 0.17 | 0.04% |

范数缓存没有改善本轮 P95；HashMap 在 SQLite 中的 P95 较低，但配对中位数变慢，不能据单个分位数宣布稳定优化。原参照已经在同一次遍历中融合 dot 和 norm，减少一个累加器没有形成足以改变规模结论的实测收益。

## 读取、准备与内存

先执行六次 SQLite 行／BLOB 遍历探针，不计算距离、不复制到应用缓存，只取得身份、BLOB 长度及首尾字节。它包含 SQLite 取得 BLOB 的成本，不能当作逐字节计算或纯磁盘带宽测量。随后复制全部向量到连续内存，单独生成范数缓存，再进行完整精确性检查与每路线一次预热。因此正式路线明确属于已预热测量。

首次筛查的首遍探针为 2,727.90 ms，记录到 1,217,626,112 字节物理读，约 1.13 GiB；后五遍约 511–552 ms，物理读为零。没有清 OS 页缓存，因此首遍只是实际发生物理读取的观测，不是受控冷缓存基准。首次筛查的查询重复了同样的路线顺序，保留在私有工件并单列到公开 JSON，未混入确认数据。

确认实验继续使用已读取的库；六次读取探针 P50 为 531.69 ms、P95 为 544.52 ms，累计物理读取 135,168 字节（132 KiB）。SQLite 配置保持 `cache_size=-2000`、`mmap_size=0`、`page_size=4096`。SQLite 每次正式查询仍记录约 1.030 GB 的逻辑读取，即使物理读取为零；连续内存路线只有计数器探针自身的少量逻辑读取。读取路径、BLOB 交付和布局在热缓存下仍有成本，下一步应优先调查这条路径。

确认实验的内存预加载为 1,172.74 ms，范数准备为 281.21 ms，二者都在查询计时外单独报告。向量有效字节 1,019,109,376（约 0.949 GiB），平方范数 1,990,448 字节（约 1.90 MiB），身份数组 3,980,896 字节。进程 VmHWM 为 1,020,668 KiB（约 996.75 MiB），不包含 OS 页缓存。

六条路线在同一进程运行，SQLite 计时时内存向量仍驻留，不能把这个 VmHWM 当作流式 SQLite 实现的自身内存要求。SQLite 遍历与内存计算的输入层和访问方式不同，时间不能直接相加或相减为严格阶段占比。2k 的驻留加速也不证明 10k／25k 的内存预算、首次查询或并发可接受。

## 精确性与验证

正式计时前对全部 12 查询、全部 248,806 个向量比较缓存与原参照的 float32 距离 bits，共 2,985,672 次，一致。原参照完整文献扫描与两种聚合容器比较全部 24,048 个“查询＋文献”赢家，片段身份、文献身份、距离 bits 及顺序一致。正式六路线的 144 次 k=100 结果逐项核验；计时后再核验 72 个 k=25 查询／路线组合，均通过。

新增两项行为检查先观察失败，再实现：平方范数／距离逐位一致及无效输入拒绝；同分、同父文献多片段、反向输入、短结果与正负零的聚合排序。连同复用的参照检查，Rust 17 项全部通过。Release 构建使用已有缓存依赖、`--offline --locked`；rustfmt 按 edition 2024，Markdown／JSON 的 Prettier 检查及公开输出脱敏结构检查通过。

首次筛查约 156 秒，修正顺序后的确认约 151 秒。主机仍为非独占 Linux Xeon E5-2680 v4；确认前后 load average 约 `17.31/15.01/8.79` 与 `15.96/15.49/9.95`。本轮未清缓存或调整已有主机任务，也未重跑 10k／25k 的整套计时。上述采样只证明本次固定输入和条件，第三轮的大规模验收结果继续有效。

## 后续判断与复现

读取／数据布局的对照差异远大于两项单变量优化的配对收益。下一轮可先单变量核验 SQLite mmap 或有界批量读取，并保持原数值参照。持久范数的增量失效、事务／备份成本，本轮没有验证；也没有形成引擎定案或内容过滤默认规则。

输入仍来自 86 篇文献与 4 个 Topic 的冻结工件，扩容副本只用于压力负载。人工质量、多语言完整验收、生产并发、maintenance 生命周期、staging／备份峰值和七平台交付仍由后续验收承接。

在仓库根复现，变量指向本机私有位置和全新输出。临时 Cargo adapter 复用第三轮固定的 build.rs、sqlite-vec C 源及 lock，只将 bin 指向本轮入口；依赖版本不变。实验以只读 SQLite 事务固定输入，结束后释放。

```bash
CARGO_TARGET_DIR="$ISSUE89_BUILD" cargo +nightly-2026-07-25 test --offline --locked --manifest-path "$ISSUE89_ROUND4/build/Cargo.toml"
CARGO_TARGET_DIR="$ISSUE89_BUILD" cargo +nightly-2026-07-25 build --release --offline --locked --manifest-path "$ISSUE89_ROUND4/build/Cargo.toml"
"$ISSUE89_BUILD/release/issue89-round4-profile" "$ISSUE89_RUST_DB_2K" "$ISSUE89_QUERIES_1024" "$ISSUE89_FRESH_OUTPUT" 24
rustfmt +nightly-2026-07-25 --edition 2024 --config skip_children=true --check artifacts/vector-retrieval-wayfinder/issue89/round4-profile.rs
node node_modules/prettier/bin/prettier.cjs --check artifacts/vector-retrieval-wayfinder/issue89-round4-plan.md artifacts/vector-retrieval-wayfinder/issue89-round4-results.md artifacts/vector-retrieval-wayfinder/issue89-round4-results.json
```

本机私有位置及两次日志保存在新 `.scaffold/test/issue89-round4-20261005/`，没有覆盖此前工件。入口不输出查询文本或原始结果身份；公开 JSON 只保留标量统计、路线与查询序号。
