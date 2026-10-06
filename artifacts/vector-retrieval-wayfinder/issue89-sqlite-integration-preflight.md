# Issue #89 SQLite integration preflight

核查日期：2026-10-04。范围仅限本机 Rust/SQLite 依赖、扩展缓存、可隔离基准入口，以及官方 sqlite-vec v0.1.9 的能力边界。没有访问语料或 `.env`，没有改 Cargo/源码、安装依赖、构建或运行 sidecar。

## 结论

- **现在就能作为候选运行的底座**：Rust Synthesis workspace 已锁定 `rusqlite = 0.40.1`、`libsqlite3-sys = 0.38.1`，启用 `bundled`；该 crate 缓存携带 SQLite 3.53.2 源码。基于现有连接做“向量 BLOB + Rust 精确余弦扫描”的基准不需要新增 SQLite crate 或系统 SQLite。
- **现在没有可直接运行的 sqlite-vec 集成**：检查的 Cargo registry source/cache、Python pip/local module 与本机扩展路径均未发现 sqlite-vec v0.1.9、C 扩展或 `sqlite_vec` Python 模块。`sqlite-vec` 不在 workspace lockfile。Python 标准库 `sqlite3` 即使可用，也不是项目 bundled SQLite，不能作为共享 SQLite 集成证据。
- **最小隔离入口建议**：临时 harness 放在 `.scaffold/test/issue89` 独立 Cargo 项目，复用缓存的 `rusqlite 0.40.1`/bundled SQLite，获取并固定官方 v0.1.9 C 源码后，编入同一个 benchmark binary，再用隔离临时数据库验证该连接上的 vec0。生产 Cargo 与 schema 均不改。仍须核实链接确实复用唯一 SQLite 符号集；不能以 Python 扩展加载或系统 `sqlite3` 结果代替。
- **最省变更的依赖路径**：在仓库外临时 Cargo harness 中精确复用 sidecar 的 `rusqlite = 0.40.1` 与 `libsqlite3-sys = 0.38.1`，再将固定 tag 的 `sqlite-vec.c/.h` 编入同一 Rust binary。官方 v0.1.9 Rust binding 本身是轻薄包装：build.rs 用 `cc` 编译 C 文件并定义 `SQLITE_CORE`，crate 提供 C 初始化符号；可将其构建逻辑作为临时 harness 参考。sidecar lock 已包含 `cc` 的传递依赖与其源码缓存（版本须以本地 lock/source 核对），rusqlite 及 SQLite 源也已缓存。临时 crate 可使用独立 manifest/lock 与 `$CARGO_HOME` 缓存，**不会修改主 workspace Cargo 文件**；但 Cargo 仍需执行本地原生构建，且临时包是否按离线方式完全解析须实际验证。
- **直接 pin C 源比下载 sqlite-vec crate 更适合 #89**：从官方 v0.1.9 tag 固定 `sqlite-vec.c`、`sqlite-vec.h` 和配套 SQLite extension header，记录 tag commit/hash；通过 `cc` 编入临时 Rust harness，并确认扩展注册到 rusqlite connection。优点是来源/版本和 C/Rust ABI 明确、避免增加生产 Cargo 依赖；代价是 benchmark 工件要自行保存源码与许可证、构建 glue，并核实传入的 `SQLITE_CORE`/SQLite header 确与 0.38.1 bundled symbols 配套。
- **Rust crate 路径适合检验 upstream 推荐接法，但不一定更隔离**：下载/缓存 `sqlite-vec 0.1.9` crate 会通过它自己的 build.rs 编译上游 C，仍要在 harness 里声明它和匹配 rusqlite；主 workspace 不变，但 crate 下载会修改用户级 Cargo 缓存并需网络/缓存写权限。官方 crate 使用的 dev dependency 是 `rusqlite 0.31.0`，不能直接照抄其测试配置；验证 binary 必须由项目锁定的 `rusqlite 0.40.1` 打开连接，避免把“能自测”误认为共享 SQLite。
- **需要事先批准的动作**：下载 v0.1.9 源或 crate 到本机、执行 Cargo/C 编译，以及创建仓库外临时 harness（若要落盘）。目前授权是验证准备，但用户明示本轮不得构建/安装，所以报告只给出方案、未执行这些动作。若选择用 `cc` crate，应先确认确切缓存版本与可离线解析能力；若不想下载 crates，可单独用系统 C compiler 编译固定 C 源到临时对象，但这会更难保证编译器、SQLite header 和 Rust 链接参数一致，建议只作次选。
- 生产接入、数据库 schema、发布构建/许可证闭环及七平台验证属于后续授权范围；本报告不展开七平台工作（归 #90）。

## 项目本地证据

| 事实 | 来源 |
|---|---|
| workspace 精确锁定 rusqlite 0.40.1，`default-features = false`，仅声明 `bundled`、`backup` | [`rust/synthesis-sidecar/Cargo.toml`](../../rust/synthesis-sidecar/Cargo.toml) |
| lockfile 固定 rusqlite 0.40.1 与 libsqlite3-sys 0.38.1；lock 中没有 sqlite-vec | [`rust/synthesis-sidecar/Cargo.lock`](../../rust/synthesis-sidecar/Cargo.lock) |
| registry 中 libsqlite3-sys 0.38.1 自带 `sqlite3.c/.h`，头文件定义 SQLite 3.53.2 | 本机 `$HOME/.cargo/registry/src/index.crates.io-*/libsqlite3-sys-0.38.1/sqlite3/sqlite3.h`（版本宏）；这是 crate 源码版本事实，不代表当前进程已编译该 crate |
| Repository 用 rusqlite 打开数据库，配置 WAL、`synchronous=NORMAL`、外键和 250ms busy timeout，并封装事务 | [`synthesis-repository/src/lib.rs`](../../rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs)（`Repository::open`、`open_database`、`transaction`） |
| production Repository 有真实路径与身份校验，不能拿 production open 路径当 benchmark fixture | 同上；测试已有 `Repository::open` 临时目录用例可供隔离方式参考 |
| sqlite-vec crate、C 扩展文件及 Python `sqlite_vec` 导入均未发现 | 只读检查 Cargo registry source/cache 与本地 Python 环境；`uv run --project="$HOME/.ar" --locked -- python -c 'import importlib.util; print(importlib.util.find_spec("sqlite_vec") is not None)'` 输出 `False` |
| 共享 uv Python 3.12.3 环境有 SQLite 3.45.1、NumPy、PyTorch、Transformers、sentence-transformers；未安装 sqlite_vec | 主会话提供的本机环境核查结果。本机 SQLite 3.45.1 与项目 bundled SQLite 3.53.2 不同；不能用 Python extension probe 证明 Rust 生产连接集成 |
| 本机 Ollama 0.34.1 可加载 `qwen3-embedding:4b`，维度 2560；无 Hugging Face embedding cache | 主会话提供的本机环境核查结果。#89 engine/storage benchmark 可直接使用已准备的向量输入，不需要将模型下载或 embedding 推理纳入本轮；端到端生成时间与模型 cache 不属于本票引擎对比 |

仓库中另有向量选型研究：[选型输入](./vector-engine-selection-inputs.md)、[引擎可行性](./vector-engine-feasibility.md)和[已确认决议](./vector-engine-selection-decisions.md)。本预检补充本机缓存与 v0.1.9 tag 源码事实，不替代这些文档记录的语料级质量/性能验证。

## v0.1.9 官方能力与限制

来源均固定到官方 `v0.1.9` tag，避免把浮动文档的后续能力算入本次结论。

- [KNN 文档](https://github.com/asg017/sqlite-vec/blob/v0.1.9/site/features/knn.md)明确提供两种精确路径：vec0 虚拟表 KNN，以及普通表存储向量、用 `vec_distance_cosine()` + `ORDER BY` 的 brute-force 扫描。vec0 列可设置 `distance_metric=cosine`。这使两路算法有机会共享输入向量、同一 SQLite 文件和事务，但数值实现/排序并未在本机作等价性测量。
- [vec0 文档](https://github.com/asg017/sqlite-vec/blob/v0.1.9/site/features/vec0.md)确认 KNN 可对声明的 metadata 列执行硬约束预筛选；可用类型为 TEXT/INTEGER/FLOAT/BOOLEAN，最多 16 列，支持 `= != > >= < <=`。Boolean 仅支持 `= !=`。文档警告 `IS NULL`、`LIKE`、`GLOB`、`REGEXP`、标量函数等会报错或产生错误结果，不能把任意 SQL 谓词当成安全 prefilter。
- Partition key 只适用于等值约束，最多 4 列；组合分区可能过度分片，官方建议每个唯一分区值通常有数百向量。它不直接表达任意范围、集合成员、多对多标签或复杂 join 条件。Auxiliary 列不能参与 KNN 的 `WHERE`。因此 vec0 对库/来源等简单键可能有效，但 issue #89 所需复杂硬范围必须逐谓词核实。不能先取全局 top-k 再过滤并称其为范围内 top-k。
- [v0.1.9 C 源码](https://github.com/asg017/sqlite-vec/blob/v0.1.9/sqlite-vec.c)中 vec0 module 提供 `xUpdate`、`xBegin`、`xSync`、`xCommit`、`xRollback`；源码层面具备 SQLite virtual table 写事务回调，支持在同一连接事务中测试插入/更新/删除及回滚。文档未把这等同于本项目 SQLite 构建下已证明 crash atomicity；必须用同一连接、显式 rollback、关闭重开及故障注入验证 shadow tables 的状态。
- 同一 C 源中 vec0 写入路径包括 insert/delete/update。v0.1.9 release notes 修复了长 metadata 删除错误；这提示 metadata 较长时必须把 delete/replace 纳入测试，不能仅验证短 ID。
- 官方安装说明称项目由单个 `sqlite-vec.c` 与 `sqlite-vec.h` 构成，可编译或静态链接；官方 Rust 示例通过 `sqlite3_auto_extension` 注册 `sqlite3_vec_init`。这些说明了可行接入方向，不证明 Rust binding 会链接到本仓库 bundled SQLite，也不证明不会引入第二份 SQLite 符号。
- 项目标注 pre-v1。v0.1.9 的 API、限制和修复必须随 benchmark 固定版本记录；不以 main/latest 文档替代。

主要官方来源：[v0.1.9 KNN](https://github.com/asg017/sqlite-vec/blob/v0.1.9/site/features/knn.md)、[v0.1.9 vec0](https://github.com/asg017/sqlite-vec/blob/v0.1.9/site/features/vec0.md)、[v0.1.9 C 源码](https://github.com/asg017/sqlite-vec/blob/v0.1.9/sqlite-vec.c)、[安装/静态编译说明](https://github.com/asg017/sqlite-vec/blob/v0.1.9/site/getting-started/installation.md)、[v0.1.9 Rust binding 源码](https://github.com/asg017/sqlite-vec/tree/v0.1.9/bindings/rust)。

## 最小 benchmark 形状

建议由 `.scaffold/test/issue89` 下的独立临时 Cargo benchmark、同一个 rusqlite 连接、同一隔离临时数据库和同一组确定性 float32 向量比较：

1. baseline 表保存向量 BLOB 与最小行 ID/范围元数据；先用 SQL 选择满足全部硬范围的行，再由 Rust 计算完整候选集余弦距离并稳定排序 `(distance, stable_id)`，最后取 k。这是 exact filtered top-k 的参照实现。
2. vec0 表存相同向量和能映射到 vec0 原生 metadata/partition 的范围字段；只将官方支持的 predicate 放入 vec0 KNN 查询。复杂 join、标签集合、排除列表等需先生成完整 eligible ID 集，并验证 vec0 查询确实只在该集合中排名；若只能 postfilter，则记录语义不等价，不和 exact top-k 作性能胜负比较。
3. 对同一查询向量，检查全量/严格过滤结果 ID、余弦距离、k 边界、eligible 少于/等于/多于 k、零向量/维度错误与稳定 tie-break。性能采样分开记录建表/导入、预热、查询 p50/p95、峰值 RSS、数据库字节数。
4. 在同一临时 DB 验证显式事务写入后回滚、提交、关闭重开、单行更新/删除、批量 source replace 中途失败及长 metadata 删除；检查 shadow table 与 canonical 行一致。只跑隔离 fixture，不连真实 profile/生产库。

此形状验证 SQLite/扩展接合面，不代表 retrieval production 行为：不包含真实 25k 文献的实际片段分布、完整 source eligibility、embedding 模型质量、文献级聚合/RRF、sidecar 并发争用、完整 rebuild/restart 生命周期、七平台构建或发布体积。LiSongTao 金例库不是本预检输入；后续语料 benchmark 应另行按既定只读复制和脱敏约束执行。

## 与 #88 的生产契约关系

主会话确认 #88 仍开放，固定 HEAD `84b3028...` 尚未接入新 `searchEvidence` 生产契约。因此 #89 可以形成 engine/storage 证据：相同输入向量下的精确距离、范围内候选与 vec0 结果、事务/回滚/重开、隔离 DB 的延迟与资源。生产 owner 同次核验、当前 Host 硬范围完整投影、SearchEvidence DTO/operation 的 basis 绑定及 production query path 验收必须保留为待 #88 接入后的工作；benchmark 通过不证明生产 owner 核验，也不应改变生产选择。

## 待验证，不能从源码直接推定

- C 编译和 `sqlite3_vec_init` 的 Rust ABI/符号最终绑定至 rusqlite 的 bundled SQLite；auto-extension 是否安全覆盖所有新连接；是否意外出现第二 SQLite 实例。
- v0.1.9 vec0 对各硬范围谓词的候选集合精确性、join/多对多筛选写法及过滤后 top-k 完整性。
- SQLite 3.53.2 下 v0.1.9 的实际兼容、cosine 数值/排序与 Rust reference 的边界差异。
- 事务 rollback、进程异常退出恢复、WAL/checkpoint、备份/恢复对 vec0 shadow tables 的一致性。
- 性能、内存、数据库/二进制尺寸、compile time、target C toolchain，以及七个发布平台的构建可行性。

在获得源码及 benchmark 构建依赖授权之前，当前能安全确认的是 exact Rust+bundled SQLite 路径具备现成依赖；sqlite-vec v0.1.9 仅有上游能力证据，没有本机可运行集成。
