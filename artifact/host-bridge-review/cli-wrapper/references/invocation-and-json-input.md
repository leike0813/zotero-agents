# 调用与 JSON 输入

在构造结构化 CLI 输入之前，先阅读本参考。

## 选择输入通道

- 对简短、已审核的 `--query` 或 `--input` payload 使用内联 JSON 值。
- 对持久或生成的 payload 使用 `@file` 或命令文档中记录的文件参数。
- 仅在管道有意拥有字节且命令合约接受时才使用 stdin。
- 将选择、workflow 选项和 provider profile 保留在各自的参数中；绝不将它们合并为一个猜测的对象。

`surface describe '<command>' --json` 将 `invocationSchema` 与 `payloadSchema` 分开。前者描述 CLI 标志和位置参数。后者描述解码后的业务对象。在执行之前对两者进行验证。

## 分页

将每个 cursor 结果视为一页。在请求 `nextCursor` 之前保留页面证据；当 `hasMore` 为 false 或 cursor 为 null 时停止。如果中断，从最后接受的 cursor 恢复，不要将前一页合并两次。

## 文件输出

当结果提供输出路径时，在写入之前确认覆盖策略。当结果返回 `fileId` 时，使用 `file download`；已注册的 handle 不是本地路径。在将下载或上传的文件用作证据之前，验证校验和和字节数。

## 密钥与路径

不要将 bearer token、backend 凭证、基础 URL 或本地密钥路径放入 workflow 选项或 provider profile。不要将任意本地路径作为 Zotero mutation 目标发送：上传文件、保留其校验和，然后将返回的 `fileId` 传递给已批准的 mutation。
