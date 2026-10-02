
# src/modules/zoteroHost
> 目录聚合页：9 个文件、146 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/zoteroHost/libraryArtifactReadiness.ts](../../../files/src/modules/zoteroHost/libraryArtifactReadiness.ts.md) | 文件 | 24 | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [src/modules/zoteroHost/notePayloadCodec.ts](../../../files/src/modules/zoteroHost/notePayloadCodec.ts.md) | 文件 | 31 | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts](../../../files/src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts.md) | 文件 | 8 | Broker 的原生写入原语集合：封装 Zotero.Item 的保存、删除、作者更新、元数据写入、分类更新与链接附件创建，供 Broker 在原生事务内调用。 |
| [src/modules/zoteroHost/zoteroHostNativeMutations.ts](../../../files/src/modules/zoteroHost/zoteroHostNativeMutations.ts.md) | 文件 | 8 | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |
| [src/modules/zoteroHost/zoteroHostPreparedFiles.ts](../../../files/src/modules/zoteroHost/zoteroHostPreparedFiles.ts.md) | 文件 | 3 | 已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。 |
| [src/modules/zoteroHost/zoteroHostTrash.ts](../../../files/src/modules/zoteroHost/zoteroHostTrash.ts.md) | 文件 | 2 | 宿主回收站变更的准备与执行：按 portable ref 解析目标条目、采集变更前版本与实体观察值，先产出无副作用的预检结果，再执行实际的置入回收站。 |
| [src/modules/zoteroHost/zoteroLibraryPageQuery.ts](../../../files/src/modules/zoteroHost/zoteroLibraryPageQuery.ts.md) | 文件 | 32 | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |
| [src/modules/zoteroHost/zoteroManagedNotes.ts](../../../files/src/modules/zoteroHost/zoteroManagedNotes.ts.md) | 文件 | 28 | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |
| [src/modules/zoteroHost/zoteroNotePayloadResolver.ts](../../../files/src/modules/zoteroHost/zoteroNotePayloadResolver.ts.md) | 文件 | 10 | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/utils](../utils.md) | 8 |
| [src/workflows](../workflows.md) | 6 |
| [packages/synthesis-contracts/src](../../packages/synthesis-contracts/src.md) | 4 |
| [src/modules](../modules.md) | 4 |
| [src/shared](../shared.md) | 2 |
| [src/platform](../platform.md) | 1 |
