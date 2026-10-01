# C18 verification

固定基线：`b26824f2572c6258d7fcd15fb807dcc610f143e3`。核对依据为 #26 的 C18 已接受决定（5551328218）、方案（5551328345）与最终 wave 表（5552013273），以及本 change 的 proposal、design、四份 delta spec 和 tasks。验证针对当前未提交源码；没有新增依赖、提交或发布。

## 官方 OpenSpec 验证

按项目本地 `openspec-verify-change` 技能检查 completeness、correctness 和 coherence，再按 `openspec-sync-specs` / `openspec-archive-change` 技能同步与归档。

| 维度         | 证据与状态                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness | 11/11 个任务完成；11 个新增 requirement、15 个 scenario 均有实现与行为证据。                                                                                                                                         |
| Correctness  | 下表逐项映射 11/11 requirement 和 15/15 scenario；真实宿主最终 core 209 项与 UI 4 项通过。                                                                                                                           |
| Coherence    | 复用 Runtime Log normalization、buffered write coordinator、Native owner quota、runtime persistence、Workflow ZIP 和既有 UI action/publication；没有独立日志 schema、event bus、export manager 或 health subsystem。 |

不存在 REMOVED 或 RENAMED requirement。两份新主规格使用 delta Purpose，既有规格保留原需求和场景；Runtime Log 的遗留 Purpose 占位已改成当前职责说明。

## Requirement 与 scenario 映射

| Requirement / scenario                                                              | 实现                                                                                    | 行为证据                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical failure identity：Provider failure propagates；Failed failure persistence | `piFailureContract.ts`、`piConversation.ts`、`piSkillRun.ts`、`piToolGateway.ts`        | 272 的 Provider HTTP/network 分类；256 的失败观察先于 terminal、返回值与 terminal 复用 identity、canonical 写失败进入 recovery；270 的 turn/outcome 同一 identity、不同 cause 不复用、封存不重复。 |
| Failure facts outside model history：Context rebuild after failure                  | `piTurnPreparation.ts` 的 non-context kinds，两个 owner 的 canonical facts              | 256 的下一轮 context 排除 failureId；272 的非上下文分类；既有 241/247 继续读取旧历史，不改写旧记录。                                                                                               |
| One fact owner / sink：Tool receipt propagation                                     | `piRuntimeAudit.ts`、Gateway receipt seam；Runtime/Provider/两个 coordinator 的直连接线 | 245 的 canonical receipt 后唯一审计、未复制工具正文；240/246 的真实 audit 文件边界；271 的 owner 记录不进入全局 sink。                                                                             |
| Structural tier policy：Private content at any tier                                 | audit 单一 operation policy 与属性白名单、`debugMode.ts` 独立 false source switch       | 271/289 的 production/diagnostic/debug 准入、私密 canary、允许字段中的自由文案与额外 owner 属性过滤。                                                                                              |
| Bounded storage：Backpressure recovery；Storage cap                                 | audit bounded admission、queue、atomic compaction/gap                                   | 271/289 的 count/byte 独立上限、oversized entry、写失败后恢复、75% 双目标与最新 warning；271 的 watermark 写失败导出为 incomplete。                                                                |
| Owner lifecycle：Delete overlaps queued write                                       | coordinator flush/dispose、`cleanupPiConversation` 的 discard-and-wait                  | 263 的 blocked sink/barrier/discard；271 的 export-copy 与删除重叠、不重建目录；271/289 的归档保留与删除；270 的 dispose 结算。                                                                    |
| Precise ZIP scope：Global export with several owners                                | audit owner correlation/time filtering、global ownerless projection                     | 271/289 的 global 排除 owner 日志、正文/路径/secret 过滤；260 的 picker 捕获 owner 与取消 no-op。                                                                                                  |
| Consistent bounded atomic export：Active producer；Export budget/writer failure     | fixed queue watermark、临时副本、96 MiB budget、既有 atomic ZIP                         | 263 的 threshold/in-flight producer 与独立 owner；271 的重启后 bound-key export；271/289 的缩小测试预算、保留 failure/completeness、源文件不裁、writer 失败与缺失 owner。                          |
| Product surfaces：Transcript update during owner export                             | Details drawer action、lazy router、Backend Manager                                     | 192/258/260/251 的 scope、错误通道、picker 切换 owner、chrome DOM identity；真实 UI 沿用标准 runner。                                                                                              |
| Audit quota：Nested Workspace；Audit consumes remaining quota                       | Native shared quota lock、一次计量、audit-only reclaim                                  | 248 的 nested/exclusion/reservation/manifest 验证与真实审计 reclaim 后业务 snapshot 接纳；282 的真实宿主 nested Workspace/private audit/admission。                                                |
| Runtime Log correlations：Owner round trip                                          | `runtimeLogManager.ts` reusable normalization、Pi typed correlations                    | 271 的 persistence/hydration 与 owner/invocation 查询；既有 Runtime Log 和 ACP domains 回归。                                                                                                      |

## 可执行检查

| 命令                                        | 已确认结果                                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run test:node:runtime`                 | 5/5 分片，42 个文件通过。后续 owner/cancel/security/shared-host 修改后，execution 分片 16 个文件再次通过。             |
| `npm run test:node:acp`                     | 3/3 分片，35 个文件通过。                                                                                              |
| `npm run test:node:assistant`               | 8 个文件通过；lint hook 修正后再次通过。                                                                               |
| `npm run test:node:dashboard`               | 13 个文件通过。                                                                                                        |
| `npm run test:node:ui`                      | UI 16 个文件与 shared 1 个文件均通过。                                                                                 |
| 定向 `271`                                  | 14 项通过，包括固定水位、删除竞态和 manifest allowlist。                                                               |
| 定向取消 / 安全拒绝                         | 245/256/270 的 4 项通过；先失败再补 production 接线。                                                                  |
| `npx tsc --noEmit`                          | 通过；最终 build 同时运行根、sidebar、dashboard、synthesis 的 TypeScript 检查。                                        |
| `npm run lint:check`                        | 最终完整检查通过，Prettier 与 ESLint 退出码为 0。                                                                      |
| `npm run build`                             | 最终完整 production build 通过，包含根与三个页面 TypeScript 检查。                                                     |
| `npm run test:zotero:core`                  | 最终 Linux x86_64 / Zotero 9.0.6 完整 core：209 项通过，包括 9 项共享 Runtime Audit 与修正后的 nested Workspace 用例。 |
| `npm run test:zotero:ui`                    | Linux x86_64 / Zotero 9.0.6 标准 runner：4 项通过。                                                                    |
| `openspec validate --specs --json`          | 381/381 主规格通过普通校验。                                                                                           |
| change 与四份受影响主规格 strict validation | 通过；仅有长 requirement 的 INFO 建议。                                                                                |

## 首轮失败与修正

保留实际失败历史，不能将最终通过写成一次全量通过：

- 早期 runtime 3/5 分片通过；272 的临时目录 API 导入问题与 270 的 owner audit 清理竞态修正后，完整 runtime 5/5 通过。
- 早期 shared 分片碰到并行编辑中的语法错误，稳定源码后 UI/shared 全部通过。
- 最初真实 core 197 项通过，但早于最新 producer/删除/配额变化，只作为中间证据。
- 加入真实审计文件测试后，276/279 从 240/245 引入了 Node 文件系统和 SQLite adapter，browser test bundle 明确拒绝。改用项目跨宿主 runtime persistence 临时目录，不再在共享 suite 安装 Node adapter，browser bundle 与 Node 定向 98 项通过。
- 后续真实 core 为 207 通过、1 失败。282 的 `ls('.')` 被共享路径验证器拒绝，改用实际 Workspace 根；生产路径无需特判。补齐安全拒绝用例后，最终完整 core 为 209 项通过。
- 最初 lint 的格式问题和 4 个测试 lint 问题经 apply_patch 修正；最终完整 lint 退出码为 0。
- 在 fixed-watermark、manifest extra fields、failure identity、取消和安全拒绝等切片中，先执行失败行为用例再实现修正。测试断言结构化身份、状态、配额、scope 和 DOM identity，不锁定完整文案或 JSON 顺序。

## 验证边界

这里没有运行全仓所有 Node domains，也没有把 Linux 9.0.6 结果写成完整版本/OS matrix 或正式 XPI 验收。C19 仍负责 startup reconciliation、异常退出、unknown-effect recovery、共享 shutdown deadline 和 Skill Run 30 天清理调度。C20 仍负责最终矩阵、完整 Workspace E2E、正式包、真实账号和性能验收。

本次真实宿主用标准 core/UI runner 和当前源码构建，profile/data 在 `.scaffold/test` 中运行。没有直接写入来源库，没有主动诊断探针或自动上传。

## 最终结论

Completeness、correctness 与 coherence 检查均通过，没有未解决的 CRITICAL、WARNING 或 SUGGESTION。11/11 个任务完成，四份主规格已同步并逐项核对；本 change 归档为 `2026-10-01-add-pi-observability-and-audit`。本次相关 Node domains、lint、类型检查、build 和真实 Zotero core/UI 均通过。C19/C20 的边界仍按上文保留，没有新增提交或发布。
