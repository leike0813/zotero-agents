
# src/platform
> 目录聚合页：8 个文件、35 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/platform/command.ts](../../files/src/platform/command.ts.md) | 文件 | 9 | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [src/platform/env.ts](../../files/src/platform/env.ts.md) | 文件 | 9 | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [src/platform/filePicker.ts](../../files/src/platform/filePicker.ts.md) | 文件 | 3 | 跨运行时文件选择器：优先使用宿主提供的原生多选文件对话框，在不可用时回退到 toolkit 的 FilePicker，并负责挑选可用的 parent window。 |
| [src/platform/hash.ts](../../files/src/platform/hash.ts.md) | 文件 | 0 | 平台无关的 SHA-256 摘要工具：优先使用 WebCrypto subtle.digest，回退到 Mozilla 的 nsICryptoHash，保证在 Zotero 沙箱与工具链环境中都能得到一致摘要。 |
| [src/platform/path.ts](../../files/src/platform/path.ts.md) | 文件 | 5 | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [src/platform/processControl.ts](../../files/src/platform/processControl.ts.md) | 文件 | 3 | 子进程控制：启动、信号投递与终止回收策略，把 platform/command 的执行结果转成可取消、可等待的进程句柄。 |
| [src/platform/runtimePlatform.ts](../../files/src/platform/runtimePlatform.ts.md) | 文件 | 3 | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [src/platform/subprocess.ts](../../files/src/platform/subprocess.ts.md) | 文件 | 3 | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](modules.md) | 4 |
| [packages/synthesis-contracts/src](../packages/synthesis-contracts/src.md) | 1 |
| [src/utils](utils.md) | 1 |
