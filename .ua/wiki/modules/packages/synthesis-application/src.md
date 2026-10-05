
# packages/synthesis-application/src
> 目录聚合页：17 个文件、92 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [packages/synthesis-application/src/citationGraphApplication.ts](../../../files/packages/synthesis-application/src/citationGraphApplication.ts.md) | 文件 | 6 | 引用图谱（Citation Graph）应用层唯一 owner：把宿主读取事实、图构建引擎、指标/布局引擎与 repository 记录编排成 slice/metrics/layout/rebuild 四类读取与变更视图，并负责私有 rebuild attempt 的生命周期收敛。 |
| [packages/synthesis-application/src/citationGraphProjection.ts](../../../files/packages/synthesis-application/src/citationGraphProjection.ts.md) | 文件 | 4 | 引用图谱 repository 记录与契约 DTO 之间的纯投影层：把节点、边、来源归属、light metrics 行映射为可校验的应用视图，并提供基于 canonical JSON 的行哈希。 |
| [packages/synthesis-application/src/conceptKbApplication.ts](../../../files/packages/synthesis-application/src/conceptKbApplication.ts.md) | 文件 | 7 | 概念知识库（Concept KB）应用层：管理概念、义项、别名、关系与审阅项的快照读写，接收 topic synthesis 产出的概念卡片 proposal 并用 token 重叠做合并。 |
| [packages/synthesis-application/src/debugMaintenanceApplication.ts](../../../files/packages/synthesis-application/src/debugMaintenanceApplication.ts.md) | 文件 | 2 | sidecar 调试与维护能力的应用层：聚合 repository 捕获、profiler 结果与 topic canonical store，产出隔离快照、缓存/操作列表及 checkpoint、durable、reset 维护入口。 |
| [packages/synthesis-application/src/durableBundleApplication.ts](../../../files/packages/synthesis-application/src/durableBundleApplication.ts.md) | 文件 | 3 | durable bundle（可持久化主题包）应用层：以 repository topic basis 校验既有草稿，驱动合约 codec 完成导出、导入事实分类与 apply，阻断 basis 漂移导致的覆盖。 |
| [packages/synthesis-application/src/index.ts](../../../files/packages/synthesis-application/src/index.ts.md) | 文件 | 5 | synthesis-application 包的 barrel 入口：重导出全部应用层模块，并额外实现 Workbench 运行期 chrome 读取（运行中/失败作业与缓存描述符）。 |
| [packages/synthesis-application/src/knowledgeCheckpointApplication.ts](../../../files/packages/synthesis-application/src/knowledgeCheckpointApplication.ts.md) | 文件 | 6 | 知识检查点（knowledge checkpoint）应用层：跨概念库、标签词表与主题图三类 basis 计算知识载荷哈希、生成差异预览，并在用户覆盖决定后以 expectedBases 做原子替换。 |
| [packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts](../../../files/packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts.md) | 文件 | 2 | 知识检查点的兼容归一化工具：把非安全整数或负数的计数折叠为 0 并按键排序，再对记录集取 canonical 哈希生成稳定签名。 |
| [packages/synthesis-application/src/referenceMatchingReviewApplication.ts](../../../files/packages/synthesis-application/src/referenceMatchingReviewApplication.ts.md) | 文件 | 4 | 参考文献匹配审阅应用层：驱动 reference matcher 引擎产出绑定/去重提案，维护提案状态机（待审、已接受、已丢弃），并把用户决策投影为 mutation 结果。 |
| [packages/synthesis-application/src/referenceProjection.ts](../../../files/packages/synthesis-application/src/referenceProjection.ts.md) | 文件 | 8 | 参考文献投影层：从引用分析 artifact 与原始 source 中提取标题、作者、年份、citekey，判定文献质量等级，构建 canonical reference 记录并把引用分析渲染为 Markdown。 |
| [packages/synthesis-application/src/referenceRefreshApplication.ts](../../../files/packages/synthesis-application/src/referenceRefreshApplication.ts.md) | 文件 | 3 | 参考文献刷新应用层：按 source 描述符判定增量或全量刷新计划，合并新旧 source/artifact/raw reference 行，并以 basis 哈希守卫 repository 投影替换。 |
| [packages/synthesis-application/src/tagVocabularyApplication.ts](../../../files/packages/synthesis-application/src/tagVocabularyApplication.ts.md) | 文件 | 8 | 标签词表应用层：读取并哈希词表候选、管理 staged 标签绑定与宿主批量生效请求，校验归一化后的状态记录并驱动 Zotero 侧 tag effect 执行。 |
| [packages/synthesis-application/src/topicApplication.ts](../../../files/packages/synthesis-application/src/topicApplication.ts.md) | 文件 | 11 | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |
| [packages/synthesis-application/src/topicApplyDecision.ts](../../../files/packages/synthesis-application/src/topicApplyDecision.ts.md) | 文件 | 2 | 主题结果包 apply 决策：校验 synthesis 结果 bundle 的结构、基线哈希与直接写键白名单，据此判定 create、update_full、update_patch 或拒绝应用。 |
| [packages/synthesis-application/src/topicCanonical.ts](../../../files/packages/synthesis-application/src/topicCanonical.ts.md) | 文件 | 13 | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |
| [packages/synthesis-application/src/topicGraphApplication.ts](../../../files/packages/synthesis-application/src/topicGraphApplication.ts.md) | 文件 | 6 | 主题图应用层：维护主题间关系图谱的节点、边与审阅项，接收 topic graph relation proposal，检测反向更宽路径等冲突后决定合并或转审阅。 |
| [packages/synthesis-application/src/webDavSyncApplication.ts](../../../files/packages/synthesis-application/src/webDavSyncApplication.ts.md) | 文件 | 2 | WebDAV 同步应用层：编排快照指针读取、远端 head 比对与冲突报告，按重试退避策略驱动写入，并在同步状态陈旧时拒绝继续写入。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [packages/synthesis-contracts/src](../synthesis-contracts/src.md) | 22 |
| [packages/synthesis-engine/src](../synthesis-engine/src.md) | 20 |
| [packages/synthesis-repository/src](../synthesis-repository/src.md) | 10 |
