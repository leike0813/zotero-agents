# Verification — Pi SDK 1.0.0

2026-10-03，开发工作树，HEAD `0c14475d3031144aa3759e1f71f3046895f1e314`，dirty。当前 change 只实施 core/ai 升级；目录独立更新、SIWC 和搜索迁移留给后续 change。C20 仍开放。下列结果不认证 clean 最终候选，也不构成发布或归档许可。

## 实现与回归

- 根 manifest、lock 和实际安装均为 core/ai **1.0.0**，`@oh-my-pi/pi-catalog` 保持 **18.0.11**。
- Runtime 经 `prepareRequest` 返回归一化的指令、完整历史和匹配的执行工具。`finishTurn` 结束项目等待、未知效果、LoopGuard、取消或暂停状态；其它路径保留自然工具续调用。准备失败不调度 Provider。逻辑终态和物理 settlement 仍分开。
- Provider 在直接 API 入口归一化 Context；已归一化的输入不会重复插入指令或工具。HTTP 回归检查 plain/structured 两条路径的指令、工具及所选授权；既有无密钥、脱敏失败和取消测试保持通过。
- Pi AI 估算器计入指令、工具描述/schema 和实际参数。冻结预算、完整语义单元、摘要校验与压缩 CAS 没有改动。新记录携带 Pi AI 身份/版本；历史冻结选择保留原有版本。
- 版本事实来自根 manifest，经既有 `piRuntimeBuild.ts` 共享。浏览器 guard 仍只有 `provider-env.js → node:fs` 的精确不可达导入，不增加 Node shim。

TDD 保留了三个失败边界：旧 Runtime 没有执行准备后替换的工具；旧估算器在描述增加后仍返回 6；升级 SDK 后的旧 Provider Context 没有发送系统指令。实现后回归通过。首次完整执行分片还暴露 text adapter 对不存在 setter 的调用，已改为替换归一化消息并通过全分片复验。

## 自动检查

| 命令                                                                              | 结果                                                                                                   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm ls @earendil-works/pi-agent-core @earendil-works/pi-ai @oh-my-pi/pi-catalog` | 匹配固定版本，core 的 ai 依赖去重                                                                      |
| `npm run test:node -- --shard=runtime-provider-execution`                         | 全分片通过，含 Runtime、Provider、Preparation、Tool Gateway、Conversation、Skill Run 和物理 settlement |
| 最终 Runtime/Provider/Estimator 定向合同回归                                      | 通过，命令保留于 `evidence/contracts-final.log`                                                        |
| 最终 Runtime/Provider/Estimator 定向合同回归                                      | 通过，命令保留于 `evidence/contracts-final.log`                                                        |
| `npm run check:pi-mcp-browser-bundle`                                             | 通过；Pi MCP bundle 1,759,230 bytes，插件无 legacy MCP SDK                                             |
| `npm run build`                                                                   | 通过，含生产打包及 root/sidebar/dashboard/synthesis TypeScript 检查                                    |
| `npm run lint:check`                                                              | 通过                                                                                                   |
| 定向 Prettier/ESLint 检查                                                         | 通过                                                                                                   |
| `openspec validate upgrade-builtin-pi-runtime --strict`                           | 通过                                                                                                   |
| `npm run test:node`                                                               | 首轮 26/28 分片通过；UI、workflow-engine 各 2 个默认 2 秒超时，随后以原参数分别重跑全分片通过          |
| `npm run measure:pi-runtime-bundle`                                               | 三项数值低于预算；正式证据因 dirty 被 discard，exit 2                                                  |

构建生成的 help-docs manifest 只有生成时间更新。已有 `.gitignore`、`CONTEXT.md`、研究材料和 SIWC 原型保持原样。

## 包体测量

```shell
npm run measure:pi-runtime-bundle -- \
  --out .scaffold/pi-upgrade/bundle \
  --bundle .scaffold/pi-upgrade/bundle-record.json \
  --artifact .scaffold/pi-upgrade/bundle.json
```

`sameInputs`、`browserGuardPassed`、`excludedFully` 均为 true，`exceededLimits` 为空：

| 项目         | 实测 bytes | 预算 bytes |
| ------------ | ---------- | ---------- |
| Raw JS 增量  | 17,106,420 | 20,971,520 |
| Gzip JS 增量 | 1,052,213  | 1,572,864  |
| XPI 增量     | 1,090,171  | 2,097,152  |

Candidate 摘要 `baa976f213b7b9d616ca8b63af5ce29702614feaa473989d40ae7e2e613fb2e7`，control 摘要 `5172535e283b805db3250ff83c3ebd810a1b09a9ac5ffeba77b86453e4d3633d`，构建位于 `.scaffold/pi-bundle-size/{candidate,control}`。测量 JSON/Markdown 与 bundle record 保留于 `.scaffold/pi-upgrade/`。脚本返回 **2**，bundle record 为 **failed**，唯一 discard 原因为 **dirty-worktree**。上述数值仅用于本阶段开发审阅，不能标记 C20 正式包体门禁通过；没有修改脚本门禁或 Git 状态。

## Linux 宿主证据

本地证据保留在 `.scaffold/pi-upgrade/evidence/<runId>/`，包含原始 receipt 与其诊断文件。以下 core 由同一个既有 compatibility worker 运行：

```shell
ZOTERO_TEST_ENTRY=/tmp/pi-upgrade-20261003-core-entry \
ZOTERO_TEST_GREP='compatibility host facts|PiRuntime|Pi Turn Preparation|Pi Web external trust preparation|Pi API-key Provider|Pi provider configuration' \
npm run test:zotero:compatibility:run -- \
  --gate=main --target=<matrix-target> --mode=behavior --suite=lite --domain=core
```

临时 `suite.test.ts` 仅 import 现有 276/278/280/281 core 文件；worker 附加 host probe。没有新测试 runner。最终增加声明工具集合断言后，用 `compatibility host facts|replaces prepared instructions|estimates complete tool|Pi API-key Provider in real Zotero` 在三平台版本重新定向验证。表中 Run ID 使用后缀；完整证据目录名为 `<matrix-target>-<suffix>`。

| Matrix target       | 实际版本 | Core    | 最终定向复验 | Run ID（core / final）  |
| ------------------- | -------- | ------- | ------------ | ----------------------- |
| zotero-7-linux-x64  | 7.0.32   | 74 pass | 4 pass       | `5299e179` / `ab36547f` |
| zotero-9-linux-x64  | 9.0.6    | 74 pass | 4 pass       | `a351ad22` / `db25a3e6` |
| zotero-10-linux-x64 | 10.0.1   | 74 pass | 4 pass       | `f1efb139` / `8e9bfc04` |

完整 owner 集成运行：

```shell
npm run test:zotero:compatibility:prepare -- --gate=main --build-root=.scaffold/build
ZOTERO_TEST_GREP='System E2E (runner foundation|Phase 3 builtin Pi runtime)' \
npm run test:zotero:compatibility:run -- \
  --gate=main --target=zotero-10-linux-x64 --mode=behavior \
  --suite=full --domain=e2e --families=PI
```

Receipt `zotero-10-linux-x64-8c3e674c` **passed**，实际 Zotero **10.0.1**。Conversation、interruption、Auto、Interactive 和 restart recovery 各 phase 通过；foundation、PI-01/02/03/04/05/05-safe 分跨重启阶段执行。测试复用 `tests/zotero/e2e/full`。Synthesis sidecar 从当前源码构建，fingerprint `218a1b9212e62384b28e08d6728e1e0ea463db4ea6a043c2b3b6ef8621e51b2f`。这是 test-bundle owner 行为，不是安装正式 XPI 的认证。

这些宿主 receipt 的插件摘要为 `4e3cb8ed6ea164db48999f1e3c287a883eb9da18293db93780fb9dbe232fba52`。包体对照会独立构建自己的 candidate/control 并保留各自摘要，不将两次构建混作同一候选。

## 失败与证据缺口

- 全量 Node 首轮有 4 个默认 2 秒超时：UI readonly harness 的 publication 初始化与 DB 映射、Literature Search Ingest 的参数及结果验证。未改测试或阈值，串行重跑对应完整分片均通过；首轮失败与两个重跑日志保留在本地 evidence，不能将其表述为首次全绿。
- `zotero-7-linux-x64-040e21f8`、`zotero-9-linux-x64-4f7a5893`：测试包构建失败，原因是已有未提交 SIWC 原型引用 artifacts，而临时 worker 未映射该目录；未运行 SDK，不能作为 SDK 失败或通过。
- `zotero-7-linux-x64-bba35dff`：receipt 通过但只执行了 1 个 host-facts 用例。隐藏目录中的临时入口被 glob 跳过；该尝试不计入 Pi 验证。移到非隐藏临时目录后重新执行 74 个用例。
- Windows 7.0.32/9.0.6/10.0.1：**missing / blocking**。当前 Linux 会话没有 Windows 宿主执行环境，任务 4.3 保持未完成；Linux 结果不能替代它们。
- macOS Zotero 10 x64/arm64：**missing / nonblocking visibility**。保留可见性，不标记通过。
- C20 的 clean final candidate、安装/升级 XPI、容量探索及最终 workload、真实账号/搜索人工 receipt 仍按其原任务处理。此 change 不完成 C20。
