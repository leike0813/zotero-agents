# Zotero 变更观测能力：只读核查记录

核查对象：当前工作树 `/home/joshua/Workspace/Code/JavaScript/.orca/worktrees/zotero-agents/dev`。这是代码与约束盘点，不作产品决议。

用户给定的既定背景（未在本次核查中复核）：#82 已采纳“已建立索引且在纳入范围内，成功文献 digest/分析或 Topic apply 后后台自动有界更新此次材料；不自动初建、不扫描全库；embedding 失败不改变 apply 成功”。本记录只讨论普通 Zotero item/attachment 编辑、删除、合并和 Markdown 附件外部改动对该背景的影响。

## 当前工作树代码事实

生产 notifier 订阅由 `src/hooks.ts` 在插件启动序列中注册。它调用 `Zotero.Notifier.registerObserver`，只订阅 `item` 类型；shutdown 路径注销 token。回调收到 event、type、numeric/string IDs 和 extraData，调用本地派发逻辑（`src/hooks.ts:1041-1074`, `1279-1309`）。在当前核查的生产入口中，这是找到的 Zotero item 变更订阅。

派发逻辑将符合条件的 item 事件用于 Artifacts 列缓存失效；Synthesis library read model 对 add/modify/delete/trash/refresh/remove/erase 作失效判断并通知 Workbench。`itemObserver` 将 attachment/note 作为 child 类型过滤，但 literature-score child change 有特例。该路由没有把普通 Zotero 编辑写成通用重建/索引作业；`recordSynthesisZoteroItemNotifications` 只检查 modify/refresh，并消费 related-items sync echo，返回的 `recorded` 始终为 0（`src/modules/synthesis/itemObserver.ts:46-61`, `72-75`, `116-179`; `src/hooks.ts:1285-1308`）。因此 notifier 目前是失效/回显协调信号，不能据此推断它可靠捕捉所有用户编辑。

Notifier 提供 item numeric ID 和 extraData；Synthesis echo 分支尝试用当前 `Zotero.Items.get(id)` 获取存活对象，再取 item key/libraryID，缺失时从 extraData 取 key/libraryID，并可取 related target key（`src/modules/synthesis/itemObserver.ts:18-44`, `142-177`）。它不把这些输入持久化为通用变更事件。Broker 对外 canonical item ref 是 `{libraryId, key}`，并用 `Items.getByLibraryAndKey(libraryId, key)` 做即时解析；找不到返回 null，`requireItem` 再转 not-found（`src/modules/zoteroHostCapabilityBroker.ts:2963-3029`）。所以已知 ref 可以在处理时短读来源当前是否可解析；代码没有在本次 notifier 路径中对删除/合并事件执行该短读，也未从所查实现确认 Zotero 对 trashed item 的 lookup 语义。Merge event 的具体订阅表现及 extraData 是否总含被合并来源身份，当前未知。

Attachment canonical ref 同样依赖 libraryId + item key。Broker 的 attachment version 基于 Zotero item revision，再混入 link mode、路径、title、URL、content type 和 charset；没有纳入文件内容 hash、size 或文件修改时间（`src/modules/zoteroHostCapabilityBroker.ts:13249-13290`）。附件 DTO 也可返回路径和 filename（同文件 `309-324`, `2804-2843`）。这可观测 Zotero 元数据/路径变化，不能证明外部编辑器改写文件字节会改变 Zotero revision。

当前找到的 Markdown 生产逻辑是打开探针：包装 `Zotero.FileHandlers.open`，按路径扩展名或 MIME 类型识别 Markdown，再将 item ID/key、路径等交给阅读器打开（`src/modules/markdownAttachmentOpenProbe.ts:53-63`, `94-161`）。阅读器维护 tab/iframe 和握手；文档桥提供 request/refresh，但本次受限核查未确认其每次 refresh 是否重新读取磁盘，也未找到监听文件系统变动、轮询文件元数据或校验字节版本的 owner（`src/modules/markdownAttachmentTab.ts:64-75`, `435-463`, `599-642`, `645-709`）。故外部 Markdown 字节编辑能否在已打开 tab 中自动反映，属于未知；现有 Zotero item notifier 本身不应被当成磁盘 watch。

## 文档约束与同步边界

已查文档明确规定 notifier 路径不得扫描 library，也不得构造全量 Workbench snapshot；它只应标记受影响 read model 并对可见 surface 做 debounce reload（`docs/synthesis-layer/performance-and-scale.md:40`、`openspec/specs/synthesis-persistence-performance/spec.md:104`）。Related-items sync 文档约束 startup 可以检查或展示 pending state，但不得在启动时执行 Host writes；notifier echo 和 receipt reconciliation 需要重读 durable effect rows（`docs/synthesis-layer/persistence-and-files.md:363`）。

代码另有显式分页 library query 与 sync snapshot API，支持受限分页读取（`src/modules/zoteroHost/zoteroLibraryPageQuery.ts:466-542`; broker interface `src/modules/zoteroHostCapabilityBroker.ts:564-598`）；这证明存在按调用进行分页扫描的能力，不证明插件启动时自动初建索引或全库同步。本次没有追踪每个调用方，因此启动是否触发某种特定范围的同步不能从这些 API 单独推断。用户给定的 #82“无自动初建、无全库扫描”作为既定范围背景记录，不作为本次独立代码审计结论。

## 未知项与核查边界

- 本次没有在真实 Zotero 运行时验证不同 Zotero 版本的 notifier event、merge 行为、extraData 内容和删除后的对象可见性。
- 没有验证 `getByLibraryAndKey` 对 Trash 中条目的具体行为；能确认的是函数返回对象或 null，短读可作为当前来源解析结果，具体状态解释需另核。
- 没有确认 Markdown reader 的 request/refresh 如何取得正文，也没有做外部编辑器改写后重新读取的实机检查。
- 没有审计 notifier 之外的其他进程级或 Zotero 内部文件 watcher；当前结论限于本次精确定位的生产接入和相关文件。
- 没有实际运行 Zotero、测试、服务或 GitHub 写操作；未安装依赖。

## 本次读取的生产文件（6 个）

- `src/hooks.ts`
- `src/modules/synthesis/itemObserver.ts`
- `src/modules/zoteroHostCapabilityBroker.ts`
- `src/modules/zoteroHost/zoteroLibraryPageQuery.ts`
- `src/modules/markdownAttachmentOpenProbe.ts`
- `src/modules/markdownAttachmentTab.ts`
