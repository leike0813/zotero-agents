# Issue #39 第三个 Change OpenSpec Verify 审计

审计时间：2026-09-06。

状态：**代码验证通过；尚未 archive。** 本文审计
`canonicalize-host-bridge-zotero-capabilities` 的写入 change。它不修改
`tasks.md`、acceptance 或协作者代码；release identity、七平台 CLI prebuild、发布和
archive 属于独立 release-set/收尾步骤，不作为本 change 的代码 CRITICAL。

## 判定

**CRITICAL：0。**

此前四项实质性阻塞已由当前稳定代码和行为证据清除：

| 原阻塞 | 当前行为证据 | 结论 |
| --- | --- | --- |
| cleanup 在 durable terminal 后，或 cleanup failure 仍可返回 confirmed result | `withPreparedFileCleanup()` 位于 authority execute callback 内，terminal 在 callback 返回后才写入。102 覆盖真实 native import 后 cleanup failure、`repair_required`、删除 source 后同 identity replay 和 `getOperation` settled 原样返回；双失败 helper 保留 primary code/message，升级 repair/unknown 并记录 cleanup residual。 | 通过 |
| 只有首个 native slice revalidate | canonical control 对普通 mutation 每个 effect 比较 current observations；destructive/ingest 首 effect 使用专用 revalidate，随后每个 effect 使用刷新后的 entity observations。`markWritten` 刷新自写后的 basis，`markRemoved` 排除已删对象；attachment placement、destructive loops、required ingest membership 和 enrichment writes 都经 guard。 | 通过 |
| public/named Broker path 绕过 canonical lifecycle，或 factory 注入 attachment executor | `mutations.execute`、status tags、全部 note/attachment named APIs 都调用 `executeCanonicalMutationLifecycle()`；factory 不再接收 attachment executor，primitives 只在 private trusted control 中构成。 | 通过 |
| Workflow content manifest SHA 与 closed schema 不一致 | Workflow canonical mapper 将 main/companions 输出为 `sha256:<hex>`，符合 Broker schema。90/102 覆盖首次 stored create、stale source、replay 与 cleanup。 | 通过 |

## D3 和 URL staged import

当前 `downloadStoredUrlToManagedStaging()` 在 Host gate 外完成 URL 下载与 staging file
检查。普通 `stored_url` attachment create 与 literature PDF 都复用
`importDownloadedStoredUrlAttachment()`；后续 `importStoredAttachment()` 才通过 admitted
callback 进入 native import。Broker 路径不再调用 `importFromURL`。

literature ingest 中，typed item 的创建/复用与显式 collection membership 是 required
core。required membership 失败仅撤回本次创建 item 或本次新增 membership；不会删除
reused item 或既有 membership。PDF 与 landing URL 是 optional enrichment：clean failure
保持 core committed/unchanged 并返回 failed enrichment；residual 或 uncertain native
failure 进入 `repair_required`/`unknown` attempt，并携带 bounded refs。

## Durable authority、preview 与 replay

- SQLite `plugin_mutation_authority` claim 使用 `INSERT OR IGNORE` 加
  `SELECT changes()` 判定真实 durable winner；admission failure 在任何 effect 前失败。
- terminal persistence failure 返回 typed unknown；storage read failure 不伪装为
  unavailable；failed/canceled/unknown/repair_required identity 从不重派。
- 30 天普通证据 expiry 只留下 binding tombstone：same binding 返回 typed
  `outcome_unavailable`，changed binding conflict；unknown/repair-required 不年龄清除。
- trusted stored attachment lookup 在资源读取前覆盖 missing、live running 后 settled、
  settled、tombstone，不泄露 content 或 paths。
- public preview 返回 operation、domainPlanDigest、bounded safe plan 与
  would_change/unchanged，不公开 token、revision 或 prepared evidence。嵌套用户 JSON
  的 `previewToken` 也是 digest binding 的一部分。

## 实跑证据

以下是当前稳定快照的实跑结果：

| 集合 | 结果 | 覆盖 |
| --- | ---: | --- |
| 12、90、102、241、242 | 127 passing | native URL staging、prepared files、canonical lifecycle、authority、Trash。 |
| 101、106、107、108、138 | 178 passing | MCP/Bridge canonical execute、approval/reapproval、observation、uploaded-file replay、attachment locality。 |
| 169、187 | 30 passing | agent-facing contract 与 Workflow public projection。 |
| CLI Cargo | 126 unit + 14 schema = 140 passing | canonical CLI schema and command contract。 |
| TypeScript | pass | `tsc --noEmit`。 |
| Workflow stable suite | 253 passing, 26 pending, exit 0 | Workflow integration；pending 不计为通过。 |
| Core full suite | 3335 passing, 29 pending, 6 failing | 139 timeout 已定向复跑通过，187 alias 已修并在 30-contract run 通过；剩余 218、229×2、97 为既有 Synthesis/diagnostic failures。 |

`test/core/12-handlers.test.ts` 还直接断言 stored URL 下载进入 managed staging 且
不调用 `importFromURL`。

## Tasks 和 delta specs

本报告不修改 task checkbox；下列项已有足够行为证据，可由主会话结合 acceptance
决定勾选：

- 1.1、1.2、1.3：closed 23-operation mapping、preview/preflight/revalidation、list/Trash。
- 2.1、2.2、2.3：durable admission、resource-first replay/restart/retention、getOperation。
- 3.1、3.2、3.3：private native ownership、trusted managed files/cleanup、D3 required/optional effects。
- 4.1、4.2、4.3：Bridge/MCP lifecycle/approval、attachment locality/replay、CLI projection/schema.
- 5.1、5.2、5.3：Workflow getOperation projection、consumer migration、approved deletion inventory。
- 6.1、6.2：已勾选；semantic review 四项计数均为 0，content check 与 153-file
  review mirror 已通过。
- 6.3：实现、架构/ownership 记录与 focused/integration evidence 已具备，可由主会话
  按 acceptance 完整性勾选。

**6.4 不可勾选。** 它要求 OpenSpec verify、sync、archive 和 archive 后状态核验；本报告
只完成 verify 审计，且 change 尚未 archive。

对应 11 个 delta specs 中，`zotero-host-broker-capability-api`、
`zotero-host-capability-broker`、`workflow-host-api-v12`、
`host-bridge-operation-receipts`、`host-bridge-file-downloads`、
`host-bridge-service`、`host-bridge-approval-prompts`、
`host-bridge-cli-interface`、`host-bridge-cli-literature-ingest` 和相关 consumer
projections已有上述代码或跨 surface 行为证据。`host-bridge-output-boundaries` 与
`result-apply-handlers` 的 broader consumer checks 由 101/106/107/108/138、169/187
以及 core full result 支撑；未把 release-set 事项误列作这里的失败。

## 限制

Core full suite 的四个剩余失败是 218、229×2、97，属于 Synthesis contract/production
route/diagnostics elision 的既有问题，未由本 change 改动且不构成 mutation capability
CRITICAL。29 个 pending 同样不能计为通过。若 archive 前代码继续变化，必须重跑受影响
focused sets，并保持本审计结论与最终 acceptance 一致。
