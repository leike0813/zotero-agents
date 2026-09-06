# Issue #39 第三个 change 验收记录

状态：**代码与文档验收通过；已 archive，不提交、不推送、不发布。**

实现 baseline：`a60879d6e669b148fcf22d1d16433045c7080f54`。累计指令面 baseline：`4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`。固定文件指标记录在 `issue-39-change-3-surface-baseline.json`。

## 已批准范围

变更为 `canonicalize-host-bridge-zotero-capabilities`。保留 navigation 与 Managed Note 当前语义；不提交、推送、安装依赖、发布或派发预构建。D3 明确：item 创建/复用及请求的 collection membership 是 required core；PDF/landing 是 optional enrichment，残留或不确定写入必须进入 attempt。

删除仅覆盖 DEL-03/04/08/14：legacy mutation types/routes/builders；公开 expectedRevision/token 和旧 related/Trash/linked-path authority；公开 handlers 聚合与注入。notifications、watched runs、attention、catalog/index、maintenance、generic receipts、cron 与 Input Planning v2 均保留。

## 最终审计结论

独立 OpenSpec verify 审计（`issue-39-change-3-verification.md`）判定 CRITICAL=0。先前四项实质性阻塞（cleanup 在 durable terminal 后、首 native slice revalidate、public/named 路径绕过 canonical lifecycle、Workflow content manifest SHA 不一致）均已收敛并由相应测试覆盖。

| 实跑集 | 结果 | 说明 |
| --- | ---: | --- |
| `test/core/12`、`90`、`102`、`241`、`242` | 127 passing | native URL staging、prepared files、canonical lifecycle、authority、Trash。 |
| `test/core/101`、`106`、`107`、`108`、`138` | 178 passing | MCP/Bridge canonical execute、approval/reapproval、observation、uploaded-file replay、attachment locality。 |
| `test/core/169`、`test/node/core/187` | 30 passing | agent-facing contract 与 Workflow public projection。 |
| `cargo test --manifest-path cli/zotero-bridge/Cargo.toml` | 126 unit + 14 schema = 140 passing | canonical CLI schema and command contract。 |
| `tsc --noEmit` | pass | 整个代码库类型检查。 |
| `npm run test:node:workflow` | 253 passing、26 pending、exit 0 | Workflow 集成；pending 不计通过。 |
| `npm run test:node:core` | 3335 passing、29 pending、6 failing | 见下方既有失败说明。 |
| `npm run test:node:ui` | 172 passing、7 pending | 此前最终快照无后续 UI 生产改动。 |
| 消费者 181/187/239 联跑 | 26 passing | canonical 标签回放、Workflow projection、runtime adapter governance。 |
| Broker Firefox 115/browser esbuild | pass | `platform:"browser",target:"firefox115",write:false`。 |

## Core full suite 六个剩余失败

`npm run test:node:core` 余 6 项失败，其相对实施 baseline 均无工作区改动，故不归本 change 阻塞：

1. `test/core/139-packaging.test.ts` 2s timeout — 已定向 15s 复跑通过。
2. `test/core/187` URL 重构时 helper 未定义 — 最终 tsc 与 169/187 30pass 已解决（属中间快照）。
3. `test/core/218-synthesis-cross-language-fingerprint.test.ts` 固定 fingerprint expected/actual 不符 — 既有 Synthesis cross-language 用例。
4. `test/core/229-production-rust-route.test.ts` 仍断言旧 `receipt.ok`（两项） — 既有 production Rust route 用例。
5. `test/node/core/97-synthesis-sidecar-disabled-bundle.test.ts` 缺 `safeSynthesisSidecarObservationReason` 导出 — 既有 diagnostics elision 用例。

第 3–5 项同实施 baseline 初筛同位置失败，相对本次 change 均为既有失败，不扩 scope 修。

## D3 与 URL staged import

`downloadStoredUrlToManagedStaging()` 在 Host gate 外完成 URL 下载与 staging file 检查；普通 `stored_url` attachment create 与 literature PDF 都复用 `importDownloadedStoredUrlAttachment()`；后续 `importStoredAttachment()` 才通过 admitted callback 进入 native import。Broker 路径不再调用 `importFromURL`。

Literature ingest 中，typed item 创建/复用与显式 collection membership 是 required core。required membership 失败仅撤回本次创建 item 或本次新增 membership；不会删除 reused item 或既有 membership。PDF/landing 是 optional enrichment：clean failure 保持 core committed/unchanged 并返回 failed enrichment；residual/uncertain native failure 进入 `repair_required`/`unknown` attempt。

## Durable authority、preview 与 replay

- `plugin_mutation_authority` claim 使用 `INSERT OR IGNORE` 加 `SELECT changes()` 判定真实 durable winner；admission failure 在任何 effect 前失败。
- terminal persistence failure 返回 typed unknown；storage read failure 不伪装为 unavailable；failed/canceled/unknown/repair_required identity 从不重派。
- 30 天普通证据 expiry 只留下 binding tombstone：same binding 返回 typed `outcome_unavailable`，changed binding conflict；unknown/repair-required 不年龄清除。
- trusted stored attachment lookup 在资源读取前覆盖 missing、live running 后 settled、settled、tombstone，不泄露 content 或 paths。
- public preview 返回 operation、domainPlanDigest、bounded safe plan 与 would_change/unchanged，不公开 token、revision 或 prepared evidence。嵌套用户 JSON 的 `previewToken` 也是 digest binding 的一部分。

## Bridge/MCP/CLI 一致性

- canonical execute 路径上：Bridge `execute mutation` 与 MCP `execute` 走 Bridge execute handler，preview 也做 fileId 转换但不消耗 handle、不消费 lease/stage。
- `library.get_item_attachments` 与 `mutation.execute` 的 attachment 输出共用同一 locality projection：删除本地 path，只返回 opaque file handle 或 unavailable。MCP 复用 Bridge handler。
- Bridge/MCP/CLI 共享稳定 profile-local caller namespace `host-bridge`；mutation.get_operation 与 CLI `mutation get-operation` 走 canonical Broker 观察。

## Workflow Host 投影

`src/workflows/hostApi.ts` 通过 member-level `Pick` 与显式对象字面量投影 broker：`mutations.{preview,execute,getOperation}`、`notes.*`、`attachments.*`、runtime 等 89 callable。

## Surface 与 mirror

- `npm run check:host-bridge-content` 返回 `changes: []` 且 consumer guidance aligned。
- `npm run check:host-bridge-review-mirror` 通过 153 个文件。
- semantic review 四项计数均为 0（unmapped、downgraded、unauthorized dropped、intra-package duplicate）。
- 固定 baseline 厚度门禁通过（substantive instruction line count 不下降、normalized prose character count 不低于 95%），54 条 advisory 按报告保留。

## Format 与 lint

`npx prettier --check` 对本次修改的源码与测试扫描仅剩 3 文件已格式化收尾。`git diff --check` 通过。修改文件 ESLint 已通过（已确认 102、101、107 等文件）。

## OpenSpec archive

`openspec validate canonicalize-host-bridge-zotero-capabilities --type change --strict` 通过。11 个 delta 全部 valid（仅 OpenSpec 默认 placeholder 与长度 INFO 提示）。

`openspec archive canonicalize-host-bridge-zotero-capabilities --yes` 同步 11 个 delta 到 `openspec/specs/` 对应主 spec：

| 主 spec | + ADDED | ~ MODIFIED | − REMOVED |
| --- | ---: | ---: | ---: |
| `host-bridge-approval-prompts` | 1 | 1 | 0 |
| `host-bridge-cli-interface` | 2 | 0 | 0 |
| `host-bridge-cli-literature-ingest` | 1 | 1 | 0 |
| `host-bridge-file-downloads` | 1 | 1 | 0 |
| `host-bridge-operation-receipts` | 1 | 2 | 0 |
| `host-bridge-output-boundaries` | 1 | 1 | 0 |
| `host-bridge-service` | 0 | 2 | 0 |
| `result-apply-handlers` | 0 | 1 | 2 |
| `workflow-host-api-v12` | 2 | 3 | 0 |
| `zotero-host-broker-capability-api` | 8 | 0 | 8 |
| `zotero-host-capability-broker` | 2 | 1 | 1 |
| 合计 | 19 | 13 | 11 |

原 spec 中未被 delta 提及的 requirements/scenarios 完整保留。Archive 后 change 移入 `openspec/changes/archive/2026-09-06-canonicalize-host-bridge-zotero-capabilities/`，包含 proposal、design、tasks、specs/ 全部 11 个 delta 备份。`tasks.md` 1.1–6.4 全部勾选。

## 未执行与限制

- **未执行**：Git commit/push、Host Bridge CLI 七平台 prebuild、正式 release receipt、release identity 升级、`npm run sync:gitee-release`。这些属于五个 change 整组发布层；不在本 change 范围，单独列项，不伪造证据。
- `npm run lint:check` 因既有未改动文件格式问题退出，未扩 scope。
- `npm run test:zotero:compatibility:plan` 只解析 Zotero 7.0.32/9.0.6/10.0.1 的 Linux/Windows 六 blocking cells，未运行真实 Zotero native 行为测试。
- `npm run build` 未跑完整链路；只跑 Broker Firefox 115/browser esbuild。
- 核心 full suite 既有四项失败（218、229×2、97）相对实施 baseline 不动，不归本 change 阻塞。

## 关键命令与日志

| 集合 | 命令 | 日志 |
| --- | --- | --- |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit --pretty false` | exit 0 |
| Broker/native/authority | `npm run test:node:core` (12, 90, 102, 241, 242) | `/tmp/issue39-final-broker-native.log` 127 passing |
| Bridge/MCP 五文件 | 101, 106, 107, 108, 138 | `/tmp/issue39-final-bridge-five.log` 178 passing |
| CLI | `cargo test --manifest-path cli/zotero-bridge/Cargo.toml --no-fail-fast` | `/tmp/issue39-final-cli.log` 140 passing |
| Contract/Workflow | 169, `test/node/core/187` | `/tmp/issue39-final-contracts.log` 30 passing |
| Workflow wrapper | `npm run test:node:workflow` | `/tmp/issue39-workflow-stable-final.log` 253 passing 26 pending |
| Core wrapper | `npm run test:node:core` | `/tmp/issue39-core-acceptance-final.log` 3335 passing 29 pending 6 failing |
| UI wrapper | `npm run test:node:ui` | `/tmp/issue39-node-ui.log` 172 passing 7 pending |
| 消费者 | 181, 187, 239 | `/tmp/issue39-consumer-final.log` 26 passing |
| Content | `npm run check:host-bridge-content` | `/tmp/issue39-content-latest.log` changes:[] consumer aligned |
| Mirror | `npm run check:host-bridge-review-mirror` | `/tmp/issue39-mirror-final.log` 153 files |

## 验收签名

主会话在 `openspec validate`、`openspec archive`、`prettier --check`、`git diff --check` 通过后，按既定授权完成 archive，未触发任何 Git、发布或预构建动作。
