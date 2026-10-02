
# rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs -->

持久化 bundle 应用层：负责跨设备同步所需 bundle 的组装、比较与提交，保持 durable 记录与事务边界的单一来源。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs)

## 符号（8）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:apply_import -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:build_export -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:DurableBundleApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:DurableImportConflict -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:DurableImportPreview -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:DurableManifest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:preview_import -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs:verify_source -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_import | 函数 | 441–515 | 中等 | rust、导入、提交、durable-bundle | 0 | 应用导入：按预览结论提交持久化变更，并为每条记录产出 import receipt。 |
| build_export | 函数 | 303–339 | 中等 | rust、导出、bundle、同步 | 0 | 构建导出 bundle：汇总资产、生成 manifest 与校验信息，输出可跨设备同步的完整包。 |
| DurableBundleApplication | 类 | 242–250 | 简单 | rust、A、p、l | 0 | durable bundle 应用层 owner：负责 bundle 导出、导入预览、冲突判定与 apply 提交的完整生命周期。 |
| DurableImportConflict | 类 | 164–175 | 简单 | rust | 0 | 导入冲突描述：定位远端与本地记录的分歧点及可用解决策略。 |
| DurableImportPreview | 类 | 179–192 | 简单 | rust | 0 | 导入预览：在真正写入前给出冲突项与影响范围，供用户确认。 |
| DurableManifest | 类 | 106–116 | 简单 | rust、M、a、n | 0 | bundle manifest：记录资产条目与校验信息，是跨设备同步判定一致性的依据。 |
| preview_import | 函数 | 352–439 | 中等 | rust、导入、预览、冲突检测 | 0 | 生成导入预览：逐条比对远端与本地记录，给出冲突项与影响范围而不做任何写入。 |
| verify_source | 函数 | 864–1057 | 复杂 | rust、校验、bundle、前置检查 | 0 | 校验 bundle 来源的完整性与一致性，失败时阻止后续导入流程。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
| [webdav_sync.rs](webdav_sync.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs | WebDAV 同步应用层：驱动远端 bundle 的拉取、合并与推送，复用 durable bundle 与统一 admission，保证同步过程可重放。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| DurableBundleApplication | 类 | 242–250 | durable bundle 应用层 owner：负责 bundle 导出、导入预览、冲突判定与 apply 提交的完整生命周期。 |
| DurableImportConflict | 类 | 164–175 | 导入冲突描述：定位远端与本地记录的分歧点及可用解决策略。 |
| DurableImportPreview | 类 | 179–192 | 导入预览：在真正写入前给出冲突项与影响范围，供用户确认。 |
| DurableManifest | 类 | 106–116 | bundle manifest：记录资产条目与校验信息，是跨设备同步判定一致性的依据。 |
