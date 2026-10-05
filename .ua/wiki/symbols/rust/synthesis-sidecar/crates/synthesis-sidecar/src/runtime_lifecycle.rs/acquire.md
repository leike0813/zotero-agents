
# acquire
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:acquire -->

获取运行根目录独占锁，清理上一次异常退出残留后返回 RuntimeOwnership。
类型：函数  
复杂度：中等  
入边数：2  
标签：lifecycle、rust、runtime  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs:250](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs#L250)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [build_production_applications](../runtime_production_ports.rs/build_production_applications.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:153–317 | 组合根：打开 canonical store 与 repository，按依赖顺序构造各 application 并交由运行时持有。 |
| [start](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:178–366 | 读取启动配置、校验并接管运行根目录所有权、装配生产应用与各 owner，然后绑定 listener 并原子发布 discovery。 |

## 调用

该符号没有记录对外调用。
