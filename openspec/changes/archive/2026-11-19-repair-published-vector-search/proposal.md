# Proposal

## Why

建好向量索引后，ACP 搜索仍可能漏掉词法扫描窗口以外的条目，或在校验返回值时拒绝已验证的语义命中。用户需要能在工作台上直接搜索和检查已发布的索引，以区分索引覆盖、查询服务可用性和单次词法扫描预算。

## What Changes

- 现有三个搜索入口自动使用已发布索引，按实际参与排名的通道报告方法，并分别报告向量覆盖和词法扫描情况。
- 汉字连续匹配和标签值匹配进入共享词法内核，减少散字和标签命名空间造成的误报。
- 在 Synthesis Workbench 的 Index 后加入「向量搜索」，提供纯语义查询、索引分页、片段核验及来源跳转。

## Capabilities

### New Capabilities

### Modified Capabilities

- `synthesis-search-contracts` — 检索方式与独立的向量覆盖诊断。
- `synthesis-evidence-search` — 跨越词法扫描窗口的库内证据核验。
- `zotero-host-broker-capability-api` — Library 搜索公开结果支持自动向量召回。
- `synthesis-topic-lexical-search` — 已发布 Topic 章节的召回与校验。
- `synthesis-lexical-search-kernel` — 连续汉字与命名空间标签的匹配规则。
- `synthesis-vector-retrieval` — 工作台语义搜索与索引浏览。

## Impact

涉及 Rust sidecar、Host Broker、跨语言协议、Host Bridge CLI/MCP 契约和工作台页面。发布时需要与源码匹配的 sidecar 和 CLI 预编译件。
