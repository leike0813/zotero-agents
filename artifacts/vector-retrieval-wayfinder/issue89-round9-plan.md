# #89 第九轮：免建子集图的动态 Flat 候选

用户授权继续测试，baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。新增本计划、`issue89/round9-flat.py`、结果 Markdown／JSON；复用第六轮正式图内的 normalized 向量、SQLite 和 Rust oracle，不重建 HNSW、不重新 embedding、不运行 10k／25k，不改生产代码、schema、依赖、真实库或已有改动，不提交或切换分支。私有工件在全新 `.scaffold/test/issue89-round9-20261005/`。

比较每次请求的三条候选生成路线：SQLite 原始 float32 分批取数、校验和归一化，填入完整子集数组，再创建／add／搜索 IndexFlatIP；从常驻全库 Flat 重建 eligible 子集数组，再创建／add／搜索 IndexFlatIP；直接对常驻全库 Flat 的 eligible 行调用 compute_distance_subset，再按 float32 分数及全局身份排序取候选。前两条请求结束释放临时数组和索引，第三条不复制 eligible 向量。SQL 路线的正式进程不加载全库 Flat，避免把不需要的常驻成本算进去。

全库 Flat 仅从已有 HNSW.storage 导出一次，记录加载、序列化和大小；导出后重载，全部 normalized 坐标与原图及 SQLite 分批归一化结果逐位核验。该工件是隔离加速文件，不是生产 schema、维护 owner 或缓存正确性证明。常驻路线须报告全库 Flat 的约 1GiB 磁盘／加载／内存成本，不把其加载移出查询后宣称动态请求无需准备。

固定候选预算 6400，只验证 all、intersection（46813 行／185 对象）、union_intersection（69198／231）。范围每次重新准备，同一进程内共用冻结只读 transaction 的 metadata 投影，原 SQL／索引 SQL 身份一致。三个路线固定查询和候选数，Flat 与 compute_distance_subset 都是 float32 inner product，不是契约的顺序 float64 余弦；同分截断规则及内核差异需另报，最终候选统一从 SQLite 实际取数重算距离并聚合 Top100，Top25 为前缀。

每路线独立进程串行运行；每范围预热一次，12 查询 × 3 轮，共 324 次正式执行。路线之间没有交替执行，报告匹配查询的差值只能作为非独占主机下的观察，不称因果配对或生产 P95。质量只取每查询第一轮。停止、预算和路由不读 oracle；计时后比较实际候选距离 bits、获胜身份、召回、最佳片段、短结果和范围。重复身份拒绝，候选数不得超过 min(budget,eligible)。

总时间覆盖每请求范围准备、向量物化／校验／归一化、临时 Flat 创建／add、候选评分／选择、范围校验、SQLite 实际重算、聚合和显式释放；分段说明夹带的校验。全库加载、metadata 初始化、预热、oracle 核验另列。全部范围正式计时结束后，每个范围另做一次非计时内存探针，记录请求阶段 RSS；独立进程 VmHWM 包含全局输入、oracle、metadata、分配器保留和探针，不称临时向量的独占峰值。

先写指定行计算、空／单行范围、非法／重复／越界 ID、非有限分数、同分身份和 SQL BLOB 边界的行为自测，观察失败后实现。每进程最多 10 分钟，清理仅限自有进程组；不安装依赖、不启动服务器、不调整缓存和主机负载。最终检查自测、Ruff、Prettier、统计与公开脱敏，并更新交接入口。

独立查询、真实独立文献、动态 basis／来源、增量、maintenance、并发、七平台和生产引擎仍开放。本轮不把冻结 resident matrix 当事实源，不以这组查询的完整覆盖固定生产预算。

能力依据：[Faiss 1.13.2 IndexFlat 实现](https://github.com/facebookresearch/faiss/blob/v1.13.2/faiss/IndexFlat.cpp)。
