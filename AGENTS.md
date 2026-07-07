# 项目说明

本项目用于开发一个 Zotero 插件，作为 ACP Agents、Skills-Runner 后端服务以及其他 API 的一个通用前端。

# 项目特点及目标

1. 插件目标版本为 Zotero 7 + Zotero 9。
2. 插件以 zotero-plugin-template 项目为模板开发。
3. 插件采用模块化、工作流可插拔的设计理念。插件本体提供通用的 UI 界面及菜单。内部通过统一的工作流协议，由各组件分别按流程执行任务。插件本身不包含任何具体的业务逻辑。业务逻辑由用户通过“可插拔”的工作流文件或工作流包来声明和定义。
4. 插件主要以通过ACP协议调用Agent工具为目标开发，兼容旧的Skill-Runner后端服务，但也应设计为兼容其他通用的REST API后端。

# 目录结构

- 所有的 `.js/.ts` 代码都在 `./src`;
- 插件配置文件：`./addon/manifest.json`;
- UI 文件：`./addon/content/*.xhtml`.
- 区域设置文件：`./addon/locale/**/*.flt`;
- 首选项文件：`./addon/prefs.js`;

```shell
.
|-- .github/                  # github conf
|-- .vscode/                  # vscode conf
|-- addon                     # static files
|   |-- bootstrap.js
|   |-- content
|   |   |-- icons
|   |   |   |-- favicon.png
|   |   |   `-- favicon@0.5x.png
|   |   |-- preferences.xhtml
|   |   `-- zoteroPane.css
|   |-- locale
|   |   |-- en-US
|   |   |   |-- addon.ftl
|   |   |   |-- mainWindow.ftl
|   |   |   `-- preferences.ftl
|   |   `-- zh-CN
|   |       |-- addon.ftl
|   |       |-- mainWindow.ftl
|   |       `-- preferences.ftl
|   |-- manifest.json
|   `-- prefs.js
|-- build                         # build dir
|-- node_modules
|-- doc
|   |-- architecture-flow.md      # 架构流程设计（初步方案）
|   |-- dev_guide.md              # 开发指南（初步方案）
|   |-- README-frFR.md            # zotero-plugin-template项目法语README/说明
|   |-- README-zhCN.md            # zotero-plugin-template项目中文README/说明
|   |-- testing-framework.md      # 测试框架/策略说明（初步方案）
|   `-- components
|       |-- handlers.md           # handlers组件设计说明（初步方案）
|       |-- job-queue.md          # 任务队列组件设计说明（初步方案）
|       |-- local-cache.md        # 本地缓存组件设计说明（初步方案，暂不实现）
|       |-- selection-context.md  # 选区/上下文组件设计说明（初步方案）
|       |-- transport.md          # 传输层组件设计说明（初步方案）
|       |-- ui-shell.md           # UI壳层组件设计说明（初步方案）
|       `-- workflows.md          # 工作流组件设计说明（初步方案）
|-- reference
|   |-- Skill-Runner              # Skill-Runner 后端项目仓库
|   |-- zotero                    # Zotero 7.0.32版本源码仓库
|   |-- zotero-plugin-toolkit     # zotero-plugin-toolkit 项目参考文档
|   |-- zotero-item-typeMap.xml   # Zotero 条目类型映射表
|   |-- zotero-javascript-api-guide.md # Zotero JS API 指南
|   |-- zotero-plugin-dev-guide-zh.md  # Zotero 插件开发指南（中文）
|   `-- zotero-plugin-dev-guide.md     # Zotero 插件开发指南（英文）
|-- src                           # source code of scripts
|   |-- addon.ts                  # base class
|   |-- hooks.ts                  # lifecycle hooks
|   |-- index.ts                  # main entry
|   |-- modules                   # sub modules
|   |   |-- examples.ts
|   |   `-- preferenceScript.ts
|   `-- utils                 # utilities
|       |-- locale.ts
|       |-- prefs.ts
|       |-- wait.ts
|       |-- window.ts
|       `-- ztoolkit.ts
|-- typings                   # ts typings
|   `-- global.d.ts

|-- .env                      # enviroment config (do not check into repo)
|-- .env.example              # template of enviroment config, https://github.com/northword/zotero-plugin-scaffold
|-- .gitignore                # git conf
|-- .gitattributes            # git conf
|-- .prettierrc               # prettier conf, https://prettier.io/
|-- eslint.config.mjs         # eslint conf, https://eslint.org/
|-- LICENSE
|-- package-lock.json
|-- package.json
|-- tsconfig.json             # typescript conf, https://code.visualstudio.com/docs/languages/jsconfig
|-- README.md
`-- zotero-plugin.config.ts   # scaffold conf, https://github.com/northword/zotero-plugin-scaffold
```

# 注意事项

- 遵循全局AGENTS.md的指示
- 首先，敲定开发方案，再进入执行阶段
- 开发过程注重文档化
- 采用TDD模式：每一步开发前先写测试用例，再围绕测试实现
- **切勿将Node.js环境中才能使用的代码用于插件环境**

# Assistant Workspace UI硬约束

- transcript/prompting 是 Assistant Workspace 中最高频的更新路径，transcript 渲染必须与 toolbar、banner、plan、hint、reply、context drawer、details drawer、permission drawer 等非 transcript DOM 渲染解耦。
- 任何 Assistant Workspace / ACP Skills / ACP Chat / SkillRunner 面板改动，都不得把 transcript revision、transcript page signature、streaming chunk、transcript item/event count、prompting event tail 或 log tail 放入整面板 chrome render key。
- transcript-only 更新只能触发 transcript region 渲染；不得重建 Runner pane、details drawer、context drawer 或其它非 transcript managed region。
- transcript loading/spinner 也是 transcript region 的一部分，必须按 panel owner scope（例如 backend/conversation、requestId、taskKey）隔离；同一 owner 的同一 loading 语义状态不得反复清空 transcript window 或重建 spinner。
- 如果需要刷新非 transcript region，必须使用该 region 自身的稳定 signature，signature 只能包含该 region 用户可见内容和打开/折叠状态。
- 所有 Assistant Workspace shared managed regions（toolbar、banner、plan、hint、reply、context drawer、details drawer、permission drawer）都必须经由区域级 signature guard；不得让 transcript-only/loading/streaming snapshot 直接触发这些区域的 clear/rebuild。
- 涉及 transcript 渲染、prompting、snapshot、drawer/details 的改动必须补充或更新能锁定上述 DOM identity 不变量的测试。

# ACP Transcript Projection硬约束

- ACP Chat / ACP Skills 的 transcript projection 不得假设后端已经正确整流 assistant message chunks；插件侧必须按协议语义维护稳定的 assistant text segment。
- `tool_call_update`、usage、status、workspace activity 等 side-channel update 不得作为 assistant message 的硬切分边界；新 `tool_call`、用户消息、plan/permission/user interaction、显式 turn boundary、request terminal 才能结束当前 assistant text segment。
- ACP transcript message coalescing 必须是协议/语义级通用逻辑，不得按 backend id、provider id、agent family、命令名或具体后端产品字符串做特判。
- ACP Chat 与 ACP Skills 共享同一类 transcript boundary 分类；新增或修改 session update kind 时必须同步审查两条路径的 message coalescing 行为。
