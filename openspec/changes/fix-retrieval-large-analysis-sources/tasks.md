# Tasks

## 1. Host 来源与私有证据契约

- [x] 1.1 在 `178-synthesis-host-read-ports.test.ts` 和现有 Broker 回归中复现长分析来源被拒绝。扩展 `zoteroHostCapabilityBroker.ts` 及 Synthesis 私有证据验证，覆盖许可的受管分析来源枚举、连续根范围、页尾代理对、超限拒绝和页间版本变更。验证原有短分析、长 Markdown 和公共词法搜索行为。

## 2. Sidecar 摄取与回查

- [x] 2.1 扩展 Rust `retrieval.rs` 的现有分页摄取校验。用跨过 262,144 单元且至少与已观测最大样本等长的合成分析，验证完整摄取、真实页尾续读和高位片段坐标。用一个页间变化场景和一组畸形页验证失败时保留上一版发布记录与维护暂停语义。
- [x] 2.2 在已有 Host Broker 与 Rust 生产路由测试 `281-synthesis-evidence-production-route.test.ts` 中验证高位 `analysis_field/$` 命中能在 Index contents 预览及语义搜索中使用，并回查原始来源身份。复跑通用生产路由、相关 Rust 和 Workbench 用例，覆盖旧分析位置与长 Markdown 路径。

## 3. 集成构建与真实库验收

- [ ] 3.1 按构建预检同步当前源码的七平台 sidecar，构建开发 XPI 并校验包内七个平台及运行时身份。保留构建运行和包校验记录。
  - Host Bridge、ACP、内置资源和 Content Package 已通过预检。七平台 bundle 待同步到本次源码指纹。
- [x] 3.2 复用 `npm run test:zotero:e2e` 和当前源码构建的 sidecar，在关闭 Zotero 后取得的真实库隔离副本上用本地测试嵌入服务执行四来源重建。验证新索引完整发布，核实长分析在索引中的可读高位预览，并在 Workbench 分别搜索和打开论文与主题。记录去标识化结果和耗时。验收通过后在 `fix-workbench-retrieval-source-coverage` 关联该收据并完成其待办。
  - Windows Zotero 10.0.2 的 `retrieval-semantic-search-01` 通过。新索引发布 3,815 个来源组和 89,180 个片段，耗时 361,394 ms。最长样本 721,621 个 UTF-16 单元，预览起点 263,543。去标识化收据位于 `artifacts/test-diagnostics/system-e2e/b597f4a2-d198-4fca-8c62-6140cb00da4c/large-analysis-retrieval.json`。
  - 合跑时基础用例收到完整版本号，缺少终态。改用主版本参数 `10` 后单独补跑通过，记录位于 `artifacts/test-diagnostics/system-e2e/72256d2f-6632-4b5d-911f-323723a88a62/run-manifest.json`。
