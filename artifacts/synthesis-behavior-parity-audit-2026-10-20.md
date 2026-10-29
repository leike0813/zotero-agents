# Synthesis 迁移前能力与行为排查

本次以迁移合并的第一父提交 `77834172aa5aaf366bddfc538919fb844173a620` 为基准。源码修复和本地真实原生路由验证已执行；七平台构建证据及隔离 Zotero 验收尚未完成，因此不宣称迁移前后业务行为已经全面等价。

## 基准、授权和覆盖口径

| 对象                | 固定身份与范围                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust 迁移合并       | `35f2f77d2ba32c06b044823a9154eb9490e28cce`；第二父提交 `57325c375e4896df2e8e5016241b7d80fd8cb878`                                                 |
| 合并前服务          | 第一父提交 `77834172…`，`src/modules/synthesis/service.ts` 的 136 个公开方法                                                                      |
| 更早的独立基线      | `e210997a11e0054a3cb4ae0656e5cfb96102a09c`，131 个方法；现有 fixture 原样保留                                                                     |
| 排查开始时的源码    | `d533d246a1224a4b138464572ec8af34fbca0b0e`，106 个生产 client RPC                                                                                 |
| 退役授权            | `4e08ff7f3ac79b7a955a46cbe14d802f123c25b3:doc/synthesis-layer/contracts/service-api-migration.yaml` 的 `audit.deletion_authorization`，逐项 23 个 |
| 修复后的 client RPC | 107 个；恢复 `client.auditConceptAliases`，没有恢复旧 TS owner 或生产 fallback                                                                    |

[136 项清单](../tests/fixtures/synthesis-sidecar-migration/main-77834172-production-observables.v1.json)保存固定源行、逐方法处置、历史授权、当前 owner 和证据类型。其 106 项 current roster 是排查开始时的捕获，不随修复重写。94 项同名、18 项职责迁移候选、23 项明确退役、1 项未映射是捕获时的状态，不能当作行为通过率。唯一未映射项 `auditConceptAliases` 已在本次恢复。

两个历史基线之间增加的五项是：`applyTopicPlan`、`getTopicPlanningContext`、`auditConceptAliases`、`exportPaperResearchBundle`、`exportTopicResearchBundle`。仅用更早的 131 项基线会漏掉后面三项的能力损失风险。名称清单及退役授权现在接入现有 service-boundary 检查；它只证明清单完整与授权一致，不能代替行为测试。

## 本次 run 的根因与修复

来源：`acp-skill-mvgd0qjl-hws2xk` 的 Stage 00 resolver/export 调用，以及相邻运行日志中的约 10025 ms 失败。原始论文、标题和运行目录内容未提交。

| 问题                     | 可观察证据                                                                                                                      | 修复与验证                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 旧同步预算仅 10 秒       | 快速合成 fixture 的 16、24 篇四件套成功；16 篇、每件约 170 ms 时在约 10.026 秒失败。24 篇少导两种 artifact 成功，与读取成本一致 | manifest/read/export 的总预算统一为 120 秒；CLI/MCP 从同一 manifest 推导 124 秒等待窗。真实路由的 24 篇延迟读取超过 10 秒后完成                                 |
| 输入与交付容量不一致     | 100 篇 × 四种 artifact 合法；63 篇为 253 个文件成功，64 篇为 257 个文件撞上旧 256 限制                                          | 上限从请求 schema 推导为 `100 × 4 + 1 = 401`。路径、逐项字节及总字节限制保留；100 篇本地与远程导出通过                                                          |
| 错误被归并               | native timeout 被归并为 unavailable，HTTP generic catch 再投影成 400 invalid_capability_input                                   | Rust 保留 IO timeout，TS 保留 timeout/internal/conflict/validation，HTTP 复用既有 typed read 映射；保留维护操作的冲突分支                                       |
| Manifest 分组和计数漂移  | 基线返回 `papers[{paper_ref,artifacts}]`、paper-count total；迁移后只有 flat artifacts、artifact-count total                    | 恢复分组与 paper-count total，保留现有 flat projection。较大 manifest 经既有 locator 通道返回；100 篇、超过 1 MiB 的 manifest 真实路由通过                      |
| 笔记元数据丢失           | note key/title 与 missing reason 在 Host descriptor 和公开 ArtifactRow 之间缺失                                                 | adapter、TS/Rust、闭合 schema 和 corpus 一起补齐；真实 Zotero adapter 的 digest descriptor 与原生 manifest 分别验证                                             |
| Concept 查询窗口漂移     | 默认 25 变成 50；先排序再截断改变了调用者选择的标签；`limits.limit` 错填 total                                                  | 恢复默认 25、去重后的输入顺序和实际请求 limit。原生 stale-index 路径及已重建 index 的真实路由均验证                                                             |
| Concept alias audit 丢失 | 基线存在，现行 Concept/Workbench spec 仍要求；不在 23 项授权内。现行代码只有 keep/remove 已有审计项                             | 恢复显式 no-arg client、Rust application 和 Concepts 按钮。确定性创建审计项、CAS、重复执行、已处理项去重、reopen、keep/remove、canonical facts 保持均有行为测试 |

“约 15 篇”是本机旧预算下的耗时边界，不是公开能力的固定数量限制。本次没有加入 caller 分批、自动轮询或降级导出，以免丢失原始请求的完整性。

## 职责迁移的核对结果

下列是 18 个不同名 owner 的核对分组。授权来自固定历史 SSOT；执行证据验证当前 owner 的行为。每项历史调用者的所有输入组合并未全部差分回放。

| 合并前方法                                           | 当前入口/owner                                                              | 已执行证据                                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| applyReferenceMatchingSidecar                        | workflow apply → client.applyLiteratureDigestSidecar                        | 229 的真实 apply、Reference refresh；239 Reference 决策序列                                            |
| listDeletedTopicArtifacts                            | Workbench topics surface 的 deleted artifacts                               | 229 delete/rebuild/purge/reopen；239 Topic mutation                                                    |
| getDebugSynthesisSnapshotInput、getSynthesisSnapshot | client.debugSynthesisSnapshot                                               | 239 read projections 的有界 snapshot、严格字段与排序                                                   |
| warmSynthesisWorkbenchSurfaces                       | Workbench surface orchestration                                             | 125 的刷新隔离/失败保留；其既有测试不是本次实机通过证据                                                |
| readTopicArtifact                                    | client.readTopicDetail / canonical Topic store                              | 239 Topic detail/full/patch、reopen；workflow producer                                                 |
| exportPaperResearchBundle、exportTopicResearchBundle | Host Bridge createDirectResearchBundleApplication.exportPapers/exportTopics | 194-research-bundle-service 25 项；239 export-research-bundle producer。不是 durable bundle 的同名替代 |
| loadConceptKb、loadTopicGraph                        | Workbench concepts / topics surfaces                                        | 239 非空 Concept/Topic Graph 读回与 mutation/reopen                                                    |
| loadReferenceSidecarCacheStatus                      | client.getReferenceSidecarIndex                                             | 229 empty-ready、非空 refresh；239 Reference/Graph                                                     |
| readCitationGraphSnapshot                            | client.queryCitationGraph                                                   | 239 basis、graph window、metrics；已有 approved graph spec 的 depth 1–4 保留                           |
| loadWebDavSyncState                                  | Workbench chrome                                                            | 239 WebDAV pause/conflict/retry/import/reopen                                                          |
| 五个 WebDAV configuration/credential 方法            | plugin-side webDavSyncPrefs / webDavSyncCredentialPrefs                     | owner 源码仍存在；当前方法没有成为公开 wire RPC。配置 UI 与凭据的所有真实宿主分支未在本次重跑          |

保留 23 项逐名授权；没有根据名称差集恢复 Git sync、mirror、旧 JSON import、checkpoint 等已批准退役入口。新能力和后续规格保留，尤其 Graph depth 1–4、分页/typed DTO、search 和 Tag audit 等不机械回退到旧表示。

Concept query 当前返回 typed IDs，完整 Concept/alias/sense facts 由 Workbench surface 读取；这与旧 service 的嵌套对象表示不同。本次修复可确认的窗口语义，不把旧私有存储对象重新穿透当前闭合 DTO。此处仍需按外部消费者逐项核对，不能仅凭 engine/query 测试宣称旧响应对象的完全兼容。

## 验证记录

常用 Node 命令为 `npm exec --no -- tsx node_modules/mocha/bin/mocha <files> --require tests/setup/zotero-mock.ts --timeout 180000 --exit`。所有实际 Host 输入为合成 fixture，原生路由启动当前源码构建的 sidecar。

| 检查                                   | 结果与边界                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 182 delivery / 220 + 225 + 106         | delivery 10 passed；client + reverse Host + HTTP 111 passed；容量、路径/字节边界、manifest-last、剩余预算和 typed error                                                              |
| 101 MCP                                | 76 passed；包括等待窗与显式短 watchdog                                                                                                                                               |
| CLI crate tests                        | 142 unit + 19 integration passed；artifact 124 秒、其它请求 30 秒；嵌入的 operations.json 已进入 CLI build fingerprint                                                               |
| 229 artifact 数量/延迟                 | 7 passed：15、16、24 delayed、63、64、100 local、100 remote；完整文件、manifest/content hash、实际 ZIP/materialization port                                                          |
| 229 current scenario matrix            | 107 个 client operation 全部实际派发；历史 fixture 保留，manifest 当前成功语义独立验证                                                                                               |
| 229 完整套件                           | 冻结源码后 37 passed；包含真实路由、生命周期、维护、完整 scenario matrix 和导出。此前一次执行中格式化改变了证据 identity，Related Items 的 evidence 集合断言失败；冻结后完整重跑通过 |
| 239 read projections                   | 7 passed；四类 artifact、坏邻居、metadata、分组、debug、超大 review transfer                                                                                                         |
| 239 Topic / Tag / WebDAV / maintenance | 既有 52 passed，含非空持久化、部分失败、冲突、取消、reopen；新增 alias audit 的真实公共路由通过                                                                                      |
| 239 Reference/Graph                    | 4 passed；binding review、retarget、mixed batch、stale basis 与 graph 事实                                                                                                           |
| 239 workflow read producers            | 6 passed；包括由真实 plan 创建的 24 篇 Planned Topic、内置 Python gate、96 个 artifact、prepare handoff，以及导出失败无 handoff                                                      |
| 125 / 184 / builtin request contracts  | UI 缓存/刷新及 Concepts wiring 6 passed；WebDAV runtime composition 4 passed；内置工作流生产请求契约 53 passed                                                                       |
| 255 Concepts                           | 12 passed；显式 audit action、pending 禁用、区域 DOM identity                                                                                                                        |
| Rust sidecar workspace                 | 529 passed；包括 application audit、query 窗口、reverse Host timeout；无测试失败                                                                                                     |
| artifact descriptor 契约修复后           | `synthesis-application` 189 passed；新增 `host_artifact_accepts_contract_note_fields` 覆盖 native DTO 对合约 note 字段的接受；TS 合约回归 3 passed（`283-synthesis-reference-refresh-artifact-contract`） |
| TS 与契约                              | 根 `tsc --noEmit`、`check:synthesis-contracts`、107 项 production capability checker 通过                                                                                            |
| OpenSpec / format / lint               | 按本 change 及受影响文件检查；最终结果见 tasks.md                                                                                                                                    |

跨语言 checker 的 schema/entry 检查未报契约错误，但整体 `ok:false`。一次独立检查记录入口 483/483、结构 14428/14706（278 uncovered）；真实生产者/接收者及 workflow producer 另计。证据绑定源树和 executable identity，源码或格式变化会使旧执行证据失效；不得把不同 identity 的计数拼成当前通过率。未执行项继续保留 uncovered，不能把静态 entry 覆盖算成全面业务等价。

别名审计在候选循环前建立 alias、sense label 和归一化 alias 索引，避免逐 alias 重扫全库 senses 或反复解析相同 alias JSON。大结果沿用既有 locator；没有增加自动审计、调用方分批或新的轮询接口。

## 构建与实机验收

1. `check:synthesis-sidecar-runtime-freshness`：七平台 sidecar 与当前源码不一致。已按 prebuild 规则重新派发七平台构建（run `39417241388`、`39432745087`）并同步，freshness 复核通过。
2. `check:host-bridge-cli-prebuild-freshness`：CLI 0.5.8 的锁定 fingerprint 与当前源码不一致。已锁定 CLI build fingerprint、重新派发七平台构建（run `39415582821`，aggregate `84bbe12b…c968`）并同步，freshness 复核通过。
3. Host Bridge 内容与内置技能：host-bridge-skills manifest 随 release identity 重新渲染；`literature-deep-reading` 图模板相对当前 synthesis 源码过期，已在隔离副本中重新生成并逐文件复验；`check:host-bridge-content`、`check:host-bridge-doc-sync` 通过。
4. Content Package：dev 频道因交付字节变化而陈旧，已按授权提升 `dev_version` 至 `0.8.10-dev.9` 并发布（run `39421848535`），`check:content-package-release -- --channels dev` 与 `--current-branch` 均通过。
5. 插件 build 成功，产物为 `.scaffold/build/zotero-agents.xpi`；`check:help-docs` 通过。
6. 隔离实机验收（Windows Zotero 10.0.2，当前源码插件 + 当前源码 sidecar + 已发布 dev 内容包 `0.8.10-dev.9`）：首次执行 PA-03 失败，报 `reverse_host_result_invalid`。根因是本次改动把 `noteKey`/`noteTitle`/`missingReason` 加入 host artifact descriptor 合约后，native reference host DTO 与 TS refresh prepare rebuild 仍按旧字段集严格拒绝该 payload；合约 SSOT 已允许这些字段，因此修复方向是让两端 DTO 与合约一致，而不是撤回合约字段。修复后重新执行：`PA-03` 通过；RH+PA family 共 6 个用例全部通过（foundation、RH-01、RH-02、PA-01、PA-02、PA-03），manifest 终态 `complete`。
7. `check:synthesis-service-boundary` 仍报告已有 `runtime_reset.rs` 调用 `CanonicalStore::open_production`，与“唯一 opener 为 runtime_service.rs”的 checker 规则冲突。该源码在本次开始前已存在，本次没有增加 whitelist 或隐去失败。`check:synthesis-cross-language-contracts` 在修复前后均为 `ok:false`，uncovered 计数来自既有覆盖缺口，本次修复未新增 uncovered 项。
8. 所有 136 个历史方法均已入清单，但并非所有历史输入/输出与真实 UI/凭据调用者均完成差分回放。规格与表示迁移的证据缺口仍需分别保留。
