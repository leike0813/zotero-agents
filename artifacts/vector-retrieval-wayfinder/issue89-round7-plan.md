# #89 第七轮：范围准备、候选扩展与有界精确回退

用户确认继续试验。本轮 baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`，复用第六轮正式保存的 HNSW 图和 Rust 距离矩阵、4B／MRL 1024／12 查询、小语料 12,646 行和 2k 248,806 行。新增本计划、`issue89/round7-adaptive.py`、结果 Markdown／JSON；不重新建图，不重跑 10k／25k，不改生产代码、schema、依赖、真实库或用户既有改动，不提交或切换分支。

要检验三个判断：范围准备的全表读取／逐行 EXISTS 可以通过已有 membership index 和轻量事实投影减少；逐步增加片段候选能改善对象聚合，但“凑够 k 对象”或“连续三个预算快照排名稳定”不能证明没有漏项；排除已发现对象再搜索能减少片段候选挤占，但可能遗漏已发现对象更好的片段，也仍受过滤召回影响。

范围准备先配对比较原 `round6-ann.py` 的 SQL 与 membership `id IN (SELECT row_id ... value IN ...)` 改写，仅用现有索引。另在同一冻结 reader transaction 读取 id、document、library、kind、type、section 的 int64 投影，不复制正文／向量；标量条件用数组，成员关系仍从 SQLite 现有 value index 查询。准备成本与额外内存单列，逐项与原 SQL identity 集合比较。投影只属于冻结实验输入；本轮不证明动态来源、basis 变更或持久缓存正确性，不将它升格为生产 SSOT。

复用第六轮精确距离函数、聚合指标与逐位参照。候选距离从数据库实际重算，每批最多 128 个 BLOB，避免大候选集产生整批浮点临时数组。算法及停止条件不接收 oracle；运行结束后才比较距离 bits、Recall@25／100、最佳片段覆盖、短结果及违规。完整精确回退以 eligible 全集为输入，不从 oracle 读分数。

三组候选扩展与固定 1600 对照：`400→1600→6400→16384`，分别以凑够目标对象数、连续三个预算快照的有序 Top-k 获胜片段身份相同为停止条件；以及最多四轮 400 候选／efSearch=1600，后续轮次排除已发现文献／Topic 的全部片段。扩展合并候选并只重算新增片段；这些都是待验证的启发式，明确报告停止理由、最终预算和剩余误差，不以稳定或完成数量宣称 exact。

eligible 不超过 4096，或 eligible 对象数不超过 k 且片段不超过 16384 时走完整精确路线，后者覆盖“小语料对象不足 k，应返回全部”的情况，并保留片段工作量上限。4096／16384 只是实验边界，尚未选为生产阈值。空范围不进入 ANN。原始 HNSW 的窄范围失败保留第六轮证据，本轮不重复全套。

范围覆盖 all、fulltext、非空多条件交集、类别内并集再交集、itemRefs、稀有标签、全部 Topic、Topic section 和显式空 itemRefs。所有查询的范围均重新准备，计时包含准备、计数、selector、ANN、SQLite BLOB 取数、实际重排和聚合；oracle 核验在计时之后。候选 selector 用 Bitmap，与 Batch 在相同固定候选上做身份及配对时间检查，避免把多项变化归因于一种优化。

每语料串行运行，配置先预热，每查询正式三次并轮换次序。各执行进程最多 10 分钟；不清系统缓存，不调整主机负载，不据 36 个相关样本宣布生产 P95。保留准备／索引加载、投影字节、RSS／峰值与每查询轨迹。私有路径、身份和原始轨迹留在新 `.scaffold/test/issue89-round7-20261005/`，公开 JSON 只保留计数、序号和脱敏指标。

先写 scope identity／并集交集／显式空／Bitmap 多字节边界／候选合并与停止反例的行为检查，观察失败后实现。复用既有 Rust oracle，不因 Python 实验重新引入依赖。最终检查自测、距离 bits、返回范围、格式与公开结构脱敏。人工内容金例、独立查询、Rust 引擎、生产来源变化、维护并发和七平台验收仍开放。

查询参数及 bitmap 能力依据：[Faiss 官方 selector 文档](https://github.com/facebookresearch/faiss/wiki/Setting-search-parameters-for-one-query)。所有权沿用第六轮已验证的 kwargs 构造器；Bitmap 底层数组保持存活直到同步搜索返回。
