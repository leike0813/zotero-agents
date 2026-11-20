# Proposal

## Why

在真实 Zotero 库的隔离副本中，四来源重建因 3 份可正常解析的引文分析超过 262,144 个 UTF-16 单元而失败。最大一份达到 721,621 个单元，现有长 Markdown 读取路径无法覆盖这种分析来源。

## What Changes

- 让向量检索通过现有 Host 证据读取接口分段读取超过单次响应上限的规范化分析文本，覆盖引文分析等已支持的受管分析类型。
- 保留来源身份、逻辑版本和绝对 UTF-16 位置。索引内容预览和语义搜索都能回查高位命中。
- 继续用完整来源验证和最终目录复核保护索引发布。在 Windows Zotero 隔离副本中重跑原变更留下的四来源验收。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `synthesis-vector-retrieval` 支持有界的大型 canonical analysis 来源读取、索引和回查。

## Impact

涉及 Host Broker、TypeScript 与 Rust 的私有证据契约、sidecar 检索和预览路径、跨语言回归及既有 Zotero E2E。范围限于现有分析来源和检索协议，不改写受管笔记数据，不改变嵌入配置和 Workbench 操作入口。
