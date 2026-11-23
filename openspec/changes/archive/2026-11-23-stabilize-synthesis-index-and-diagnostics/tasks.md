# Tasks

## 1. Index 读取和恢复

- [x] 1.1 用已提交的 Reference 修订号绑定分页。Rust 测试覆盖现有数据库初始化、回滚、无关写入和读连接隔离。
- [x] 1.2 限制生成产物就绪检查和 Reference 扫描的并发，传递宿主读取的截止时间和取消信号。Host 测试覆盖载荷分页、就绪检查和中止行为。
- [x] 1.3 接通 Index 渐进加载和从首页重试。Workbench 定向测试验证首批优先显示、查询替换、失败保留内容和分页。

## 2. Runtime Log 和 Sidecar Trace

- [x] 2.1 接通默认会话及保留历史切换。Dashboard 测试覆盖跨会话任务日志与诊断导出。
- [x] 2.2 接通 trace 默认视图、失败优先保留和维护终态判定。诊断测试覆盖轮询、恢复和维护任务失败。
- [x] 2.3 验证 Dashboard 和 Workbench 类型检查、文案治理及发布构建的诊断裁剪检查。

## 3. Windows 隔离验收

- [x] 3.1 用迁移库副本运行 `index-projection-01`，验证首批摘要、Reference 并发读取、翻页、视图状态恢复和 sidecar 健康。

隔离验收运行 `3e834515-f9f1-45e4-bef8-57f8e4562b8a` 通过。Zotero 10.0.8 的冷开首批为 1727 ms，五次中位数为 1511 ms，Reference 刷新并发读取为 4126 ms。三项 Review 切换断言和一项 Reverse Host 导出断言在干净基线上同样失败。

## Workflow follow-up

- 普通 XPI 打包还需同步七个平台的当前 sidecar 包。本次隔离验收使用当前源码编译的 Windows sidecar。
