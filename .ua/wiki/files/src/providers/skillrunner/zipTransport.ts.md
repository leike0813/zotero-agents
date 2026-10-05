
# src/providers/skillrunner/zipTransport.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/zipTransport.ts -->

SkillRunner provider 的 zip 上传传输层：在 Zotero 沙箱内用纯 JS 构造 zip 与 multipart 负载，把 skill 包发送给旧版后端。
源码：[src/providers/skillrunner/zipTransport.ts](../../../../../../src/providers/skillrunner/zipTransport.ts)

## 符号（4）
<!-- node: function:src/providers/skillrunner/zipTransport.ts:concatBytes -->
<!-- node: function:src/providers/skillrunner/zipTransport.ts:createMultipartZipPayload -->
<!-- node: function:src/providers/skillrunner/zipTransport.ts:createZipFromNamedFiles -->
<!-- node: function:src/providers/skillrunner/zipTransport.ts:sanitizeZipEntryName -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| concatBytes | 函数 | 46–55 | 简单 | 工具函数、字节操作 | 0 | 按顺序拼接多个 Uint8Array 片段。 |
| createMultipartZipPayload | 函数 | 146–168 | 中等 | multipart、上传、skillrunner | 0 | 将 zip 包装为 multipart/form-data 负载，供 SkillRunner 上传端点消费。 |
| [createZipFromNamedFiles](../../../../symbols/src/providers/skillrunner/zipTransport.ts/createZipFromNamedFiles.md) | 函数 | 79–144 | 复杂 | zip、序列化、工具函数 | 1 | 把具名文件集合打包为 zip，生成局部头、中央目录与 EOCD 完整结构。 |
| sanitizeZipEntryName | 函数 | 61–77 | 简单 | validation、路径归一、安全 | 0 | 清洗 zip 条目名，去除前导斜杠与路径穿越片段。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [build-content-package-feed.ts](../../../scripts/content-package/build-content-package-feed.ts.md) | scripts/content-package/build-content-package-feed.ts | 内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。 |
| [client.ts](client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [skillPackageBundler.ts](skillPackageBundler.ts.md) | src/providers/skillrunner/skillPackageBundler.ts | SkillRunner 侧 skill 包打包：把插件 Skill 注册表中的条目组装成 zip 包，经 zipTransport 发送给旧版 SkillRunner 后端。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| concatBytes | 函数 | 46–55 | 按顺序拼接多个 Uint8Array 片段。 |
| createMultipartZipPayload | 函数 | 146–168 | 将 zip 包装为 multipart/form-data 负载，供 SkillRunner 上传端点消费。 |
| [createZipFromNamedFiles](../../../../symbols/src/providers/skillrunner/zipTransport.ts/createZipFromNamedFiles.md) | 函数 | 79–144 | 把具名文件集合打包为 zip，生成局部头、中央目录与 EOCD 完整结构。 |
