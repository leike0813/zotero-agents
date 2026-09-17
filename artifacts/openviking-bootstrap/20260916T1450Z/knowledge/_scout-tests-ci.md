# zotero-agents 质量与交付基础设施侦察报告

- 侦察对象：`tests/`、`scripts/`、`.github/workflows/`、`package.json` scripts
- 侦察约束：**严格只读**。未修改任何既有文件（仅新建本报告）、未做 git 写操作、未安装依赖、未运行任何测试或构建
- 事实源优先级：代码 > `docs/` > 注释。所有条目标注【事实】或【推测】；每个结论给 `路径:行号`
- 行号以本次侦察时的工作区为准。`node_modules/zotero-plugin-scaffold/dist/shared/zotero-plugin-scaffold.DQYuTa0n.mjs` 在下文简写为 `scaffold.DQYuTa0n.mjs`
- 环境：Ubuntu 6.8 / x86_64；`DISPLAY=:99`（Xvfb 存活）；`ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 在 `.env` 中已设置且指向可执行文件

---

## 0. 速览

1. 【事实】`tests/` 共 **955 个文件**，文本约 **57.8 万行**；其中 **324 个 `*.test.ts`**、49 个非测试 `.ts` 支撑文件、**582 个 fixtures**。
2. 【事实】Node 侧测试 **308 个文件 / 28 分片 / 11 个 domain**，全部由 `scripts/run-node-test-shards.ts` 发现与归属；`tests/zotero/**` 被显式排除（`:368-381`）。
3. 【事实】真实 Zotero 宿主测试只有 **13 个测试文件**（`tests/zotero/{core,ui,workflow}/{lite,full}`）+ 2 个兼容性 suite，全部走 `zotero-plugin test`，**必须有真实 Zotero 二进制**。
4. 【事实】`npm test`（`test:node`）**不包含任何真实 Zotero 测试**，也不包含 `tests/zotero/**`。
5. 【事实】PR / release 门禁是两条 6 项串行 fail-fast 流水线，差别仅在最后一项 `test:lite` ↔ `test:full`（`scripts/ci-gate-plan.ts:31-38`）。
6. 【事实】`scripts/` 117 文件覆盖 8 个交付域；其中 **28 个 `check-*` 里有 2 个实际会跑 `cargo run` 并写 `target/`**，并非纯校验。
7. 【事实】E2E 不修改真实库靠的是「scaffold 先 `emptyDir(.scaffold/test/*)` + `fs.cp` 复制副本后运行」，**没有源目录只读校验**（构造性保证，非强制）。
8. 【事实】`.github/workflows/` 10 个 workflow：2 个自动触发（CI、Release），1 个路径触发（verify-synthesis-sidecar、deploy-user-docs），其余 `workflow_dispatch` 手动。
9. 【事实】失败定位靠：mocha 原始输出 + node shard 结构化摘要 + `.scaffold` reporter HTTP 通道 + Zotero 侧 `artifacts/test-diagnostics/*.json`。
10. 【事实】`tests/fixtures` 共 **112.8 MiB**，其中 `selection-context` 98.5 MiB（含 23 篇真实论文 PDF），另有约 4 MiB 语料在仓内 **0 引用**。

---

## 1. 测试体系地图

### 1.1 规模与构成

| 项 | 数值 | 证据 |
|---|---|---|
| `tests/` 文件总数 | 955 | `find tests -type f \| wc -l` |
| 文本行数 | 578,200 | `find tests -type f \( -name '*.ts' ... \) -exec cat {} + \| wc -l` |
| `*.test.ts` | 324 | 同上 find |
| 非测试 `.ts`（setup / helpers / shared 支撑） | 49 | 同上 |
| `tests/fixtures` 文件 | 582 / 112.8 MiB | `du -sh tests/fixtures` |

【事实】测试文件按顶层目录分布（`.test.ts` 计数）：

| domain | 目录 | 文件数 |
|---|---|---|
| synthesis | `tests/synthesis` | 67 |
| workflow | `tests/workflows` + `tests/workflow-*` | 28 + 22 = 50 |
| acp | `tests/acp` | 33 |
| skillrunner | `tests/skillrunner` | 32 |
| tooling | `tests/tooling` | 31 |
| runtime | `tests/runtime` | 22 |
| host-bridge | `tests/host-bridge` | 22 |
| ui | `tests/ui` + `tests/shared` | 16 + 1 = 17 |
| zotero-host | `tests/zotero-host` | 16 |
| dashboard | `tests/dashboard` | 13 |
| assistant | `tests/assistant` | 5 |
| （真实宿主） | `tests/zotero` | 16 |
| 合计 | | **324** |

【事实】`workflow-*` 22 个文件分布在 10 个目录：`literature-workbench-package`(5)、`literature-analysis`(5)、`tag-regulator`(4)、`literature-explainer`(2)、`tag-auditor`/`tag-bootstrapper`/`tag-vocabulary`/`literature-translator`/`literature-metadata-curator`/`literature-deep-reading`/`mineru` 各 1。

### 1.2 Node 域分组：`scripts/run-node-test-shards.ts`

【事实】**发现规则**（`:362-383`）：从 `tests/` 递归 `readdir`，跳过 `relativePath === "tests/zotero"` 或以 `tests/zotero/` 开头者（`:368-372`），只收 `.test.ts`，`localeCompare` 排序。

【事实】**归属规则**（`:111-356` 的 `SHARDS` 表，共 28 个分片；`:93-97` 的 `inDirectory` 要求路径以 `tests/<dir>/` 开头）。分片选择不是纯目录式的：多个分片用**文件编号阈值**或**文件名正则**切分，例如：

```ts
// scripts/run-node-test-shards.ts:157-166 (host-bridge)
select: (filePath) =>
  inDirectory(filePath, "host-bridge") && testNumber(filePath) < 139,
...
select: (filePath) =>
  inDirectory(filePath, "host-bridge") && testNumber(filePath) >= 139,
```

【事实】`workflow-*` 用正则与前缀覆盖全部子目录（`:336-352`）：

```ts
/^tests\/workflow-(?:literature-(?!workbench)|mineru\/)/
filePath.startsWith("tests/workflow-literature-workbench-package/")
filePath.startsWith("tests/workflow-tag-")
```

【事实】**归属校验**：每个文件必须恰好命中 1 个分片；出现 `unassigned` 或 `duplicates` 时 `--list-shards` 与正式运行都直接返回 1（`:745-754`）。这兑现了 `docs/testing-framework.md:8` 的承诺。

【事实】**每分片命令**（`:433-445`）：`process.execPath <node_modules/tsx/dist/cli.mjs> node_modules/mocha/bin/mocha <files...> --require tests/setup/zotero-mock.ts [转发参数] --exit`，cwd 为仓库根。

【事实】**无超时、无并发**：`runSelectedShards` 为 `for` 循环串行 `await runShard(...)`（`:680-701`），脚本内无 timeout 常量；`package.json:139` 的 `test:node` 不转发 `--timeout`，因此 mocha 走默认 2000ms。空分片被 skip 并记 exit=0（`:682-690`）。

【事实】**数据隔离**（`:488-499`）：每分片注入 `ZOTERO_TEST_DATA_DIR=<root>/<shardId>/Zotero_data` 与 `ZOTERO_TEST_DATA_DIR_MANAGED=1`；根目录取 `ZOTERO_TEST_DATA_DIR` 父目录下 `shards/`，否则 `os.tmpdir()/zotero-agents-node-test-shards-<pid>`（`:462-471`）。

【事实】`--suite` 只接受 `synthesis-native-stage1`，与 `--domain`/`--shard`/`--list-shards` 互斥（`:706-721`），内容由 `scripts/synthesis/synthesis-native-stage1-suite.ts:38-85` 按硬编码编号表切成 3 段；**不存在 domain→suite 映射**。

### 1.3 `npm run test:node` 实际做什么

`package.json:139` → `tsx scripts/run-node-test-shards.ts`：

1. 收集 308 个 Node 测试文件（排除 `tests/zotero/**`）
2. 校验归属唯一性，不合法即退出 1
3. 串行跑 28 个分片：`tsx mocha <files> --require tests/setup/zotero-mock.ts --exit`
4. 每分片独立 `ZOTERO_TEST_DATA_DIR`（tmpdir）
5. 打印 `[node-test-shards:summary]` 与失败分片的重跑命令（`:632-663`）

【事实】**不需要真实 Zotero**，也不需要外网。【事实】检查了 `tests/**/*.test.ts` 中全部 `https?://` 字面量：绝大多数是 `example.test` / `example.invalid` / `192.0.2.x`（TEST-NET）/ `*.example` 等占位域；出现的 `doi.org` / `mineru.net` / `arxiv.org` / `pubmed.ncbi.nlm.nih.gov` 均为解析用字符串 fixture，未发现直接对它们发起 `fetch` 的调用点（`grep 'fetch('` 的命中都在本地 mock server 上）。【推测】Node 层可离线运行；个别测试若依赖本机 `127.0.0.1:8030` 之类端口（archive 中的 openspec 记录提到过端口占用）会受本机环境影响，但当前代码未强制外网。

### 1.4 `test:zotero:*` 实际做什么

【事实】全部 `test:zotero:*`（除 `:stress`）都是 `scripts/run-zotero-test-with-mock.ts` 的包装：

```
package.json:120  test:zotero:lite   → tsx scripts/run-zotero-test-with-mock.ts test:zotero:cli lite
package.json:121  test:zotero:case   → tsx scripts/run-zotero-test-with-mock.ts test:zotero:cli
package.json:129  test:zotero:e2e    → tsx scripts/run-zotero-test-with-mock.ts test:zotero:cli full e2e
package.json:138  test:zotero:cli    → zotero-plugin test
```

【事实】包装器行为（`scripts/run-zotero-test-with-mock.ts`）：

1. 解析 `targetScript / mode / domain`，默认 mode=`lite`、domain=`all`（`:44-76`）
2. 设 `ZOTERO_TEST_MODE` / `ZOTERO_TEST_DOMAIN` / `ZOTERO_TEST_DATA_DIR`（未提供则 `os.tmpdir()/zotero-agents-test-data-<pid>/Zotero_data`），未提供时置 `ZOTERO_TEST_DATA_DIR_MANAGED=1`（`:126-170`）
3. `npm run mock:skillrunner` 起本地 mock，从 stdout 抓 `baseUrl=`，8s 超时（`:235-281`、`:365-372`）
4. 注入 `ZOTERO_TEST_SKILLRUNNER_ENDPOINT`（`:191-202`）
5. `npm run <targetScript> -- <args> [--no-watch]`（`:283-316`）
6. 退出前 `rm -rf` 受管 tmp 数据目录（`:213-223`）

【事实】真正跑测试的是 `zotero-plugin test`（scaffold），入口由 `zotero-plugin.config.ts` 决定：

```ts
// zotero-plugin.config.ts:35-47
const ZOTERO_TEST_ENTRIES = {
  lite: { core: [...], ui: [...], workflow: [...] },
  full: { core: [lite+full], ui: [lite+full], workflow: [lite+full], e2e: ["tests/zotero/e2e/full"] },
}
// :77-93 resolveTestEntries 总是前置 "tests/zotero/setup.test.ts"
// :336-352 test config：headless 判定、e2e startupDelay=30s、test:init/test:prebuild/test:bundleTests 钩子
```

| 命令 | domain | mode | 实际范围 |
|---|---|---|---|
| `test:zotero:lite` | all | lite | `core/lite` + `ui/lite` + `workflow/lite` |
| `test:zotero:core[:full]` | core | lite/full | core 的 lite（+full） |
| `test:zotero:ui[:full]` | ui | lite/full | ui 的 lite（+full） |
| `test:zotero:workflow[:full]` | workflow | lite/full | workflow 的 lite（+full） |
| `test:zotero:e2e` | e2e | full | `tests/zotero/e2e/full`（1 个文件） |
| `test:zotero:full` | — | — | `scripts/run-zotero-full-suite.ts` 串行 4 步 |

【事实】**是否需要真实 Zotero：需要**。scaffold 的 `zoteroBinPath` getter 要求 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 存在**且文件存在**，否则抛 `The Zotero binary not found.`（`scaffold.DQYuTa0n.mjs:4201-4209`），随后作为 `binary.path` 启动（同文件 `:4885-4899`）。

【事实】**是否需要网络**：
- `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 未设且 Linux 下走 headless 时，`installZoteroLinux()` 用 `wget` 下载 Zotero beta（`scaffold.DQYuTa0n.mjs:4284-4292`），需要外网
- 测试库（mocha.js/chai.js）本地与 `.scaffold/cache` 均缺失时会从 jsdelivr / chaijs.com 下载（同文件 `:4761-4782` 附近）
- 兼容矩阵另行从 `download.zotero.org` 下载归档（`tests/zotero/compatibility-matrix.json` 的 `downloadUrl` + sha256）

【事实】本机情况：`DISPLAY=:99` 已设置且有 Xvfb 存活，`shouldUseHeadlessZoteroTest()` 判定为 **false**（`zotero-plugin.config.ts:24-33`），因此不会触发 Xvfb/apt 安装路径；`.env` 中的 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 已指向存在的可执行文件，**本机具备运行真实 Zotero 测试的条件**。但本次侦察按约束未运行，无法给出"实际通过"的证据。

### 1.5 `test:gate:pr` / `test:gate:release`

【事实】`package.json:117-118` → `tsx scripts/run-ci-gate.ts pr|release` → 读取 `scripts/ci-gate-plan.ts` 的 stage 表，**串行 fail-fast**：

```ts
// scripts/ci-gate-plan.ts:8-38
SHARED_GATE_STAGES = [check-localization-governance, check-ssot-invariants,
  check-host-bridge-content, test-synthesis-native-stage1, test]
// 第 6 项：pr → test-zotero-lite (test:lite)；release → test-zotero-full (test:full)
```

【事实】失败只报第一个失败 stage，退出码透传（`scripts/run-ci-gate.ts:35-46`）；后续 stage 不执行也无跳过记录。

【事实】范围与依赖：
- `check:host-bridge-content`（`package.json:87`）= 渲染 `--check` + agent-language + consumers，会间接 `cargo run` 取 surface descriptor
- `test:synthesis-native:stage1`（`package.json:152`）= `check:synthesis-native-worker-transfer-parity` + `cargo +nightly-2026-07-25 build` + stage1 suite → **需要 Rust nightly-2026-07-25**
- `test:lite` / `test:full` → **需要真实 Zotero**（见 1.4）

### 1.6 "测试文件存在" ≠ "能实际运行"

| 套件 | 能否在纯 Linux + Node 环境跑 | 阻塞条件 |
|---|---|---|
| `npm test` / `test:node:*` | **能**（未实际运行验证） | 无外网依赖；需 `node_modules` 已安装 |
| `test:synthesis-native:stage1` | 需额外工具链 | Rust `nightly-2026-07-25`（`package.json:152`、`:55`） |
| `test:zotero:*`（lite/full/core/ui/workflow/e2e） | **需要有真实 Zotero 二进制 + 图形会话** | `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 指向真实二进制；无 DISPLAY 时还需 Xvfb+apt 或自动下载 |
| `test:zotero:compatibility:*` | 需网络 + 目标平台 | `download.zotero.org` 归档 + `jq`（CI 用）+ 逐平台 runner |
| `test:synthesis-rust-sidecar` | 需 Rust nightly | `package.json:58` |
| `test:node:ui:harness` / `test:literature-deep-reading:detr-visual` | 能（单文件 mocha） | 后者 `--timeout 90000` |
| `test:synthesis:invariants` / `test:synthesis:legacy-production-migration` | 能（单文件/多文件 mocha） | 不在任何门禁内 |
| `npm run build` | 需 Rust + 前端工具链 | `cargo +nightly` clippy/build 等 |

【事实】**本次无法判定的部分**（明确标注）：各套件在当前机器上"实际通过率"未验证——约束禁止运行测试/构建。上文"能跑"仅依据静态依赖分析（二进制存在性、toolchain 声明、网络调用点）。`pytest`-式的环境探测未做。

【事实】**文档与实现不一致**：`docs/testing-framework.md:18` 称"`test:zotero:full` 顺序启动**三个**独立宿主进程"，而 `scripts/run-zotero-full-suite.ts:8-13` 实为 **4 步**（core-full → ui-full → workflow-full → e2e-full）。`docs/dev/zotero-e2e.md:3` 的描述（"依次运行 core、UI、workflow 与 E2E"）才与代码一致。

---

## 2. 测试基础设施

### 2.1 `tests/setup/zotero-mock.ts`（3135 行 / 64.8 KB）

【事实】只导出 2 个符号：`resetZoteroMockStateForTests`（`:390`）与 `mochaHooks`（`:3122`）；核心 `createZoteroMock()` 不导出（`:2736`）。

【事实】**安装的全局**（皆为"仅当不存在时安装"，故真实 Zotero 环境下不覆盖）：

| 全局 | 内容 | 证据 |
|---|---|---|
| `Zotero` | 完整对象字面量 | `:3088-3094` |
| `Components` | 只有 `{ utils: { isDeadWrapper: () => false } }` | `:3096-3102` |
| `PathUtils` | 只有 `{ join }` | `:3104-3110` |
| `OS` | 只有 `{ Path: { join } }` | `:3112-3118` |
| `Services`/`IOUtils`/`ChromeUtils`/`Cc`/`Ci` | **不安装**，只列入 `RUNTIME_GLOBAL_KEYS`（`:275-287`）用于快照/还原 | — |

【事实】`Zotero` mock 覆盖：`Promise.delay`、`debug/logError/warn`、`DataDirectory`、`HTTP.download`、`File.*`、`Item`/`Items`、`Attachments.*`、`Collection`/`Collections`、`ItemTypes`、`ItemFields`、`Libraries`、`ItemTreeManager`、`ItemPaneManager`、`Prefs`（含 observer）、`Notifier`、`Plugins.addObserver`、`PreferencePanes.register`、`Search`、`getTempDirectory`、`getMainWindow`、`getMainWindows`、`isWin/isMac`。

【事实】**未 mock 且测试确实需要的**：`Zotero.DB`、`Zotero.Utilities`、`Zotero.FileHandlers`、`Zotero.launchFile`、`Zotero.Reader`、`Zotero.version`、真实窗口/标签页/Reader/首选项面板、真实 Sync/WebDAV、XPCOM `Services`/`IOUtils`/`ChromeUtils`。【事实】SQLite 走旁路：`pluginStateStore` 由 `tests/helpers/pluginStateNodeSqliteAdapter.ts:5-45` 注入 `node:sqlite` 的 `DatabaseSync(":memory:")`，在 mock 文件 import 时即生效（`zotero-mock.ts:8`）。

【事实】**深度：混合体，不是纯 stub**：

- 内存行为实现：`MockItem.saveTx` 分配 id/key 并维护父项数组（`:760-790`）；`setField("itemTypeID")` 校验类型并清理非法字段（`:473-490`）；creator 类型非法抛错（`:59-69`、`:614-618`）；`Items.trashTx` 置 `deleted`（`:2799-2810`）；`Prefs` 内存 Map + observer 通知（`:3014-3035`、`:356-362`）
- 真实文件系统行为：`HTTP.download` 真写文件（`:2750-2760`）；`File.putContentsAsync` 真落盘（`:2769-2775`）；`Attachments.importFromFile` 真 `fs.copyFile`（`:2856-2863`）
- no-op stub：`debug/logError/warn`、`Plugins.addObserver`、`PreferencePanes.register`、`ItemTreeManager.refreshColumns`、`ItemPaneManager.*`
- 存根语义：`MockSearch.search()` 恒返回 `[]`（`:861-863`）

【事实】**fail-closed 不完整**：全文仅 8 处 `throw`，全是领域校验；**无 Proxy、无未知 API 陷阱**，类型带 `[key: string]: unknown`（`:195`），未实现的 API 静默返回 `undefined`，调用方得到下游 `TypeError`。【推测】这属于隐式失败，排障定位成本较高。与项目对 broker 替身「必须 fail-closed」的硬约束（AGENTS.md）形成落差——需要注意该约束的措辞针对 broker 测试替身，未强制 Zotero 全局 mock。

【事实】内置 parity 自描述：`ZOTERO_MOCK_PARITY`（`:198-241`，`contractVersion: "2026-02-hb08"`），暴露为 `Zotero.__parity`（`:3083`），登记 3 条 drift：DR-001 `File.pathToFile` 盘符路径（high/open）、DR-002 `Search` 存根（waived）、DR-003 UI 注册 stub（waived）。测试以 `__parity.runtime !== "node-mock"` 决定 `describe.skip`，使同一文件在 mock 与真 Zotero 下行为不同（`tests/zotero/core/full/188-zotero-navigation.zotero.test.ts:11`、`tests/zotero/core/lite/165-runtime-platform-services.zotero.test.ts:24` 等）。治理合同见 `openspec/specs/zotero-mock-parity-governance/spec.md`。

【事实】生命周期：数据目录受 `ZOTERO_TEST_DATA_DIR`/`_MANAGED` 控制，缺省 `mkdtemp`（`:294-307`）；进程退出经 `isUnderDirectory` 校验在 `os.tmpdir()` 下才 `rmSync`（`:309-332`）；`mochaHooks.beforeEach/afterEach` 双重 reset + 5s 超时后台清理（`:3122-3135`）。

【事实】接入方式：`package.json:41/42/59/163` 用 `--require tests/setup/zotero-mock.ts`；`:72/74` 用 `tsx --import`；`run-node-test-shards.ts:434-441` 对所有分片统一注入 `--require`；另有 3 个脚本直接 `import`（`scripts/e2e-single-markdown-live.ts:1`、`inspect-single-markdown-request.ts:1`、`inspect-literature-analysis.ts:1`）。

### 2.2 `tests/helpers/`（21 文件 ≈ 252 KB）

| 文件 | 作用 |
|---|---|
| `acpRuntimePerformanceHarness.ts` | ACP 静默运行时基线与矩阵跑分、状态重置 |
| `acpSessionManagerHarness.ts` | ACP 会话 harness：fake connection adapter、后端配置、transcript/UI 快照读取 |
| `acpSkillRunWorkspaceHarness.ts` | 构造/准备 ACP skill-run 面板快照并订阅快照流 |
| `assistantWorkspaceAcpChildHarness.ts` | 创建 Assistant Workspace 的 ACP 子 harness |
| `assistantWorkspacePublicationHarness.ts` | owner/page/publication 测试 DTO 工厂 |
| `canonicalIngestIdentityDatabase.ts` | 作用域内 canonical ingest identity fixture 数据库 |
| `dashboardBrowserPage.ts` | 构建 dashboard bundle 到临时镜像并返回 `index.html` 路径 |
| `dashboardHostHarness.ts` | Dashboard 运行时 harness + 全局属性替换 + flush |
| `hostBridgeCliHarness.ts` | 启动 Host Bridge CLI fixture harness（多临时目录 + 命令处理器） |
| `nativeFixtureMutations.ts` | 创建/挂接真实 Zotero fixture 并注册清理 |
| `nodeZoteroTransactionStub.ts` | `Zotero.DB` 事务直通 stub（注释明确「不提供 native rollback 证据」） |
| `pluginStateNodeSqliteAdapter.ts` | 为 `pluginStateStore` 注入 `node:sqlite` 内存适配器 |
| `sidebarDomEnv.ts` | jsdom DOM 环境 + 区域子树保持断言 |
| `skillRunnerWorkspaceSnapshotHarness.ts` | SkillRunner workspace 快照 harness（真实 run store 种子 + 发布捕获） |
| `synthesisHostReadPort.ts` | 测试用 Synthesis host read port |
| `synthesisProductionRouteHarness.ts` | 启动真实 Rust synthesis sidecar production route + 记录器 |
| `synthesisProductionRouteScenarios.ts` | production-route 场景清单与执行 |
| `synthesisReferenceReviewHarness.ts` | 构建 reference review seed/state 文档 |
| `workflowSelectionContext.ts` | 构建 selection-context 载荷与 item ref |
| `zoteroHostCapabilityBrokerHarness.ts` | strict-JSON 断言 + **fail-closed** broker 测试替身 |
| `zoteroLibraryPageQueryAdapter.ts` | mock 的 library page query 适配器 |

【事实】共性：**没有统一 mock/fake 构造器**；统一模式是 `createXxxHarness/Adapter/Port` 工厂。临时目录只在 3 个文件出现（`dashboardBrowserPage.ts:15`、`hostBridgeCliHarness.ts:493`、`synthesisProductionRouteHarness.ts:376`）；断言工具只 2 处内联；**fail-closed 替身只有 broker harness 一个**，与 AGENTS.md 中该约束的适用范围一致。

### 2.3 `tests/fixtures/`（582 文件 / 112.8 MiB）

扩展名分布：`json 295`、`md 176`、`txt 66`、`pdf 23`、`ts 3`、`zip 2`、`html 2`，另有 `sqlite/epub/py/mjs/jsonl/cmd/bin/Snapshot` 各 1–8。

```
tests/fixtures/                                     582 文件 / 118,259,079 B
├── acp/                          1       .mjs（ACP composer reply agent）
├── assistant-workspace/          1       json
├── digest_samples/              69       md（Zotero key 前缀摘要样本）
├── literature-analysis/          3       md + zip×2（run_bundle*.zip）
├── reader/                       1       epub（zotero-stub.epub，二进制）
├── reference_samples/           68       txt
├── selection-context/           75       json/ts×16 + attachments/（59 目录，真实 PDF/HTML）← 98.5 MiB
├── source_papers/               67       md
├── synthesis-reference-resolution/current-library-v1/  11  json/jsonl ← 10.2 MiB
├── synthesis-sidecar-migration/  4       json 基线
├── synthesis-tag-vocabulary/     1       json
├── synthesis-topics-sample/    115       topics/<sha256>/current/{sections}：md+json
├── topic-synthesis-create-detr-gated-playbook/  153
│      diagnostics/ discovery/ schemas/examples/ transcripts/{bridge,gate-commands}/
│      workspace/runtime/acp/skill-runs/…（含 topic-synthesis.sqlite 77,824 B）
├── workflow-loader-invalid-json/          1
├── workflow-loader-missing-apply/         1
├── workflow-loader-missing-required-fields/ 7
├── zotero/                                1  json（录制的 selection-context 快照）
├── zotero-e2e/                            1  json（lisongtao-v1 去标识化金例契约，609 B）
└── 顶层散文件  synthesisCitationGraphBuildBenchmarks.ts / synthesisSyntheticDatasets.ts
```

【事实】**二进制/大文件**：23 个 PDF 全在 `selection-context/attachments/`（最大 `AJHT6UTC/…RF-DETR….pdf` 11.7 MB）；`literature-analysis/run_bundle*.zip`；`reader/zotero-stub.epub`；`…-playbook/…/runtime/topic-synthesis.sqlite`；8 个 0 字节 `Snapshot` 文件（Spotlight 残留）。

【事实】**引用面窄**：整仓 `fixtures/` 命中约 72 次 / 32 文件。主要消费方：`selection-context`（`tests/zotero-host/11-selection-context-rebuild.test.ts:4-19`、`:85` 定义 `FIXTURE_ROOT`；`tests/workflow-literature-analysis/literature-analysis-fixture-cases.ts:1-5`）、`synthesis-reference-resolution/current-library-v1`（`tests/synthesis/151-synthesis-reference-resolution-matcher.test.ts:22`）、`synthesis-sidecar-migration`（4 处，含 `tests/helpers/synthesisProductionRouteScenarios.ts:97`）、`zotero-e2e/lisongtao-v1.json`（`tests/zotero/e2e/full/300-lisongtao-gold.zotero.test.ts:3`）、`literature-analysis/run_bundle_canonical.zip`（`tests/mock-skillrunner/server.ts:600-609`）、`synthesisSyntheticDatasets.ts`（3 处）、`assistant-workspace/*.json`（`tests/acp/97-acp-ui-smoke.test.ts:3198`）。

【事实】**仓内 0 引用的整目录**：`source_papers/`、`digest_samples/`、`reference_samples/`、`synthesis-topics-sample/`、`topic-synthesis-create-detr-gated-playbook/`、`zotero/`、`workflow-loader-*/`、`acp/`、`reader/`（epub 仅按文件名被 `tests/zotero/core/full/188-zotero-navigation.zotero.test.ts:184` 引用）。【推测】属历史归档语料，约 4 MiB。

### 2.4 `tests/mock-skillrunner/`（2 文件）

【事实】`server.ts`（18.7 KB；`:92` `startMockSkillRunnerServer`，`:576` `listen`，`:600` `literatureDigestBundlePath`）+ `contracts.ts`（2.5 KB；`validateCreatePayload`/`validateMultipartHasField`，校验 `literature-analysis`/`tag-regulator`/`tag-bootstrapper` 输入契约）。是内存 job 表 + 流量记录的 HTTP mock，由 `npm run mock:skillrunner`（`package.json:164` → `scripts/mock-skillrunner-serve.ts`）启动，由 `scripts/run-zotero-test-with-mock.ts:365-372` 拉起、`:405-410` 注入 endpoint。

---

## 3. E2E 约束

### 3.1 目录与调用链

【事实】`tests/zotero/e2e/full/` 只有 1 个文件：`300-lisongtao-gold.zotero.test.ts`（139 行，1 个 `it`，`this.timeout(900_000)`，`:61`）。**没有平行 runner**，与 AGENTS.md「E2E 统一使用该目录与 `npm run test:zotero:e2e`」一致。

完整链路：
```
package.json:129  test:zotero:e2e
  → tsx scripts/run-zotero-test-with-mock.ts test:zotero:cli full e2e   (:45-79 解析 mode/domain)
  → buildTestEnvironment 写 ZOTERO_TEST_MODE=full / ZOTERO_TEST_DOMAIN=e2e / ZOTERO_TEST_DATA_DIR (:126-170)
  → 起 mock skillrunner，等待 stdout "baseUrl=" (:235-281, :365-372)，注入 ZOTERO_TEST_SKILLRUNNER_ENDPOINT (:191-202)
  → npm run test:zotero:cli -- --no-watch (:283-316, :98-104)
  → package.json:138  zotero-plugin test
  → zotero-plugin.config.ts:90-92  resolveTestEntries(e2e, full) = [tests/zotero/setup.test.ts, tests/zotero/e2e/full]
  → :339 startupDelay=30_000；:348-350 test:bundleTests → patchGeneratedZoteroTestRunner()
```

### 3.2 `.scaffold/test` 的准备与使用

【事实】常量由 scaffold 定义（`scaffold.DQYuTa0n.mjs:4218-4223`）：`.scaffold` / `.scaffold/test` / `…/profile` / `…/data` / `…/resource`。

【事实】**每轮先清空三目录**，再触发 `test:init`：

```js
// scaffold.DQYuTa0n.mjs:4834-4839
async run() {
  await emptyDir(TESTER_PROFILE_DIR);
  await emptyDir(TESTER_DATA_DIR);
  await emptyDir(TESTER_PLUGIN_DIR);
  await this.ctx.hooks.callHook("test:init", this.ctx);
```

【事实】本仓库的 `test:init` 就是金例复制（`zotero-plugin.config.ts:125-154`）：

- `:136-139` `fs.cp(ZOTERO_E2E_GOLD_DATA_DIR → .scaffold/test/data, {recursive, force})`
- `:140-146` 删除副本内 `zotero-agents/data/synthesis/identity.json`、`zotero-agents/runtime/logs`、`zotero-agents/runtime/synthesis/service-runtime`（清除 machine-bound identity 与旧运行时/日志）
- `:147-152` 可选 `fs.cp(ZOTERO_E2E_GOLD_PROFILE_DIR → .scaffold/test/profile, {recursive, force})`
- `:153` 默认 `ZOTERO_E2E_GOLD_ID=lisongtao-v1`；`:132-134` 只给 profile 不给 data 时直接抛错

【事实】启动 Zotero 时 profile/data 都指向这两个副本（`scaffold.DQYuTa0n.mjs:4885-4901`：`profile: { path: TESTER_PROFILE_DIR, dataDir: TESTER_DATA_DIR }`）。

【事实】`.scaffold` 的其它使用点：`scripts/patch-zotero-test-runner.ts:340-349`（改写 `.scaffold/test/resource/content/index.xhtml`，`:356` 写盘）、`scripts/run-zotero-compatibility-worker.ts:67-70`、`scripts/zotero-compatibility-fixture.ts:944-947`/`:972`/`:985`、`scripts/run-zotero-compatibility-matrix.ts:74`、`scripts/run-zotero-direct.ts:46`、`zotero-plugin.config.ts:160`。`.gitignore:22` 忽略整个 `.scaffold`。

【事实】**清理**：`scripts/run-zotero-test-with-mock.ts:213-223` 只删 Node mock 的 tmp 数据目录（且要求 `_MANAGED=1` 并校验在 `os.tmpdir()` 下）；**没有发现测试后删除 `.scaffold/test` 的代码**。【推测】清理依赖下一次运行的 `emptyDir`，或人工删除。兼容矩阵另有独立 run root 与 `cleanupRunLayoutState`（`scripts/zotero-compatibility-fixture.ts:963-987`），并有逃逸校验。

### 3.3 如何避免修改真实库与 profile

【事实】机制是**「先清空 + 复制副本后运行」**，不是只读挂载，也不是环境变量重定向：

1. scaffold 无条件 `emptyDir(.scaffold/test/{profile,data,resource})`（`scaffold.DQYuTa0n.mjs:4834-4836`）
2. 本仓库 `test:init` 钩子把源目录 `fs.cp` 进 `.scaffold/test/data` 与 `.scaffold/test/profile`（`zotero-plugin.config.ts:136-152`）
3. Zotero 进程只被授予副本路径（`scaffold.DQYuTa0n.mjs:4894-4901`）

【事实】源目录在整个流程中只作为 `fs.cp` 的**读来源**出现（`zotero-plugin.config.ts:127-130` 读 env、`:136`/`:148` 为 cp 的 src）；仓内**没有任何对源目录的写入、chmod/chown，也没有源目录只读校验**。→ 该保证是**构造性 + 文档约定**，不是运行时强制。

【事实】文档承诺一致：`docs/dev/zotero-e2e.md:16`「运行时把指定库与 profile 复制到 `.scaffold/test`，不会修改来源目录」；`:44`「不要直接对金例来源目录执行写入」；`AGENTS.md:140-141` 同义。

【事实】下游写入面都落在副本：E2E 用 `Zotero.DB.queryAsync`/`valueQueryAsync` 做只读结构统计（`tests/zotero/e2e/full/300-lisongtao-gold.zotero.test.ts:22-56`），并点击插件 UI 触发 reference sidecar refresh（`:87-126`）。金例断言仅在 `ZOTERO_E2E_GOLD_ID === gold.id` 时生效（`:71`、`:133`）；未设金例目录时使用隔离空库（`docs/dev/zotero-e2e.md:34`）。

【事实】金例本体是去标识化结构契约：`tests/fixtures/zotero-e2e/lisongtao-v1.json`（609 B），只含 itemTypes/attachments/notes/collections/tags 计数与 `topLevelItems`，无标题/作者/路径/正文。

### 3.4 `tests/zotero/` 26 文件结构

【事实】顶层 10 个 `.ts` + 1 个 `.json`：

| 文件 | 行数 | 用途 |
|---|---|---|
| `setup.test.ts` | 9 | 唯一宿主 setup，装载 grep / failure diagnostics / leak probe / perf probe（`:1-9`） |
| `diagnosticBridge.ts` | 219 | 失败上下文 provider、debug 桥、清理编排 |
| `leakProbeDigest.ts` | 435 | 对象泄漏探针与摘要 |
| `performanceProbeDigest.ts` | 640 | 性能探针与摘要 |
| `objectCleanupHarness.ts` | 291 | 测试对象注册/清理 |
| `testDiagnosticsOutput.ts` | 98 | 诊断目录与文本落盘 |
| `testMode.ts` | 122 | lite/full 与域判定、grep 模式 |
| `testObjectKeepFlag.ts` | 35 | `ZOTERO_KEEP_TEST_OBJECTS` 解析 |
| `workflow-test-utils.ts` | 425 | 宿主路径/文件/临时目录工具 |
| `mochaGrep.ts` | 23 | 把 env grep 应用到 mocha |
| `compatibility-matrix.json` | 172 | 4 平台 × Zotero 7.0.32 / 9.0.6 / 10.0.1 的 URL + sha256 + 策略 |

【事实】子目录与用途：`core/lite`(7)、`core/full`(1)、`ui/lite`(2)、`ui/full`(1)、`workflow/lite`(1)、`e2e/full`(1)、`compatibility/probe`(1，仅 re-import `core/full/188-zotero-navigation`)、`compatibility/xpi`(1)。core=宿主 API/库/平台；ui=页面交互；workflow=工作流集成；e2e=完整构建 + 本地 Rust sidecar + 真实 Host reverse-RPC；compatibility=真实二进制跨版本 XPI 冒烟。

---

## 4. `scripts/` 分类

### 4.0 总览

【事实】117 文件 = 105 `.ts` + 8 `.mjs` + 4 `.ps1`；约 3.23 万行。分布：顶层 34、`host-bridge/` 34、`synthesis/` 35、`content-package/` 11、`acp-ws-bridge/` 2、`internal/` 1。每个文件在下表只归一组。

### 4.1 构建 / 打包（7）

| 脚本 | 作用 | 副作用（证据） |
|---|---|---|
| `build-help-docs.ts` | docs → `addon/content/help-docs/` | **写**：`:548-549` 先 `rm(outputRoot, {recursive,force})` 再 `mkdir`；`:592-593` `--check` 只比对 |
| `runtime-diagnostics-esbuild.ts` | esbuild plugin（诊断模块裁剪） | 纯读（仅导出 Plugin，无写盘） |
| `runtime-diagnostics-production-manifest.ts` | 常量表 | 纯读 |
| `acp-ws-bridge/build-acp-ws-bridge.mjs` | cargo 构建 | 写 `target/`（`:26,:45` spawnSync） |
| `acp-ws-bridge/package-acp-ws-bridge.mjs` | 复制二进制 + sha256 | **写** `:39-44` |
| `host-bridge/build-zotero-bridge-cli.mjs` | 按平台 cargo/zigbuild 构建 | 写 `target/`（`:63,:79`） |
| `host-bridge/package-zotero-bridge-cli.mjs` | 打包到 `addon/bin/<platform>/` | **写** `:50-58` |

### 4.2 内容包 content package（11）

| 脚本 | 作用 | 副作用 |
|---|---|---|
| `content-package/build-content-package-feed.ts` | 打 zip + 生成各 channel feed | **写** `:476-477,:480,:511` |
| `content-package/build-canonical-literature-validators.ts` | Ajv standalone validator 源码 | **写** `:53`；`--check`(`:48`) 只比对 |
| `content-package/build-literature-deep-reading-graph-renderer.ts` | 前端构建 + 复制产物 | **写** `:80,:92,:106,:110-112,:139,:150` |
| `content-package/bump-content-package-version.ts` | semver bump 版本文件 | **写** `:57` |
| `content-package/check-builtin-workflow-manifest.ts` | 校验内置 workflow manifest | 纯读 |
| `content-package/check-content-package-release.ts` | 校验已发布 feed/asset | 只读工作区；`:332-333` mkdtemp 到 tmpdir，`:423` 清理 |
| `content-package/content-package-channels.ts` | channel 常量 | 纯读 |
| `content-package/prepare-content-package-release.ts` | bump + 校验 HEAD 后 dispatch | **写 + 远端**；`:177` 的 `git commit` 只是**建议命令字符串** |
| `content-package/publish-content-package-feeds.ts` | 推 feed 分支 | **远端写** `:166-170` |
| `content-package/publish-content-package-github.ts` | GitHub release asset | **写 + 远端** `:120-129`；`:53,:65` gh |
| `content-package/publish-skills.ps1` | orphan 分支推送 | **远端写** `:141,:143` |

### 4.3 Host Bridge（26，另有 2 个构建/打包与 6 个 check 已归他组）

| 脚本 | 作用 | 副作用 |
|---|---|---|
| `materialize-host-bridge-surfaces.ts` | 物化 surface 到 addon/skills/profiles | **写（含删）** `:71-72`、`:109,:198` |
| `render-host-bridge-surfaces.ts` | 渲染三层发布面 | **写** `:1235-1237`；`:1406` `check` 开关 |
| `render-host-bridge-release-set.ts` | 渲染 release-set | **写** `:110-111`；`:94` `--check` |
| `render-host-mutation-contract.ts` | 渲染 mutation 契约 | **写** `:123`；`:112` `--check` |
| `host-bridge-surface-model.ts` | surface 版本读写 | **写** `:208-209`（tmp+rename） |
| `host-bridge-surface-version.ts` | inspect/bump 单 surface 版本 | `--bump` 时写 |
| `host-bridge-version-intent.ts` | 解析精确版本意图 | 纯读 |
| `host-bridge-cli-release-governance.mjs` | CLI 发布治理 | 条件写 `:476`（`--write`）；status/recipe 只读 |
| `host-bridge-release-plan.ts` | 生成 plan | **写** `:161-162` |
| `host-bridge-release-controller.ts` | 分步执行发布 | **写** `:231`（receipt） |
| `prepare-host-bridge-release.ts` | 准备发布 | 条件写 `:53-58`：无 `--write` 仅打印 JSON 并 exit 0 |
| `dispatch-host-bridge-release.ts` | 本地预检 + dispatch | **远端写**；`:130-160` 串行跑 lint/doc-sync/content/bundle/profile/check/mocha |
| `prebuild-zotero-bridge-cli.ts` | 七平台预构建 | **写** `:301` |
| `stage-host-bridge-cli-prebuilds.ts` | 暂存预构建 | **写** `:73,:85,:117,:132` |
| `sync-host-bridge-cli-prebuilds.ts` | 同步内容寻址二进制 | **写（含删）** `:237-238,:288-290,:495-513,:616` |
| `host-bridge-release-set.ts` | release-set 模型 | 纯读 |
| `zotero-bridge-cli-release.ts` | release 身份解析 | 纯读 |
| `host-bridge-agent-surface.ts` | `cargo run --example export-agent-surface` | 写 `target/` `:147-157` |
| `host-bridge-surface-catalog.ts` | 生成 catalog | 写 `target/` `:126` |
| `host-bridge-command-contracts.ts` | 命令契约加载/校验（Ajv） | 纯读 |
| `host-bridge-workflow-catalog.ts` | workflow manifest 投影 | 纯读 |
| `host-bridge-semantic-review-context.ts` | 收集变更文件 | 纯读（`:30` 只读 git） |
| `host-bridge-review-mirror.ts` | 中文审阅镜像 | **写（含删）** `:472-481` |
| `publish-host-bridge-cli-bundle.ps1` | 推 CLI bundle | **远端写** `:345,:356` |
| `publish-zotero-librarian-profile.ps1` | 推 profile | **远端写** `:186,:188` |
| `publish-zotero-library-agent-bundle.ps1` | 推 bundle | **远端写** `:219,:221` |

### 4.4 Synthesis sidecar / 发布（19，另有 16 个 check 与 1 个 suite 已归他组）

| 脚本 | 作用 | 副作用 |
|---|---|---|
| `package-synthesis-sidecar-runtime.ts` | 组装 runtime bundle | **写** `:76,:80,:84,:88,:106,:172` |
| `package-synthesis-sidecar-runtime-symbols.ts` | 符号归档 | **写** `:135-138` |
| `stage-synthesis-sidecar-runtime-prebuilds.ts` | 暂存七平台 runtime | **写** `:73,:149,:153,:176` + `:43` spawnSync |
| `sync-synthesis-sidecar-runtime-prebuilds.ts` | 同步进 addon（备份/回滚） | **写** `:96,:145,:156,:163` |
| `publish-synthesis-sidecar-runtime-prebuild.ts` | 推内容寻址预构建 | **远端写** `:201-210` |
| `dispatch-synthesis-sidecar-prebuild.ts` | dispatch 预构建 workflow | **远端 + 写** `:196,:295` |
| `dispatch-synthesis-sidecar-release.ts` | dispatch 正式发布 | **远端** |
| `prepare-synthesis-sidecar-release.ts` | 写 release-set | **写** `:69-70` |
| `synthesis-sidecar-runtime-release-set.ts` | release-set 构造 | **写** `:71-72` |
| `synthesis-sidecar-runtime-release-plan.ts` | 生成 plan | 条件写 `:47-51`（仅 `--output`） |
| `synthesis-sidecar-runtime-release-controller.ts` | receipt/生命周期 | **写** `:97-98` |
| `synthesis-sidecar-runtime-release-governance.ts` | 治理规则 | 写 `target/`；`:334,:362` |
| `resolve-synthesis-sidecar-runtime-cache.ts` | 解析缓存 | 条件写 `:328-329` |
| `resolve-synthesis-sidecar-verification.ts` | 解析远端验证 run | **写** `:327-328` |
| `download-synthesis-sidecar-runtime-cache.ts` | 下载解包 | **写** `:65,:107,:124,:138,:170` |
| `smoke-synthesis-rust-durable-candidate.ts` | 端到端 smoke | 写临时目录 `:496` |
| `smoke-synthesis-rust-sidecar-worker.ts` | worker 协议 smoke | 写临时目录 |
| `synthesisProductionSurfaceCorpora.ts` | 生产 surface 语料读取 | 纯读 |
| `synthesis-native-stage1-suite.ts` | stage1 清单/分段 | 纯读（纯计算） |

### 4.5 校验与门禁 check:*（28）

【事实】纯读（26 个）：`check-localization-governance.ts`、`check-skillrunner-ssot-invariants.ts`、`check-runtime-diagnostics-release-elision.ts`（`:34,:65,:87` 全 `write:false`）、`check-host-bridge-agent-language.ts`、`check-host-bridge-cli-prebuild-freshness.mjs`、`check-host-bridge-consumer-guidance.ts`、`check-host-bridge-skill-packages.ts`（`:389,:435` 用 `git show` 取 baseline）、`check-plugin-host-bridge-assets.ts`、`check-zotero-bridge-cli-binary-identity.mjs`，以及 14 个 `check-synthesis-*surface-parity / capabilities / service-boundary / freshness / xpi / license-inventory / cross-language-contracts`。

【事实】**名字是 check 但实际会写盘 / 需要重工具链（2 个）**：

```ts
// scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts:114-127
const rust = spawnSync("cargo",
  ["+nightly-2026-07-25","run","--quiet","--locked",
   "--manifest-path","rust/synthesis-sidecar/Cargo.toml",
   "-p","synthesis-sidecar","--example","native_runtime_contract_parity"], ...)
```
`check-synthesis-native-worker-transfer-parity.ts:160-172` 同构。二者会写 `rust/synthesis-sidecar/target/`，并要求 nightly toolchain 已装。

【事实】纯数据/编排：`ci-gate-plan.ts`（无 IO）、`run-ci-gate.ts`（间接写）、`release-coordinator-gate.ts`（纯读 git/gh 查询）。

### 4.6 测试 runner（13）

| 脚本 | 作用 | 副作用 |
|---|---|---|
| `run-node-test-shards.ts` | Node 分片 runner | 写 tmp 数据目录；不写仓库 |
| `run-zotero-test-with-mock.ts` | 起 mock 后跑 Zotero CLI 测试 | **删** `:222`（受管 tmp） |
| `run-zotero-start-with-mock.ts` | dev 启动 | 写 Zotero profile prefs |
| `run-zotero-direct.ts` | 无热重载启动 | 写 Zotero profile prefs（工作区外） |
| `run-zotero-full-suite.ts` | 串行 4 步 | 间接写；`:8-13` 定义 4 步 |
| `run-zotero-e2e-stress.ts` | 透传 e2e + stress 环境变量 | 间接写 `:2` |
| `run-zotero-compatibility-matrix.ts` | 兼容矩阵 plan/run/matrix/acquire | 自身零写；写在 fixture 模块 |
| `run-zotero-compatibility-worker.ts` | 矩阵 worker | **写** `:12,:38-39,:53,:121` |
| `zotero-compatibility-fixture.ts` | 下载/安装/挂载 Zotero、写 receipt | **写（含删/rename/锁）** `:944-947,:963-987,:1098-1104` |
| `patch-zotero-test-runner.ts` | 给生成的 runner HTML 打补丁 | **写** `.scaffold/test/...` `:340-356` |
| `e2e-single-markdown-live.ts` | 单条 markdown live e2e | **写** `:135,:196`；默认输出 `~/Workspace/Code/zotero-agents/e2e_downloads`（`:132`） |
| `ui-harness-serve.ts` | 只读 UI harness HTTP server | 纯读（`:215` `write:false`） |
| `mock-skillrunner-serve.ts` | mock SkillRunner 服务 | 纯读（内存态） |

【事实】**关于 `patch-zotero-test-runner.ts`**（易误判项）：它**不修改 `node_modules`**，写盘目标是 `.scaffold/test/resource/content/index.xhtml`（`:340-349`）；**不是 postinstall**（`package.json` 无该 hook）；**无需手动运行**——由 `zotero-plugin.config.ts:6` import、`:349` 在 scaffold 钩子里自动调用，且脚本本身没有 CLI 入口守卫，直接 `tsx` 跑是空操作。补丁内容：把内联 mocha 的 `send()` 换成 `sendBlocking()` + 进度事件队列（`:55-105`），安装 `console.error`/`window.onerror`/`onunhandledrejection` 桥（`:165-227`），把 `fail` 事件升级为带 stack/expected/actual 的 debug 明细（`:230-247`）。幂等：检测 `ZOTERO_SKILLS_DIAGNOSTIC_PATCH_V1` 直接返回原文（`:266-268`）。

### 4.7 发布与同步 GitHub / Gitee（3）

【事实】`sync-gitee-release.ts`（Gitee REST 建 release）、`sync-gitee-publication.ts`（`:279,:366` `git push`）、`github-workflow-run.ts`（gh dispatch/list/view/artifact 库）。均为**远端写**或远端读。按 AGENTS.md 的发布硬约束，Gitee 只能在用户单独要求时执行。

### 4.8 工具与运维（10）

| 脚本 | 作用 | 副作用 |
|---|---|---|
| `clear-acp-chat-records.ts` | 清 ACP conversation 记录 | **写 DB** |
| `clear-acp-skills-records.ts` | 清 ACP skill run 记录 | **写 DB** |
| `clear-skillrunner-records.ts` | 清 SkillRunner ledger | **写 DB** |
| `internal/cleanup-runtime-category-cli.ts` | 三者共用 sqlite 清理 CLI | **写/建 DB** `:124,:171` |
| `inspect-literature-analysis.ts` | 只读检视工作流 | 纯读 |
| `inspect-single-markdown-request.ts` | 只读检视请求 | 纯读 |
| `migrate-persistence-governance.mjs` | 持久化治理迁移 | 条件写 `:8` mode 门（dry-run 默认） |
| `record-acp-runtime-governance-baseline.ts` | 录制 baseline | **写** `:123,:127,:138` |
| `update-skillrunner-runtime-feed.ts` | 更新 runtime feed | **写** `:123-124` |
| `zip-archive.ts` | ZIP 只读解包库 | 纯读 |

### 4.9 副作用速查（按交付视角）

- **会修改工作区文件的**：`build-help-docs.ts`、全部 `content-package/*` 发布/构建脚本、`host-bridge/materialize-*`/`render-*`/`sync-*`/`stage-*`/`prepare-*`、`synthesis/package-*`/`stage-*`/`sync-*`/`publish-*`/`prepare-*`、`record-acp-runtime-governance-baseline.ts`、`update-skillrunner-runtime-feed.ts`、`migrate-persistence-governance.mjs`（apply 模式）、`clear-*`（改 Zotero/插件数据库）。
- **纯只读校验**：所有 `check-*`（除 4.5 指出的 2 个 synthesis native parity）、`ci-gate-plan.ts`、`release-coordinator-gate.ts`、`runtime-diagnostics-esbuild.ts`、`content-package-channels.ts`、`host-bridge-command-contracts.ts`、`host-bridge-workflow-catalog.ts`、`host-bridge-semantic-review-context.ts`、`inspect-*.ts`、`zip-archive.ts`、`ui-harness-serve.ts`、`mock-skillrunner-serve.ts`、`synthesisProductionSurfaceCorpora.ts`、`synthesis-native-stage1-suite.ts`。
- **名字与行为不符**：`check-synthesis-native-*-parity`（check 却 `cargo run` + 写 `target/`）；`runtime-diagnostics-esbuild.ts` / `runtime-diagnostics-production-manifest.ts`（像构建产物，实为 plugin/常量表）；`patch-zotero-test-runner.ts`（不碰 node_modules、无 CLI 入口）；`prepare-content-package-release.ts:177` 的 `git commit` 只是建议字符串（grep 审计误报源）。

---

## 5. CI：`.github/workflows/`

【事实】共 10 个 workflow。

| workflow | 触发 | 概要 |
|---|---|---|
| `ci.yml` | `push: main`、`pull_request: main`、`release: published` | 6 个 job：`lint`（`npm run lint:check`，`:25`）；`build`（`npm run build`，产物 `.scaffold/build` 上传 artifact，`:37-42`）；`compatibility-plan`（`run-zotero-compatibility-matrix.ts plan --gate <pr\|main\|release> --json`，按 `blocking` 拆矩阵，`:57-63`）；`test-lite`（仅 PR：装 Host Bridge CLI Rust toolchain 后 `npm run test:gate:pr`，`:85-86`）；`test-full`（仅 main push：`git submodule update --init skills_builtin` + `npm run test:gate:release`，`:108-111`）；`zotero-compatibility-blocking`（矩阵真实 Zotero cell，`:113-154`）与 `zotero-compatibility-macos-evidence`（非 PR，`continue-on-error: true`，`:156-199`） |
| `release.yml` | `push: tags v**` | 单 job `create-release`：同步 Host Bridge CLI 内容寻址预构建（`:31-36`）→ 校验七平台二进制与 `.sha256` 齐全（`:38-65`）→ `check:host-bridge-cli-prebuild-freshness`（`:68`）→ Synthesis sidecar release plan `completeReceipt == true`（`:70-74`）→ `check:synthesis-sidecar-runtime-freshness`（`:77`）→ 要求当前 Host Bridge complete receipt（`:79-85`）→ `npm run test:gate:release`（`:88`）→ `check:content-package-release`（`:91`）→ `build:help-docs`（`:94`）→ `npm run build`（`:97`）→ `check:synthesis-sidecar-runtime-xpi`（`:100`）→ 校验 XPI 内 Host Bridge 资产（`:103`）→ `npm run release`（`:106`） |
| `verify-synthesis-sidecar.yml` | `workflow_dispatch` + `push`/`pull_request` 命中 `rust/synthesis-sidecar/**`、`packages/synthesis-*/**`、`scripts/synthesis/check-synthesis-*.ts`、`package.json` 等路径 | 3 平台 job（linux/windows/macos）各跑 `cargo +nightly-2026-07-25 test --workspace --locked --no-fail-fast` + 治理门禁，最后 `receipt` job 写闭合验证 receipt |
| `build-host-bridge-cli-prebuilds.yml` | `workflow_dispatch`（`request_id`、`source_sha`） | `plan`（读 recipe 出矩阵/toolchain）→ `build`（cargo-zigbuild 七平台 + 二进制身份校验 + surface identity）→ `publish-prebuild`（推内容寻址集合） |
| `release-host-bridge.yml` | `workflow_dispatch`（`release_set_id`、`source_sha`、`request_id`） | `plan` → `materialize`（恢复预构建集、绑定并校验 release set、stage finalize 文件）→ `publish`（可恢复 receipt、推不可变 commit/tag、校验 manifest、推进可变指针、finalize source main、失败保留 receipt） |
| `prebuild-synthesis-sidecar-runtime.yml` | `workflow_dispatch`（`source_sha`、`request_id`） | `plan`（校验 `GITHUB_SHA == source_sha`）→ `prebuild`（七平台构建/打包/native smoke/证据）→ `publish-set` |
| `release-synthesis-sidecar.yml` | `workflow_dispatch`（`release_set_id`、`source_sha`、`prepared_sha`、`request_id`） | `materialize`：绑定 release set → 恢复内容寻址集合 → 记录 complete receipt → finalize source main |
| `publish-content-feed.yml` | `workflow_dispatch`（`request_id`、`channels`） | 建 feed → 上传 artifact → 校验 token → 发 GitHub release asset → 推 content-feed 分支 → 校验已发布 feed |
| `deploy-user-docs.yml` | `push: main`（`site/**`）+ `workflow_dispatch` | Docusaurus 构建 + GitHub Pages 部署 |
| `issue-bot.yml` | `issues: labeled`、`issue_comment: created`、每日 cron、`workflow_dispatch` | 复用 `zotero-plugin-dev/workflows/.github/workflows/issue-bot.yml@main` |

【事实】发布类 workflow 全部是 `workflow_dispatch`，符合 AGENTS.md「普通 main push 和 CI 不得触发发布」。`release.yml`（tag 触发）只做验证 + `zotero-plugin release`。

---

## 6. 门禁

### 6.1 CI 门禁：`scripts/run-ci-gate.ts`

【事实】调用链 `package.json:117-118` → `tsx scripts/run-ci-gate.ts pr|release` → `scripts/ci-gate-plan.ts`。

**PR 门禁（6 项，顺序执行，fail-fast）**：

| # | stage id | npm script | 内容 |
|---|---|---|---|
| 1 | `check-localization-governance` | `check:localization-governance` | locale 治理校验（纯读） |
| 2 | `check-ssot-invariants` | `check:ssot-invariants` | SkillRunner SSOT YAML 不变量（纯读） |
| 3 | `check-host-bridge-content` | `check:host-bridge-content` | 渲染 `--check` + agent-language + consumers（间接 `cargo run`） |
| 4 | `test-synthesis-native-stage1` | `test:synthesis-native:stage1` | worker-transfer-parity + `cargo build` + stage1 suite |
| 5 | `test-node` | `test` | `run-node-test-shards.ts`（308 文件 / 28 分片） |
| 6 | `test-zotero-lite` | `test:lite` | **真实 Zotero** core/ui/workflow lite |

**Release 门禁**：与 PR 完全相同的前 5 项，第 6 项替换为 `test-zotero-full` → `test:full`（`scripts/ci-gate-plan.ts:34-38`）。

【事实】执行语义：串行 `for` 循环，首个非零退出码即返回（`scripts/run-ci-gate.ts:35-46`）；无并行、无 retry、无跳过记录。

### 6.2 发布协调门禁：`scripts/release-coordinator-gate.ts`（732 行）

【事实】与 CI 门禁**不是一条链**：它不 import 另外两者，也不被它们 import；只被 `.agents/skills/zotero-agents-release-coordinator/SKILL.md` 引用。它**不执行任何测试**，只做审计并输出 JSON + `blockers` + `next_action`，有 blocker 时 `process.exitCode = 2`（`:721-724`）。

【事实】12 项检查（顺序，`:486-627`）：① 在 main 分支 ② 工作区干净 ③ target 是合法 semver ④ target > `package.json` version ⑤ Host Bridge 候选变更且未 `--host-bridge-done` ⑥ 内容包候选变更且未 `--content-package-release-verified` ⑦ 未 `--test-node-full-passed` ⑧ 未 `--lint-check-passed` ⑨ origin/main 同步 ⑩ origin 已有 target tag ⑪ 本地已有 target tag ⑫ GitHub release 已存在。

【事实】⑤–⑧ 完全依赖操作者自报 flag，gate 自己不验证（`:528-535` 等）。【事实】`next_action` 优先级：`resolve_blockers` > `run_host_bridge_pipeline` > `publish_content_package` > `run_local_gates` > `sync_main_remotes` > `recover_release_state` > `ready_to_release`（`:361-396`）。

### 6.3 门禁与 workflow 的对应

【事实】`.github/workflows/ci.yml:86` 跑 `test:gate:pr`（PR）、`:111` 跑 `test:gate:release`（main push）、`release.yml:88` 又跑一次 `test:gate:release`（tag）。→ **release tag 会重复执行 release 门禁一次**（CI 的 `test-full` job 与 Release job 各一次）。这是设计取舍，不是缺陷，但会显著拉长 tag 发布时长。

---

## 7. 可观测性：测试失败如何定位

### 7.1 Node 分片层

【事实】每个分片开始/结束都打印结构化标记：`[node-test-shard:start] <id> (<label>)`、`[node-test-shard:files]`、`[node-test-shard:data-dir]`、`[node-test-shard:command]`、`[node-test-shard:end] <id> exit=<code> durationMs=<ms>`（`scripts/run-node-test-shards.ts:541-561`）。

【事实】汇总输出（`:632-663`）：
- `[node-test-shards:summary]` 逐分片 `exit/files/durationMs`
- `[node-test-shards:failed]` 逐失败分片给出**重跑命令**
- `[node-test-shards:failed-output]` + `[node-test-shard-output:start] <id>` + `[node-test-shard-output:command] <command>`，再用 `extractMochaFailureOutput` 只截取 mocha `N failing` 之后的段落（`:475-486`）

【事实】单分片重跑：`npm run test:node -- --shard <id>`（`docs/testing-framework.md:10`）。

### 7.2 真实 Zotero 层

【事实】宿主侧统一 setup：`tests/zotero/setup.test.ts:1-9` 装载 4 个模块——
- `mochaGrep.ts`：把 env 里的 grep 应用到 mocha
- `diagnosticBridge.ts`：失败上下文 provider（`:74-81`）、`window.debug` 桥（`:55-72`）、case 后的后台清理与对象清理编排
- `leakProbeDigest.ts`：泄漏探针，`ZOTERO_TEST_LEAK_PROBE` 开关（`:71`），输出 `ZOTERO_TEST_LEAK_PROBE_OUT`，默认前缀 `zotero-leak-probe`（`:76-77`）
- `performanceProbeDigest.ts`：性能探针，`ZOTERO_TEST_PERF_PROBE`（`:114`），输出 `ZOTERO_TEST_PERF_PROBE_OUT`，默认前缀 `zotero-performance-probe`（`:126-127`）

【事实】诊断产物默认目录：`artifacts/test-diagnostics/`（`tests/zotero/testDiagnosticsOutput.ts:72-83`，文件名 `<prefix>-<ISO 时间戳>.json`，`:85-97`）；在宿主内优先用 `IOUtils`，Node 侧回退 `fs/promises`（`:49-70`）。`.gitignore:74` 已忽略 `artifacts/test-diagnostics/`。

【事实】另有 E2E 专属产物：debug 构建持续写 `runtime/logs/citation-graph-crash-journal.json`，压测结束时复制到 `artifacts/test-diagnostics/citation-graph-crash-journal.json`（`docs/dev/zotero-e2e.md:38-40`）。

【事实】保留现场开关：`ZOTERO_KEEP_TEST_OBJECTS`（`tests/zotero/testObjectKeepFlag.ts:10/20/28`）仅用于本地调查（`docs/testing-framework.md:73`）。

### 7.3 scaffold 报告通道

【事实】`zotero-plugin test` 内置 `TestHttpReporter`（`scaffold.DQYuTa0n.mjs:4296`），生成的 runner 页面通过 `POST http://localhost:<port>/update` 回传 mocha 事件；本仓库的 `patch-zotero-test-runner.ts` 在此之上把 `send()` 改为阻塞式 `sendBlocking()` 并补装 `console.error`/`window.onerror`/`onunhandledrejection` 桥（`:55-105`、`:165-227`），使宿主内异常也能出现在终端输出。patch 锚点缺失会显式抛错（`:253`、`:295`），不会静默降级。

### 7.4 CI 产物

【事实】`ci.yml` 上传 `build-result`（`.scaffold/build`，`:38-42`）与每个兼容性 cell 的 `compatibility-<id>`（`${{ runner.temp }}/zotero-compat-runs`，`if: always()`，保留 30 天，`:147-154` / `:192-199`）。

---

## 8. 疑点清单（待核查，非结论）

| # | 疑点 | 证据 | 性质 |
|---|---|---|---|
| 8.1 | `test:node:raw` 作为 `DEFAULT_NODE_TARGET_SCRIPT` 存在，但 `package.json` **没有这个 script** | `scripts/run-zotero-test-with-mock.ts:22`；`grep test:node:raw package.json` 无命中（仅出现在 `tests/zotero-host/91-zotero-test-infrastructure.test.ts:161-162` 与 openspec 归档） | 死默认值。当前所有 `test:zotero:*` 都显式传 target，暂不影响运行；不传参直跑会失败 |
| 8.2 | 文档说 `test:zotero:full` 起 **3** 个宿主进程，实际是 **4** 步 | `docs/testing-framework.md:18` vs `scripts/run-zotero-full-suite.ts:8-13` | 文档漂移（`docs/dev/zotero-e2e.md:3` 与代码一致） |
| 8.3 | `.scaffold/test` 在测试后**无清理代码**，跨轮次共享 profile/data | `scripts/run-zotero-test-with-mock.ts:213-223` 只清 tmp；`scaffold.DQYuTa0n.mjs:4834-4836` 仅在下轮开头 `emptyDir` | 本地中断后可能残留脏 profile；`artifacts/zotero_7_9_10_compatibility_test_framework_design_guide.md:361-363` 已警告过同类问题 |
| 8.4 | E2E「不修改真实库」**没有运行时强制**（无源目录只读校验） | `zotero-plugin.config.ts:125-154`：只有 `fs.cp` 与 env 读取，无 chmod/校验 | 构造性保证；误配 `ZOTERO_E2E_GOLD_DATA_DIR` 指向可写路径时没有任何防线 |
| 8.5 | 两个 `check-*` 脚本实际会 `cargo run` 并写 `rust/synthesis-sidecar/target/` | `scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts:114-127`；`check-synthesis-native-worker-transfer-parity.ts:160-172` | 名字与行为不符；在无 Rust nightly 的环境里它们不是"纯校验"，可能阻塞 PR 门禁第 3/4 项 |
| 8.6 | 测试编号表重复定义两份 | `scripts/run-node-test-shards.ts:82-91` `SYNTHESIS_NATIVE_FILE_NUMBERS` vs `scripts/synthesis/synthesis-native-stage1-suite.ts:6-15` `REQUIRED_CORE_NUMBERS` | DRY 违反；两表漂移会导致 stage1 suite 静默漏测 |
| 8.7 | 分片归属用**测试文件编号阈值**切分，与文件名强耦合 | `scripts/run-node-test-shards.ts:139,157,164,219,226,249,261` | 新增文件编号落在阈值边界会静默改变归属；好在 `unassigned/duplicates` 会兜底（`:745-754`） |
| 8.8 | `e2e-single-markdown-live.ts` 默认输出写死开发者家目录 | `scripts/e2e-single-markdown-live.ts:132` `~/Workspace/Code/zotero-agents/e2e_downloads` | 仓库路径已不是这个（当前为 `.../JavaScript/zotero-agents`），默认值已过期；另有内置 IP `http://192.168.13.111:8030`（`:131`） |
| 8.9 | `release-coordinator-gate.ts` 写死仓库 | `scripts/release-coordinator-gate.ts:102` `DEFAULT_REPO = "leike0813/zotero-agents"` | fork/改仓库时会静默审计错误对象 |
| 8.10 | `tests/fixtures` 提交了 98.5 MiB 真实论文 PDF（含真实标题与作者文件名） | `tests/fixtures/selection-context/attachments/*/…pdf`（23 个）；`docs/dev/zotero-e2e.md:16` + `AGENTS.md:141` 的"金例只提交去标识化结构契约" | **仅针对"金例"的约束不覆盖 selection-context**，故不构成规则违反；但仓库体积与去标识化精神存在张力，值得确认是否为有意保留 |
| 8.11 | `tests/fixtures` 约 4 MiB 语料在仓内 0 引用 | `source_papers/`、`digest_samples/`、`reference_samples/`、`synthesis-topics-sample/`、`topic-synthesis-…-playbook/`、`zotero/`、`workflow-loader-*/`、`acp/` | 疑似历史归档，可评估删除 |
| 8.12 | `zotero-mock.ts` 未实现 fail-closed：未知 API 静默返回 `undefined` | `tests/setup/zotero-mock.ts:195`（`[key: string]: unknown`）、无 `Proxy` 命中；对照 `tests/helpers/zoteroHostCapabilityBrokerHarness.ts` 的 fail-closed 替身 | 与项目对"broker 替身必须 fail-closed"的硬约束形成落差（该约束未直接覆盖全局 mock）；隐式失败增加排障成本 |
| 8.13 | 多个 `test:*` script 不在任何门禁/ workflow 中 | `test:node:ui:harness`、`test:literature-deep-reading:detr-visual`、`test:synthesis:invariants`、`test:synthesis:legacy-production-migration`、`test:synthesis-rust-sidecar`、全部 `test:zotero:*` 细分命令、`test:zotero:compatibility:*` | 有的是本地调试入口（合理），有的可能是遗留（待确认） |
| 8.14 | Release tag 会重复跑一次 release 门禁 | `.github/workflows/ci.yml:111` 与 `.github/workflows/release.yml:88` | 成本问题，非正确性问题 |
| 8.15 | `scripts/` 中 `npm run build` 依赖 `cargo +nightly-2026-07-25`（`package.json:55-58`） | `package.json:55`；`scripts/check-runtime-diagnostics-release-elision.ts` 等 | 本地无该 toolchain 时 `npm run build` 与门禁第 4 项不可用（【推测】本机是否已装未验证——约束禁止运行构建） |
| 8.16 | `tests/tsconfig.tsbuildinfo` 存在于工作区 | `git ls-files` 为空（未跟踪）；`.gitignore:15` `*.tsbuildinfo` | 非问题，仅记录 |

---

## 9. 未覆盖范围

本次侦察**没有**覆盖以下内容，后续若需要请单独排期：

1. **未运行任何测试或构建**：所有"可运行性"判断均来自静态依赖分析。各套件在本机的**实际通过率、耗时、稳定性**未测。
2. **未审计测试内容质量**：没有逐文件评估 324 个测试文件是否违反 `docs/testing-framework.md:55-67` 的"测试价值"准则（如是否断言内部调用顺序、是否锁定文案），也没有统计 skip/quarantine 数量。
3. **未审计 `tests/zotero/compatibility/*` 与 `scripts/run-zotero-compatibility-worker.ts` 的完整矩阵语义**：只确认了下载源、平台/版本表与 CI job 入口，未逐条核对 `policy.blocking` 在 pr/main/release 三档下的差异。
4. **未审计 `scripts/host-bridge/` 与 `scripts/synthesis/` 的发布正确性**（只做了副作用分类与关键行取证），Host Bridge 三层发布面语义、receipt 状态机、Gitee 同步合规性均需专项。
5. **未审计 Rust 侧测试**：`rust/synthesis-sidecar` 的 `cargo test` 范围、`rust/zotero-bridge`、`rust/acp-ws-bridge` 的测试完全不在本次范围。
6. **未审计 `packages/*` 的 workspace 测试**：`synthesis-engine`/`synthesis-contracts`/`synthesis-repository`/`synthesis-application` 只通过 `tsc --noEmit` 参与 `npm run build`，其自身测试情况未查。
7. **未审计 `.agents/skills/zotero-agents-release-coordinator/SKILL.md`** 与 `release-coordinator-gate.ts` 的一致性。
8. **未验证网络声明**：只做了 URL 字面量与调用点扫描，未做实际的离线运行验证（例如 Node 分片是否真的全程无外网）。
9. **未评估 CI 时长/成本**：未统计各 job 的历史耗时，也没有分析矩阵 job 的 runner 成本。
10. **未核查 `openspec/` 中与测试治理相关的 spec 是否与当前实现同步**（只引用了 `zotero-mock-parity-governance` 一处）。
