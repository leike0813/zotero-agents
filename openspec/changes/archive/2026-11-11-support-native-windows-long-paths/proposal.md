# Proposal

## Why

研究包导出将展示名拼入暂存路径，产生 278 UTF-16 单位的目标并被插件的 259 上限拒绝。同一上限还会拒绝底层可以读取的长源路径；需要将原生 I/O 能力、内部命名和外部消费者的兼容预算分别落实在共享入口。

## What Changes

- 普通 Windows 文件操作使用 Gecko 原生扩展路径；兼容消费者继续使用短路径预算，扩展格式保持适配器私有。
- 内部暂存采用独占短目录和有界物理名，展示名、运行身份与物理布局分离。
- 短路径消费者自动中转，完整结果经同卷暂存后原子提交；中转内容纳入现有治理和在用保护。
- 更新文件传输、Workflow 文件/归档、上传与附件准备等调用点，保留既有错误、事务和恢复语义。
- 不迁移历史目录，不修改系统开关，不新增原生服务；本轮不扩展超长链接最终目标支持。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `runtime-persistence-governance`: 区分原生与兼容预算，统一扩展路径适配与临时目录所有权。
- `attachment-file-lifecycle`: 长源路径可进入兼容暂存，原生附件下游目标继续独立预检。

## Impact

修改 runtime persistence、平台路径、文件传输、Workflow 资源与归档、输入物化、上传/附件准备、ACP 文件暂存及临时目录治理，扩展已有测试和 Windows Zotero 验收。保持 Workflow Host API v12；无依赖、数据库格式、历史目录或发布身份变更。执行时保留工作区已有改动，不提交或发布。
