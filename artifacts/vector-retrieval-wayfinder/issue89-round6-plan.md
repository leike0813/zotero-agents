# #89 第六轮：HNSW 候选与精确文献聚合对照

用户确认继续 ANN 实验。baseline 为 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。复用冻结的 4B／MRL 1024 向量、12 个查询与第三轮 2k 普通 SQLite 库，不重建语料，不重跑 10k／25k，不改生产代码、schema、依赖、真实库或已有用户改动，不提交或切换分支。

共享 Python 环境已有 faiss-cpu 1.13.2，因此先用其 HNSWFlat 做算法筛查。它不是已选生产引擎，也不构成 Rust、维护生命周期或七平台交付证据。索引保留 float32、使用归一化后的 inner product；ANN 只产生候选，最终距离和排序仍与原 Rust float64 顺序累加、float32 距离及 `(distance, stable id)` 参照比较。候选未覆盖的行不能由重排恢复。

新增本计划、`issue89/round6-oracle.rs`、`issue89/round6-ann.py`、结果 Markdown／JSON。Rust 入口直接包含原 `benchmark.rs`，导出全部查询的逐行精确距离；这些距离仅供质量核验，不以读取已计算分数的时间冒充重排成本。Python 候选重排通过 float64 顺序累计实际重算距离，并逐位核对 Rust 输出。SQLite 候选读取、距离重排及聚合另计时间；范围和 selector 准备成本单列，embedding 不在本轮计时内。

先写行为自测再实现：覆盖精确重排的同分稳定顺序、多片段文献聚合、范围内召回、短结果、显式空过滤和过滤类别内并集／类别间交集。真实 12,646 片段筛查 M=16、efConstruction=100，查询 efSearch=64／256／1024，候选上限为 100／400／1600；增加候选时使用不低于候选数的有效 efSearch。筛查五组 `(候选数, efSearch)`：`(100,64)`、`(100,256)`、`(100,1024)`、`(400,256)`、`(1600,1024)`，报告全部组合，不把同一语料调参后的结果当作独立测试集。若真实集可运行且无越界，2k 248,806 片段沿用同一建图配置，保留 `(100,256)`、`(400,256)`、`(1600,1024)` 三档确认；单个构建／评测进程设 10 分钟上限，不调整主机缓存或负载。

范围包括全范围、库、来源类别、类型、itemRefs、标签、集合、多条件交集、Topic section、空数组和不相交范围。eligible 集合从冻结事实生成，2k 从只读 SQLite 的同一 reader transaction 查询；HNSW 用 IDSelector 在搜索中限制可返回身份，对照全局候选后过滤。两者均按过滤后的完整集合评估，而不只检查返回项合法。单库样本不能证明跨库隔离，另用合成行为自测覆盖类别组合规则。

每查询分别报告片段 Recall@25／100、文献／Topic 聚合 Recall@25／100、exact 最佳片段候选覆盖、返回不足和过滤违规。严格身份召回为主；另报只放宽完全相同 float32 距离边界的 tie-aware 指标，不引入任意距离容差。复制压力集保留原同分向量并记录边界 tie 大小，不按复制身份召回推断真实内容相关性。窄范围的 exact fallback 另列，不掩盖 ANN 原始召回。

计时区分 build、加载／归一化、范围准备、ANN 搜索、SQLite 候选读取＋实际重排＋聚合；正式重复 3 次，轮换查询顺序，先预热。样本中位数及范围用于本轮筛查，不据此宣布生产 P95 达标。记录索引序列化大小、RSS 和匿名／文件 RSS；内存索引中的向量副本是额外加速结构，不等同于 SQLite mmap 文件页。

私有身份、路径、向量、距离矩阵和日志留在新的 `.scaffold/test/issue89-round6-20261005/`。公开工件只保留查询序号和汇总计数。验证使用共享 uv 环境、已有 Rust offline locked adapter、最小行为自测、距离逐位核验、格式及脱敏检查。人工内容金例、真实并发、维护恢复、空间峰值和七平台仍需后续验收。

能力来源：[Faiss 查询参数与 IDSelector](https://github.com/facebookresearch/faiss/wiki/Setting-search-parameters-for-one-query)、[Faiss 索引说明](https://github.com/facebookresearch/faiss/wiki/Faiss-indexes)。实际过滤和版本行为以本机自测与本轮结果为准。
