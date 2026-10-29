# Joshua-Side 工件列、迁移与 Index 遗漏调查

调查日期：2026-10-10。对象：`C:\Users\leike\Zotero_Side\Joshua-Side`，个人库 `libraryId=1`。

源码基线：`c097edc79b015b4209136a1fc8485df0c06531b8`。对应 profile 为 `9w7o285s.Joshua-Side`，已安装插件版本为 `0.9.0`。检查了安装包中的关键分支，确认 summary 回退、工件列错误缓存、refresh 过滤及 Index 100 条截断与当前源码一致；这不等同于验证整个安装包与 HEAD 完全一致。

本文是调查结果与待实施方案。本次只新增本报告，没有修改插件实现、真实库、附件或迁移历史，也没有提交代码。

## 1. 结论与证据强度

| 问题 | 结论 | 证据强度 |
| --- | --- | --- |
| 八个中文题名的工件列不显示 | 实际对应九个父条目，文件存在，四类笔记经过生产解析器全部可识别。列存在“读取失败后永久缓存为空”的确定缺陷，也遗漏普通 refresh 的缓存失效 | 数据核验及缓存缺陷已复现；未捕获现场内存缓存与失败时序，不能断言九条全部由同一次错误触发 |
| Exploring large language model… 被认为非法 | 原 summary 明确为空，转换器却用完整 report_md 填入 summary，制造了 590,562 字符的字段，超过 65,536 上限 | 原库输入、生产转换器、单变量对照和最小合成输入均已复现 |
| Pipe jacking and microtunneling 被排除 | 空 References 被错误等同于缺失 References，误判 citation_only / unsupported_input；canonical 契约实际允许空数组 | 原库输入及最小合成输入均已复现 |
| Index 文献遗漏 | 当前实现最多累计 100 个父条目，随后标记 complete，丢弃后续分页信息，界面没有继续入口；本库符合来源条件的父条目有 274 个 | Host SQL、副本排名、源码、安装包及页面调用链相互印证；未抓取当前可见 UI 快照 |

不能把这四件事合并为一个“清缓存”问题。迁移有两个转换语义错误；Index 有明确的产品访问限制；工件列则有已复现的缓存恢复缺陷，但其现场归因仍需时序证据。

## 2. 核查方式与边界

- Zotero 正在运行，SQLite 只读直连失败，后续重试返回 `database is locked`。调查采用主数据库和 WAL 的临时副本；没有关闭 Zotero或向真实库执行 SQL 写入。
- `zotero.sqlite`、`zotero-agents.db`、`synthesis.db` 副本的 `PRAGMA quick_check` 均为 `ok`。落稿前重新复制 Zotero/Synthesis 数据库，复制前后源文件大小与修改时间保持稳定，复核父条目数仍为 274、Reference source 数仍为 272。
- 数据库是分库取样，不能把三份副本宣称为跨数据库的原子快照。Zotero 在调查期间继续运行，本文描述取样时状态。
- profile 的链接附件根为 `E:\Zotero_Side_Bibliography\Joshua-Side`。逐一验证下表九条的 PDF、Markdown 实体文件，全部存在。
- 从九条的 36 个子笔记读取 63 个附件文件，生产 `parseEmbeddedNotePayloadBlock` 解析出 45 个 payload 块，再经 `classifyManagedNoteContent` 和 `summarizeLibraryGeneratedArtifacts` 检验。
- 原始数据库、笔记正文及 payload 提取文件仅保留在系统临时目录，不加入仓库；报告保留定位所需题名、key、数量和代码位置。

## 3. 工件列：数据正常，缓存失败恢复不完整

### 3.1 逐条核查

下表全部满足：父条目未删除；PDF/Markdown 文件存在；四类笔记均被生产 classifier 识别为 managed；References/Citation 的迁移 outcome 为 applied；四类工件汇总均可用，Citation basis 未被判 stale。

“Index 顺位”是按当前 Host 查询的 `itemID ASC` 排列、从 1 开始的排名。它与迁移 candidate ordinal 不同。

| 题名 | Parent key | References 数 | Citation items / unresolved | Score | Index 顺位 |
| --- | --- | ---: | ---: | ---: | ---: |
| 边顶拱式全液压变截面衬砌台车的设计与应用 | V54TQ6D3 | 1 | 0 / 0 | 49.3 | 35 |
| 衬砌模板台车在地铁车站主体施工中的应用 | WFIQFXU5 | 5 | 0 / 0 | 46.2 | 224 |
| 重庆长大公路隧道结构安全保障技术及策略研究 | HDNQMLNB | 1 | 0 / 18 | 64.3 | 233 |
| 大型排涝水工隧洞二次混凝土衬砌钢模台车设计和力学计算 | 3349FD5P | 2 | 2 / 0 | 60.5 | 214 |
| 带模注浆新型铁路隧道衬砌台车施工技术的优化（2017，何玉书等） | 2QP58QSE | 6 | 0 / 2 | 64 | 37 |
| 带模注浆新型铁路隧道衬砌台车施工技术的优化（2018，张军茂） | KG695ME5 | 6 | 0 / 0 | 35 | 39 |
| 高铁大断面隧道衬砌智能化建造及质量控制技术 | 4P6726EJ | 31 | 0 / 0 | 61.5 | 220 |
| 高铁隧道衬砌台车智能搭接防顶裂施工技术 | L7JVJVBJ | 8 | 0 / 0 | 60.5 | 10 |
| 基于模糊贝叶斯证据理论的盾构下穿既有隧道安全风险评价 | W26VY6EY | 21 | 2 / 7 | 68 | 94 |

这里的“可用”是机器契约与读取状态，不代表参考文献抽取内容完整。比如重庆长大一文只存有 1 条 References、18 条 unresolved，属于后续内容质量核对范畴，不应被解释为没有工件。

七条 Citation 的 `items=[]` 仍被正确识别。Digest/Score 的存储包装也经生产解析器正常解包，不能因为仍见到 `{version, entry, format, ...}` 就认定未迁移或非法。

### 3.2 已复现的缓存缺陷

代码位置：

- `src/modules/libraryArtifactsColumn.ts:170`：dataProvider 命中 `stateCache` 就返回，不再读 Broker。
- 同文件 `:202`：Artifacts 与 Rating 共用异步 `scanItemArtifacts`。
- 同文件 `:226`：任何读取异常都写入 `{artifacts: "", score: null}`，把“读取失败”永久当成“已确认无工件”；没有自动恢复入口。
- 同文件 `:149`、`src/hooks.ts:1284`：列失效事件不包含普通 `refresh`。
- `src/modules/synthesis/itemObserver.ts:52`、`:117`：Index 已区分普通 refresh 与带 marker 的 UI-only 重绘，列的处理与它不一致。

在现有 Zotero mock 中，对生产列 provider 注入一次 Broker reject，结果如下：

```text
第一次读取：readiness reject，列返回空。
直接再次调用同一个 Broker：成功，返回完整工件状态。
再次读取列：仍返回空，没有发起新 readiness 调用。
显式 notifyLibraryArtifactsColumnItemsChanged(parentID)：失效缓存。
下一次扫描成功后：列恢复正常。
```

因此，一次启动时、附件读取中或 Host 读取中的暂时失败，就足以造成“东西明明在，列却一直空”。触发该次失败的具体原因尚未从现场证据中确认。取样 runtime log 的 2,361 条记录未命中目标 key/readiness 相关词；`Zotero.logError` 也不保证写入该日志，因此不能用“日志没找到”证明没有失败。

另有竞态风险：`clearCachedItem`（`:333`）删除 pending 标记，却无法使旧 Promise 失效；旧扫描在 `:217` 回填、或在 `:227` 失败回填时，可能覆盖新扫描。此处已确认代码缺少代次校验，尚未单独复现竞态，不列为这九条的已确定现场根因。

### 3.3 建议修复

1. 只有成功扫描结果进入成功缓存。读取失败保留此前成功状态；首次失败保留“未成功读取”的状态，支持有界退避重试或下一次有效失效后重读，避免重绘时忙循环。
2. 普通 refresh 使相关 parent 缓存失效；带现有 UI-only marker 的 refresh 只重绘。复用 `uiOnlyItemRefresh.ts` 的既有判定，不引入第二种 marker。
3. 每个 parent 的扫描绑定失效代次/请求身份；旧成功、旧失败及旧 finally 都不能覆盖新结果或删除新请求的 pending 身份。全量清理/插件卸载也要使旧扫描失效。
4. 保持 Broker readiness 为事实源，不把 HTML 标题或任意附件名降格成“有效工件”的充分证据。

优先扩展 `tests/ui/48-library-artifacts-column.test.ts`：暂时失败后恢复、普通 refresh 与 UI-only refresh 分离、旧 Promise 晚返回不得覆盖新结果。测试观察 provider 输出与读取次数，不断言错误全文。

现场验收须再比对同一 parent 的即时 Broker readiness、列输出及失效前后结果，记录稳定错误码/代次；本次没有接管真实 UI 或读取其进程内 `stateCache`。

## 4. 英文论文迁移：完整报告被误填为 summary

对象：`VN5BGGN6`，题名为 “Exploring large language model AI tools in construction project risk assessment: chat GPT limitations in risk identification, mitigation strategies, and user experience”。

唯一迁移 run：`run-b52bd220-9ee0-4b96-aa02-717bbc85a076`，definition version 7。北京时间 2026-10-10 20:48:22–20:57:51，268 个候选，266 applied、2 skipped，run 状态 completed。**completed 仅表示这一轮处理结束，不表示每个候选迁移成功。**

该文为 candidate-148。原始原因包含 duplicate_reference、ambiguous_linkage、unresolved_linkage、invalid_canonical_artifact；批量决策合并重复并保留 unresolved 后，剩余 invalid_canonical_artifact，最终 skipped。

### 4.1 原始数据与复跑结果

| 项目 | 值 |
| --- | ---: |
| 原始 Citation summary 长度 | 0 |
| 原始 report_md 长度（JS string.length） | 595,125 |
| 转换后 summary 长度 | 590,562 |
| 契约 summary 上限 | 65,536 |
| 转换后 Citation JSON UTF-8 字节 | 1,692,243 |
| 原始转换 References 数 | 290 |
| 按既有批量决策合并后 References 数 | 201 |
| 转换后 Citation items / unresolved | 67 / 120 |

直接调用正式 validator，得到：

```json
{"path":"/summary","code":"schema_invalid","message":"must NOT have more than 65536 characters"}
```

根因在 `src/modules/literatureArtifactMigration/converter.ts:1061`：

```ts
summary: firstText(value.summary, value.report_md)
```

`firstText` 会跳过空字符串，于是将完整报告压平空白后装入 summary。`compactMigrationCitationSteps`（`:131`）先校验 schema，随后才压缩 snippets；summary 已违反字段上限，所以不会走到可恢复的 snippet 压缩。

单变量实验仅在临时内存输入中去掉 report_md 回退来源，保留原有空 summary，再运行生产转换器和相同的重复/未关联决策：得到 `ready`、201 References、67 items、120 unresolved、Citation 209,754 字节，Citation schema 和 References 关联校验均通过。未改真实 payload。

### 4.2 建议修复

- 明确 `summary` 与 `report_md` 是不同语义字段。已有合法 summary（包括空字符串）应保留；完整报告继续由保留的可见 note HTML/来源承担，不作为 summary 的备用值。summary 缺失时采用契约允许的空值，不从完整报告截断或伪造摘要。
- 保留 65,536 字符以及正常读写字节上限，继续复用已有 snippet 压缩。真实超长 summary 仍须拒绝；现有 65,537 字符测试不应被放宽。
- 保留重复 Reference 的人工/批量决策和 unresolved，不借此自动猜测关联。这里只修复转换器制造的非法状态。
- 更新 migration definition version，使成功 onboarding marker 不压住新规则下的再扫描；历史 receipt 保持原样，新一轮以当前源事实扫描。

### 4.3 “非法”原因丢失也是缺陷

有三层信息损失：

1. converter 的 schema catch（`:1353`、`:1363`）丢弃 validator 的 `issues`，只追加泛化文本。
2. converter `boundedDiagnostics`（`:399`）直接取前 20 条。本例前 20 条全是 duplicate reference evidence，后面的关键 schema 失败连泛化文本都可能被截掉。
3. `src/modules/literatureArtifactMigration.ts:1502` 的 `persistCandidate` 仅保存调用方传入 diagnostics；排除路径（`:1886`）传的是 `excluded_from_final_selection`。本例历史表因此无法回答“哪里非法”。

建议保留有界的稳定字段路径、错误码、限制和实际长度，去重重复诊断并优先保留阻塞原因；利用现有 diagnostics 持久化路径传递这些事实。不得持久化整段 summary 或完整 validator 输入，不需要新建诊断数据库。

## 5. Pipe jacking：空集合被当作工件不存在

对象：`5RNBY74J`，item type 为 book，candidate-59。原库 References 笔记及其 PNG payload 都存在，References 为 `[]`；Citation 也存在，`items=[]`、`unresolved=[]`，说明当前 Markdown 仅包含题名/目录和参考文献页指针，没有可分析的正文引用。该输入能表达一次合法的空结果；并不证明整本书没有参考文献。

正式 `validateSourceReferenceArtifact({schema: "source_reference_artifact.v1", references: []})` 返回 `ok: true`。

迁移器却在 `converter.ts:1228`、`:1322` 用 `references.length === 0` 推断 citation_only，并在 `:1324` 加上 unsupported_input。其前置 `resolveLegacyValues`（`:477`）只返回展平后的数组，已经丢失了“没有 References 来源”与“有可读、合法、明确为空的 References 来源”的区别。`citationHasExistingBasis`（`:1214`）对已有 canonical References 也使用非空长度判断，需一并修复。

建议 converter 的私有解析结果保留 References 来源存在性及可读/有效状态；对合法的显式空集合输出 canonical 空 References，并照常写 Citation basis。不要用非空数组作存在性证据。

边界必须保留：

- 真正没有 References 工件的 Citation-only 输入，继续按现有策略阻塞。
- 解码损坏、错误形状、被丢掉后变空的 References，不得伪装成合法空集。
- 空 References 加无引用 Citation 可以 ready；若有待关联提及，按现有 unresolved/review 策略保留证据，不能自动丢弃，也不能伪造 Source Reference ID。
- existing canonical References 为空时也应被认作存在的 basis；验证同步/异步 converter 和 Import preview 使用同一判断。

现有 `tests/tooling/264-literature-artifact-migration.test.ts:571` 将 `references: []` 当作 citation-only fixture，会掩盖该区别。应将真正缺失的 fixture 改为省略来源，再增加“显式空来源”的对照测试。无需改变 canonical schema。

## 6. Index：100 条窗口被当作全库完成

### 6.1 来源与数量

当前个人库符合 Host 普通常规条目查询的总数为 **274**：225 journalArticle、16 conferencePaper、14 preprint、10 bookSection、4 report、3 book、2 thesis。附件、笔记、删除记录不计入该数。

常规 Index 行来源是 Host 实时分页，非 `synt_reference_source` 枚举：

```text
Workbench readIndex
  → native workbench index surface
  → ReferenceApplication 的 workbench_index_page
  → library.items.list_page
  → libraryAdapter / queryZoteroLibraryPage
  → 当前 Zotero 普通父条目 + 按这些 source refs 读取的 sidecar 事实
```

关键代码：

- `src/modules/zoteroHost/zoteroLibraryPageQuery.ts:337`：来源条件及 itemID keyset 分页。
- `src/modules/synthesis/libraryAdapter.ts:1277`：每次 Host 页读取；`:1310` 的投影未向 sidecar 传递 Host total。
- `rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:916`：一页 Host 来源及 referenced scope 过滤；空非末页可以继续。
- `src/modules/synthesis/workbench/synthesisWorkbenchTab.ts:1883`：首批 25 条，然后循环。
- 同文件 `:1968`：`state.complete = !page?.hasMore || seen.size >= 100`。
- 同文件 `:1970`：累计结果 `.slice(0, 100)`；保存时只保留 rows/cacheStatus，后续 page 信息不进入视图。
- `src/synthesis/components/registry/RegistryTables.tsx:432`：虚拟化仅控制已加载行的 DOM，不会读取第 101 条。
- `src/modules/synthesis/uiModel.ts:2968`：search/coverage/binding 等过滤已加载行，搜索不会绕过 100 条限制。

本库第 100 条为 `Z67SWCQ6`（itemID 970）。后续 **174 条**不可能通过当前 library scope 的这轮读取进入视图；本次目标中 3349FD5P、4P6726EJ、WFIQFXU5、HDNQMLNB 以及英文 VN5BGGN6 都在上限之外。前 100 条内的工件列异常仍是另一个问题。

Index 本身没有传递全库 total；不能把用户观察到的较小数目直接认定为某个已实测的计数标签。确定的是行访问范围被截断。

### 6.2 sidecar 差异不是本次 UI 遗漏的解释

取样 `synt_reference_source` 为 272 行，与当前 274 个父条目交集 268：Host-only 6 条，sidecar-only 4 条。6 条 Host-only 的排名为 201、203、204、208、210、211，均满足当前 Host 查询条件；4 条多余 source 在当前 Zotero items 中不存在，artifact 状态均 missing，且没有 raw references。snapshot 表为空。

这些是历史投影状态，值得通过既有 Reference refresh/维护另行核对，但不妨碍实时 Host Index 读取 6 条新增来源。重建 sidecar、补写 source 表或重建 snapshot 都不能解决 UI 的 100 条截断。

### 6.3 建议：保留有界窗口，提供完整来源访问

推荐扩展现有 cursor/basis 分页：每次仍读 25 个来源，单个展示窗口最多 100 个父条目，通过分页/下一批入口继续访问后续来源。不要直接全库 hydrate，也不要单纯把 100 改成另一个更大的常量。

- 区分“当前窗口装满”和“来源已穷尽”；仅 `hasMore=false` 能表示来源读取完成。缓存不能把达到 100 的部分窗口伪装成全量 complete。
- 保留下一页 cursor、basis、scope 和 owner；换页与返回使用同一查询条件，过期 basis 必须失败并重新开始。会话缓存仍遵守四个 entry、8 MiB 上限。
- library scope 可复用 Host total，显示已加载范围与来源总数；referenced scope 经后置过滤，其匹配总数不能直接使用 Host total，允许未知。
- 本地 search 当前只搜索已加载窗口，应明确范围，不能宣称全库搜索。若后续决定提供全库检索，需要独立将条件交给来源查询并绑定 cursor；本次修复不必新增一种搜索引擎。
- 复用现有虚拟窗口、按 sourceRefs 的详情 hydration 和稳定行锚点；翻页/失效均不得触发全库 payload 读取或 sidecar maintenance。

这是已有产品限制的调整：`docs/synthesis-layer/workbench-ui.md:124` 以及项目 `AGENTS.md` 已写明最多 100 个展示父条目。实施时应将其明确为“单窗口上限、分页可覆盖完整来源”，同步相关 OpenSpec 和 DTO。不能未经说明删除性能约束。

## 7. 实施范围与验收顺序

建议分三个可独立验证的变更，均在用户确认开发方案后实施。

| 变更 | 主要修改文件 | 验收要点 |
| --- | --- | --- |
| 迁移语义及诊断 | `src/modules/literatureArtifactMigration/converter.ts`、`src/modules/literatureArtifactMigration.ts`、`src/modules/literatureArtifactMigration/definition.ts`；扩展 tooling 的 264/276 测试 | 空来源与缺失来源分离；空 summary 不消费 report_md；同步/异步一致；真正超长 summary 仍失败；receipt 留下关键原因 |
| 工件列恢复 | `src/modules/libraryArtifactsColumn.ts`、`src/hooks.ts`；复用 `uiOnlyItemRefresh.ts`；扩展 `tests/ui/48-library-artifacts-column.test.ts` | 一次失败不导致永久空列；普通 refresh 重读，UI-only 不循环；旧扫描不覆盖新值；Artifacts/Rating 共享一次有效扫描 |
| Index 完整访问 | `src/modules/synthesis/workbench/synthesisWorkbenchTab.ts`、`src/modules/synthesis/uiModel.ts`、`src/synthesis/registryProjection.ts`、`src/synthesis/components/registry/RegistryRegion.tsx` 及对应 types；按分页事实传输需要更新 `src/shared/synthesisWorkbenchWireContract.ts`、`packages/synthesis-contracts/src/workbench.ts`、协议 schema 和 Rust projection | 274 条可逐页访问且无重漏；101/最后一条可达；空非末页继续；basis 变化拒绝旧 cursor；缓存与 DOM 有界 |

Index DTO/schema 的精确字段应在实施设计中闭合，并从合约源重新生成验证器；不得手改生成文件。若透传 Host total，还需修改 `packages/synthesis-contracts/src/hostRead.ts`、reverse-host schema、`libraryAdapter.ts` 及 Rust 对应 DTO；referenced 总数保持真实的未知状态。

同步文档：`docs/components/literature-artifact-migration.md`、`docs/synthesis-layer/workbench-ui.md`、相关 `openspec/specs/literature-artifact-migration`、`synthesis-reference-sidecar-index`、`zotero-library-artifacts-column`；后者仍描述 marker 可免读 payload，与当前严格 canonical owner 实现存在漂移，应按当前 Broker 契约修正，不能退回凭 marker 判合法。

最小回归矩阵：

1. 迁移：References 缺失、显式空、损坏、已有 canonical 空 basis；Citation 无提及/有 unresolved；空 summary+长 report、真实 summary 超限；20 条重复诊断不能挤掉阻塞原因。
2. 列：正常结果、首次 transient failure 后恢复、已有成功值后失败、普通/UI-only refresh、失效期间旧 Promise 返回。
3. Index：0、25、100、101、274 条；library/referenced；空中间页；basis 失效；切换 owner/关闭页面；部分窗口重开；展开详情与滚动锚点。
4. 复用 `tests/synthesis/125-synthesis-tab-ui.test.ts` 与 Rust `reference_application.rs` 的既有分页测试。真正 Host 集成验收走现有 `tests/zotero/e2e/full` 和 `npm run test:zotero:e2e`，真实库/profile 仅复制为隔离输入，使用当前源码 sidecar。

对真实库的恢复应在修复验收后进行：列重新扫描即可，九条已迁移数据不必重做；两条 skipped 通过 Dashboard 新扫描重新审阅/apply，不改旧 receipt；Index 通过分页功能修复，不清空 synthesis.db。本报告不授权或执行上述写入。

## 8. 本次验证结果与复现入口

已经执行：

```powershell
node --import tsx node_modules/mocha/bin/mocha tests/tooling/264-literature-artifact-migration.test.ts tests/tooling/276-literature-migration-cooperative-converter.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --reporter dot --exit
```

结果：**57 passing**。以下两个新增的合成对照都复现当前缺陷，说明既有测试通过不意味着覆盖本次输入：

```text
显式 references-json {references: []} + 空 Citation
  expected ready; actual blocked [citation_only, unsupported_input]
一条合法 Reference + Citation {summary: "", report_md: "x" × 65537, items: []}
  expected ready; actual blocked [invalid_canonical_artifact]
```

生产 converter 的调用入口是 `convertLegacyArtifactSet`；canonical 空数组使用 `validateSourceReferenceArtifact` 直接校验。真实英文 payload 的差分复跑也经过 `resolveLiteratureArtifactMigrationConversion` 和 `validateCitationAgainstReferences`，修正回退输入后为 ready/pair valid。

本机临时 probe（未纳入仓库，临时目录被清理后需重建）：

```powershell
node --import tsx C:/Users/leike/AppData/Local/Temp/zotero-library-audit-vrj2zz0_/production-readiness-probe.mjs
node --import tsx C:/Users/leike/AppData/Local/Temp/zotero-library-audit-vrj2zz0_/readiness-failure-recovery-probe.mjs
```

前者只读实体笔记 payload，结果为 9 parents / 36 managed notes / 45 payload blocks / 四类工件全部可用；后者仅使用内存 Zotero mock，结果为首次失败后列持续空、显式失效后恢复。

没有执行完整测试、插件构建、Rust 全套验证或真实 Zotero E2E，因为本次没有修改实现。未抓取现场列缓存、Notifier 时序或实际 Index surface；工件列的现场首个错误仍待定位，Index 的证据限于数据、生产代码与已安装构建中的确定行为。后续修复必须分别补上相应验收，不能把本报告当成修复完成凭证。
