
# reconcile_restart
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:reconcile_restart -->

启动期对账：不自动 replay，public pending 转为 continuation_required，public running 以 restart_external_effect_unknown 失败。
类型：函数  
复杂度：中等  
入边数：2  
标签：maintenance、rust、runtime  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:1100](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs#L1100)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [start](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:178–366 | 读取启动配置、校验并接管运行根目录所有权、装配生产应用与各 owner，然后绑定 listener 并原子发布 discovery。 |
| [reconcile_startup](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs:184–193 | 启动期对账入口：只做状态分类，不自动派发维护工作。 |

## 调用

该符号没有记录对外调用。
