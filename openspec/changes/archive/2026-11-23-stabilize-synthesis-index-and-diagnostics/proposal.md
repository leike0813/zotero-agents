# Proposal

## Why

迁移 Joshua-Side 后，Index 的摘要读取超时，Reference 刷新期间的进度写入也会使进行中的扫描失效。历史日志和高频普通调用让这些失败难以定位。

## What Changes

- Index 优先显示首批摘要，独立统计全库匹配结果。读取失败时保留已加载内容，并允许从首页重试。
- Index 游标关联已提交的 Reference 数据。维护进度和检索写入不影响正在进行的扫描。
- Runtime Log 默认显示本次启动的记录，保留历史仍可切换查看。任务日志和诊断导出支持跨会话追踪。
- Sidecar Trace 默认展示关键调用和失败，保留的普通调用可通过「显示全部」查看。

## Capabilities

### New Capabilities

### Modified Capabilities

- `synthesis-workbench-ui` 的 Index 渐进读取、游标有效性和失败重试。
- `runtime-log-pipeline` 的默认会话范围和跨会话任务诊断。
- `synthesis-sidecar-debug-observability` 的默认视图、失败保留和终态判定。

## Impact

影响 Workbench、Dashboard、Reverse Host 就绪读取及 sidecar Reference 存储。现有 SQLite 库打开时补齐修订号和触发器。更新 Rust 源码后，普通 XPI 构建需要与当前源码匹配的七平台 sidecar 包。
