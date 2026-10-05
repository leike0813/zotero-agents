
# public_maintenance_operation_dto
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:public_maintenance_operation_dto -->

把 operation view 投影为对外 DTO，只暴露状态与 receipt。
类型：函数  
复杂度：简单  
入边数：2  
标签：maintenance、rust、runtime  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:171](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs#L171)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [dispatch_production_client](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:858–1007 | production client 分发入口：按解析出的 route 选择 typed dispatch、artifact export 或 maintenance control。 |
| [dispatch_public_maintenance_control](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:1009–1030 | 把 maintenance 控制请求投递给 public maintenance 生命周期 owner。 |

## 调用

该符号没有记录对外调用。
