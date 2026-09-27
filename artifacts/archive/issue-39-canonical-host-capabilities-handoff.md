# Issue #39 第五个 change 交接记录

## 当前任务

当前 OpenSpec change 为 `canonicalize-zotero-navigation`，目标是把 Zotero
界面导航收敛到 Broker 的七个 canonical capability，并从 Workflow Host、旧
Host Bridge context-open 路由和旧 CLI open 命令中完成硬切。当前工作已暂停，
没有提交、推送、切换分支、发布、预构建或归档。

OpenSpec 状态：`spec-driven`，4/4 规划工件齐全，任务清单 22 项中 20 项已勾选，
2 项仍未勾选（中文审阅镜像翻译/定稿，以及需在这些证据完成后执行的 sync/archive）。验证命令
`openspec validate canonicalize-zotero-navigation --type change --strict`
当前通过。

固定实现基线为 `b7a4c9536640d4c4947488ba26b0b42f059df34a`。Zotero 参考基线为
7.0.32、9.0.6、10.0.1。用户原有的
`addon/content/help-docs/manifest.json` 单行改动仍在，未被本任务修改。

## 已完成的实现

### Broker 与服务投影

- `src/modules/zoteroHostCapabilityBroker.ts` 已提供七个导航入口：
  `focusZotero`、`selectLibraryView`、`selectCollection`、
  `selectSavedSearch`、`revealItems`、`openItem`、`openReaderLocation`。
- 输入使用 portable refs，包含严格字段校验、目标范围检查、取消检查、窗口捕获、
  bounded reveal、Reader 类型和位置校验；无法证明目标窗口或位置时 fail-closed。
- `src/modules/hostBridgeCapabilityRegistry.ts` 和
  `host-bridge/contracts/capabilities.v2.json` 已登记七个 `navigation.*` 能力。
- `src/modules/hostBridgeServer.ts` 已移除四个旧 context-open 路由的正常分发，通用
  capability 调用会按 operator/interactive/automated/invalid scope 控制导航访问。
- `src/modules/zoteroMcpProtocol.ts`、`src/modules/zoteroMcpServer.ts` 已复用 Host
  Bridge handler，执行一次请求头 scope 解析；自动化或非法 scope 会隐藏并硬拒绝导航。

### Workflow Host

- `WorkflowHostApiV12.navigation` 已从
  `src/workflows/types.ts`、`src/workflows/hostApi.ts`、
  `src/workflows/workflowHostContract.ts`、`src/workflows/workflowHostOwners.ts`
  以及治理测试中移除。
- `src/workflows/workflowHostErrorContract.ts` 已移除旧的
  `navigation.openItem/openNote/openCollection/openSelection` 交互成员。
- v12 计数已经按 24 个顶层 key、22 个模块、92 个 callable 更新到文档和测试。

### CLI 与生成面

- Rust CLI 已新增 `navigation` 顶层命令及七个 leaf，支持 schema、严格输入和单信封
  输出；相关实现位于 `cli/zotero-bridge/src/args.rs`、`commands.rs`、`contract.rs`、
  `main.rs`、`surface.rs`。
- `host-bridge/contracts/cli-commands.v2.json` 已加入七个 canonical navigation
  命令；渲染器已新增 navigation 分区。
- 源控的 addon/profile Host Bridge 命令卡已生成七个 navigation 卡片，旧四个
  `context ... open` 卡片已删除；中文审阅镜像翻译/定稿由其他 agent 接手，当前检查明确标记为 stale。
- `doc/host-bridge-cli.md`、`doc/components/host-bridge-capability-registry.md`、
  `doc/components/zotero-host-capability-broker-ssot.md`、
  `doc/components/workflows.md` 和两个 OpenSpec 主规格已同步当前导航归属。

## 尚未完成的任务

以下状态以 `openspec/changes/canonicalize-zotero-navigation/tasks.md` 为准。不要在
没有对应证据前直接把任务勾选为完成。

### 2.5 清理旧 Broker 入口

已完成。生产代码已删除 `openLegacyZotero*`、不可达的旧 `openZotero*` 辅助函数、
旧 context-open handler 及导航专用错误分支；CLI 原始契约中的四个旧命令和加载器
过滤器也已删除。生产范围搜索只剩测试中的 404 回归路径断言。

### 6.1 Zotero 原生矩阵

已新增并接入 `test/core/188-zotero-navigation.zotero.test.ts`（full core 与
compatibility probe）。必须在可用的 Zotero 7.0.32、9.0.6、10.0.1 runtime 中执行
该导航套件，至少覆盖：

- Library root、collection、Saved Search；
- regular item、PDF attachment、annotation；
- 已存在 Reader tab 和 cold Reader open；
- captured window、exact order、Reader page/EPUB CFI bounds、关闭窗口后的
  fail-closed，以及每个用例的清理。

已在本机 Linux runtime 中按版本逐个执行导航套件，三次均通过；未执行 Windows/macOS
跨平台矩阵。receipt 分别为：

- Zotero 7.0.32：`/tmp/zotero-agents-compat/zotero-7-linux-x64-behavior-full-d2731b8e-7a07-449f-a353-feae14a58ed1/receipt.json`。
- Zotero 9.0.6：`/tmp/zotero-agents-compat/zotero-9-linux-x64-behavior-full-ee0d1c33-c45b-4ea2-88e8-d310141f33da/receipt.json`。
- Zotero 10.0.1：`/tmp/zotero-agents-compat/zotero-10-linux-x64-behavior-full-2e184e66-a4d1-4178-9052-a296bc559057/receipt.json`。

导航套件覆盖 Library root、collection、Saved Search、regular item、真实 PDF
attachment、annotation、cold/existing Reader page、EPUB dispatch 和 cleanup。跨平台矩阵
仍未运行，不能把本机三版本结果扩大为 Windows/macOS 成功。

### 6.2 文档和主规格

已复核并完成 Broker SSOT、Workflow 文档和
`openspec/specs/host-bridge-workflow-control/spec.md`、
`openspec/specs/zotero-host-capability-broker/spec.md`。任务复核时要：

1. 检查这些改动是否完整覆盖 Broker、Host Bridge 生命周期、CLI、MCP 和 Workflow
   Host 当前所有权；
2. 搜索旧 route、旧 Workflow navigation member 和旧计数；
3. 确认没有引入 mutation、PI、release 或 publication 声明；
4. 确认变更文件本身没有与 change spec 冲突，再将 6.2 勾选。

### 6.3 Host Bridge 语义审阅

已运行 `npx tsx scripts/host-bridge-semantic-review-context.ts`，结果要求人工
审阅（`reviewRequired: true`）。Minimum/Generic/Hermes 组合已复核并写入
`openspec/changes/canonicalize-zotero-navigation/implementation-evidence.md`：

- substantive instruction line count；
- normalized prose character count；
- `unmapped`、`downgraded`、`unauthorized-dropped`、
  `intra-package-duplicate` 四类计数；
- 每个已有 advisory warning 的 disposition；
- DEL-09/10/11 以外不得删除任何语义单元。

不能只以行数门禁代替逐条语义 parity 审阅。

### 6.4 生成面与中文镜像

英文生成面已刷新并通过内容检查；中文审阅镜像翻译与定稿交由其他 agent，本项暂不宣称完成。当前镜像因导航命令契约变化而过期，`npm run check:host-bridge-review-mirror` 会明确报告 stale，不能以旧 provenance 掩盖。

已知英文生成面结果：

- `npm run render:host-bridge-content` 成功；
- `npm run check:host-bridge-content` 成功且无 render diff；
- 旧四个 context-open 卡片已移除，新 navigation 卡片已生成；
- `addon/content/help-docs/manifest.json` 的用户原有改动仍保留。

翻译 agent 完成镜像后，必须从空暂存目录执行 prepare/finalize，并再次运行
`npm run check:host-bridge-review-mirror`；不能手工编辑生成卡片或 provenance。

### 7.1 全量验证

已完成或部分完成的验证如下：

- `npx tsc --noEmit`：通过；
- `cargo test --manifest-path cli/zotero-bridge/Cargo.toml --quiet`：通过，124
  个 unit/integration 测试和 14 个 contract 测试；
- Broker/MCP/Host Bridge/Workflow focused tests：已通过已更新的 canonical cases；
- `git diff --check`：通过；
- `npm run test:zotero:compatibility:plan`：通过，仅为计划检查；
- `npm run check:host-bridge-doc-sync -- --baseline-ref b7a4c9536640d4c4947488ba26b0b42f059df34a`：
  通过，报告 27 个既有 advisory depth warning，四类映射计数为零；
- `npm run test:zotero:core`：45 项通过，2 项失败，均为现有环境/核心测试问题：
  selection fixture 使用无效 `itemType` 字段，以及 managed-note transaction 期望
  `execution_failed` 但得到 `invalid_ref`；需在最终报告中标为未解决的既有失败，
  不能伪报全绿；
- `npm run lint:check`：失败，Prettier 报告既有格式问题和本次触及的文件；不要用
  全库 `--write` 覆盖用户改动。
- `npm run build`：失败于本次 Reader annotation 错误类型，已修正为稳定的
  `invalid_ref` item/wrong_kind；修正后重新运行已通过。
- `npm run test:zotero:core:full`：入口已移除 Node-only
  `test/core/12-handlers.test.ts`，现可正常构建并启动 Zotero；未过滤执行仍会到达既有
  selection-context fixture 失败。新增入口边界测试通过。
- `npm run test:zotero:ui`：2 个 ACP Workspace publication timeout 失败，属于
  现有运行环境问题；无导航相关失败。
- `npm run test:zotero:compatibility:plan`：通过，仅证明六个阻塞作业可生成，不是
  三版本运行证据。

仍需决定是否能在当前环境运行 Node、UI、完整 Zotero runtime、兼容性矩阵和构建；
不能运行的项目要记录“unavailable evidence”，不能标记成功。

建议最终复跑的最小命令集：

```sh
npx tsc --noEmit
cargo test --manifest-path cli/zotero-bridge/Cargo.toml --quiet
npm run check:host-bridge-content
npm run check:host-bridge-review-mirror  # delegated translation pending
npm run check:host-bridge-doc-sync -- --baseline-ref b7a4c9536640d4c4947488ba26b0b42f059df34a
openspec validate canonicalize-zotero-navigation --type change --strict
git diff --check
```

### 7.2 官方 OpenSpec 验证

已按 `.agents/skills/openspec-verify-change/SKILL.md` 的流程检查 proposal、design、
specs、tasks 和实现证据；20 个已勾选任务均有实现依据，6.4 的中文镜像翻译/定稿
已明确交接，7.3 依赖该证据。主规格未发现
矛盾要求；`openspec validate` 严格校验通过。

### 7.3 同步和归档

只有 2.5、6.1、6.2、6.3、6.4、7.1、7.2 全部完成并有证据后，才可考虑官方 sync
和 archive。归档前要确认：

- 第五个 change 的所有任务均为 `[x]`；
- Issue #39 的五个原始 change 都已完成；
- 归档不会覆盖用户原有 manifest 改动；
- 没有执行 commit、push、release-set、prebuild、publication 或 Gitee 同步。

在上述条件满足前，不要运行 archive，也不要修改 Git 历史。

## 关键文件索引

实现和契约：

- `src/modules/zoteroHostCapabilityBroker.ts`
- `src/modules/hostBridgeCapabilityRegistry.ts`
- `src/modules/hostBridgeServer.ts`
- `src/modules/zoteroMcpProtocol.ts`
- `src/modules/zoteroMcpServer.ts`
- `src/workflows/hostApi.ts`
- `src/workflows/types.ts`
- `src/workflows/workflowHostContract.ts`
- `src/workflows/workflowHostErrorContract.ts`
- `src/workflows/workflowHostOwners.ts`
- `host-bridge/contracts/capabilities.v2.json`
- `host-bridge/contracts/cli-commands.v2.json`

CLI 和生成脚本：

- `cli/zotero-bridge/src/{args.rs,commands.rs,contract.rs,main.rs,surface.rs}`
- `scripts/host-bridge-command-contracts.ts`
- `scripts/render-host-bridge-surfaces.ts`
- `addon/content/host-bridge-skills/`
- `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/`
- `artifact/host-bridge-review/`

测试和 OpenSpec：

- `test/core/101-zotero-mcp-server.test.ts`
- `test/core/102-zotero-host-broker-capability-api.test.ts`
- `test/helpers/zoteroHostCapabilityBrokerHarness.ts`
- `test/node/core/187-workflow-host-contract-governance.test.ts`
- `openspec/changes/canonicalize-zotero-navigation/tasks.md`
- `openspec/changes/canonicalize-zotero-navigation/implementation-evidence.md`
- `openspec/changes/canonicalize-zotero-navigation/{proposal.md,design.md}`
- `openspec/changes/canonicalize-zotero-navigation/specs/`

## 当前完成判据

本 change 只有在以下条件同时满足时才算完成：

1. tasks.md 的 22 项全部为 `[x]`；
2. 旧 Broker helper、旧 context-open route、旧 CLI command 的生产路径和原始契约
   均清理，且只删除 DEL-09/10/11；
3. Zotero 7/9/10 原生矩阵取得可复核证据，或在任务明确允许时把不可用环境记录为
   外部阻塞并得到用户决定；
4. 语义审阅完成并记录四类零计数、指标和 warning disposition；
5. 源控生成面、内容检查、中文镜像检查、TypeScript、Rust、focused/full 可运行
   测试和 OpenSpec verify 均有结果；
6. implementation-evidence.md 与本交接记录不再把 unavailable、既有失败或人工
   审阅要求写成成功；
7. 用户明确允许时才执行 sync/archive，且仍不提交 Git 历史。
