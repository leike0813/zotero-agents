# C14 验证记录

日期：2026-09-30。固定基线：`2fa6bc0c85e9c27223c718b66eae0c1686f7ee94`。

范围依据为 [#26 C14 决策](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5543869931)、[最终 wave 顺序](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5552013273) 和 [dryRun 补充](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5558577500)。本次复用 Broker、C07 Gateway、C08 暂存和 C02 canonical transcript，未新增依赖或独立 mutation store。

## OpenSpec verify

| 维度 | 核对结果 |
| --- | --- |
| 完整性 | 14 项任务；5 个 capability、9 条新增/修改需求 |
| 正确性 | 9/9 需求映射到实现，21/21 场景有行为验证 |
| 一致性 | 遵循 design 的七项决定，沿用既有所有权和错误模型 |

### 需求与场景证据

1. **Native catalog exposes only reviewed broker capabilities**（5 场景）：`zoteroNativeToolCatalog.ts` 的显式目录和可选可信 mutation 依赖保留只读组合。`250` 验证 current-view、非法字段、缺失 Broker、14 个读工具及 37 个完整工具；真实 `284` 冻结全部目录。没有 generic mutation、note-payload 或导航工具。
2. **Business mutation tools have reviewed tiers and preview semantics**（2 场景）：静态映射包含 11 个默认、12 个增强工具，分类按 `dryRun` 选择效果及增强 key。`250` 验证所有 tier、schema 与预览分类；真实 `284` 执行无效果预览和实际写入。`242` 以一个已删除父项及 100 个已删除子项验证展开超限返回 `resource_limited`，所有项仍在 Trash。逻辑列表、重复和重叠继续由共享 schema/Broker 校验。
3. **Managed authoring uses semantic inputs and stable source identity**（2 场景）：Broker 的 `normalizeManagedAuthoring` 复用 artifact validators；`102` 验证新 ID、未知 retained ID、当前 References basis 与 Score schema。真实 `284` 覆盖 custom/conversation/digest/references/citation/score 六种写入；`286` 在生产 Conversation 审批前后验证 generated IDs 保持相同。
4. **Mutation results preserve domain evidence without duplication**（1 场景）：`piConversation.ts` 持久化 operation/source ID/full domain receipt，catalog 按各操作投影 refs/revisions/counts/outcomes，Gateway 仅保存 domain receipt 引用。`241` 验证后来事实之后重复发布同一 receipt 不会改变父项或重复写入；`247` 验证这些事实不进入模型 context。真实 `284` 注入 domain receipt 发布失败：metadata 写入确已提交，返回 `state_unknown`、`recovery:reconcile`、无成功 value，仅调用一次，没有自动重放；`286` 检查单份 receipt 与原 source turn。
5. **Exact approval continues one original call**（3 场景）：Gateway continuation 重预检，并返回 `{result,pending?}`；`245` 验证匹配审批、过时事实续审批、事实变化时拒绝不执行。`256` 和真实 `286` 验证生产 Conversation 保留新 pending 与原 call/source turn，审批等待不再次调用模型。
6. **Trusted domain preflight precedes batch effects**（2 场景）：`245` 用一个被阻塞的 preflight 验证整个 batch 预检完成前无效果，验证审批等待释放 stage、续行重新准备、结构化失败、非法/过大计划清理。额外回归验证预检期间取消不会发布 permission，以及预审批清理失败返回 terminal failure，供 Conversation 持久化，避免丢掉 cleanup 事实。
7. **Stored attachment staging is owner-scoped and immutable**（2 场景）：`piTrustedNativeExecution.ts` 复用路径身份、附件 stager、prepared-files owner 与 quota lock。`248` 验证源变化不改变已暂存字节、外部/私有/alias/link/socket/FIFO 拒绝、并发配额、失败清理保留 reservation；`90-workflow-stored-attachment-import` 验证共享 cleanup owner 可重试。真实 `284` 使用 Zotero IOUtils 导入、替换 stored attachment 并验证清理。共享 `RuntimePathStat.isFile` 明确区分普通文件和特殊文件，不向插件导入 Node 文件 API。
8. **Conversation preserves mutation identity and renewed permission**（2 场景）：`piConversation.ts`、Workspace surface 和 `piTurnPreparation.ts` 维持 canonical evidence 与 safe plan 分离；`256` 验证更新 pending、unknown 停止续调用；`192` 扩展已有 DOM identity 用例，使实际 permission plan 存在时 transcript-only 更新仍保留 chrome。`245` 验证未知领域结果的恢复事实与 receipt 引用；Broker `102` 的原有 unknown/repair-required 用例继续通过。
9. **Prepared mutation identity includes actual domain and file facts**（2 场景）：Broker prepared digest 包含 scope/operation/input/observations/plan/file fingerprint，排除 private token/TTL；`102` 验证相同事实 digest 稳定、文件或 revision 变化 digest 改变、declared manifest 与 staged snapshot 不符时拒绝。执行期仍复核 prepared facts。

审阅未发现 C14 的 CRITICAL、WARNING 或需要新增抽象的 SUGGESTION。所有权、schema、场景、设计与现有代码模式均完成核对；下列平台和后续 wave 限制不计为已验证能力。

## 可执行验证

Node 使用现有分片，每条命令只指定一个 shard。五个受影响分片共 56 个文件通过：

- `npm run test:node -- --shard runtime-provider-execution`：15 文件；最后一次包含 Gateway 取消/cleanup 修正和普通文件检查，exit 0。
- `npm run test:node -- --shard runtime-platform-persistence`：10 文件；最后一次包含共享 `isFile` 变更，exit 0。
- `npm run test:node -- --shard assistant`：7 文件，exit 0。
- `npm run test:node:zotero-host`：16 文件，exit 0；新增 expanded Trash 用例另跑 `242`，9 项通过。
- `npm run test:node -- --shard workflow-host`：8 文件；包含 shared prepared-file cleanup 重试修正，exit 0。

各 slice 按 TDD 实施；收尾的取消/预审批 cleanup 两项用例先出现 2 failing，修正后 2 passing。特殊文件、并发 quota 与 cleanup 重试也验证过修正前的失败。没有以覆盖率或指令文本断言增加测试。

真实宿主均使用标准 `test:zotero:core` runner 和隔离 `.scaffold/test`。可执行文件：`/home/joshua/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/9.0.6/Zotero_linux-x86_64/zotero`。

```sh
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/home/joshua/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/9.0.6/Zotero_linux-x86_64/zotero npm run test:zotero:core

ZOTERO_TEST_GREP='Pi Tool Gateway|Pi Zotero Native Tool Catalog|Pi Conversations|Pi Trusted Native' ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/home/joshua/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/9.0.6/Zotero_linux-x86_64/zotero npm run test:zotero:core
```

完整 core：147 passed。随后加入最后的普通文件检查、预检取消/清理修正和 receipt 发布失败 canary，以上定向命令再构建当前源码后为 57 passed。两者均 exit 0，没有把较早一次 145 passed/2 failed 的构建竞态结果作为通过证据。

`npx tsc --noEmit`、`npm run lint:check`、`npm run build` 和 `git diff --check` 通过。build 包含各页面与共享包的 TypeScript 检查、浏览器 bundle 和 XPI 打包；没有新增浏览器 Node guard。

临时验证日志存于 `/tmp/pi-c14-*.log`，本报告保存可重复命令和结论，临时日志不作为长期事实源。

## 规格同步与交付边界

官方 verify/sync/archive 技能用于本 change。五份 main specs 已同步：新增 7 条、修改 2 条，共 9 条需求与 21 个场景；脚本逐块比对 delta/main 并确认未涉及的原有需求和旧场景均保留。Broker 原有 Purpose 占位也补为实际能力描述。

change 与五份受影响 main specs 的 strict 校验通过。全仓 `openspec validate --specs` 为 378 passed、0 failed；补齐本次 Broker Purpose 后，全仓 strict 为 224 passed、154 failed，失败项均是其它规格的既有 Purpose 占位警告。本次没有修订无关能力。

14/14 任务完成，change 已归档为 `2026-09-30-add-pi-zotero-mutation-tools`，`.openspec.yaml` 随目录保留。交接入口为 `artifacts/builtin-pi-agent-runtime-handoff.md`，下一项为 C15 导航工具。C17 Skill Run、C18 诊断、C19 启动恢复与异常退出残留对账、C20 Workspace E2E/完整 Zotero 版本与 OS 矩阵均未在本 change 中实现或声称验证。旧 C08 read/edit/write 的特殊文件边界不属于本次附件暂存合同；后续采用共享 `isFile` 证据时须单独验证。

未提交、推送或发布；未修改来源 Zotero profile/真实文献库。
