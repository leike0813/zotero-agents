# #89 第八轮：过滤图与 eligible 子集搜索

用户授权继续测试，baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。复用第六轮正式全局 HNSW、冻结 SQLite 和 Rust oracle；第七轮的两个非空过滤失败是固定对照，不重新运行 10k／25k，不改生产代码、schema、依赖、真实库或已有改动，不提交或切换分支。

新增本计划、`issue89/round8-subset.py`、结果 Markdown／JSON。复用 `round7-adaptive.py` 的范围、分批重算及聚合，复用第六轮指标。私有文件进入全新 `.scaffold/test/issue89-round8-20261005/`，公开文件仅含计数、查询序号和统计。

三个可检验判断：若全局图在过滤后导航不足，范围内图会在相同候选预算改善召回；若片段截断仍挤占对象，范围内图也需增大预算，且 FlatIP 候选也会不完整；若 float32 排序或复制同分身份影响结果，strict 与完全同分边界可互换的指标会分离。FlatIP 的精确是其 float32 inner product，不是 Rust 顺序 float64 余弦参照。

只跑 2k 压力集 intersection（46813 行／185 对象）和 union_intersection（69198／231）。范围条件用限定原始前缀的 anchor，原 SQL、索引 SQL 和冻结 metadata 投影必须身份一致；metadata 与所有读取保持同一只读 transaction。每次正式计时重新准备 eligible，不能把结果缓存当范围准备收益。

两个子集串行取数并建图，M16、efConstruction100、seed89、单线程，与原图配置一致。局部插入顺序为 eligible 全局身份升序，local ID 映射回 global ID；不同图大小与编号导致 topology 改变，结论仅比较两种实际策略，不能把收益全部归因于 selector。全部归一化坐标与原图保存向量逐位核对。范围图的 IndexFlatIP storage 作为第三路线，不额外复制一个 Flat 索引。

三路线都用固定 400／1600／6400／16384 候选，efSearch 至少等于候选数。参数不根据 oracle 调整；每预算独立检索，不累计，不使用稳定／数量停止条件。候选从 SQLite 分批实际重算距离，聚合完整 Top100 后以其前缀报告 Top25。oracle 在计时后验证候选分数 bits、聚合身份、片段／对象召回、tie-aware 召回、最佳证据、短结果和硬范围违规。

正式运行结束后，另用 Rust oracle 的精确片段 Top-budget 聚合，作为不含图误差及 float32 排序误差的截断对照。该控制只做离线质量评估，没有查询时间，不给算法或停止条件提供信息。

各配置预热一次，12 查询 × 3 轮，三路线轮换执行次序，质量只取每查询第一轮；正式时间包含 scope 准备、搜索、取数、实际重算和对象聚合。取数／归一化／建图／序列化／重载验证／mapping 大小及 RSS／峰值另记，磁盘图只保存在私有工件；不把预建子集的查询延迟当动态请求延迟。只有质量不同的路线不能用摊销次数论证等价收益。

先写 mapping 越界、重复身份、局部到全局、空候选、范围隔离与重算行为检查，观察失败后实现。每个正式进程最多 10 分钟，超时清理其自有进程组；不调整系统缓存或负载，不启动服务器，不新增依赖。最终核验自测、Ruff、Prettier、脱敏及统计。冻结子集建图不解决任意组合数量、动态 basis、更新、维护和生产生命周期；本轮不是 Rust 引擎或生产验收。

能力依据：[Faiss 索引说明](https://github.com/facebookresearch/faiss/wiki/Faiss-indexes)、[固定版本 HNSW 参数定义](https://github.com/facebookresearch/faiss/blob/v1.13.2/faiss/impl/HNSW.h)。
