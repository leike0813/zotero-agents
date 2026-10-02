
# src/modules/harness/zoteroReadonlyLibraryAdapter.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/zoteroReadonlyLibraryAdapter.ts -->

只读 Harness 的文献库适配器：以只读 SQLite 查询装配 Synthesis 侧的 registry 输入、library index、citation graph 输入与 managed note 投影。
源码：[src/modules/harness/zoteroReadonlyLibraryAdapter.ts](../../../../../../src/modules/harness/zoteroReadonlyLibraryAdapter.ts)

## 符号（4）
<!-- node: function:src/modules/harness/zoteroReadonlyLibraryAdapter.ts:createZoteroReadonlyHostReadPort -->
<!-- node: function:src/modules/harness/zoteroReadonlyLibraryAdapter.ts:groupRowsByKey -->
<!-- node: function:src/modules/harness/zoteroReadonlyLibraryAdapter.ts:itemFieldRows -->
<!-- node: function:src/modules/harness/zoteroReadonlyLibraryAdapter.ts:loadRegistryInputs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createZoteroReadonlyHostReadPort | 函数 | 271–552 | 复杂 | 端口、harness、synthesis、只读 | 0 | 创建 Synthesis 宿主只读端口：提供 library index、artifact 读取、citation graph 输入与代表图/managed note 投影。 |
| groupRowsByKey | 函数 | 69–82 | 简单 | 分组、sqlite、装配 | 0 | 将 SQL 结果行按指定键分组为 Map，供多表关联装配使用。 |
| itemFieldRows | 函数 | 50–67 | 简单 | sqlite、字段映射、只读 | 0 | 按 itemID 批量读取 itemFields 行并整理为字段名到取值列表的映射。 |
| loadRegistryInputs | 函数 | 117–269 | 复杂 | sqlite、数据装配、registry | 0 | 从只读库中加载文献、集合、笔记、附件与标签等 registry 输入，容忍缺表与脏行。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [foundation.ts](../synthesis/foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [libraryAdapter.ts](../synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [literatureScore.ts](../../shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [notePayloadCodec.ts](../zoteroHost/notePayloadCodec.ts.md) | src/modules/zoteroHost/notePayloadCodec.ts | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [registry.ts](../synthesis/registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [sqliteReadonly.ts](sqliteReadonly.ts.md) | src/modules/harness/sqliteReadonly.ts | Harness 侧只读 SQLite 访问层：以 readOnly 模式打开 zoteroDB/plugin 数据文件，必要时先拷贝到临时目录，并提供符合 synthesis-repository `SqlAdapter` 契约的适配器。 |
| [zoteroManagedNotes.ts](../zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReadonlyClient.ts](synthesisReadonlyClient.ts.md) | src/modules/harness/synthesisReadonlyClient.ts | 组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createZoteroReadonlyHostReadPort | 函数 | 271–552 | 创建 Synthesis 宿主只读端口：提供 library index、artifact 读取、citation graph 输入与代表图/managed note 投影。 |
