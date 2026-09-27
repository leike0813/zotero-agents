# ACP Workspace Publication Data Plane Round2 失败复盘与重做审核

日期：2026-07-16

工作分支：`dev-acp`

Round1 基线提交：`a3e026155fdcb6fbb7acf233430681793a1b4e00`
失败 change：`govern-acp-workspace-incremental-publication-data-plane`

## 结论

Round2 的架构方向正确：ACP Chat 与 ACP Skills 应继续共用一个 publication data plane，并共享 transcript projection、coordinator、Shell delivery、child receiver、ack/rebase 和 profiler 契约。失败不应被解释为“共享架构不可行”。

失败来自四个实现偏差：

1. 只共享了类型骨架，没有统一领域词汇和 child read model。共享 receiver 最终写入了 Skills 的 `selectedTranscript`，Chat 仍读取 `transcriptState`。
2. producer 没有产生原生 mutation，而是每次读取完整 page，再由 coordinator clone、索引和反向 diff。
3. 真实 Shell ACK 链、child-ready、initial snapshot 和 Replay barrier 没有形成闭合状态机。
4. 测试使用了比生产链路简单得多的理想模型，因此 Node、OpenSpec 全绿仍未发现真实功能和性能失败。

下一轮必须延续同构方向，但采用 v3 原子切换：两个 surface 使用完全相同的字段、read model、page request、publication、ACK 和 receiver；删除旧字段，不保留 alias、decoder、双写或 full-snapshot fallback。

## 审核来源

### Git 与工作区

- `dev-acp` 与 `origin/dev-acp` 同步，ahead/behind 均为 0。
- 无 staged 文件、无 merge/rebase、无冲突。
- Round2 全部实现为未提交修改或未跟踪文件。
- `openspec/changes/archive/2026-07-16-govern-acp-workspace-region-publications/tasks.md` 是独立的用户改动，不属于 Round2 失败快照的提交范围。

### Replay 证据

Chat Round2：

`/home/joshua/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/runtime/profiles/acp-replay/acp-replay-chat-2026-07-15t10-41-23-627z-1__after-r3-round2__logical__2026-07-15T18-24-18-415Z-1.json`

- `executionCompletion=complete`
- `measurementCompletion=incomplete`
- 三个 target-active run 均报告：`prepare=214 signature=0 post=213 shell=213 child=213 render=213`
- formal round 仍约 213 posts、2.90 MB，未满足 `<2.7 MB`
- transcript 被归因到 `materializationSource=transcript-page`，证明 steady producer 仍读取 page

Skills Round2：

`/home/joshua/Workspace/Artifact/Zotero-Skills/Zotero_data/zotero-agents/runtime/profiles/acp-replay/acp-replay-skills-2026-07-13t10-08-16-777z-1__after-r3-round2__logical__2026-07-15T18-27-21-080Z-2.json`

- `executionCompletion=incomplete`
- `measurementCompletion=incomplete`
- 两个 open-inactive formal run 在准备阶段超时：`workspace-publication-timeout:acp-chat:target=unassigned,pending=none`
- target-active 仍主要发布 `baseline-status`，没有形成可验证的 Skills transcript publication 生命周期
- 用户可见结果是 Replay 不显示 transcript

Round1 用户确认基线：

- Chat：每轮约 213 posts、5.41 MB
- Skills：每轮约 8 posts、557,610 bytes
- Round2 只降低部分 wire bytes，没有消除 producer 的累计 page/text 成本，也没有通过功能验收

## 测试与规格的假阳性

本次审核重新运行：

```text
npx tsx node_modules/mocha/bin/mocha \
  test/core/184-assistant-workspace-publication-data-plane.test.ts \
  test/core/182-acp-runtime-replay-publication-sidecar.test.ts \
  --require test/setup/zotero-mock.ts --reporter dot
```

结果：17 passing。

```text
npx tsx node_modules/mocha/bin/mocha test/core/97-acp-ui-smoke.test.ts \
  --require test/setup/zotero-mock.ts --reporter dot \
  --grep 'forwards typed publications|applies ACP Chat count publications|gates transcript rendering'
```

结果：3 passing。

```text
openspec validate govern-acp-workspace-incremental-publication-data-plane \
  --type change --strict --no-interactive --json
```

结果：valid。

这些绿灯不能证明实现正确：

- coordinator 测试直接发送 `render-complete`，没有模拟真实的 `shell-receive → shell-forward → child-apply → render-complete`。
- 测试 item 只有简化字段，没有真实 revision、metadata 和累计文本。
- UI 测试验证转发和 counts，没有运行共享 receiver 的 snapshot/delta loading-to-ready。
- Zotero 183 没有用真实 transcript event 断言两侧 DOM 文本。
- sidecar 测试人工保证重试后一定返回 publication；生产 equal-page 路径可能永远返回 `undefined`。
- OpenSpec 校验只验证文档结构，无法发现任务被错误勾选或实现偏离设计。

## P0 功能回归

### Chat transcript 永久 loading

共享 receiver 的 snapshot 分支写入：

- `selectedTranscriptPage`
- `selectedTranscript`

Chat renderer读取：

- `selectedTranscriptPage`
- `transcriptState`

因此 page 已到达时，Chat 的 `transcriptState.state` 仍是 `loading`，renderer继续显示 spinner。delta 分支同样没有统一地将 transcript region切换到ready。

这不是单个字段拼写错误，而是共享层仍接受两套领域词汇的直接后果。

### Initial snapshot 可在 child listener 注册前丢失

- typed publication 直接转发，不进入 child-ready cache。
- page-first snapshot 由零延迟后续任务发送。
- coordinator没有把initial snapshot登记为transcript in-flight。
- 如果frame尚未安装listener，snapshot永久丢失；后续append对不存在的item成为无效操作。

### Chat resync 无法恢复

- child仅发送`requestId`。
- host要求backendId、conversationId和requestId同时匹配。
- coordinator重新读取同一page后equal-diff返回`undefined`，即使补齐参数也不会强制snapshot。

### Skills boundary Replay 不释放文本

- boundary模式下text chunk写入mirror后不emit。
- Replay target把`turn-end`和`root-end`视为`consumed-noop`。
- 现有`completeAcpSkillRunTranscriptTurnBoundary()`没有被调用。
- 文本只在store中存在，没有稳定publication进入child。

## P0 状态机错误

### Shell ACK 提前释放 in-flight

coordinator对任意有效ACK都清空transcript in-flight，而Shell会在child apply前发送`shell-receive`和`shell-forward`。结果：

- 后续delta可以越过前一publication。
- child稍后报告gap时，coordinator已找不到对应in-flight。
- 所谓“每owner/page单一在途”在真实链路中并不存在。

### Page revision作用域不一致

- coordinator按owner/page保存状态。
- receiver仅按owner保存`uiRevision`。
- 同一owner换页后host从0开始，而child保留旧页revision，天然产生伪gap。

### Forced publication 与 Replay drain 不闭合

- diagnostic force在进入coordinator后丢失force语义。
- equal page返回`undefined`，sidecar无法取得publication identity。
- sidecar又要求目标完成且全tab没有pending；一次丢失会污染后续所有run。

## P0 性能偏离

Round2 的wire形式改成了delta，但producer仍然是snapshot算法：

1. Chat或Skills每次change异步读取完整selected page。
2. coordinator clone并索引完整page。
3. 逐item使用`JSON.stringify`比较。
4. text item metadata变化时，patch可能携带完整累计text。
5. Skills多个page read未纳入统一队列，可以乱序完成并回退baseline。

因此成本仍随累计page和文本增长。Chat的大量耗时被移到未充分profile的semantic event路径，而不是被消除。

## 字段语义审计

当前生产代码中的旧词汇分布：

- `selectedTranscript`：5个文件、20处
- `selectedTranscriptPage`：9个文件、60处
- `transcriptState`：9个文件、52处

其他歧义：

- page使用`requestId`，但Chat将其当conversation复合key，Skills将其当request owner。
- publication同时存在`source`与`tab`。
- publication identity同时存在`id`、`revision`、`deliveryRevision`、`signature`和`initialization`，ACK重复传递其中多数值。
- `revision`、`transcriptRevision`、`eventSeq`、`uiRevision`没有严格隔离作用域。
- shared item使用`id/kind`，mutation又使用`itemId/op`。

下一轮不建立兼容层。Workspace生产路径统一使用：

- `AssistantWorkspaceOwner`
- `AssistantWorkspaceTranscriptRegion`
- `AssistantWorkspaceTranscriptPageRequest`
- `AssistantWorkspaceTranscriptPage`
- `publicationId/publicationKind/publicationForm/publicationCause`
- `regionRevision/uiRevision/eventSeq/deliverySequence`
- `itemId/itemKind`

迁移完成后，Workspace生产代码中`selectedTranscript`、`selectedTranscriptPage`和`transcriptState`必须为零。

## 保留、重写与删除

### 保留方向并重建

- source/owner判别联合
- transcript snapshot/delta/resync-required三种publication form
- mutation操作集合
- 512 mutations/256 KiB上限
- 两侧共享coordinator、receiver和renderer
- `eventSeq`与`uiRevision`分离
- owner-first、loading-first、page-first
- low-cardinality profiler标签

### 必须重写

- publication字段词汇和runtime validator
- transcript region read model
- producer mutation projection
- initial snapshot/single-flight状态机
- Shell child-ready重放
- ACK终态推进规则
- page-scoped continuity
- forced diagnostic barrier
- Replay boundary release和drain
- 两侧参数化production adapter conformance

### 必须删除

- page反向diff生成steady mutation
- shared receiver中的surface字段写入
- Chat-only/Skills-only revision、in-flight、resync和apply状态机
- typed publication的旧schema decoder或alias
- unknown change baseline/full snapshot fallback
- Workspace生产路径中的旧transcript字段体系

## 下一轮实施计划

新OpenSpec change：`complete-acp-workspace-publication-data-plane-unification`。

1. 从Round1验证Chat/Skills transcript和forced drain恢复。
2. 先建立v3唯一领域词汇、严格不变量、runtime validator和字段禁用测试。
3. 两侧full snapshot/read model原子切换为`AssistantWorkspaceTranscriptRegion`。
4. 在Chat/Skills store event seam直接产生共享mutation，并经同一projection处理boundary。
5. 重建coordinator，使initial snapshot与delta进入同一single-flight，只有render-complete或终态rejection推进。
6. Shell缓存typed in-flight并在child-ready/frame reload后幂等重放。
7. 两个child使用同一个receiver、同一个transcript region model和同一个page request action。
8. 删除旧字段和重复状态机后接入profiler/Replay。
9. Node、Zotero、lint、build、严格OpenSpec和formal Replay全部通过后才完成任务。

双surface原子验收：

- Chat与Skills transcript均可见。
- formal Replay execution/measurement全部complete。
- steady transcript、Chat counts、Skills progress的full-panel/frontend/page materialization为0。
- Chat每轮posted bytes `<2.7 MB`。
- Skills每轮posted bytes `<=557,610 bytes`。
- transcript成本随新增mutation而非累计page/text增长。
- Chat target-active overhead下降，两侧`>100ms` drift bucket不恶化。
- 任何双字段、compatibility decoder、surface状态机或未运行的Zotero验收都会阻止change完成。

## v3 实施复核补记

后续实现已按本审核建议完成原子字段迁移：Workspace生产路径统一为
`transcriptRegion/pageKey/itemId/itemKind`，Chat与Skills加载同一个receiver，
旧transcript字段不再参与生产read model或publication。两侧store event seam
直接生成规范mutation；共享coordinator不再读取完整page并反向diff。

本轮复核再次发现并修复了一个与Round2症状一致的根因：Skills indexed page
读取成功后，full mirror hydrate的`loading`仍可能覆盖page-ready。现在page
ready与full mirror ready严格独立，cold page可以先渲染。共享receiver也区分
tail和cursor page，off-page delta不会更换历史页identity或插入尾部item。

截至本补记，相关Node测试、类型检查和浏览器脚本语法检查已通过；正式
Replay、Zotero 7/9、lint、build和严格OpenSpec的最终结果以本change tasks和
最终执行报告为准，未运行的性能验收不在此提前声明通过。

## v3 最终实施审计

真实Zotero回归进一步暴露并修复了三处不能留到后续的闭环缺口：Replay
barrier曾等待无关历史pending publication；Skills无选中run时无法生成精确
diagnostic identity；producer-native delta会被旧R3口径错误要求一一对应page
prepare/signature。现在barrier绑定强制publication的精确identity，并等待同source、
同tab且delivery sequence不大于该目标的所有publication；其它surface或tab的历史
pending不再阻塞。idle Skills也发布规范TranscriptRegion，R3以同identity的
post/shell/child/render链为完整性依据。

最终代码审计还删除了steady transcript的page snapshot兜底。Chat与Skills只要
收到transcript kind，就只能把producer mutation交给共享coordinator；空mutation
不会触发page读取。两个child的分页与resync请求也已收敛为同一个
`{ owner, request }` schema，由Host的同一解析器按`owner.source`路由。

Skills Replay不再把trace中的source requestId当成Workspace owner，而是统一投影
到当前synthetic selected owner；request/root terminal通过生产
`completeAcpSkillRunTranscriptTurnBoundary()`释放held文本。这修复了旧matrix中
Skills只有diagnostic publication、实际transcript事件落入background owner的问题。

最终机制验收结果：相关Node套件、全仓ESLint、变更文件Prettier、生产build、帮助
文档一致性、严格OpenSpec和Zotero UI套件均通过；Zotero UI为4/4，其中Chat
target-active Replay及Chat/Skills真实嵌套frame transcript均通过。仓库级
`npm run lint:check`仍被任务外既存的172/173两个未格式化测试阻塞，本轮没有修改
它们。相同digest/cadence的正式after matrix尚未生成，因此posted bytes、
target-active overhead和drift预算仍保持未验收，不能从机制测试推断性能达标。

## 本轮再次治理实现复核

针对最新round2失败报告暴露的加载、target-active和性能闭环问题，本轮没有回退
Chat/Skills同构方向，而是把未闭合的状态机收敛到同一条可验证路径：

- store event seam使用同一个before/after projector，patch不再携带完整累计item；
- coordinator按owner串行处理loading、ready、delta、page transition、resync和
  rebase，只有终态child ACK推进；
- snapshot原子覆盖此前已包含的待发mutation，region signature只在真实post成功后
  提交；
- Shell在child ready前保留typed publication，并按deliverySequence重放；ACK必须
  属于当前document generation；
- Chat和Skills child使用同一个receiver/client，批次内append后的patch基于append
  结果，render失败以`render-failed`触发明确rebase；
- renderer从DOM order identity删除revision，steady append/finalization只更新目标
  row，历史页off-page delta只更新元数据；
- Replay barrier固定`source/tab/deliverySequence/publicationId`并等待同surface、
  同tab、序号不大的全部publication；SkillRunner单独等待readiness；
- profiler lifecycle只由profile窗口内post创建，render duration只统计accepted
  completion，phase与artifact slug在保存和比较前强制一致。

这些修改同时作用于ACP Chat和ACP Skills，没有引入surface专用字段、receiver、
revision或ACK状态机。Node/browser机制测试、类型检查、lint、build、严格OpenSpec
和真实Zotero replay的最终执行结果以本change tasks及本轮交付报告为准；在正式
boundary matrix生成前，不提前宣称bytes、target-active overhead或drift预算达标。

### 真实Zotero交付闭环补记

真实嵌套frame验证发现，Node中的`window.message`路径通过了共享交付状态机，但
插件实际优先使用的direct child bridge曾直接调用Host action，绕过Shell的child
ready和document generation登记。两条入口现已统一进入同一个
`handleChildAction()`，不再维护两套ready/ACK语义。

随后暴露的早期pending publication不是barrier误判，而是真实丢失：只要iframe
window存在，Host在Shell尚未ready时也会把`postMessage()`视为成功，消息可能在
Shell安装listener前消失，而lifecycle已经登记为posted。现在coordinator transport
在`host.shell.ready`前明确返回未投递，owner lane保留工作；初始化snapshot作为
完整rebase，会原子替换尚未进入Shell的旧resync/delta，避免ready后先发送过时工作。
无选中Chat conversation或Skills run时，两侧也统一发布unowned idle transcript
snapshot，使首次打开和diagnostic publication都有规范identity。

Chat修复通过后，参数化的Skills target-active验证又发现force API会把owner lane中
尚未post的diagnostic snapshot当作barrier identity返回。coordinator现在提供唯一的
post-owned等待语义：只有Host lifecycle已经登记后才交出identity；排队项被更新的
snapshot取代时明确返回未发布，由sidecar重新强制，而不是制造`missing`目标。

修复后，真实Zotero中的Chat/Skills nested-frame snapshot用例通过；Chat和Skills
各自三轮的target-active参数化矩阵也通过，单次测试分别约为688 ms和3.0 s。该结果
只证明交付、ACK和target-active机制闭环，不代替相同trace digest、boundary模式和
正式cadence的after matrix，因此正式bytes、overhead和drift验收仍保持未完成。
