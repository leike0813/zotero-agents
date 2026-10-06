# Rust 候选评分与精确重排：最终批次计划

2026-10-06；固定源码基线 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。
目标票：[验证 Rust 范围内候选评分与精确重排（有界最终批次）](https://github.com/leike0813/zotero-agents/issues/91)；父票：[选定本地向量引擎与持久化方案](https://github.com/leike0813/zotero-agents/issues/84)。

当前状态：资源预算批准后的有界最终批次已结束，结论为限定推荐。2k／10k八个配置通过；25k构建、替换及备份完成，但oracle准备触及600秒上限，四个查询配置未测。完整证据见[最终结果](issue91-results.md)。以下保留执行前冻结方案及门槛。

## 输入与范围

复用[选型收束结论](vector-engine-selection-conclusion.md)和第八至第十轮证据。本票只验证算法，不承担生产 Repository、来源 owner、maintenance、人工相关性或七平台交付验收。

真实语料为 86 篇文献、4 个 Topic、12646 片段。2k、10k、25k 沿用复制真实向量、分配新身份的压力输入，各为 248806、1239322、3097688 片段；不称为独立真实文献。沿用完整 1024 维 float32 实验向量，不重新 embedding、不截维。

2026-10-06恢复输入采用旧12条查询的代码原文重新编码，加32条按原公开类别、语言和序号重新起草的查询，合并44条并在编码前冻结。32条原文没有找回，旧12向量也不能与已删除文件逐位核对；这是新冻结批次，不是旧第十轮逐位复现。新查询作者只依据公开类别起草，未读取私有语料或逐次检索输出；中英文各16条，保持非互译配对和类别分布。

每份输入只读，核查维度、有限性、非零范数与身份对应。2k的44查询oracle已用原Rust导出程序重算；缺失的更大档oracle可依据同一恢复查询准备，实际生成成本单列。oracle只供计时结束后的质量和数值核验，不参与候选、预算或路由。正式44×3批次仍按既定门槛评估，但不能把新32条的通过当作旧32条的历史回归证明；旧1600预算的已知失败保留，不被新批次覆盖。

所有新增 Cargo 构建目录、临时文件、私有查询、矩阵、数据库副本、oracle、原始输出与 tracker payload 放入 `/mnt/HotData/tmp/issue91-<session>/`。新建目录，拒绝覆盖旧文件。旧实验数据库只读使用；若需副本，写入该目录。不得修改来源真实库或既有未提交改动。

该目录所在 `/mnt/HotData` 是 NFS4 挂载，预检可用约 256 GiB。记录每项输入和工件所处文件系统；网络加载、数据库读取和本机旧 SATA 结果不可直接作受控速度比较。不清 OS 缓存，不称真正冷盘。

### 当前输入盘点

scout 子代理 Turing 只读盘点后，主代理复核以下三个文件存在、字节数和 SQLite 文件头；尚未运行完整数据库 integrity check，不能仅据大小称为数据完整性通过。

| 压力档 | 现存只读文件 | 逻辑字节数 |
| --- | --- | ---: |
| 2k | `/mnt/HotData/tmp/issue89-round3-qrbctjv3/issue89-run-1791136634103922860/rust.sqlite` | 1214525440 |
| 10k | `/mnt/HotData/tmp/issue89-round3-qrbctjv3/issue89-run-1791137172340591976/rust.sqlite` | 6059716608 |
| 25k | `/mnt/HotData/tmp/issue89-round3-qrbctjv3/issue89-run-1791139967598740899/rust.sqlite` | 15168462848 |

重建前，对当前工作区 `.scaffold/test/`、常规 checkout `/home/joshua/Workspace/Code/JavaScript/zotero-agents/.scaffold/test/` 及旧报告涉及的实验目录核查，未找到旧 12 条 1024 维查询向量、新 32 条 `queries.f32`／`queries-private.json`、两套 2k `distances.f32`、第九轮 Flat 文件和已编译 oracle。主代理另复核 `/home/joshua/Git/JavaScript/zotero-agents.git/.scaffold/test/` 当前不存在。用户随后说明可能因磁盘不足已清理，并授权重建及迁移旧数据；本次没有恢复旧32条原文。

三份现存 `query-<scale>-private.json` 是第三轮结果报告：主代理确认顶层包含 `query_count`、`results` 等字段，不包含冻结查询向量或 query manifest，不能用于恢复44条输入。历史评论的“九项输入均存在”是2026-10-05的记录，不代表当前仍可读取。

恢复工件统一位于 `/mnt/HotData/tmp/issue91-20261006T032556Z/rebuild/`：`query-freeze-private.json`、`queries-44.f32`、`queries-old12-reencoded.f32`、`queries-new32-replacement.f32`、`normalized-2k-flat.faiss`、`oracle-2k-44.f32`和离线重编译的oracle。文档向量直接从旧数据库复用，没有重新请求文档embedding。恢复检查与迁移记录见[输入重建与数据迁移](issue91-recovery.md)。用户现已批准资源上限。

## 冻结实现

- 使用现有 `nightly-2026-07-25`、缓存 `rusqlite = 0.40.1` 的 bundled SQLite、现有 `serde_json`，离线构建；不引入 crate、sqlite-vec、Faiss 生产依赖或平台服务。
- 独立 Rust CLI，复用 `issue89/benchmark.rs` 的向量校验、`QueryPlan`、顺序 float64 余弦、稳定 `(distance, fragment identity)` 排序及对象聚合。复用只属于实验模块；生产 API 和源码不修改。
- 连续 normalized float32 矩阵常驻；逐行从只读 SQLite 读取有效向量，以顺序 float64 L2 归一化再转 float32，并流式保存可重建文件。加载和构造单列。矩阵不替代原始有效向量。
- 候选评分使用 Rust 标准库、单线程的八路 float32 累加内积及固定尾部处理，允许编译器优化；不使用 fast-math、手写平台 SIMD、外部 BLAS 或运行中选择内核。此分数只决定候选，不承担精确余弦契约。
- 每请求重新准备 eligible：沿用第七至第十轮 metadata 标量投影及 SQLite membership index，类内并集、类间交集；与原始 `EXISTS` SQL 和索引 SQL 的身份结果核对。冻结投影仅用于隔离实验，不能作为生产动态 basis 验收。
- eligible ≤4096 时完整取数重算；更宽范围直接评分 eligible 指定行，按分数降序、稳定片段身份升序截取 `min(6400, eligible)`。使用标准库选择和排序，避免完整向量子集复制；不使用 oracle 或结果稳定性提前停止。
- 从 SQLite 实际取回候选原始向量，复用顺序 float64 dot/norm，最后转 float32；每个对象取稳定最佳片段，再按既有片段身份排序取对象 Top100，Top25 为前缀。实际取数、范围核验、重算、聚合和临时缓冲释放均在计时内。

6400 与 4096 是本次冻结验证参数，不能因本批成功自动成为生产默认或任意语料的保证。预算不足、数值反例、对象过度集中均如实记录。

## 预先约定的判定

既有用户决议见[执行前核查进度](https://github.com/leike0813/zotero-agents/issues/91#issuecomment-5994129914)：新增配置对象 Recall@25/100、最佳片段覆盖分别宏平均 ≥99%、最差查询 ≥95%；既有完整覆盖配置保持 100%。均按严格身份，质量只统计第一轮，不用 tie-aware 替代。不把算法 oracle 覆盖称为人工相关性。

硬范围违规为零；每次实际精确重排距离 bits、候选内获胜片段及顺序与参照一致。空范围、跨库、多对多、同分、多片段对象、非法向量和已有小预算遗漏反例保留。

每档固定四个范围：全范围、既有 intersection、既有 union_intersection、第六轮 topic_section。两个组合范围的 anchor 从原始 12646 片段按既有规则取得，不以查询或 oracle 挑选；Topic section 在三档保持同一规则。共 12 配置。

每配置独立进程：记录矩阵加载、metadata 初始化、首次进程请求；首次请求为额外诊断，随后另预热一次，再完成 44 查询 ×3 轮。正式样本共132，P95 为升序第126项，最低线2.5秒、目标1秒。不混合规模或范围，不删除异常、不将未完成配置计算为合格P95。离线核验和查询embedding不计入检索时间，成本另列。

每配置进程最多10分钟；准备阶段也记录独立耗时及超时。完成首档四个配置后审查正确性、质量、延迟和资源；失败则停止扩大规模。更大档出现失败，记录限定推荐或负面结论，不自动调参继续。最多一次针对明确实现缺陷的定向修正，仅重测受影响配置，修正前证据保留。

## 已批准资源上限

用户批准查询进程峰值16 GiB、构建／替换峰值32 GiB、三档工件磁盘总上限128 GiB，包含正式数据、staging、保留一份备份、矩阵、oracle、日志和构建输出。旧输入中本票保留使用的数据库也纳入成本，不通过原位置与复制位置分开计账绕过预算。每次扩大规模同时核对本机实际可用内存，无法准备时保留未完成证据。

内存使用进程 RSS/VmHWM 与必要阶段观测；查询进程包含矩阵、metadata、评分／重排临时缓冲及SQLite缓存，oracle核验的额外开销清楚标记。构建／替换测量同时保留旧矩阵、流式生成新矩阵的峰值；磁盘记录旧正式数据、新staging与一份保留备份的实际共存成本。隔离文件替换不算生产原子发布验收。

若预算不足以准备某档，停止并报告未完成；不得静默缩小维度、清理用户工件、增加预算或将估算当作实测峰值。

## 文件与最小验证

新增文件限定为本计划、`issue91.rs`（隔离CLI及行为检查）、必要时一个薄的 `issue91-run.py`（超时、资源观察和脱敏汇总）、`issue91-results.md/json`。已有十轮代码和报告不改写；没有生产文件修改、提交或分支切换。

测试边界沿用票中已明确的隔离检索行为和CLI输出：先以同分／对象多片段和范围反例写失败检查，再实现对应行为；复用已有数值oracle和范围用例，不添加生产API或静态文案测试。正式矩阵是性能和质量验证，不用逐函数测试重复它。

运行最小 Rust 行为检查、离线release构建、rustfmt，以及薄runner所需的Python自检、Ruff和公开Markdown/JSON格式、脱敏及汇总一致性检查。Python按共享uv锁定环境运行，临时目录和字节码亦指定到本票HotData目录。

结束输出完整推荐、限定范围／规模推荐、淘汰或证据不足之一；保存固定命令、工具链、逐配置样本和失败诊断，再按wayfinder发表resolution、结票并更新地图索引。已批准的运行上限不因结果而提高，当前领取不等于完成。
