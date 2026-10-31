# 本地向量引擎选型输入

本文件为[本地向量引擎与持久化方案](https://github.com/leike0813/zotero-agents/issues/84)的讨论输入，尚无引擎定案。核查日期：2026-10-04。用户明确要求提前讨论；查询票及其基础工程的开放依赖仍保留。

## 已确认的选型条件

- [规模与验收](https://github.com/leike0813/zotero-agents/issues/77#issuecomment-5977325643)：25k 文献密集全文场景，实际文本、片段/向量数及维度分别测量。本地索引就绪且查询向量已生成时，参考查询 p95 1 秒目标、2.5 秒最低要求；内存/磁盘预算及相关性阈值仍按既定测量方法确认。
- [查询契约记录](./query-contract-decisions.md)：三类结果、当前 Host 硬范围、来源可见性、文献聚合后融合、RRF、basis-bound 分页及证据同次核验。引擎必须满足这些语义，不能用全库 top-k 后过滤代替范围内搜索。
- [生命周期结论](https://github.com/leike0813/zotero-agents/issues/82#issuecomment-5980714524)：增量按来源整组发布；整体重建及发布前失败/取消关闭语义，完整发布恢复；保留有效构建工作，发布后清理/候选独立恢复；不自动重启执行。
- [所有权结论](https://github.com/leike0813/zotero-agents/issues/80#issuecomment-5977462482)：Retrieval Application 位于现有 Rust runtime，复用 Repository；Zotero/canonical Topic 保持原始事实 owner。

## Repository 只读核查

原生子代理 Averroes，模型 `gpt-6-luna`，检查 6 个关键 Rust 生产文件；没有修改文件、安装依赖或执行服务。

| 当前代码事实 | 本地依据 |
|---|---|
| Repository 持有明确传入的 synthesis.db 连接；CanonicalStore 为分开的 owner | [Repository lib.rs](../../rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:405)、[runtime_service.rs](../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:258) |
| 生产 RepositoryPort 使用最多 4 条只读连接，with_reader 开启短读事务；唯一 writer 经锁访问，事务由实际 Repository 方法持有 | [ports.rs](../../rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:342)、[reader](../../rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:459)、[writer](../../rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs:474) |
| Repository writer 配置 WAL、synchronous=NORMAL、外键及 250ms busy timeout；提供 online backup 和迁移前备份 | [连接配置](../../rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:1281)、[backup](../../rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:2533)、[migration](../../rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:736) |
| runtime_service 持有 admission/drain/storage close 的生产生命周期；未排空任务时不显式关闭仍可能被引用的 storage | [runtime_service cleanup](../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:428)、[storage close](../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:559) |
| graph 派生持久化经 RepositoryPort；public maintenance 的 admission/dispatch/events 仍由独立既有生命周期 owner 持有 | [graph persistence](../../rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs:14)、[maintenance owner](../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:263) |
| 初始化回滚会处理主 DB/WAL/SHM，legacy 迁移使用临时数据库；检查范围中没有确认通用 checkpoint 或备份按龄清理策略 | [初始化回滚](../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:78)、[legacy migration](../../rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs:765) |

推论：同库向量行有机会复用现有事务和备份路径；独立数据库或索引文件需要明确跨文件发布、恢复和备份规则。以上不是现有代码已实现向量的声明，也不能推定所有派生资产都应进入同一个文件。存储位置、长查询占用 reader、唯一 writer 竞争和 WAL 规模仍待选型测量。

## 一手引擎证据复核

- sqlite-vec 提供 vec0 及普通表标量距离扫描两条 KNN 路径；普通表路线允许调用方组合范围，vec0 元数据筛选有明确操作限制，auxiliary 字段不能参与 KNN WHERE。复杂多对多标签/集合及显式 itemRefs 的实际执行方式仍需验证。[KNN 文档](https://alexgarcia.xyz/sqlite-vec/features/knn.html)、[vec0 文档](https://alexgarcia.xyz/sqlite-vec/features/vec0.html)。
- sqlite-vec 官方仍标注 pre-v1。GitHub release 查询当前稳定发布为 v0.1.9，文档页面标注 v0.1.10-alpha.4；不能将当前文档能力自动当作 v0.1.9 已验证行为。[官方仓库](https://github.com/asg017/sqlite-vec)、[v0.1.9 发布](https://github.com/asg017/sqlite-vec/releases/tag/v0.1.9)。按 [Q3](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-5980898310) 固定 v0.1.9 作为首轮验证版本，尚未选定生产依赖。
- 官方 Rust 文档提供 bundled rusqlite 配合 sqlite-vec crate 的静态编译及 auto-extension 注册示例；已有集成路径可作为验证起点，但未验证本项目 rusqlite/SQLite 版本及七平台。v0.1.9 发布修复 vec0 长文本 metadata 的 DELETE 错误，来源退出/替换应在实际固定版本验证。[Rust 集成](https://alexgarcia.xyz/sqlite-vec/rust.html)、[修复发布](https://github.com/asg017/sqlite-vec/releases/tag/v0.1.9)。
- 已复核 v0.1.9 tag 下 API reference，float32 每维 4 字节，提供 cosine/L2 距离及 L2 normalization。其支持的表示还包括 int8/bit；首轮表示与距离已由 Q4 确认为未量化 float32 和余弦，最终默认距离仍待质量实测确认。[固定版本 API 源](https://github.com/asg017/sqlite-vec/blob/v0.1.9/site/api-reference.md)。
- Qwen3-Embedding-0.6B 官方模型卡示例使用 cosine similarity，直接 Transformers 示例先 L2 normalize 再点积。这是一个参考模型的适用依据，不能推广成任意用户模型均有相同质量要求。[官方模型卡](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)。
- hnsw_rs 文档版本 0.3.4，提供近似搜索、search_filter、构建/搜索宽度及 dump/reload。Hnsw 文档注明 parallel insertion 与 parallel searching 不能同时进行，dump 分为 graph/data 两个文件；这需要纳入增量期间可用性和持久化验证，不能仅凭纯 Rust 就认定容易集成。[crate](https://docs.rs/hnsw_rs/0.3.4/hnsw_rs/)、[Hnsw API](https://docs.rs/hnsw_rs/0.3.4/hnsw_rs/hnsw/struct.Hnsw.html)。
- LanceDB 文档区分 prefilter/postfilter，默认 prefilter；postfilter 可能少于 limit 或零结果。当前文档支持不能替代项目所选 Rust 版本、七平台及持久化实测。[官方过滤文档](https://docs.lancedb.com/search/filtering/)。
- SQLite WAL 支持读写并行但只有一个 writer，长读事务可能阻止 checkpoint 前进；多个 ATTACH 数据库不保证整体原子提交。复用 SQLite 仍须测量检索和现有业务互相影响。[SQLite WAL](https://www.sqlite.org/wal.html)。

先前完整比较见[引擎可行性研究](./vector-engine-feasibility.md)。本次仅复核官方文档和生产存储事实，没有测得查询延迟、召回、增量吞吐、内存、磁盘、七平台构建或包体增量。

## 待确认

- 精确基准及允许近似的取舍已按[Q1 定案](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-5980799313)确认；实际候选与召回损失仍需以相同片段语料、范围及结果聚合定义测量。
- 向量及关联派生记录按[Q2 同库优先方案](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-5980849632)存入现有 synthesis.db，由 Repository 管理；额外加速结构是否必要及其事务/恢复安排仍待确定，主库/备份规模与业务争用需要实测。
- Q3 已确定 Rust+SQLite 精确基准与 sqlite-vec v0.1.9 的首轮比较，已建立[契约/性能验证](https://github.com/leike0813/zotero-agents/issues/89)及[静态集成/交付验证](https://github.com/leike0813/zotero-agents/issues/90)子票。[Q4](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-5980936439) 将首轮条件固定为未量化 float32、完整配置维度和一致的余弦计算，最终默认距离仍待质量实测确认。切分原则及变更策略按 Q6/Q7 定案，实际参数待验证；缺少项目证据时选型票保持开放，不凭估算关闭。

- [Q5](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-5980983992) 确认分批保存向量及完成记录、完整就绪后短事务整体发布，普通增量按来源整组替换，发布后清理失败不撤销成功。构建标识为 Repository 内部实现；实际事务、取消及恢复行为仍待两张验证票取证。

- [Q6](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-5981056562) 确认按来源结构切分、模型能力约束输入长度并保留原文范围；实际片段大小及无/少量重叠的取舍由质量和规模实测确认。两条引擎路线使用完全相同的切分结果，不增加公共搜索参数。

- [Q7](https://github.com/leike0813/zotero-agents/issues/84#issuecomment-5981076877) 确认索引记录并沿用建库切分规则，规则升级通过现有 Home 重建入口整体生效；实际编码文本及模型/维度/编码要求未变的同来源片段可复用向量并重建定位分组。不能支持旧规则时暂停增强、提示显式重建，不自动扫描或编码。

本文不授权修改生产 schema、Cargo、依赖、打包或部署。
