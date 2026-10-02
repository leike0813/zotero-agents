
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs -->

Tag 公共面的唯一生产适配器：路由标签导入预览与应用、审阅替换与追加，并保持私有 vocabulary application 作为持久领域 owner。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs)

## 符号（5）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs:append_audit_run -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs:apply_import -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs:preview_import -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs:rebuild_index -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs:replace_audits -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| append_audit_run | 函数 | 347–359 | 简单 | tag、rust、runtime | 0 | 追加一次审阅运行记录，不覆盖历史运行。 |
| apply_import | 函数 | 280–290 | 简单 | tag、rust、runtime | 0 | 应用标签导入结果，按预览计划写入 canonical 存储。 |
| preview_import | 函数 | 269–278 | 简单 | tag、rust、runtime | 0 | 预览标签导入：返回将要新增、合并与冲突的条目而不落盘。 |
| rebuild_index | 函数 | 197–209 | 简单 | tag、rust、runtime | 0 | 触发标签词表索引重建，经 compute port 派发到 worker。 |
| replace_audits | 函数 | 292–328 | 简单 | tag、rust、runtime | 0 | 以整表替换方式提交标签审阅记录，保持审阅视图与私有词表应用一致。 |

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
