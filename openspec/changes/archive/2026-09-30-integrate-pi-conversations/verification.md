# C16 实现验证

核对日期：2026-09-30。固定源码基线：`4d95a25c`。实施依据：[已接受的 C16 方案](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5549998298)与本 change 的 proposal、design、四份 delta spec。验证按项目 `openspec-verify-change` skill 检查完整性、正确性与设计一致性；不包含发布审批、规格同步、归档或 Git 提交。

| 维度 | 结果 |
| --- | --- |
| 完整性 | 9/9 项任务完成；7 项 requirement 均有生产实现 |
| 正确性 | 10 项 scenario 均有实现及行为测试证据 |
| 一致性 | Conversation 组合已有边界；共享 Workspace、canonical JSONL 和受管文件继续由原 owner 持有 |

## 规格与证据

| Requirement / scenario | 实现 | 验证 |
| --- | --- | --- |
| Final Workspace lane and source registry；独立窗口选择 | `src/shared/assistantWorkspaceSourceRegistry.ts`；`src/sidebar/assistantWorkspaceShell.js` | `260` 检查两 lane、五 source、默认项、每 lane 的窗口内记忆、source/lane 数量与 attention、过期导航拒绝；既有 ACP 和 SkillRunner characterization 保留 |
| Pi uses the shared Workspace publication plane；Details 打开时流式文本 | `src/modules/piConversationWorkspaceSurface.ts`；共享 publication、child 与区域组件 | `258` 阻塞真实 coordinator 的 page read，先观察新 owner 的 loading 空页再观察 ready 页；`192` 检查 transcript-only 及 loading→ready 时所有非 transcript 区域 DOM identity |
| Optional Conversation auxiliary model selection；删除辅助配置 | `src/modules/piProviderConfiguration.ts`；Backend Manager | `242` 检查辅助配置引用、删除与失效；`251` 覆盖既有配置页面；`257` 检查无辅助调用的确定性 fallback |
| Conversation turn admission and execution；第二 turn 与 interrupt | `src/modules/piConversation.ts`；C02 admission、C04 Provider、C06 Preparation、C07 Gateway | `256` 13 项检查 durable history、工具 batch/续调用、审批、取消、失败收敛与手动压缩；`240/247` 覆盖底层准备和 runtime；真实 Zotero `286` 运行工具、第二 turn 与 owner 生命周期 |
| Explicit one-send resources；原文件变化与 preflight 失败 | Conversation composer；`src/modules/piTrustedNativeExecution.ts` | `256` 检查纯附件、捕获/重新校验、拒绝 Local Network 与发送前取消均不接纳、不清空资源；`248` 检查历史 snapshot、精确只读 ref、数量/大小/配额和原子提交；`260` 检查接纳 revision 的 wire/projection；`192` 检查清空草稿边界 |
| Conversation titles and lifecycle；rename 竞态与 cleanup 失败 | Conversation 标题任务；C02 metadata/CAS/cleanup；共享 drawer | `257` 11 项检查最小输入、48 字符、独立 usage、rename/切换/归档/删除竞态与失败 fallback；`241` 检查 cleanup_pending 不可恢复；`258` 检查归档/恢复 identity 与主调用/标题 usage；`260` 检查手动 rename 路由；`192` 检查删除确认缺失时不发送动作 |
| Immutable managed snapshots；复制时超过已声明大小 | C08 snapshot；`src/modules/runtimeFileTransfer.ts` | `184/248` 共 20 项检查分块读取上限、增长/缩小、回滚、共享 quota 和扫描不完整时拒绝；真实 Zotero `286` 验证宿主有界读取 |

测试编号对应 `tests/runtime/`、`tests/assistant/`、`tests/dashboard/` 或 `tests/zotero/core/lite/` 下同编号文件。既有 `tests/acp/184-assistant-workspace-publication-data-plane.test.ts` 和 `tests/skillrunner/94-skillrunner-sidebar-entrypoints.test.ts` 随共享 shell 迁移更新。

## 检查记录

| 命令 | 结果与范围 |
| --- | --- |
| `npm run test:node` | 最后一次全量运行 27/28 分片通过；tooling-runtime 的既有 `264-literature-artifact-migration` 用例触发 2 秒超时，见 `/tmp/pi-node-final.log`。不能记作单次全量通过 |
| `npm run test:node -- --shard tooling-runtime` | 原失败分片独立重跑通过，21 文件，见 `/tmp/pi-tooling-rerun.log` |
| `npm run test:node -- --shard runtime-provider-execution` | 最终 coordinator/runtime/preparation/title 版本通过，13 文件，见 `/tmp/pi-provider-close.log` |
| `npm run test:node -- --shard runtime-platform-persistence` | 最终 owner/persistence 版本通过，10 文件，见 `/tmp/pi-touched-final.log` |
| `npm run test:node -- --shard assistant` | 最终 shell 数量/attention 与 registry 派生版本通过，7 文件，见 `/tmp/pi-assistant-ssot.log` |
| `npm run test:zotero:core` | 107 passed、0 failed、1 平台限定 pending；标准 runner，当前源码本地构建，Linux Zotero **9.0.4**，见 `/tmp/final-core2.log` |
| `npx tsc --noEmit`；`npx tsc -p tsconfig.sidebar.json --noEmit` | 通过；registry 保留源/action 的精确类型及既有 compile-time drift guards，见 `/tmp/pi-tsc-complete.log` |
| `npm run build` | 通过，见 `/tmp/pi-build-last.log`；生产浏览器打包仍拒绝未许可的 Node/Bun builtin |
| `npm run lint:check` | 通过，见 `/tmp/pi-lint-last.log` |
| `openspec validate integrate-pi-conversations --strict`；`git diff --check` | 通过 |

#26 中的 `test:node:core` 在本仓库没有脚本；使用现有全量 Node runner 及受影响分片，没有建立平行 runner 或增加超时。早期冷加载 cleanup hook 的 5 秒超时通过 beforeAll 预热现有模块图解决，beforeEach 限时保持原值。

真实宿主验证最初发现 C02 INSERT 重复命名参数未被绑定、空字符串形式的 NULL，以及成本标量投影差异；已在共享持久化边界修正，Node 的宿主式 SQL seam 和完整 core 均通过。末次完整 core 的构建时间为 16:03:27；其后的改动限于 Workspace 操作入口、删除确认、数量/attention 和 action registry 派生。最终浏览器组合另作定向补验。

## 设计一致性与问题分级

**CRITICAL：0。** 七项 requirement 均有实现，没有以占位 adapter 或一次性 text stream 代替 Conversation。主历史只存 canonical JSONL；SQLite 保留 owner 元数据和可重建标量。资源路径暂存于发送输入，提交后使用 managed ref。每次模型调用准备并记录安全事实，工具只能经 Gateway 调度。支持 action 的 source 映射只在浏览器安全 registry 声明，旧 publication 表从该 registry 派生。

**WARNING：2，均为后续 wave 的验证或生命周期边界。**

- 本次真实宿主是系统 Zotero 9.0.4，未运行正式 Zotero 7/9/10 × OS 矩阵，也未重做真实账号 Provider smoke。C20 必须按 `tests/zotero/compatibility-matrix.json` 完成发布验证；这里的 fixture Provider 与 107 项 core 不能替代该证据。
- 重启时的未结算 turn、待审批调用和未知工具效应保持 `recovery_required`，不自动重放。`dispose()` 对未响应取消的 Provider 等待仍需 C19 统一处理有界 teardown 与恢复入口；本 change 不宣称具备完整异常恢复。

**SUGGESTION：1。** C02 admission/append 仍扫描完整 owner 历史，长历史吞吐需实测后由持久化 owner 优化；本次没有增加第二份 body mirror 或性能正确性缓存。

C16 的产品组合实现可收尾；完整 MVP 的审计、恢复与发布仍由 C18–C20 负责。

## 最终收尾记录

- `npx tsx node_modules/mocha/bin/mocha` 定向运行 `192/258/260`、ACP publication `184` 和 SkillRunner entrypoints `94`：**144 passing**，见 `/tmp/pi-workspace-final.log`。支持 source 的 action 映射改为 registry 派生后，既有共享行为与 DOM identity 均保持通过。
- `ZOTERO_TEST_GREP='Pi Conversations' npm run test:zotero:core`：最终浏览器组合 **2 passed**，见 `/tmp/pi-zotero-final-target.log`，工具、第二 turn、生命周期与宿主分块文件读取均通过。
- 最终 `npm run build` 通过（16:29:40 production build）；主工程和 sidebar 类型检查通过。`npm run lint:check`（全仓库 Prettier 与 ESLint）通过。构建生成的 help-docs manifest 时间戳已还原，本 change 不包含生成文档变更。
- 任务 9 已完成，9/9 任务全部勾选；源码、测试、交接与验证记录保留在工作区，未同步主规格、未归档、未提交。
