
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs -->

sidecar CLI 适配层：解析 worker / serve --config 等子命令并转调 runtime_service 生命周期入口。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs)

## 符号（2）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs:run -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs:run_args -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| run | 函数 | 9–22 | 简单 | entry-point、cli、dispatch | 0 | sidecar 命令行入口：读取进程参数并分派到 worker 或 serve --config 分支。 |
| run_args | 函数 | 9–22 | 简单 | cli、parsing、dispatch | 0 | 按参数向量分派子命令，参数缺失或未知时返回带用法说明的错误。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs | sidecar 可执行入口：仅负责把命令行参数转交 CLI 适配层，不组装任何 runtime module graph。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| run | 函数 | 9–22 | sidecar 命令行入口：读取进程参数并分派到 worker 或 serve --config 分支。 |
