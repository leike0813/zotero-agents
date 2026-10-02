
# resolveProviderById
<!-- node: function:src/providers/registry.ts:resolveProviderById -->

按 provider id 从注册表解析出 provider 实例。
类型：函数  
复杂度：简单  
入边数：3  
标签：provider、resolution、query  
所属文件：[src/providers/registry.ts](../../../../files/src/providers/registry.ts.md)
源码：[src/providers/registry.ts:54](../../../../../../src/providers/registry.ts#L54)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [listProviderProfileBackends](../../../../files/src/providers/profile.ts.md) | src/providers/profile.ts:327–345 | 列出可生成 provider profile 的后端实例列表，含连接就绪状态与请求种类。 |
| [normalizeProviderRuntimeOptions](../../../../files/src/providers/registry.ts.md) | src/providers/registry.ts:116–127 | Provider 运行时选项归一入口，解析出目标 provider 后应用其 schema。 |
| [resolveProvider](../../../../files/src/providers/registry.ts.md) | src/providers/registry.ts:129–153 | 按请求的 provider 标识与后端类型解析出可执行的 provider，并在不匹配时抛出契约错误。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createDefaultProviders](../../../../files/src/providers/registry.ts.md) | src/providers/registry.ts:22–29 | 构造内置 provider 默认集合：SkillRunner、ACP、Generic HTTP 与 PassThrough。 |
