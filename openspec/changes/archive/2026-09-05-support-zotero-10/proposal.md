## Why

Zotero 10 已正式发布，但 v0.8.3 的安装清单、内容包兼容范围和部分宿主选择读取仍停留在 Zotero 9 语义。v0.8.4 需要用最小维护版本改动补齐 Zotero 10 支持，同时保持 Zotero 7/9 行为不变。

## What Changes

- 将插件安装范围扩展到 Zotero 10，并让运行时诊断统一识别 Zotero 7、9、10 与未知主版本。
- 在宿主上下文边界优先读取 Zotero 10 的复数 library-tree selection API；仅在选中唯一 library/collection 时输出既有标量 DTO 字段。
- 将官方 Content Package 提升到 0.7.4，声明 Zotero `>=7 <11`，并通过 stable、beta 频道发布。
- 同步公开支持文档、生成式帮助文档和兼容性测试。

## Capabilities

### New Capabilities

- `zotero-runtime-compatibility`: 定义插件安装范围、运行时 Zotero 主版本归一化及插件环境约束。

### Modified Capabilities

- `zotero-host-broker-capability-api`: 明确复数选择 API、旧版 fallback 和标量 DTO 的歧义处理。
- `content-package-subscription`: 定义 0.7.4 官方包的 Zotero 10 兼容范围和安装边界。

## Impact

- 插件清单与运行时：`addon/manifest.json`、`src/modules/*`、`src/shared/zoteroRuntimeVersion.ts`。
- 宿主能力：`src/modules/acpContextBuilder.ts`、`src/modules/zoteroHostCapabilityBroker.ts`。
- 内容发布：`content-package.version.json`、Content Package 构建/发布脚本与 GitHub workflow。
- 验证与文档：相关 core/node 测试、README、站点文档和内嵌帮助文档。
