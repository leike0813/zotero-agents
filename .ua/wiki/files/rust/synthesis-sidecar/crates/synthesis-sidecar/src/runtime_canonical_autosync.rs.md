
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs -->

canonical 自动同步协调器：观察 canonical 提交后去抖触发 WebDAV 同步，并以 maintenance guard 与 canonical_commit 串行化写入。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs)

## 符号（12）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:begin_maintenance -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:canonical_commit -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:CanonicalAutosyncCoordinator -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:CanonicalAutosyncTarget -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:CanonicalMaintenanceGuard -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:CoordinatorShared -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:finish_maintenance -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:mark_dirty -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:new -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:observe_commit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:run_worker -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs:shutdown -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| begin_maintenance | 函数 | 134–152 | 简单 | autosync、rust、runtime | 0 | 进入维护区间，期间推迟自动同步。 |
| canonical_commit | 函数 | 231–254 | 简单 | autosync、rust、runtime | 0 | 在 canonical 写入完成后登记提交信号，触发后续自动同步。 |
| CanonicalAutosyncCoordinator | 类 | 90–94 | 简单 | autosync、rust、type、lifecycle | 0 | 自动同步协调器：接收提交信号、去抖合并请求、驱动后台同步线程并在停止时收敛。 |
| CanonicalAutosyncTarget | 类 | 12–15 | 简单 | autosync、rust、type、lifecycle | 0 | 自动同步目标抽象，隔离具体 WebDAV 同步实现。 |
| CanonicalMaintenanceGuard | 类 | 72–76 | 简单 | autosync、rust、type、lifecycle | 0 | maintenance 独占守卫：保证同步期间没有其它维护动作并发进入。 |
| CoordinatorShared | 类 | 36–40 | 简单 | autosync、rust、type、lifecycle | 0 | 协调器共享状态：去抖计时、脏标记与停止信号的内部载体。 |
| finish_maintenance | 函数 | 57–69 | 简单 | autosync、rust、runtime | 0 | 结束维护区间并重新评估是否需要立即同步。 |
| mark_dirty | 函数 | 43–55 | 简单 | autosync、rust、runtime | 0 | 标记存在待同步变更并唤醒后台线程。 |
| new | 函数 | 97–121 | 简单 | autosync、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |
| observe_commit | 函数 | 123–132 | 简单 | autosync、rust、runtime | 0 | 记录 observe commit，用于诊断、观测或状态留痕。 |
| run_worker | 函数 | 190–229 | 简单 | autosync、rust、lifecycle | 0 | 后台同步线程主体：等待脏标记、去抖到期后执行一次同步。 |
| shutdown | 函数 | 162–181 | 简单 | autosync、rust、lifecycle | 0 | 停止后台线程并在 deadline 内等待退出。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| begin_maintenance | 函数 | 134–152 | 进入维护区间，期间推迟自动同步。 |
| canonical_commit | 函数 | 231–254 | 在 canonical 写入完成后登记提交信号，触发后续自动同步。 |
| CanonicalAutosyncCoordinator | 类 | 90–94 | 自动同步协调器：接收提交信号、去抖合并请求、驱动后台同步线程并在停止时收敛。 |
| CanonicalAutosyncTarget | 类 | 12–15 | 自动同步目标抽象，隔离具体 WebDAV 同步实现。 |
| CanonicalMaintenanceGuard | 类 | 72–76 | maintenance 独占守卫：保证同步期间没有其它维护动作并发进入。 |
| new | 函数 | 97–121 | 构造该类型的实例，完成必要字段初始化。 |
| observe_commit | 函数 | 123–132 | 记录 observe commit，用于诊断、观测或状态留痕。 |
| shutdown | 函数 | 162–181 | 停止后台线程并在 deadline 内等待退出。 |
