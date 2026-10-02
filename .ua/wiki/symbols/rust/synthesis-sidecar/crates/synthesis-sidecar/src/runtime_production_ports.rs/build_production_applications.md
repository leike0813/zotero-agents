
# build_production_applications
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:build_production_applications -->

组合根：打开 canonical store 与 repository，按依赖顺序构造各 application 并交由运行时持有。
类型：函数  
复杂度：中等  
入边数：6  
标签：port-adapter、rust、runtime  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:153](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs#L153)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runtime_citation_graph_commands.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:— | Citation Graph 写命令面：实现 update/retry/layout/metrics/rebuild 的 admission、durable facts 采集，以及每次 dispatch 都新建的私有 rebuild attempt 派发。 |
| [runtime_concept_topic_graph_surface.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs:— | Concept KB 与 Topic Graph 的唯一公共适配面：持有公共别名、captured CAS basis，以及由 production client runtime 选定的领域类型化命令。 |
| [runtime_production_client.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:— | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_public_maintenance_operation.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:— | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |
| [runtime_reference_citation_surface.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs:— | Reference/Citation 公共面：处理引用审阅单条与批量决策、related items 回显消费，并把命令失败投影为统一的 wire 结果。 |
| [start](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:178–366 | 读取启动配置、校验并接管运行根目录所有权、装配生产应用与各 owner，然后绑定 listener 并原子发布 discovery。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [acquire](../runtime_lifecycle.rs/acquire.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:250–309 | 获取运行根目录独占锁，清理上一次异常退出残留后返回 RuntimeOwnership。 |
| [hold_once](../runtime_test_checkpoint.rs/hold_once.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs:9–31 | 若检查点已 armed，则独占占用并在 release 文件出现前阻塞，用于确定性验证中间态。 |
