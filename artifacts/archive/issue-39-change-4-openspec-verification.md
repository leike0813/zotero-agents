# OpenSpec 实现核验：canonicalize-managed-literature-artifacts

核验对象为 PR #40 合并基线 `52624e6133e053cf307536248682ba3187801c7d`
上的未提交实现。已按项目 `openspec-verify-change` 流程读取 proposal、design、
tasks 和全部十份 delta spec，共 50 条 requirement、154 个 scenario。
`openspec status` 的 planning complete 不代表实现任务完成。

| 维度 | 当前结论 |
| --- | --- |
| 完整性 | 33/34 tasks 完成；上游固定提交已完成，尚未同步/归档 |
| 正确性 | 50 条 requirement 已建立实现映射；下列测试覆盖关键行为边界 |
| 一致性 | Broker 私有 owner、显式 Workflow projection、Application 投影和 SQLite 生命周期边界保持独立 |

## Requirement 与行为证据映射

| Delta spec | 实现事实源 | 验证证据 |
| --- | --- | --- |
| managed-literature-artifacts | `zoteroManagedNotes.ts`、`zoteroHostCapabilityBroker.ts`、canonical contract set | 102 全套 90 passing，包含 Citation 依赖损坏/重复时完整可读回归；275 真实 Zotero 三项事务/清理测试 |
| zotero-host-capability-broker | Broker 六种 semantic operation、managed detail、mutation authority | 102 + 107 最终合跑 139 passing |
| workflow-host-api-v12 | `hostApi.ts`、`workflowHostContract.ts`、`types.ts` | 187 + 46 共 22 passing；原始 applyAnalysis DTO 未知字段在投影前拒绝 |
| custom-note-import-export | `literatureDigestNotes.mjs`、import/export hooks | 45 全套 32 passing；包含实际执行 debug producer 后读取三种 canonical note |
| literature-digest-artifact-contract | standalone validator、canonical artifact schema、bundle projections | 46 正负验证、194 全套 25 passing、158 + 64 全套 24 passing、272 bare score 合同 |
| literature-workbench-workflows | analysis hooks、shared readiness、private applyAnalysis | UI48 全套 22 passing；21 + 50 full 模式 43 passing、0 pending |
| literature-bundle-workflows | `workflowHostOwners.ts`、`researchBundleService.ts`、`literatureBundle.mjs` | 194 全套 25 passing；47 全套 27 passing，包含旧 ZIP 确认/取消、损坏源拒绝及重复导入 |
| synthesis-native-reference-canonical-surface | TS/Rust Application、repository、closed Source Reference/Citation schema | 专项 47 passing；Rust 335 tests + doc-tests、build/clippy/fmt 通过；Host adapter 保留完整 stale evidence |
| literature-artifact-migration | migration service、Broker 私有 parent-set writer、pluginStateStore | 264 全套 16 passing；raw HTML 不持久化、跨 note 重复、100+ receipt 续跑、单一 authority cleanup failure 保留 canonical |
| task-runtime-ui | Dashboard `MigrationsRegion`、typed dashboard projection | UI264 验证 runtime-issued refs、相同内容 DOM identity、空/不可用页面不触发工作；PR40 region identity 基础测试 |

所有测试日志、命令及其证据边界记录在 `issue-39-change-4-verification.md`、
`issue-39-change-4-native-verification.md` 与 `issue-39-change-4-synthesis-verification.md`。
Node transaction passthrough 仅供测试环境执行，原子性结论来自真实 Zotero。

## 后续状态

3.4 已完成：上游 `skill/literature-analysis` 与本项目暂存 gitlink 均为 `5748a71ed2acb6614c071e0ddc81a6ad6bcf969c`。Citation 旧格式拒绝的 CLI 回归测试已通过。

7.4 保持未完成：本次按用户指令完成修复、上游提交/推送和 submodule 更新，未执行主规格同步或 change 归档。当前为 33/34 项完成。

本地实现、定向测试与构建已有证据；这不表示 154 个 scenario 各有独立自动化测试。中文镜像按用户要求停止更新，未执行正式发布或主项目实现提交。
