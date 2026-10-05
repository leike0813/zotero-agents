
# rust/zotero-bridge/examples/export-command-inventory.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/examples](../../../../modules/rust/zotero-bridge/examples.md)
<!-- node: file:rust/zotero-bridge/examples/export-command-inventory.rs -->

遍历 Host Bridge CLI 命令树并导出命令清单与参数位置信息的 Rust 示例，用于固化命令 inventory 契约。
源码：[rust/zotero-bridge/examples/export-command-inventory.rs](../../../../../../rust/zotero-bridge/examples/export-command-inventory.rs)

## 符号（3）
<!-- node: function:rust/zotero-bridge/examples/export-command-inventory.rs:argument -->
<!-- node: function:rust/zotero-bridge/examples/export-command-inventory.rs:main -->
<!-- node: function:rust/zotero-bridge/examples/export-command-inventory.rs:visit -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| argument | 函数 | 7–48 | 中等 | cli、serialization、command-inventory、parsing | 0 | 解析 clap 命令定义中的单个 argument 节点，抽取其名称、位置与子命令嵌套关系，输出为命令清单条目。 |
| main | 函数 | 92–116 | 简单 | entry-point、example、cli、host-bridge | 0 | 示例入口：构建命令树、导出完整命令清单并打印为可被契约检查消费的输出。 |
| visit | 函数 | 50–90 | 中等 | cli、recursion、command-tree、serialization | 0 | 递归遍历命令树的子命令与叶子节点，把每个叶子命令连同参数信息汇入命令 inventory。 |
