# Pi Coding Agent 的通用工具合同（一手源码核查）

核查日期：2026-08-28。本文为 Wayfinder 票 `Define Trusted Native Execution and Brokered Tools` 提供事实底稿；它描述已发布的 Pi 包行为，不构成对 Wayfinder API、信任模型或权限策略的设计决定。

## 核查对象与版本锚点

本项目既有材料提到的是 fork 包 `@earendil-works/pi-coding-agent`，不能与上游包混为一谈。

| 包 | npm latest（核查时） | npm `gitHead` / 官方仓库 | 本文处理 |
| --- | --- | --- | --- |
| `@earendil-works/pi-coding-agent` | `0.84.3` | `bfb004d4418ff05c6f909eaaab856cbe75c1fde0`；[`earendil-works/pi`](https://github.com/earendil-works/pi/tree/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent) | **工具合同的主核查对象**。npm tarball integrity 为 `sha512-Yr2p…t0D0w==`，包元数据见 [npm registry](https://registry.npmjs.org/@earendil-works/pi-coding-agent/0.84.3)。 |
| `@mariozechner/pi-coding-agent` | `0.73.1` | `781152fc24841dc54b22284514604048ebe5e2c9`；[`badlogic/pi-mono`](https://github.com/badlogic/pi-mono/tree/781152fc24841dc54b22284514604048ebe5e2c9/packages/coding-agent) | 另一个 npm 身份与仓库。版本、发布节奏和源码均不能用来替代 fork 的结论；元数据见 [npm registry](https://registry.npmjs.org/@mariozechner/pi-coding-agent/0.73.1)。 |

补充：fork 远端当前 [`v0.84.3` tag](https://github.com/earendil-works/pi/tree/4e58f324fae8ebfa98a3d45181fb248072a2afac) 指向 `4e58f324fae8ebfa98a3d45181fb248072a2afac`，与 npm `gitHead` 不同。因此所有下文源码链接固定到 **npm 已发布包声明的** `bfb004d…`，而不以该 tag 代替包来源。核查中比较了两点间的相关工具文件，未发现本文列出的工具合同文件有差异；但可复现的发布锚点仍应以 npm `gitHead` 为准。

作为身份差异的最小行为核验：上游 `0.73.1` 的 `ToolName` 只有 7 项（没有 `powershell`），默认仍为 `read`/`bash`/`edit`/`write`；其源码在目前的官方继任仓库可按 [该已发布 commit](https://github.com/earendil-works/pi/blob/781152fc24841dc54b22284514604048ebe5e2c9/packages/coding-agent/src/core/tools/index.ts) 查阅。不能把 fork `0.84.3` 新增的 `powershell`、Node 版本要求或其它后续 API 倒灌为 `@mariozechner` 包合同。

本工作区的根 `package.json` 与 lockfile 未声明上述 coding-agent 包；因此没有可优先采用的本地依赖源码。本次只使用 npm 官方 registry 和两个包各自声明的官方 GitHub 仓库。

## 默认集合与模型可见工具

源码定义了 8 个内置名称：`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls`，[名单与工厂在此](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/index.ts#L95-L222)。但默认启用的是 **4 个**：`read`、`bash`、`edit`、`write`；SDK 可由 `defaultTools` 设置或显式 allow/deny list 改写，且 extension/custom tool 可另行启用，[选择逻辑在此](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/sdk.ts#L55-L70) [与此](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/sdk.ts#L256-L267)。

默认系统提示将「启用且有 `promptSnippet`」的工具逐项列入 `Available tools`，另合并其 guideline；同时把当前 cwd 直接写入提示。它还明确说可能有项目自定义工具。[提示拼装源码](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/system-prompt.ts#L27-L150)、[session 收集 snippets/guidelines 的源码](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/agent-session.ts#L1034-L1067)。运行时的 `ToolDefinition` 另持有 TypeBox 参数 schema；因此 Pi 明确维护了 schema 合同与 prompt 使用提示两层信息，而非只保留自然语言工具介绍。[ToolDefinition](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/extensions/types.ts#L449-L509)

## 内置 input schema 与职责重叠

下表是 TypeBox schema 的字段级转写（可选项以 `?` 标示），不是自行设计的 DTO。

| 工具 | input schema | 既定职责与交叠处理 |
| --- | --- | --- |
| `read` | `{ path: string, offset?: number, limit?: number }` | 文本按 1-based 行分页读取；支持 jpg/png/gif/webp/bmp 作为 image attachment。prompt guideline 要求用它查看文件，优先于 `cat`/`sed`。[schema 与说明](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/read.ts#L21-L32) |
| `write` | `{ path: string, content: string }` | 创建或全量覆盖，并递归创建父目录；guideline 限定为新文件或完整重写。[schema、默认操作与 guideline](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/write.ts#L15-L44) |
| `edit` | `{ path: string, edits: Array<{ oldText: string, newText: string }> }` | 精确文本替换；每个 `oldText` 必须在原始文件中唯一、互不重叠，多个相隔位置应合并为一次调用。它是 `write` 的局部修改路径。[schema 与模型 guideline](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/edit.ts#L34-L66) |
| `bash` | `{ command: string, timeout?: number }` | 在 cwd 执行 shell；`timeout` 单位秒、无默认 timeout。提示将其描述为可做 `ls`/`grep`/`find` 等命令的通用逃生口。[schema 与提示](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/bash.ts#L25-L55) |
| `powershell` | 同 `bash` schema | 另一 shell 工厂，属于 8 个已注册内置名，但不在默认 4 个 active set 中。[工厂选择](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/index.ts#L118-L191) |
| `grep` | `{ pattern: string, path?: string, glob?: string, ignoreCase?: boolean, literal?: boolean, context?: number, limit?: number }` | 基于 `rg` 搜索内容、尊重 `.gitignore`，返回文件路径和行号；是 `bash rg` 的结构化、可限额替代。[schema](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/grep.ts#L24-L66) |
| `find` | `{ pattern: string, path?: string, limit?: number }` | 基于 glob/`fd` 查文件、尊重 `.gitignore`，结果相对于搜索根；是 `bash find` 的结构化替代。[schema](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/find.ts#L29-L60) |
| `ls` | `{ path?: string, limit?: number }` | 枚举目录、包含 dotfiles、字母排序、目录后缀 `/`；是 `bash ls` 的结构化替代。[schema 与说明](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/ls.ts#L14-L55) |

这套重叠不是互斥的安全边界：`bash` 仍可执行同类命令。源码选择的模型友好策略是「默认 4 个最小写码集合；可选的 `grep`/`find`/`ls` 给出更窄、结构化且限额的探索输出；提示在仅有 shell 时明确建议用 shell 做列举/搜索」。[工具组合](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/index.ts#L164-L222) 与 [prompt 分支](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/system-prompt.ts#L80-L119) 支持这一推论。

## 路径、cwd 与本地性

所有文件路径字段都是普通 `string`，不是 virtual mount、opaque handle 或 capability token。文件工具的文案允许相对或绝对路径；统一解析会扩展 `~`、接受 `file://`、将相对路径以传入的 `cwd` resolve，且会把 leading `@` 去掉。实现**没有**把结果限制在 cwd 内，因此 `..`、绝对路径与 home 路径在这个通用合同内均可表示。[统一解析](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/utils/paths.ts#L75-L105) [及各工具的 `resolveToCwd`](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/path-utils.ts#L44-L50)。

`bash` 则把同一个 `cwd` 直接交给 child-process spawn；默认是本地 shell。虽然 `read`/`write`/`edit`/`grep`/`find`/`bash` 各有可注入的 `operations`（注释举 SSH 为例），这些操作收到的是**已经解析好的绝对路径**或 `(command, cwd)`，并未把模型层路径改成远端 handle。[shell spawn](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/bash.ts#L80-L205) [与 read 的 delegation seam](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/read.ts#L34-L63)。

因此可明确推得：Pi 的默认通用工具是「本机路径 + session cwd」合同；它本身没有定义受信任 native executor、broker resource namespace、mount ID、路径授权证明或跨边界回执。后五项若需要，必须由调用方/新层自行定义，不能声称是 Pi 既有 API。

## 输出、失败、取消与并发

* 通用截断基线是最多 2,000 行或 50 KiB，先命中者生效；`grep` 的单条匹配又限为 500 字符。[公共截断实现](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/truncate.ts#L1-L55)
* `read` 从头截断，告诉模型继续使用 `offset`；图像是受支持 MIME 时才以 attachment 返回，普通文本走 UTF-8 内容路径，非图像二进制并没有单独的 opaque/binary-result 合同。[read 执行](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/read.ts#L209-L333)
* `grep` 默认最多 100 matches，`find` 默认最多 1,000 结果，`ls` 默认最多 500 entries，均添加可行动的截断/限额 notice；三者在默认实现中依赖本机 `rg`/`fd` 或本地文件系统。[grep 执行](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/grep.ts#L128-L388) [find 执行](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/find.ts#L123-L379) [ls 执行](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/ls.ts#L100-L229)。
* `bash` 合并 stdout/stderr，约每 100 ms 经 `onUpdate` 推送局部结果；完成时保留尾部，若截断则把完整输出写到临时文件并返回 `fullOutputPath`。非零 exit、timeout 与取消都走 rejected error，且会附已有输出/状态。[流式与结果格式](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/bash.ts#L338-L464) [完整输出累积](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/output-accumulator.ts#L32-L118)。
* 所有工具的 `execute` 接收 `AbortSignal`；shell 取消或 timeout 会终止进程树，`grep`/`find` 会停止子进程。`write` 与 `edit` 则在异步文件步骤之间检查 abort，并刻意不在 abort listener 中提前释放同一路径 mutation queue：已开始的文件操作仍须结算，故取消不等于事务性回滚。[shell 取消](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/bash.ts#L80-L145) [写入的取消语义](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/write.ts#L201-L235) [编辑的取消语义](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/tools/edit.ts#L330-L377)。

## 扩展、替换与 Web 能力

extension 可通过 `registerTool()` 注册 TypeBox 参数 schema、描述、`execute`、可选 `onUpdate` 兼容的执行函数、提示 snippet/guidelines，以及 `sequential`/`parallel` 执行模式。SDK 也可追加 `customTools`。[ToolDefinition 合同](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/extensions/types.ts#L449-L509) [注册入口](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/extensions/types.ts#L1282-L1290)。

名字冲突时，session 先装 built-in，再以 custom/extension 的同名条目写入 Map，故后者覆盖注册表里的同名 built-in 定义/实现；这是替换机制，不是额外隔离层。[装配顺序](https://github.com/earendil-works/pi/blob/bfb004d4418ff05c6f909eaaab856cbe75c1fde0/packages/coding-agent/src/core/agent-session.ts#L2588-L2678)。这可承载 brokered tool，但 Pi 并未规定 broker 的身份认证、资源权限或审计 receipt。

在上述 8 个 built-in factory、默认 prompt 和 `packages/coding-agent` 的 core/docs/README 中，没有 `web_search`、`web_fetch` 或同名 web 工具的注册/工厂。因此，已发布的默认 Pi 工具**不提供**内置 Web search/fetch；extension/custom tool 可以另加网络能力，但其参数与安全合同完全由 extension 所有者定义，不能从 Pi 默认合同推断。

## 可用作设计输入的有限结论

从官方实现可作、且仅可作如下推论：

1. 模型易用性来自小而明确的 JSON schema、把 cwd 写入 prompt、相对路径、面向大输出的 continuation/limit notice，以及将精确 edit 与全量 write 区分；这些都是代码中的直接机制。
2. 「结构化搜索工具」与「通用 shell」可以并存，前者改善结果形状和上限，后者保留通用性；Pi 没有把前者当作后者的权限替代。
3. 若 Wayfinder 引入 native/brokered 双路径，应把本地路径语义、资源标识、cwd、取消后写入可见性、截断后完整输出取得方式和替换优先级显式写成自己的合同。Pi 现有合同可作为比较对象，不能自动满足这些要求。

## 未能核实或刻意不外推的事项

* 未逐行审计 `@mariozechner/pi-coding-agent@0.73.1` 的工具 schema；它仅用于身份区分，不能据此声称与 fork `0.84.3` 等价。
* 未找到 Pi 对 native execution trust、sandbox、path allowlist、remote mount、capability handle、broker authorization/attestation 或 audit receipt 的内置规范；「未找到」不是这些能力在外部 extension 中不存在的证明。
* 本文没有执行任何工具调用，也没有验证各 OS shell、SSH 注入操作或第三方 extension 的运行时行为。
