# Verification

验证日期：2026-10-05。合并基线为 `4b1f2f81`，dev 源提交为 `f105b17480c092ef1b485e6cfbeafe9a09d58b64`。Pi 适配保留未提交，未推送。

## 实现与回归

- 枚举 `filter` 的三个回归用例先失败，再随目录 schema 修改通过。
- 文献搜索、惰性证据/主题搜索先因工具缺失失败，再随工具注册通过。
- `250-pi-zotero-tool-catalog.test.ts` 全部 38 项通过：canonical 输入校验、三类分派、18 个惰性只读工具、结果状态与游标透传、结构化冲突、未知异常隔离、取消及既有结果预算。
- Conversation/Skill Run 默认装配集成验证新增三个工具出现在 Provider 请求目录；不依靠测试覆盖默认 definitions。
- 共享 schema localizer 由 MCP 与 Pi 共用，没有新增依赖或第二份检索 schema。

## 命令结果

| 检查 | 结果 |
| --- | --- |
| `npm run build` | 通过，包含四个共享包及主插件/sidebar/dashboard/synthesis TypeScript 检查 |
| `npm run check:pi-mcp-browser-bundle` | 通过，无 Node MCP SDK；Pi MCP browser bundle 为 1,786,157 bytes |
| `npm run test:node:host-bridge` | 两个分片共 22 个文件通过 |
| `npm run test:node:zotero-host` | 17 个文件通过 |
| `npm run test:node:runtime` | 4/5 分片通过，详见下面的既有失败 |
| 改动 TypeScript 文件 ESLint 与全部改动文件 Prettier `--check` | 通过 |
| `openspec validate adapt-pi-host-search-tools --strict` | 通过；新增 requirement 已同步主 spec，CLI 提示重复 ADDED 的归档信息，本次未归档 |
| `openspec validate pi-zotero-tool-catalog --type spec --strict` | 通过；既有长 requirement 提示为 INFO |
| `git diff --check` | 通过 |

## 真实宿主

沿用 `npm run test:zotero:e2e`，通过 `ZOTERO_TEST_ENTRY` 指向临时目录中的 import entry，只导入现有 `tests/zotero/core/lite/284-pi-zotero-tool-catalog.zotero.test.ts`；未创建平行 runner。这是定向工具验收，不是完整 System E2E catalog 运行。

宿主为 Linux x86_64 / Zotero 10.0.2，使用隔离 `.scaffold/test` profile/data。runner 编译当前源码的本地 Rust sidecar，build fingerprint 为 `90a9989a539bcb3b0018174c9ff14a59af9ff6a07cce6b7c224418d0c09343a7`。

首轮 44 项通过、1 项失败：测试 bundle 与插件的模块状态独立，直接构造的 Broker 没有 ready sidecar connection，文献搜索返回 `unavailable`。按既有 MCP 宿主测试的 discovery seam，测试接入插件已发布的 sidecar owner，未改变产品行为或放宽结果断言。第二轮全部 **45 项通过**，验证实际库 filter、文献元数据命中、Synthesis 证据命中与主题搜索，以及既有 Gateway、mutation、navigation 行为。日志为 `/tmp/pi-host-search-acceptance-retry.log`。

## 既有失败

`runtime-provider-products` 中 `tests/runtime/172-export-research-bundle-skill-runtime.test.ts` 有 10 项失败；其他 Runtime 分片全部通过，包括 18 文件的 `runtime-provider-execution`。

从合并提交 `4b1f2f81` 导出独立源码快照，共用已安装 Node 依赖，单独运行 `runs discovery through the CLI fixture`，复现相同失败：`topic:topic-a` 来源未包含预期 `query:graph evidence`。日志为 `/tmp/pi-merge-baseline-product-failure.log`。该旧 fixture 仍用 `input.query` 处理 library enumeration，而 dev 已改用 `filter`；与本次 Pi 适配没有代码依赖。未扩大本次变更去修复 Skill fixture，任务 3.4 的全域通过条件保持未完成。

Host Bridge agent-facing 指令源未修改；本次只复用 MCP schema 代码。AGENTS、Broker SSOT 和 Pi 主 spec 已同步新目录契约。
