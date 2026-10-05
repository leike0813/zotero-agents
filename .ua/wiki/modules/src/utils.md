
# src/utils
> 目录聚合页：14 个文件、47 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/utils/docsUrl.ts](../../files/src/utils/docsUrl.ts.md) | 文件 | 3 | 帮助中心文档链接构造：按用户 locale 选择 GitHub Pages 或本地站点基址，处理 zh-CN 前缀拼接与 debug 模式下的本地回退。 |
| [src/utils/env.ts](../../files/src/utils/env.ts.md) | 文件 | 1 | 读取构建期注入的 __env__，返回 development / production 运行环境标识。 |
| [src/utils/fileSystem.ts](../../files/src/utils/fileSystem.ts.md) | 文件 | 1 | 在系统文件管理器中打开指定目录，优先使用 nsIFile 的 launch，退化到 reveal，并在路径为空或不存在时抛出明确错误。 |
| [src/utils/locale.ts](../../files/src/utils/locale.ts.md) | 文件 | 4 | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [src/utils/localizationGovernance.ts](../../files/src/utils/localizationGovernance.ts.md) | 文件 | 6 | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |
| [src/utils/path.ts](../../files/src/utils/path.ts.md) | 文件 | 0 | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [src/utils/prefs.ts](../../files/src/utils/prefs.ts.md) | 文件 | 4 | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [src/utils/runtimeBridge.ts](../../files/src/utils/runtimeBridge.ts.md) | 文件 | 10 | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [src/utils/runtimeCompatibility.ts](../../files/src/utils/runtimeCompatibility.ts.md) | 文件 | 3 | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [src/utils/sha256.ts](../../files/src/utils/sha256.ts.md) | 文件 | 3 | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [src/utils/timingSafeEqual.ts](../../files/src/utils/timingSafeEqual.ts.md) | 文件 | 1 | 字符串定长时间安全比较：长度不等直接返回 false，等长时以累积异或差值避免逐字符短路。 |
| [src/utils/wait.ts](../../files/src/utils/wait.ts.md) | 文件 | 5 | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [src/utils/window.ts](../../files/src/utils/window.ts.md) | 文件 | 1 | 判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。 |
| [src/utils/ztoolkit.ts](../../files/src/utils/ztoolkit.ts.md) | 文件 | 5 | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [.](../index.md) | 3 |
| [src/modules](modules.md) | 2 |
| [src/platform](platform.md) | 1 |
