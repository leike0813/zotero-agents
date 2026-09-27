# Issue 39：Reader / ingest 原生 spike

2026-09-08。本文记录最初的可行性实验；用户随后已批准并执行生产实现，当前状态见 [审阅修复记录](../issue-39-review-repairs.md)。原始实验遵循 prototype 的可丢弃、隔离状态与记录观测原则；真实 native API 问题没有用 HTML 或 Node mock 替代。

## 结论

前轮“冷 Reader 无可用窗口绑定路径”的判断过于保守。三版真实 Zotero 都能使用目标窗口预建 tab 加 `Reader.open(tabID)` 完成冷加载，同时把等待期间的窗口切换变成拒绝，而非错窗打开。ingest 的源端有界查询与原生事务序列化也具备可用接口。

| 实验 | 7.0.32 | 9.0.6 | 10.0.1 |
| --- | --- | --- | --- |
| 双窗口，目标窗口预建 tab，冷 Reader 初始化与 page command | 通过 | 通过 | 通过 |
| `Reader.open` 等待期间切换到另一窗口 | 拒绝、错窗新增 tab=0 | 同左 | 同左 |
| 32 条 title match，SQL 层 LIMIT 26 | 26 | 26 | 26 |
| title 与 DOI SQL UNION，去重后 LIMIT 26 | 26 unique | 26 unique | 26 unique |
| 并发 A/B transaction：不存在则创建 | 最终1条，B读到1条 | 同左 | 同左 |
| 负对照：另一个任务裸 `item.save()` | 可进入 A 事务 | 同左 | 同左 |

原始结构化证据：[evidence.json](evidence.json)。每版两个实验 case、六组观测，进程 exit=0，每版约20秒。保留最初 Zotero 7 实验中的说明：观测曾误用仅新版有的 `getTabContent`，改用预建 container 的 `isConnected/ownerDocument` 后重跑通过；没有为兼容实验修改生产 API。

## Reader 实验含义

目标窗口同步执行 `Zotero_Tabs.add`，取得 tabID。再将该 ID 交给 `Reader.open`，并指定 `allowDuplicate:true`，避免复用另一个窗口已有 Reader。三版 `ReaderTab` 的 existing-tab 分支只绑定该 ID 的容器，不会在目标缺失时创建替代 tab。

负路径只延迟 `library.waitForDataLoad`，保留原方法的实际执行，不替换 `getMainWindow` 或 Services 窗口解析。调用开始时主窗口为 A，阻塞期间将原生焦点切至 B，随后释放等待。结果为拒绝；B 没有新增 tab，失败 Reader 未进入 registry，A 中预建的 tab 仍存在。实验结束才清理测试自有 tab/window，安全性不依赖关闭错误窗口的补偿。

这是一条三版源码与运行证据共同支持的**内部兼容接口**，并非稳定插件 API。生产方案仍需：

- 用不暴露到 DTO 的高熵 tabID，创建前在所有主窗口确认无同 ID tab/DOM；使用已有返回 container，不通过 DOM 验证最终阅读位置。
- 按实际 tab API 能力选择 loading 状态：旧版 `reader-unloaded`，新版 `reader-loading`；初始化完成后 `markAsLoaded`，再 select/navigate。
- 保留 captured target 重验与 effect 前取消；预建 tab 已是 UI effect，后续失败不能报告“完全无副作用”，不得自动重放。失败后的预建 tab 如何呈现应明确约定，不借此偷偷回滚 UI。
- 补 loaded/unloaded reuse、annotation、有效 EPUB/CFI、关闭窗口和重复调用的正式测试。当前 spike 只证明 PDF 原生 location command 已提交，不检查像素级 viewport。
- 原生 `Reader.open` 仍会触发 annotation import check；不能把窗口安全实验扩大为“native open 没有其他行为”的保证。

## Ingest 实验含义

`Search.getSQL()/getSQLParams()` 可用于构造源端 LIMIT；多个完整 Search 子查询可以 UNION，参数按子查询顺序拼接。实际 JavaScript 只收到最多26 IDs，26为超过25候选上限的 sentinel。它不证明 SQLite 最多扫描26行，也未证明所有 identifier 匹配规则的等价性。

两个独立 `Zotero.DB.executeTransaction` 会串行进入。最终 absence 查询与 `item.save()` 处于同一事务时，第二个事务在第一个提交后看到已存在条目。因此可让 Broker 的最终检查与首写入共同持有一个短 Host admission，而不把整个 preparation 或网络操作重新包回 gate。

负对照同时证明：共享连接上的裸 `item.save()` 能在另一个事务的 await 期间加入它。生产保证应限定为受 Broker admission 与原生 transaction 管理的调用，不声称阻止所有 native/Sync/user writers；`saveTx()` 不能嵌套进现有 transaction，否则可能等待自身。

## 建议落地文件与验证

1. `src/modules/zoteroHostCapabilityBroker.ts`：Reader 增加上述 cold/unloaded tab 绑定；ingest 复用 Search 编译 SQL，最终有界查询、match/revision 校验和 core 写入归一个原生 transaction/短 Host slice。数据下载、文件 staging、审批等待保持槽外，复用已有 mutation authority 与 receipt，不新增 identity store 或 mutex。
2. 若现有 `zoteroHostNativeMutations.ts` 的 helper 固定开启 `saveTx`，仅将相关 core 写入适配为接受既有 transaction owner；不要给全部 mutation 添加通用新层。
3. 复用 `102` 的公开 mutation/navigation/concurrent-read seam；加强 `188` 的三版 native 成功断言（不能以 unavailable 作为正常成功）、有效 EPUB/annotation 和竞态；复用现有 MCP ingest 用例验证 concrete capability。
4. Broker 架构文档、修复记录与英文 CLI Skill 更新冷 Reader 的实际能力/失败边界，再经现有 renderer 更新英文内容。中文镜像仍按用户要求排除。

先落 Reader 与有界 SQL 两个独立切片，再落 transaction integration。spike 已回答可行性，但本轮不直接把实验代码吸收到生产，尤其不把 native success 等同于 mutation authority 整组验收通过。

实现时还有两点必须保持：最终 identity 与已审批 prepared plan 不一致时走现有 stale/conflict，不能悄悄改成复用新出现的条目；首版事务仅收拢最终查询与 metadata create，collection membership、可选附件和失败补偿复用现有生命周期，不顺手扩大成新的全流程事务。UNION 的全局 unique-candidate 上限与旧逐查询25上限略有不同，应在正式方案中明确选择并验证，不能把更严格的拒绝范围隐去。

## 重跑

生产验收先运行 `./node_modules/.bin/zotero-plugin build`，再给下列命令追加 `--production`。该模式直接测试当前 Broker，并包含 188 导航、host facts、ingest 创建/复用、双份 absence plan 并发、26 候选拒绝和真实原生事务回滚。它与下方原始 native API spike 是不同证据，不以旧构建替代当前源码验收。EPUB fixture 位于 `test/fixtures/reader/zotero-stub.epub`。

```sh
./node_modules/.bin/tsx artifact/issue-39-native-spike/run.ts zotero-7-linux-x64
./node_modules/.bin/tsx artifact/issue-39-native-spike/run.ts zotero-9-linux-x64
./node_modules/.bin/tsx artifact/issue-39-native-spike/run.ts zotero-10-linux-x64
```

验证当前生产 Broker 的 Reader 与 ingest 实现时，先定向构建一次当前插件，
再按宿主逐个运行 production 入口：

```sh
./node_modules/.bin/zotero-plugin build
./node_modules/.bin/tsx artifact/issue-39-native-spike/run.ts zotero-7-linux-x64 --production
./node_modules/.bin/tsx artifact/issue-39-native-spike/run.ts zotero-9-linux-x64 --production
./node_modules/.bin/tsx artifact/issue-39-native-spike/run.ts zotero-10-linux-x64 --production
```

production 入口只加载 `188` navigation、宿主身份 probe 和 Broker ingest
验收，不展开 full suite；runner 会记录本次 XPI SHA-256 与结构化 evidence。
三版必须复用 machine lock 顺序执行，且不得跳过前置 fresh build。

runner 复用兼容性 host cache、machine lock、process timeout 和测试协议。每次在 `/tmp/issue39-native-spikes/` 新建 host/profile/data/runtime；不操作用户真实资料库，不启动开发服务器，不安装依赖。使用已有 `.scaffold/build` 插件作为测试启动背景，但实验直接调用当前 native API，不以该插件二进制证明最新生产修复。scratch 数据仅为本实验生成条目，保留以便复查；未删除用户数据、提交、推送或发布。
