
# spawn
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs:spawn -->

注册一个后台线程任务，携带取消标记；已停止准入时立即失败。
类型：函数  
复杂度：简单  
入边数：7  
标签：background-task、rust、lifecycle  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs:43](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs#L43)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runtime_public_maintenance_operation.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:— | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |
| [runtime_service.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:— | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_test_checkpoint.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs:— | 进程级测试检查点：以 armed/held/release 文件协议让集成测试在 sidecar 的特定时序点精确阻塞，用于确定性验证中间态。 |
| [runtime_webdav_runtime.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs:— | WebDAV 运行时适配：以文件状态存储保存同步状态（原子写入），并提供可被停止信号中断的重试调度器。 |
| [runtime_worker_pool.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs:— | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |
| [poll](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:166–203 | 单次轮询：接收新连接、回收已结束 handler，并在达到 deadline 时返回 drain 结果。 |
| [worker](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs:399–824 | worker 主函数：从 stdin 读取命令、装配分页输入、执行计算并按 graph/concept 形态写出分页结果。 |

## 调用

该符号没有记录对外调用。
