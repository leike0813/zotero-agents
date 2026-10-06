# 精确检索验证执行方案

对应[契约与性能验证票](https://github.com/leike0813/zotero-agents/issues/89)。用户已明确本机没有 LiSongTao 金例，改为使用指定 Zotero_data_migrate 库，并提供 RTX 4090 的局域网端点；当前按该具体输入执行隔离验证。固定生产基线为 `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`。

## 当前执行状态

用户已同意在第十轮后结束开放式探索并收束选型，#89 已按研究范围关闭，当前入口为[选型收束结论](vector-engine-selection-conclusion.md)和[结票交接](issue89-closeout.md)。本文件保留原始验证范围；未完成的算法验证交给 #91，生产接入、真实业务并发／恢复、质量、资源及最终七平台验收交给 #92。#90 按当前暂不采用 sqlite-vec 方向以 not_planned 关闭，无通过声明。不再据下文或各轮“下一轮”建议自动扩展试验。#91 的实现方案、允许损失和资源预算须先冻结；本次结票没有运行新测试。

## 已核实条件与待补输入

- Linux x86_64，Xeon E5-2680 v4，28 个逻辑 CPU，Tesla P4 8 GiB；执行时重新记录背景负载，不停止其他进程。当前 GPU 已使用约 4.36 GiB，系统可用内存约 14 GiB、swap 已满，不能把独占机器作为默认前提。
- 本机 Ollama 0.34.1，已有 `qwen3-embedding:4b`，声明原生 2560 维，当前已加载上下文 4096。首轮沿用已有服务，不下载额外模型；请求实际返回维度和长度行为须验证。模型制品的量化与保存向量为 float32 是两件事，报告分别记录。
- 共享 uv 环境已有 numpy、torch、transformers 等，缺少 sqlite_vec；不更改共享环境。固定 Rust 工具链、系统 C 编译器及项目 rusqlite 缓存可用。扩展验证使用固定官方 v0.1.9 C 源码和同一个 bundled SQLite，不以 Python 系统 SQLite 代替。
- 用户指定 Zotero_data_migrate 来源库；排除附件、笔记、批注和已删除条目后，共 86 篇文献（47 preprint、16 journalArticle、21 conferencePaper、1 bookSection、1 book）和 4 个 Topic。真实规模结果与复制原始片段向量的压力扩容分别报告，公开报告不记录来源绝对路径。
- 用户提供的 RTX 4090 端点在 192.168.13.11，已在默认 Ollama 11434 端口成功读取同名模型。CPU/P4/4090 的 embedding 耗时独立测量；硬件归属注明来自用户提供，实际运行分配以服务可观察信息核实。
- 当前基线未接入新 searchEvidence 生产路径，[基础工程票](https://github.com/leike0813/zotero-agents/issues/88)仍开放。隔离引擎测试不能代替生产来源 owner 的同次核验，也不能把模拟维护生命周期记作生产通过。

## 文件与工件

本次不修改生产源码、生产 Cargo/lock、schema、package.json、发布配置或既有测试 runner。新增/更新文件限定如下：

| 文件 | 用途 |
| --- | --- |
| `artifacts/vector-retrieval-wayfinder/issue89-execution-plan.md` | 本方案及执行范围 |
| `artifacts/vector-retrieval-wayfinder/issue89-sqlite-integration-preflight.md` | gpt-6-luna 的官方源码与本机依赖调查 |
| `artifacts/vector-retrieval-wayfinder/issue89/corpus.py` | 语料快照、原文范围切分、embedding、去标识化统计与工作负载生成；通过共享 uv 环境运行 |
| `artifacts/vector-retrieval-wayfinder/issue89/benchmark.rs` | 同一 bundled SQLite 下 Rust 精确距离与 sqlite-vec 的数学/过滤/聚合、事务及性能验证；先编写内置行为测试，再实现 |
| `artifacts/vector-retrieval-wayfinder/issue89/build-harness.sh` | 在全新忽略目录生成实验 Cargo/build adapter 并获取固定官方源码，使隔离构建可复现 |
| `artifacts/vector-retrieval-wayfinder/issue89-results.md` | 可复现命令、工具链、分类结果及未完成证据，不含私有标题/作者/正文/路径 |
| `artifacts/vector-retrieval-wayfinder/issue89-results.json` | 去标识化统计与分场景原始数值，不包含片段/文献结果身份及原文 |

临时 Cargo manifest/lock、build adapter、v0.1.9 上游源码、编译产物、私有 SQLite/正文/向量及查询审阅材料统一位于新的 `.scaffold/test/issue89-<runId>/`，不覆盖现有 data/profile，不将私有内容写入可提交文件。独立 Cargo harness 只用于 benchmark，不增加生产 crate。官方源码获取与扩展编译须在方案批准后执行；先尝试缓存离线依赖，缺失依赖时报告具体项，不自行安装。

## 执行与判定

1. 核对用户给定来源，通过只读 SQLite 备份/一致性快照取得测试副本，并复制需要的附件和 canonical Topic 材料。仅在副本进行切分和写入。记录各来源类别实际覆盖、缺失、文本规模、片段数及长文分布；不为补齐样本解析 PDF。
2. 在隔离工件上先验证来源范围、Unicode/UTF-16 原文定位、超长切分和向量响应映射。沿用 Q6/Q7：结构优先、不跨来源、记录实际切分设置；缺少准确 tokenizer 时标注保守字符策略，并关闭可关闭的服务截断。首轮短片段及无/少量重叠是实验配置，不能宣称已确定产品默认值。
3. 建立相同 float32 向量、相同余弦规则和完整 eligible 集合的独立正确性参照。先测 Rust 精确路线，再测 sqlite-vec 的普通表距离函数及可表达同等硬范围的 vec0 路径。复杂标签/集合/itemRefs 必须在距离排名前限制候选；任何不等价路径不参与胜负结论。
4. 先写关键行为测试：空/交叉范围、多对多范围、库隔离、来源/section、同分稳定身份、维度/零向量/非有限数值、长文片段占用与文献/Topic 聚合、来源整组提交/回滚、staging 隔离、发布原子性、进程中断与重开、清理失败。引擎/存储行为和模拟检索生命周期分开分类。
5. 测真实规模的冷热查询 p50/p95、范围选择性、limit/maxResults、距离与聚合时间、RSS、正式/staging/WAL/备份占用、初建/重建/增量/恢复。稳定后扩至 2k/10k/25k：真实语料不足时仅复制真实切分向量并重新分配测试身份作为压力负载，记录倍率和重复率，不声称真实独立文献质量或分布。执行逐档进行，资源不足保留该档未完成。
6. 测四 reader/单 writer、短事务及正常 Repository 业务并发。若尚不能接入真实 Repository，则只报告模拟连接争用，生产 Repository 并发保持未完成；不据连接数相同冒充真实业务证据。
7. 中英及跨语言内容质量单独审阅，记录查询与判断方法。基于真实文本的相关性审阅保留本机私有材料，公开只报告汇总及覆盖；未经过人工确认的标签称作待审标签。扩容负载不参与质量结论。
8. 记录失败和局限，更新 issue 进度。原计划要求全部研究与生产证据具备才关闭 #89；现已明确调整为研究结票，算法余项交给 #91，生产来源核验、实际维护 owner 集成、真实业务争用和最终七平台／包体／许可证交给 #92。原始要求保持，不得由隔离原型掩盖缺口或将 #90 的 not_planned 写成验收通过。

首轮查询生成后本地引擎性能与端到端 embedding 性能分开；沿用 p95 1 秒目标/2.5 秒最低要求。资源预算仍按实测确认，不提前设置虚构内存/吞吐阈值。外部/局域网端点只在用户提供并确认用途后发送范围内文本，不将本机端点响应当作 RTX 4090 硬件证明。
