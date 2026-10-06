# PA-02 复核：超大 note 中断 artifact readiness

当前 dev `18157c3751a41f70d6f1dfe58b7823c8ce30f608` 仍可复现 PA-02 失败。runner 修复解决 stderr 管道阻塞，未改变 PA-02 的执行、断言或 manifest 判定。搜索范围修复也未修改本次失败路径。

## 复测结果

从 dev 导出隔离源码到 `/tmp/zotero-pa02-dev-18157c37-JtuieD`，使用既有依赖、scaffold 测试 profile/data 与当前源码构建的本地 sidecar。没有切换分支、安装依赖或修改当前工作区生产代码。宿主取自本机 `10.0.2/` 安装目录，实际版本为 **10.0.5**。

| 版本与实验 | PA-02 | runner 退出码 | manifest |
| --- | --- | --- | --- |
| dev 原版，含 runner 修复 | failed | 1 | `9767ac7b-3ebc-453f-992d-12270fd6292a` / incomplete |
| dev 加直接 readiness 诊断 | failed | 1 | `2c08d117-36cc-41f6-ae0e-ab113135d9df` / incomplete |
| dev 临时增加 resource_limited 隔离，恢复原版测试 | passed | 0 | `62aa08dc-25d3-42d3-97b2-dac38066f9e9` / complete |

以上每轮仅运行 foundation 与 PA-02；cleanup、health 都通过。这里的 complete 只代表该定向运行，不能作为完整 catalog 通过的证据。三个 manifest 已复制到当前工作区 `artifacts/test-diagnostics/system-e2e/<runId>/run-manifest.json`。

dev 工作区已有记录也与此一致：

- `4392c0f0-859a-43e6-8ca6-6177a9f6692a`，2026-10-06 18:05 CST，Zotero 9.0.4：18 个 case 中 PA-02 failed，其余 17 个 passed，terminalState 为 incomplete。
- `f7fd172f-d7cf-49ad-9314-e3b0759fc174`，18:26 CST，Zotero 9.0.4：complete，但仅覆盖 CG-02，没有执行 PA-02。

这两份记录位于 dev 的实际文件目录 `/home/joshua/Workspace/Code/JavaScript/zotero-agents/artifacts/test-diagnostics/system-e2e/`。

## 根因与错误传播

PA-02 创建一个包含 360,000 个中文字符的子 note。实际 source 为 **1,080,009 bytes**，超过 managed note 的 **1,048,576 bytes** 上限。

1. `inspectManagedNote`（`src/modules/zoteroHost/zoteroManagedNotes.ts:1541`）抛出 `ManagedNoteOwnerError`，code 为 `resource_limited`；这是有效的有界读取保护。
2. `detachArtifactNote`（`src/modules/zoteroHost/libraryArtifactReadiness.ts:217`）只隔离 `invalid_artifact` 和 `legacy_artifact_requires_migration`，把该错误重新抛出，导致 `resolveLibraryArtifactReadiness` 整体失败。
3. `library.getArtifactReadiness`（`src/modules/zoteroHostCapabilityBroker.ts:16241`）传播原始 owner error；Synthesis 的 `library.artifacts.readiness` 随之失败，Workbench Index 无法保留有效邻项。
4. reverse Host endpoint（`src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts:119`）将未识别的 error 转成 HTTP 500 / `internal`。Rust 与 native client 随后表现为 `internal_error` / `unavailable`，掩盖了底层的 resource_limited。

直接调用真实 readiness owner 的诊断结果：

```json
{"errorName":"ManagedNoteOwnerError","code":"resource_limited","resource":"bytes","limit":1048576,"observed":1080009}
```

只在临时副本的 `detachArtifactNote` 已有错误列表中增加 `resource_limited`，即可保留有效 References，并让原版 PA-02 的 Index、artifact 诊断、cleanup 与 health 断言全部通过。没有放宽字节上限，也没有改变断言。对照前确认测试文件与 dev 原版 SHA-256 完全一致：`c25af6d369604f8aed2e964fce00ff1e8bd3cbabcee7d8f31e4f84341b8fbf3b`。

## 命令与边界

在隔离源码目录执行既有统一 runner：

```bash
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/home/joshua/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64/zotero \
ZOTERO_TEST_GREP='System E2E runner foundation|PA-02' \
ZOTERO_PLUGIN_KILL_COMMAND='node /tmp/zotero-agents-issue88-kill.cjs' \
npm run test:zotero:e2e
```

kill override 仅清理当前 invocation 的 scaffold profile 对应进程。stdout 分别保留于 `/tmp/zotero-pa02-dev-reanalysis.log`、`/tmp/zotero-pa02-dev-root.log` 与 `/tmp/zotero-pa02-dev-control.log`。

本轮是诊断与临时对照，不是落地修复。当前分支与 dev 的生产文件均未修改；诊断插桩已移除。建议将 `resource_limited` 纳入共享 readiness 的逐 note 隔离，复用现有 PA-02 验收，落地后再跑完整 System E2E。当前仍不能据此结票。
