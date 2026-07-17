# ACP R1 Diagnostic Persistence Governance

日期：2026-07-17

关联审计：`artifact/acp-silent-execution-zotero-host-ui-stall-risk-audit-20260712.md`

关联 OpenSpec：`openspec/changes/separate-acp-diagnostics-from-business-persistence/`

## 结论

本轮已经切断 R1 中最明确的放大链：ACP adapter diagnostic 不再进入 ACP Skills canonical run/event store，也不再触发 transcript invalidation 或 Assistant Workspace business publication。ACP Chat 继续在当前进程内保留 owner-scoped diagnostic tail，供 Details 与 Copy Diagnostics 使用，但新的 conversation payload 不再持久化 `diagnostics`、`stderrTail` 和 diagnostic-derived `lastLifecycleEvent`。

这是一项因果治理，不是完整的生产 I/O 性能基线。现有 Replay 仍用于验证语义、发布和 UI 回归；它不会真实执行生产磁盘 I/O，因此不能用本轮 Replay 数字推断真实磁盘耗时、fsync 成本或 Zotero SQLite 主线程占用。

## 持久化分类

### 业务数据

以下数据继续保持原有格式、恢复语义和持久化路径：

- ACP Skills run identity、status、backend/session state、permission、reply、recovery、terminal、result、validation、apply 与 archive state；
- ACP Skills canonical business lifecycle events、transcript JSONL/index、output revisions、result files、input manifest 和 workflow task/sequence state；
- ACP Chat conversation/session identity、title、archive state、remote session attachment、runtime options、permission、host context、display settings、message counts、plan 以及 transcript JSONL/index；
- 用户消息、assistant 最终内容、tool/plan/permission 等协议语义边界。

本轮没有迁移、清理或重写历史数据。旧 Chat row 中的 diagnostic keys 仍可被 reader 容忍，但不会再被 hydrate 为恢复状态；下一次正常业务保存会自然写出不含这些字段的新 payload。

### Diagnostic 数据

以下数据被视为观测证据，而不是业务正确性事实源：

- adapter info/stderr/lifecycle/jsonrpc trace；
- raw frame、transport detail、stack/cause 和调试 payload；
- profiler、Semantic Trace、Replay measurement 与 audit evidence；
- diagnostic-derived stderr tail 和 lifecycle observation；
- runtime warn/error log。

治理后的路由为：

- release：普通 info diagnostic 不持久化；warn/error 进入现有有界 runtime log；
- debug：先投影为去敏、截断、无 raw/data/stack/cause 的 evidence DTO，再进入 surface-specific audit；
- ACP Skills：继续复用既有 `.acp` audit 体系，不新增第二套 diagnostic ring；
- ACP Chat：写入 conversation owner 自己的 `diagnostics.ndjson`，不参与 hydrate；
- 既有 ACP Skills 低频 `run.json`、`prompt.md`、`stderr.log`、`runtime-logs.ndjson`、`final-state.json` 等支持性工件保持不变，避免破坏发布前的现有排障能力。

## 代码级治理

### Shared policy

- `acpDiagnostics.ts` 定义 persistence-safe evidence DTO，并统一执行 4 KiB 截断与 credential redaction。
- `acpDiagnosticRouter.ts` 是唯一 severity router；它不依赖 business store 或 Workspace publication。
- `bufferedWriteCoordinator.ts` 增加显式 opt-in 的 audit hard limit。只有传入限制的 audit key 使用 drop-oldest；transcript 和其他业务 channel 的默认 pending/retry 行为不变。

### ACP Skills

- 新运行与恢复运行的两个 adapter listener 复用同一个 diagnostic handler。
- 删除 diagnostic → `upsertAcpSkillRun({ event })`，因此 diagnostic 不再写 run row、run-event row 或发布 Workspace change。
- debug audit pending 上限为 2,048 条或 2 MiB，溢出按 oldest-first 丢弃并每个 overflow episode 记录一次 warning。
- terminal、shutdown、probe 和 refresh lifecycle 对 audit owner 执行 best-effort flush/release。

### ACP Chat

- 内存中的 40 条 diagnostic tail 和当前进程 Details/Copy 行为保留。
- serializer 与 hydrator 排除 diagnostic fields，diagnostic-only snapshot 不推进 `updatedAt`。
- debug audit 采用 `backendId + "\n" + conversationId` 稳定 owner key，并在 close/disconnect/archive/shutdown 时 flush/release。
- conversation/backend/synthetic owner 删除前先废弃 pending audit、等待在途 audit append 结束，再删除 storage，避免诊断写入复活已删除目录。
- production esbuild 用无副作用 stub 完全替换 Chat diagnostic audit 模块；release-elision 门禁同时检查模块 bytes 与 schema/component markers。

## 因果证据

生产 listener seam 测试在 prompt 保持 active 时注入 10,000 条 info diagnostic。注入前后逐项比较：

- in-memory canonical run projection；
- plugin run row；
- plugin run-event rows；
- transcript revision、event sequence 与 item count；
- status、result、permission 与 recovery state；
- ACP Skills Workspace change stream。

所有比较均保持不变，Workspace change 数为 0。随后释放同一 prompt，运行仍收敛为有效 `succeeded` result。恢复会话 listener 也通过相同的不变式检查。

这证明的是 `diagnostic → canonical persistence/publication` 的因果边已经归零；它不等价于测量生产磁盘耗时。

## 验证结果

| 验证 | 结果 |
| --- | --- |
| OpenSpec strict validation | 通过 |
| TypeScript `tsc --noEmit` | 通过 |
| ACP Chat 全套相关测试 | 105 passing |
| ACP Skills diagnostic/new-run/recovery 因果测试 | 通过 |
| diagnostic routing、redaction、buffer hard-limit 测试 | 通过 |
| Assistant Workspace diagnostic-only region identity 测试 | 通过 |
| runtime diagnostics release-elision | 通过；release exclusive bytes = 0 |
| Zotero core lite | 23 passing |
| Zotero UI lite / Replay production paths | 4 passing；Chat/Skills target-active 与 hidden/reopen 均通过 |
| lint | 通过 |
| production build | 通过 |
| Node core full command | 本轮相关套件通过；整库被 `test/core/155-topic-synthesis-split-runtime.test.ts` 的 7 个独立 Python gate 失败阻断，单文件可复现，调用链不经过本轮改动 |

## Replay 与后续真实 I/O 基线

本轮没有把 Replay 扩展为真实磁盘 I/O 执行器，也没有据此声明生产 I/O 耗时下降。real-Zotero UI lite 已验证现有 Replay production target、publication drain 和 Workspace hidden/reopen 行为未回归；此前保存的 live/boundary/silent 完整 trace matrix 不因本轮治理自动变成 R1 真实 I/O 基线。

若后续仍需要发布前的真实成本校准，应在 Zotero 7/9 宿主中额外记录物理 append/SQLite 调用次数、累计耗时、bytes、event-loop drift 和长任务。该校准是对本轮因果证明的补充，不是确认 diagnostic/business 边界正确性的前置条件。
