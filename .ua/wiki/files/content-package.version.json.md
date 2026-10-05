
# content-package.version.json
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: config:content-package.version.json -->

内置内容包（官方工作流订阅源）的版本身份文件，声明 schema、版本号、content_api 及对插件版本、Zotero 版本的兼容区间。
源码：[content-package.version.json](../../../content-package.version.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contentPackageSubscription.ts](src/modules/workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
