
# rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/examples](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/examples.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs -->

校验 checkpoint bundle、WebDAV 公共维护与 debug surface 在应用层 parity 的可执行示例测试。
源码：[rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs)

## 符号（4）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs:FileHost -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs:ImmediateScheduler -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs:main -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs:tree -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [FileHost](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs/FileHost.md) | 类 | 116–119 | 中等 | test、fake host、文件系统、parity | 2 | 内存文件系统 Host，实现 collection、etag、read_text 与 write_text 供 parity 场景使用。 |
| ImmediateScheduler | 类 | 96–98 | 简单 | test、调度器、确定性 | 1 | 立即完成的调度器，把异步等待折叠为同步结果，简化测试时序。 |
| main | 函数 | 261–514 | 复杂 | test、parity、入口、契约语料、webdav | 0 | parity 驱动主流程：加载共享契约语料，逐项构造 checkpoint bundle、WebDAV 维护与 debug 请求并与期望输出比对。 |
| tree | 函数 | 214–259 | 中等 | test、fixture、文件树、webdav | 1 | 在内存 FileHost 上构造完整目录树样例，为 WebDAV 与 debug surface 提供文件事实。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-canonical-store/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs | Synthesis 规范存储层（canonical store）主体，提供 SQLite schema、迁移、事务与图谱/标签/引用等规范记录的读写。 |
