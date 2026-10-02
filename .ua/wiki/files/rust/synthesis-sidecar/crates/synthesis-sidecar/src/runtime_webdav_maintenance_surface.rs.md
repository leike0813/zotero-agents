
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs -->

WebDAV 与 maintenance 的公共适配面：只承担 wire 校验与编码，从生产 catalog 取已解析的不透明 maintenance route，并暴露启动对账等运维动作。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs)

## 符号（8）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:debug_reset -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:public_maintenance -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:public_maintenance_control_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:public_maintenance_operation_dto -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:reconcile_startup -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:reset_database -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:validate -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:webdav_sync_wire -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| debug_reset | 函数 | 206–219 | 简单 | maintenance、rust、runtime | 0 | 调试用重置动作，清理运行时缓存与诊断状态。 |
| public_maintenance | 函数 | 158–169 | 简单 | maintenance、rust、runtime | 0 | public maintenance 生命周期中的 public maintenance 步骤实现。 |
| public_maintenance_control_request | 函数 | 70–89 | 简单 | maintenance、rust、runtime | 1 | 把 public maintenance 控制 wire 请求投递给生命周期 owner，并返回 typed 结果。 |
| [public_maintenance_operation_dto](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs/public_maintenance_operation_dto.md) | 函数 | 171–182 | 简单 | maintenance、rust、runtime | 2 | 把 operation view 投影为对外 DTO，只暴露状态与 receipt。 |
| reconcile_startup | 函数 | 184–193 | 简单 | maintenance、rust、runtime | 0 | 启动期对账入口：只做状态分类，不自动派发维护工作。 |
| reset_database | 函数 | 195–204 | 简单 | maintenance、rust、runtime | 0 | 运维用数据库重置动作，调用领域提供的重置能力而非直接删库。 |
| validate | 函数 | 268–279 | 简单 | maintenance、rust、validation | 0 | 校验  的结构、版本与预算约束，拒绝不合规输入。 |
| webdav_sync_wire | 函数 | 103–131 | 简单 | maintenance、rust、wire-projection | 0 | 把 WebDAV 同步状态投影为 wire DTO，隐藏内部状态表示。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| public_maintenance_control_request | 函数 | 70–89 | 把 public maintenance 控制 wire 请求投递给生命周期 owner，并返回 typed 结果。 |
| [public_maintenance_operation_dto](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs/public_maintenance_operation_dto.md) | 函数 | 171–182 | 把 operation view 投影为对外 DTO，只暴露状态与 receipt。 |
