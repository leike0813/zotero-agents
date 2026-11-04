# Proposal

## Why

Topic 迁移后保留的历史快照会落后于新路径中的正常更新。启动时要求两者 basis 一致，会以 `canonical_legacy_topic_sources_mismatch` 拒绝启动整个 Synthesis sidecar。

## What Changes

- 已存在且通过身份、路径和内容完整性校验的新路径 `current` 为唯一运行时权威，允许历史快照具有不同 basis。
- 保留历史字节；仅当前快照缺失时执行既有迁移，当前快照非法时继续拒绝启动。
- 扩展已有回归测试，覆盖迁移、更新、连续重开及非法当前快照，并同步维护文档。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `synthesis-topic-path-identity`：修正历史快照与当前快照并存时的启动选择规则。

## Impact

影响 canonical-store 启动迁移、同模块测试、持久化文档与项目维护约束。公共 API、协议、数据库 Schema 和依赖不变。

本 change 补录本次已实现并经隔离副本验证的修复；主规格已同步。当前 Zotero 实例与真实用户数据保持原样，插件安装和发布不在本次范围内。
