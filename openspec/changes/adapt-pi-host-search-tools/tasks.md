# Tasks

## 1. Baseline

- [x] 1.1 将 dev 合并回 dev-agent-harness（merge commit `4b1f2f81`），记录基线为相关测试 290 项通过且主 TypeScript 检查通过。

## 2. 共享检索 schema 与枚举输入改名

- [x] 2.1 在 `packages/synthesis-contracts/src/protocolSchema.ts` 实现共享导出 `materializeSynthesisProtocolDefinitionSchema`，MCP 复用且只携带可达定义；验证 MCP 契约测试与 Pi 目录 schema 闭合断言通过。
- [x] 2.2 将 Pi 列表、readiness audit 与遍历的枚举输入改用 `filter`，检索输入使用独立 `query`，不建立别名；验证旧 `query` 在枚举工具被闭合 schema 拒绝。
- [x] 2.3 扩展 `tests/runtime/250-pi-zotero-tool-catalog.test.ts` 锁定枚举 `filter` 转发与 `query` 拒绝；filter 回归用例按 red-green 通过。

## 3. 三个有界检索工具

- [x] 3.1 在 `zoteroNativeToolCatalog.ts` 新增 `library.search_items` → `zotero_library_search_items` → `broker.library.searchItems`，声明 `bounded-read`；文献搜索与既有映射用例按 red-green 通过。
- [x] 3.2 目录新增可选的惰性 Synthesis Client resolver，并注册 `synthesis.search_evidence` → `zotero_synthesis_search_evidence` → `client.searchEvidence` 与 `topics.search` → `zotero_topics_search` → `client.topics.search`；验证无 resolver 时两工具缺失、冻结不启动 sidecar，有 resolver 时冻结 18 个只读工具。
- [x] 3.3 在 `piConversation.ts` 与 `piSkillRun.ts` 装配处注入现有 `getDefaultSynthesisClient` 作为 resolver；验证两条路径冻结目录均包含新增三工具并记录 capability ID 与工具名。
- [ ] 3.4 扩展 250 目录测试的只读计数（15→16，注入 resolver 后 18）与三个映射断言；运行 `npm run test:node:runtime` 通过。

  目录测试 38 项通过，Runtime 中四个分片通过，包括全部 Pi 执行与装配测试；`runtime-provider-products` 的 `export-research-bundle` 旧测试有 10 项失败，因此全域通过条件保持未完成。详见 [verification.md](./verification.md)。

## 4. 错误映射与结果边界

- [x] 4.1 在读取包装器中识别结构化 `SynthesisClientError`，保留安全 code/details，`internal` 映射为 `internal_error`，未知异常不暴露原生诊断；验证超限返回 `resource_limited`、结构化失败保留语义、游标不转换不缓存。
- [x] 4.2 扩展 Pi gateway 与集成测试覆盖三类检索分派、游标透传与冲突、零命中与 unavailable 区分、取消不重试；运行对应 runtime 用例通过。

## 5. 集成与构建验证

- [x] 5.1 扩展真实宿主镜像用例（`tests/zotero/core/lite/284-*`）与 Conversation/Skill Run 集成用例，验证冻结目录与真实 Broker 一致。
- [x] 5.2 运行插件构建、TypeScript 检查、改动文件 lint 与 `npm run check:pi-mcp-browser-bundle` 通过。
- [x] 5.3 通过现有 `npm run test:zotero:e2e` runner，以临时 import entry 定向执行 Pi 工具目录宿主用例，使用当前源码构建的本地 sidecar；Zotero 10.0.2/Linux x86_64 的 45 项通过。
- [x] 5.4 运行 `openspec validate adapt-pi-host-search-tools --strict` 通过，确认主 spec 与 Broker SSOT 已同步且无未授权内容删除。
