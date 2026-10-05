
# src/modules/synthesis/foundation.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/foundation.ts -->

Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。
源码：[src/modules/synthesis/foundation.ts](../../../../../../src/modules/synthesis/foundation.ts)

## 符号（5）
<!-- node: function:src/modules/synthesis/foundation.ts:buildSynthesisKnowledgeGraphPaths -->
<!-- node: function:src/modules/synthesis/foundation.ts:buildSynthesisStoragePaths -->
<!-- node: function:src/modules/synthesis/foundation.ts:parentPathForBoundary -->
<!-- node: function:src/modules/synthesis/foundation.ts:resolveSynthesisPersistenceRoot -->
<!-- node: function:src/modules/synthesis/foundation.ts:resolveSynthesisRuntimeFileRoot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSynthesisKnowledgeGraphPaths | 函数 | 93–113 | 简单 | 路径布局、knowledge-graph、synthesis | 1 | 构造知识图谱相关文件的完整路径集合（存储目录、数据库与导出位置）。 |
| buildSynthesisStoragePaths | 函数 | 115–171 | 中等 | 路径布局、topic、synthesis | 0 | 按 topic id 构造单个 topic 的存储路径集合，隔离不同 topic 的数据目录。 |
| parentPathForBoundary | 函数 | 62–72 | 简单 | 路径解析、边界校验、utility | 0 | 按层数回退路径段，用于把 topic 路径安全地归一到受管父目录。 |
| resolveSynthesisPersistenceRoot | 函数 | 74–86 | 简单 | 路径解析、synthesis、基础设施 | 1 | 解析 Synthesis 持久化根目录，向上回退到受管的 runtime 根。 |
| resolveSynthesisRuntimeFileRoot | 函数 | 88–91 | 简单 | 路径解析、synthesis、基础设施 | 0 | 解析 Synthesis 运行时文件根目录，所有 topic 存储都从该根派生。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../../packages/synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [path.ts](../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [topicCanonical.ts](../../../packages/synthesis-application/src/topicCanonical.ts.md) | packages/synthesis-application/src/topicCanonical.ts | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraph.ts](citationGraph.ts.md) | src/modules/synthesis/citationGraph.ts | Citation Graph 投影层：把文献与引用输入归一为稳定 reference key，去重合并 canonical paper 后调用 synthesis-engine 计算统一引用图谱。 |
| [libraryAdapter.ts](libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [registry.ts](registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [reviewInput.ts](reviewInput.ts.md) | src/modules/synthesis/reviewInput.ts | 构建概念审阅工作流输入：归一已解析论文与注册表行，裁剪出审阅所需的引用图谱切片并汇总缺失产物诊断。 |
| [zoteroReadonlyLibraryAdapter.ts](../harness/zoteroReadonlyLibraryAdapter.ts.md) | src/modules/harness/zoteroReadonlyLibraryAdapter.ts | 只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSynthesisKnowledgeGraphPaths | 函数 | 93–113 | 构造知识图谱相关文件的完整路径集合（存储目录、数据库与导出位置）。 |
| buildSynthesisStoragePaths | 函数 | 115–171 | 按 topic id 构造单个 topic 的存储路径集合，隔离不同 topic 的数据目录。 |
| resolveSynthesisPersistenceRoot | 函数 | 74–86 | 解析 Synthesis 持久化根目录，向上回退到受管的 runtime 根。 |
| resolveSynthesisRuntimeFileRoot | 函数 | 88–91 | 解析 Synthesis 运行时文件根目录，所有 topic 存储都从该根派生。 |
