# #89 精确检索验证结果

本文件保留首轮的历史测量和当时失败。实验源码已在第二轮更新；当前同分检查、数值差异、1024 维对照及串行性能结果见 [第二轮报告](issue89-round2-results.md)。首轮文本中的失败状态不表示当前测试仍失败。

执行日期：2026-10-04。对应 [#89](https://github.com/leike0813/zotero-agents/issues/89)，生产基线 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。本轮使用用户指定来源库的只读副本，不是 LiSongTao 金例；未修改生产源码、schema、依赖、发布配置或来源库，未提交代码。#89 保持开放。

## 已取得的证据

Rust 普通 BLOB 表扫描与 sqlite-vec 普通表距离函数在真实规模的片段结果、完整范围聚合结果一致。`vec0` 的多对多硬范围可以通过 `rowid IN (SELECT id FROM 完整关系范围)` 进行候选预筛选，不需要全库 top-k 后过滤；隔离集成检查已通过。

`vec0` 仍未满足稳定身份契约：四个完全相同向量，k=2，Rust 按距离、稳定行身份返回 `[1,2]`，扩展返回 `[3,4]`。在已取得的 top-k 上重新排序无法补回被扩展排除的身份。相关测试保留失败，不能以扩展更快为由宣布可采用。

另一个边界是固定版本的 KNN k 最大为 4096。本原型对完整 eligible 集合取全部邻居再聚合的路径，在更多片段时不可用；这证明该验证路径受限，不证明所有可能的精确聚合实现都不可行。Rust 完整扫描和普通表距离函数的聚合仍可单独验证。依据为[固定版本源码](https://github.com/asg017/sqlite-vec/blob/e9f598abfa0c06b328d8fe5da9c3760cce74be10/sqlite-vec.c)。

## 数据与编码

| 内容 | 实测 |
| --- | --- |
| 文献 | 86：preprint 47、journalArticle 16、conferencePaper 21、bookSection 1、book 1 |
| Markdown 全文 | 81，无缺失附件 |
| 分析材料 | 20 份 digest 和 19 份 citation analysis，经生产 note codec 解码，叙述字段共 58 来源单元 |
| Topic | 4，按 11 个既有 section 遍历非身份字符串字段 |
| 全部编码来源单元 | 2160，合计 10,587,412 个 Unicode 字符 |
| 无重叠片段 | 12,646：元数据 125、全文 9566、分析 958、Topic 1997 |
| 120 字符重叠片段 | 13,926：元数据 125、全文 10,711、分析 1086、Topic 2004 |
| 原始向量净空间 | 无重叠 129,495,040 字节；重叠 142,602,240 字节，增加约 10.1% |
| 来源原文位置 | 无重叠 12,646 及重叠 13,926 片段逐条还原 UTF-16 范围，均无不一致 |

长度上限为 1200 个 Unicode 字符，结构优先，长段落再沿句子/空白分开；这是保守实验配置，**不是精确 token 上限，也不是产品默认值**。短元数据合并编码，较长元数据继续切分。各来源独立且保留 UTF-16 原文位置。Topic 的逐字段投影只是实验输入，最终条目组织和可用性核验仍须生产 owner 接入。

模型 ID 为 `qwen3-embedding:4b`，两端模型制品 digest 相同，为 GGUF Q4_K_M、4.0B、约 2.497 GB。模型制品量化与保存向量不同：本轮保存未量化 float32、小端、完整 2560 维，统一余弦距离。未请求降维或服务自动截断。

文档原文不加前缀；查询前缀为 `Instruct: Given a research question, retrieve relevant scholarly passages.\nQuery:`。12 条中英配对查询使用同一向量供两引擎。请求设置 `truncate=false`；[Ollama API](https://docs.ollama.com/api/embed)规定超长时报错。[模型卡](https://huggingface.co/Qwen/Qwen3-Embedding-4B)给出 2560 维并建议用英文任务指令。

无重叠编码共 527 批、3,260,538 输入 token，24 输入/批，端点请求累计 762.66 秒；批次 p50=1457.76 ms、p95=1797.37 ms，最大加载耗时 39.10 ms。查询批次 12 输入另耗 423.69 ms，不能加入本地引擎时间。

重叠版本已完成，本轮因启动时模型/编码 manifest 尚未就绪而安全跳过复用，实际 13,926 片段全部重新编码：3,687,577 token、请求累计 825.14 秒。2164 个同来源、同文本片段另用不可达 embedding 地址验证了复用路径，日志为复用 2164、编码 0，并生成新定位记录；这是独立复用验证，不能减计本轮重叠编码成本。复现脚本顺序等待前一 manifest 完成后才启动重叠任务，并固定复用同一查询向量文件。

## 环境与工具链

- Linux x86_64，Xeon E5-2680 v4，28 逻辑 CPU、14 核、62 GiB RAM、Tesla P4 8 GiB；约 47 GiB 内存已使用，swap 8 GiB 已满。保留机器现有背景工作，结果不代表独占机器。
- 本机 Ollama 0.34.1，远端 0.34.2。P4 运行分配约 4.375 GB VRAM、context=4096；用户提供的 RTX4090 服务分配约 8.720 GB VRAM、context=32768。硬件归属由用户提供，服务可观测分配不证明显卡具体型号。
- `rustc 1.99.0-nightly (da86f4d07 2026-07-24)`，`cargo +nightly-2026-07-25`，缓存 `rusqlite=0.40.1` / `libsqlite3-sys=0.38.1` / bundled SQLite 3.53.2、`serde_json=1.0.150`、`cc=1.4.0`。
- 默认 Rust 1.92 构建在依赖的 `cfg_select` 报错；切换本机已有工具链成功，没有安装或更新依赖。
- sqlite-vec v0.1.9 固定 commit `e9f598abfa0c06b328d8fe5da9c3760cce74be10`，静态编译 `SQLITE_CORE`、`SQLITE_VEC_STATIC`、`SQLITE_VEC_OMIT_FS`，不使用 Python SQLite 代替项目 bundled SQLite。
- 上游 C 源产生 signedness、unused、possible-uninitialized `n/offset` 编译警告，未修改上游。七平台、包体和许可证取证属于 [#90](https://github.com/leike0813/zotero-agents/issues/90)，本轮不证明其通过。

## 本地检索结果

每个 `(scope,k,route)` 有 30 个样本，轮换 12 查询；k=25 和 100 分开统计。查询向量预先生成，计时不含网络/embedding。完整 eligible 集合内先求每个文献/Topic 的最佳片段，再对聚合身份排名。距离容差 `1e-4`，身份和顺序必须相同；不以容差掩盖同分身份不同。

首轮重叠编码任务结束时重写了共享查询文件，部分性能过程仍在逐次读取它；因此首轮跨运行比较只作为诊断记录，不能证明同查询对比。正式结果已使用同一只读固定文件在已有实验 DB 上复测，避免重复建库；2k vec0 运行使用与该文件逐字节相同、期间未改写的查询。两条真实规模 DB 的 12,646 个身份/文献/向量 BLOB 也逐条比对，字节差异为 0。复测时有数个本票 benchmark 并行，负载说明与结果一起保留。复现流程现先完成两种切分编码，再开始 benchmark，重叠路径直接复用查询文件；最终 benchmark 源码在采样开始时一次读取并校验全部查询，采样期间使用内存中的固定值。

固定查询复测的 Rust 表全范围如下，单条延迟单位 ms：

| k | Rust 片段 p95 | sqlite-vec 标量片段 p95 | Rust 完整聚合 p95 | 标量完整聚合 p95 |
| --- | ---: | ---: | ---: | ---: |
| 25 | 453.23 | 206.27 | 402.37 | 1147.01 |
| 100 | 624.36 | 330.08 | 478.38 | 1674.50 |

库/空范围/空 itemRefs/来源类别/itemType/tag/collection/Topic section 共 9 场景，18 组 k 的两路线结果全部一致。初建 2.58 秒、约 5016 行/秒；DB 157,765,632 字节、末尾 WAL=0；进程 VmHWM=28,424 KiB。第一轮未提供显式 itemRefs，罕见 itemRef 场景在后续补入。样例只有一个真实库和一个 collection；结构 fixture 有两个库及多值 tag，验证库隔离和并列条件交集，但未覆盖显式多 libraryIds、多个 collection 或 sourceKinds/sections 数组的全部语义。

Rust 基准为有界 BLOB 流式读取、完整 float32 校验、float64 累加余弦、top-k heap；不代表经 SIMD/预归一化优化的生产实现。标量聚合用 SQL window function，重复计算距离；也不能把该原型耗时当成扩展所能达到的最好性能。

`first_query_ms` / `warm_query_ms` 是打开连接后的第一次、第二次查询，使用不同轮换查询；没有驱逐系统页缓存，**不称作冷盘结果**。当前原型逐路线固定顺序，参考路线读取可能预热后续路线。后续扩容或并发结果必须保留当时负载说明。

固定查询复测的 vec0 表全范围片段如下；同一运行也计时 Rust 和标量参考路线：

| k | Rust 片段 p95 ms | 标量片段 p95 ms | vec0 片段 p50 ms | vec0 片段 p95 ms |
| --- | ---: | ---: | ---: | ---: |
| 25 | 488.09 | 181.53 | 131.55 | 191.95 |
| 100 | 523.08 | 404.38 | 129.17 | 284.32 |

10 范围/20 组 k 的本语料结果均一致；完全同分 fixture 仍失败。vec0 初建 25.83 秒、约 491 行/秒、两表 DB 295,571,456 字节、末尾 WAL=0、初建及首轮查询进程 VmHWM=39,176 KiB。实际运行查询确认 SQLite 3.53.2 / vec_version v0.1.9。全范围 vec0 文献聚合因 4096 限制未测；不能用片段性能代替文献搜索性能。

强筛选不自动意味着 vec0 更快：同一复测中，9 片段的 tag 范围，vec0 p95 约 93–101 ms，Rust 约 31–34 ms；77 片段的 Topic section，vec0 约 88–98 ms，Rust 约 29 ms。本原型没有 library/kind/itemType/section 索引，普通表范围读取及多对多 EXISTS 也有优化空间。

固定查询复测有几个本票 benchmark 同时运行，其中 2k vec0 任务还包含部分建库阶段；机器背景负载未隔离。这些延迟是该负载下的观察，不能作为无争用微基准或据此量化硬件/引擎的纯性能倍数。复现示例逐任务运行。

压力档复制文献的所有片段和向量，并重新分配测试身份；4 个 Topic 保持不复制，不能用扩容结果证明独立文献相关性。

| 文献压力档 | 实际片段数 | float32 净向量 GiB | vec0 两表及预留空间估计 GiB | 状态 |
| --- | ---: | ---: | ---: | --- |
| 2000 | 248,806 | 2.373 | 7.368 | 三条片段路线均已测；本轮 p95 均超过最低要求 |
| 10,000 | 1,239,322 | 11.819 | 35.707 | 未执行：当前原型尚未通过 2k 延迟及稳定身份检查 |
| 25,000 | 3,097,688 | 29.542 | 88.876 | 写入前容量检查拒绝 |

2k 全范围片段固定查询结果如下，单位秒。分别列出两表运行内的参考路线，避免混用不同负载时段：

| 实验表 | k | Rust p50 / p95 | 标量 p50 / p95 | vec0 p50 / p95 |
| --- | ---: | ---: | ---: | ---: |
| 普通表 | 25 | 5.89 / 9.53 | 2.83 / 4.56 | — |
| 普通表 | 100 | 5.79 / 7.89 | 2.73 / 3.01 | — |
| vec0 两表 | 25 | 6.01 / 9.61 | 2.88 / 4.94 | 2.38 / 3.15 |
| vec0 两表 | 100 | 5.87 / 7.31 | 2.88 / 3.24 | 2.44 / 3.71 |

本语料的各路线身份/顺序及容差内距离均一致，但独立同分 fixture 仍失败。本轮并行负载下三路线均超过 p95 2.5 秒最低要求；尚未验证大型文献聚合，也未作优化后独占性能定论。普通表初建 56.46 秒、约 4420 行/秒、DB 3,127,586,816 字节、WAL=0、初建及首轮查询 VmHWM=81,608 KiB。vec0 两表初建 636.75 秒、约 391 行/秒、DB 5,695,565,824 字节（约 5.30 GiB）、末尾 WAL=0、VmHWM=122,640 KiB。末尾 WAL=0 不说明建库期间的 WAL 峰值。真实规模及 2k 的全范围、筛选范围、两种 k、各路线原始统计和初建/复测 RSS 分开保存在同目录 JSON。

25k vec0 实际执行得到 `estimated_required_bytes=95429410816`、`filesystem_free_bytes=64041959424`，无可选实验预算；拒绝发生在创建 DB 前，未写入向量。预留公式是实验避免写满磁盘的保守策略，不是产品资源门禁或实际测得的 DB 大小。

## embedding 硬件参考与质量

四段相同全文，合计 4791 字符、1260 token、2560 维，4 次请求。P4 第一轮墙钟 2.23–2.45 秒；CPU 强制 `num_gpu=0,num_thread=14`，请求 30.80–73.38 秒，其中前三次加载 7.95–37.51 秒，最后一次加载约 3 ms、VRAM=0。这说明当前机器下 CPU 参考有明显加载波动，不给出“CPU p95”或稳定吞吐结论。测后恢复原 GPU 模型分配。

远端在重叠建库负载下四次小批请求为 0.62–1.62 秒；建库结束后同样输入的四次请求为 0.456、0.258、0.314、0.279 秒。两组分开记录，后者只是小样本参考，不声称 p95 或纯显卡性能倍数；网络、Ollama 版本、context 和现有系统负载也有差异。

12 条查询按 6 对中英问题组织，无重叠前 5 文献身份交集为 `[4,5,4,4,3,4]`，重叠为 `[4,5,4,4,2,4]`；同一查询两种切分的前 5 交集为 `[3,4,5,5,3,3,3,3,3,3,4,3]`。这只是结果稳定性，**不是相关性通过**。同文本重新编码的最大逐维差异约 0.00858，说明编码批次/运行浮点变化也可能参与结果变化，不能把全部差异归因于重叠。Agent 抽看发现参考文献列表、表格/标记片段进入高位；部分查询的预想原始论文不在本库，不能将返回近似主题当作正确命中。本轮没有用户确认的金标签，不发布 recall/NDCG，不定案模型、切分大小或重叠量。私有查询/内容审阅只保留于忽略目录。

## 行为检查及缺口

Python 4 项通过：只读一致快照及副本隔离、Unicode/UTF-16 范围与覆盖、embedding 响应数量/维度/数值边界、向量复用要求同来源和实际文本。

在全新忽略目录实际执行复现构建脚本，重新获取固定上游源码、离线编译并运行检查；结果同为 13 通过、1 失败。随后单独 release 构建成功，最终 binary 的两行真实向量查询 smoke 通过，查询数量与文件不一致时在输出前拒绝。Python Ruff、Rustfmt、Markdown/JSON Prettier、Bash 语法及 diff 空白检查通过。该 smoke 只验证最终采样入口，正式性能采用前述固定文件测量，未重复整轮压力测试。

Rust 最终 14 项为 **13 通过、1 失败**，包含显式空 itemRefs 与省略条件的区分；其余检查包括数学/非法向量（有限但极小非零向量不误判为零）、范围交集与多值条件、完整文献分组、来源替换回滚与删除、staging/publish 简化 fixture、扩展新连接注册、vec0 shadow table 回滚/提交/删除/重开、长辅助元数据删除、vec0 未提交事务在进程异常退出后的恢复；同分边界仍失败。异常退出只覆盖一笔未提交 insert，不证明批次完成/发布各边界或掉电持久性。

| 必需证据 | 本轮状态 |
| --- | --- |
| 当前 source owner 同次读取、原文身份/版本及可见性核验 | 待基础搜索生产工程接入；本地副本位置复核不能替代 |
| public maintenance cancel/retry/continue/restart、过期输出拒绝、发布后清理失败 | 未集成；简化 staging/publish fixture 不构成验收 |
| 正常 Repository 业务 reader/writer 并发与争用 | 未测；不以隔离连接数量冒充真实业务 |
| 显式跨库、sourceKinds/sections 数组及更丰富多集合硬范围 | 尚未完整覆盖；原型多数范围只承载单值 |
| 真正冷缓存、全链路查询、完整大规模文献/Topic 聚合 | 未完成 |
| 已确认人工中英/跨语言金标签、重叠相关性对照 | 未完成 |
| 规则升级、生产增量、可核验进度复用及全量重建 | 未集成；仅观察同来源文本复用 |
| sqlite-vec 稳定同分身份 | 已发现失败，阻止宣称候选满足全部契约 |
| 七平台及许可证/包体 | 留 #90 |

## 可复现方法

从仓库根运行，`SOURCE_DATA` 由执行者填入获授权只读来源目录。需要现有共享 uv 环境、已缓存 Cargo 依赖及固定工具链；脚本不安装依赖。所有私有材料只写全新的忽略目录。

```bash
RUN_ROOT=".scaffold/test/issue89-reproduction"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py test
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py extract --source "$SOURCE_DATA" --root "$RUN_ROOT"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py embed --endpoint "$EMBEDDING_ENDPOINT" --root "$RUN_ROOT" --batch 24
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py quality --root "$RUN_ROOT"
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py embed --endpoint "$EMBEDDING_ENDPOINT" --root "$RUN_ROOT" --overlap 120 --batch 24
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py quality --root "$RUN_ROOT" --overlap 120
bash artifacts/vector-retrieval-wayfinder/issue89/build-harness.sh
```

构建脚本在 `.scaffold/test/issue89-repro-build/` 生成 Cargo/build adapter，固定官方 C 源，离线使用缓存 Rust 依赖。新目录独立，不覆盖已有工件；目录存在时用其 Cargo.toml 续跑。当前稳定身份测试会使完整测试命令返回非零，保留诊断后可单独构建实验 binary，不能将这种构建记作测试通过。

```bash
cargo +nightly-2026-07-25 test --offline --manifest-path .scaffold/test/issue89-repro-build/Cargo.toml
cargo +nightly-2026-07-25 build --release --offline --manifest-path .scaffold/test/issue89-repro-build/Cargo.toml
BENCH=".scaffold/test/issue89-repro-build/target/release/issue89-benchmark"
"$BENCH" "$RUN_ROOT/manifest-0.json" "$RUN_ROOT/rust-real.json" 86 30 rust
"$BENCH" "$RUN_ROOT/manifest-0.json" "$RUN_ROOT/vec0-real.json" 86 30 vec0
ISSUE89_SCOPES=fragment:all-only "$BENCH" "$RUN_ROOT/manifest-0.json" "$RUN_ROOT/rust-2000.json" 2000 30 rust
ISSUE89_SCOPES=fragment:all-only "$BENCH" "$RUN_ROOT/manifest-0.json" "$RUN_ROOT/vec0-2000.json" 2000 30 vec0
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py hardware --endpoint "$P4_ENDPOINT" --root "$RUN_ROOT" --label p4
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py hardware --endpoint "$P4_ENDPOINT" --root "$RUN_ROOT" --cpu --label cpu
uv run --project="$HOME/.ar" --locked -- python artifacts/vector-retrieval-wayfinder/issue89/corpus.py hardware --endpoint "$RTX4090_ENDPOINT" --root "$RUN_ROOT" --label 4090
```

已有实验数据库可仅重跑查询，避免把复测时间算入建库：

```bash
"$BENCH" query-existing "$BENCH_DB" "$RUN_ROOT/queries-0.f32" "$RUN_ROOT/requery.json" 2560 12 rust all
```

`BENCH_DB` 指向实验 DB；引擎改用 `vec0` 时须有对应虚拟表，`fragment` 模式仅采样全范围片段。先完成正在运行的任务，再重新构建其可执行文件。

真实文献数必须取当前 corpus-summary，不盲用示例 86。`fragment:` 只测片段，明确不给出大型文献聚合性能；scope 指定是实验 CLI，未新增产品 interface。可选 budget 参数只约束本次实验的写入空间。重新编码前应确认同模型 ID/维度/编码要求；本原型的 byte-count resume 不证明生产有效进度复用，不用于生产索引。
