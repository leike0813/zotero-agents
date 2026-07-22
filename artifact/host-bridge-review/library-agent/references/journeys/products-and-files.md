# Product 与文件

将以下四种对象保持分离：本地路径、注册的 `fileId`、Dashboard `productId` 和 workflow 制品。

## 上传与附加

先验证本地制品，然后使用显示名称/内容类型执行 `file upload`。保留校验和和返回的短生命周期 `fileId`。使用当前父条目引用和 `mutation item attach-file` 调用 `fileId`，通过 approval，然后刷新 `library item attachments` 以证明新附件存在。

## 下载

仅对注册的文件 handle 使用 `file download`。刻意选择输出路径并验证字节/校验和。远程 Host Bridge 操作不会使 Host 本地路径对 Agent 可读。

## Dashboard Product

使用带过滤器和分页的 `product list`、获取单个普通 Product 的 `product get` 以及获取所选资产的 `product download`。终态 `workflowRunId` 不意味着 Product 存在，`productId` 也不是 `fileId`。`product remove` 通过 approval 移除 Product 记录；它不保证立即删除托管文件。

发生故障时，从所属附件/Product 重新获取已过期的文件访问，而非猜测路径。在证据中记录来源、handle、校验和、输出路径以及最终的实时附件或 Product 记录。
