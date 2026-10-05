
# scripts/sync-gitee-release.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/sync-gitee-release.ts -->

通过 Gitee OpenAPI 创建/更新 Release 并重新上传 xpi 等附件，附 sha256 校验与远端资产比对，确保发布资产与本地一致。
源码：[scripts/sync-gitee-release.ts](../../../../scripts/sync-gitee-release.ts)

## 符号（14）
<!-- node: function:scripts/sync-gitee-release.ts:apiUrl -->
<!-- node: function:scripts/sync-gitee-release.ts:attachmentMatches -->
<!-- node: function:scripts/sync-gitee-release.ts:createRelease -->
<!-- node: function:scripts/sync-gitee-release.ts:deleteAttachment -->
<!-- node: function:scripts/sync-gitee-release.ts:findReleaseByTag -->
<!-- node: function:scripts/sync-gitee-release.ts:listAttachments -->
<!-- node: function:scripts/sync-gitee-release.ts:main -->
<!-- node: function:scripts/sync-gitee-release.ts:parseArgs -->
<!-- node: function:scripts/sync-gitee-release.ts:requestJson -->
<!-- node: function:scripts/sync-gitee-release.ts:sha256File -->
<!-- node: function:scripts/sync-gitee-release.ts:splitRepo -->
<!-- node: function:scripts/sync-gitee-release.ts:updateRelease -->
<!-- node: function:scripts/sync-gitee-release.ts:uploadAttachment -->
<!-- node: function:scripts/sync-gitee-release.ts:verifyUploadedAttachment -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apiUrl | 函数 | 131–135 | 简单 | script、tooling、build-system | 0 | 拼接 Gitee OpenAPI 的完整请求地址。 |
| attachmentMatches | 函数 | 354–376 | 简单 | script、tooling、build-system | 0 | 比较本地文件与远端附件的大小和摘要，判断是否需要重传。 |
| createRelease | 函数 | 191–225 | 中等 | script、tooling、build-system | 0 | 创建新的 Gitee Release 并返回其标识。 |
| deleteAttachment | 函数 | 271–283 | 简单 | script、tooling、build-system | 0 | 删除 Release 上已失效的旧附件，保持发布资产与本地一致。 |
| findReleaseByTag | 函数 | 162–189 | 中等 | script、tooling、build-system | 0 | 按 tag 查找已存在的 Release，找不到返回空值以决定创建还是更新。 |
| listAttachments | 函数 | 256–269 | 简单 | script、tooling、build-system | 0 | 列出 Release 当前所有附件及其元信息，供差异比对使用。 |
| main | 函数 | 422–521 | 复杂 | script、tooling、build-system | 0 | 脚本入口，创建或更新目标 Release，上传附件并逐个校验 sha256。 |
| parseArgs | 函数 | 62–124 | 复杂 | script、tooling、build-system | 0 | 解析 Gitee release 同步参数，包括仓库坐标、token、tag 与附件列表。 |
| requestJson | 函数 | 137–160 | 简单 | script、tooling、build-system | 0 | 对 Gitee OpenAPI 发起带认证的 JSON 请求，统一处理错误状态码。 |
| sha256File | 函数 | 348–352 | 简单 | script、tooling、build-system | 0 | 流式计算文件 sha256 摘要，避免大文件一次性读入内存。 |
| splitRepo | 函数 | 126–129 | 简单 | script、tooling、build-system | 0 | 把 owner/repo 形式的仓库坐标拆分为两部分。 |
| updateRelease | 函数 | 227–254 | 中等 | script、tooling、build-system | 0 | 更新既有 Release 的标题、说明与状态。 |
| uploadAttachment | 函数 | 285–346 | 复杂 | script、tooling、build-system | 0 | 上传单个附件到指定 Release，携带校验与进度处理。 |
| verifyUploadedAttachment | 函数 | 378–407 | 中等 | script、tooling、build-system | 0 | 重新下载并比对附件 sha256，确认上传字节与本地一致。 |
