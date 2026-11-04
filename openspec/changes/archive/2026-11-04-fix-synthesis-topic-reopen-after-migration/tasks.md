# Tasks

本清单补录已完成的修复与验证，不包含真实实例恢复或插件发布。

## 1. 启动修复与契约

- [x] 1.1 扩展已有历史路径用例，确认迁移后更新并重开会以 `canonical_legacy_topic_sources_mismatch` 失败。
- [x] 1.2 校验并采用新路径当前快照，保留历史快照和原迁移校验；canonical-store 的 40 个测试通过，覆盖连续重开、历史字节保留及当前快照损坏或身份不符时拒绝启动。
- [x] 1.3 同步主规格、持久化文档及 AGENTS.md；补录的 delta 保留完整修改条款，与主规格逐字一致。

## 2. 集成验证与记录

- [x] 2.1 从当前源码构建本机 sidecar；canonical-store Clippy（`--all-targets -- -D warnings`）及 `npm run format:check:synthesis-rust-sidecar` 通过。
- [x] 2.2 通过现有生产路由 harness 启动含冲突快照的隔离副本两次；两次健康检查均为 HTTP 200 / `ready`，7 个 Topic 均读取当前内容，230 个 canonical 文件字节未变。
- [x] 2.3 校验本 change：`openspec validate fix-synthesis-topic-reopen-after-migration --strict`、Prettier 与差异检查全部通过。
