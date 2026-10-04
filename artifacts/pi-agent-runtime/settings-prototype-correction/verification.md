# Zotero Agent 设置原型一致性修正

固定参照为[已批准的第七版原型](../settings-prototype/revision-7.html)及其[批准记录](../settings-prototype/approval.md)。原实施的行为测试通过，但视觉验收没有充分对照这个固定参照。本次复核确认了布局与交互偏离，原归档记录不能作为原型一致性的完成证据。

## 偏离原因与修正

| 原型要求                                       | 原实施的偏离                                          | 当前实现                                                               |
| ---------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| 四个默认用途摘要在双栏工作台上方               | 工作台纵向堆叠；窄窗口断点将双栏变成单栏              | 摘要固定；左侧连接列表、右侧详情独立布局；760px 窗口仍为双栏           |
| 当前页面添加连接，弹窗选择三种连接方式         | 添加连接跳回引导页                                    | 共用三种方式投影，直接打开选择弹窗，再进入编辑表单                     |
| 引导页有独立页头、介绍、步骤和连接方式         | 介绍被放进页头，额外任务卡片改变层级                  | 恢复独立介绍区与三个步骤；空配置只呈现三种连接方式                     |
| 导航、连接品牌、模型卡片、用途按钮保留原型层次 | 图标、卡片与控件样式被简化                            | 恢复品牌标识、模型卡片、推理选择、矩形用途按钮与固定页脚               |
| 搜索来源在同一列表，维护项默认折叠             | 搜索来源变成分散卡片；页面露出内部配置码与目录身份    | 统一列表与分隔线；状态转换为用户文案；目录维护显示日期或就绪状态       |
| 目录翻页是实际操作                             | 页码按钮回调为空                                      | 使用既有有界查询，下一页请求 offset 50                                 |
| 产品文案使用各语言消息                         | Fluent 键齐全，但控制器语义名缺少映射，仍使用英文兜底 | 补齐静态导航、表单、认证与状态映射；四种默认用途动作增加 11 种语言消息 |

样式复用共享主题与页面 token。窗口本身持有真实宿主标题栏，原型外围的评审控件和模拟标题栏不进入产品。领域 owner、保存事实、消息动作与区域 memoization 继续使用已有实现。

## 自动验证

- 完整生产构建通过，日志：[full-build.log](full-build.log)。涵盖插件构建、Synthesis workspace 检查及四份 TypeScript 配置。
- 最后控制器与文案修改后的 Dashboard 类型检查、ESLint 和全库语言治理检查通过，日志：[dashboard-types.log](dashboard-types.log)、[eslint.log](eslint.log)、[localization.log](localization.log)。
- 既有页面测试 30 项通过，日志：[dashboard.log](dashboard.log)。补充了直接添加连接与实际有界目录翻页两项行为验证，原有草稿保护、焦点与区域身份验证保留。
- 既有实机 UI 用例增加正常/紧凑窗口几何断言，验证摘要位于双栏上方、连接列表与详情并排、详情滚动不移动摘要或页头。五个页面仍各自只有一个主内容滚动区。

实机测试使用既有 `tests/zotero/ui/lite/278-pi-provider-configuration.zotero.test.ts` 和 compatibility runner；临时入口只选择该用例，未另建 runner。隔离测试 profile 仅使用控制数据。

## 候选与实机记录

源码基线：`af36c2e861bbaaea0ddbc13a3dff248e860879f9`，工作区包含本次未提交修正。宿主：Zotero 10.0.1 / Linux x64，build `20260824184709`。

首次实机通过后，截图复核发现内部目录身份、搜索字段码及截图停留在滚动底部的问题，随后修正并重新打包复测。两次中间记录保留为 [first-pass-receipt.json](first-pass-receipt.json) 与 [content-pass-receipt.json](content-pass-receipt.json)，均为 7 项通过。

最终排版复核另外修正了紧凑窗口导航计数与用途提示的伸缩边界，并保留 160px 导航宽度，避免英文词被拆成孤立字母。最终候选重新打包后通过实机复测，7 项全部通过，清理完成。

- 最终 receipt：[final-receipt.json](final-receipt.json)，运行 ID `zotero-10-linux-x64-7abcfb66`。
- 实机日志：[final-runner.stdout.log](final-runner.stdout.log)。
- 最终生产包：`.scaffold/settings-prototype-corrected/zotero-agents.xpi`；SHA-256 `26b3dc4d602b7b000281da1c507c82dce08d2a4ad86c24a4f04434936a9c14cf`，已与 receipt 比对一致。
- 最后打包与格式检查：[final-package.log](final-package.log)、[format.log](format.log)；`git diff --check` 通过。

复测命令：

```sh
ZOTERO_BUILD_DEBUG=0 ZOTERO_PLUGIN_DIST=.scaffold/settings-prototype-corrected npx zotero-plugin build
ZOTERO_TEST_ENTRY=/tmp/zotero-settings-prototype-entry/all.test.ts \
ZOTERO_AGENT_SETTINGS_UI_OUTPUT="$PWD/artifacts/pi-agent-runtime/settings-prototype-correction/zotero-final" \
npm run test:zotero:compatibility:run -- \
  --target zotero-10-linux-x64 --mode behavior --suite lite --domain ui \
  --gate pull-request --build-root .scaffold/settings-prototype-corrected --timeout-ms 300000
```

## 图像复核

模型卡片的浏览器截图直接运行生产控制器、Preact renderer 和 CSS，数据复用现有页面测试的两张模型卡片、连接与默认用途；没有真实账户或网络请求。它们用于检查模型卡片的视觉层次，不冒充真实宿主模型发现或推理证据。

- [带模型卡片的工作台](browser-final/normal-light-model-cards.png)
- [紧凑窗口的模型卡片](browser-final/compact-light-model-cards.png)
- [直接添加连接弹窗](browser-final/connection-methods.png)

实机截图覆盖五个页面、两种窗口尺寸、明暗主题以及连接、MCP、搜索编辑弹窗。查看页首与维护区使用独立截图，避免滚动测试的页尾截图掩盖页面结构。

- [真实宿主工作台](zotero-final/normal-saved-workbench.png)与[紧凑窗口](zotero-final/compact-saved-workbench.png)
- [引导页](zotero-final/normal-light-overview.png)
- [MCP 页面](zotero-final/normal-light-mcp.png)与[stdio 表单](zotero-final/stdio-draft.png)
- [搜索页面](zotero-final/normal-light-search.png)
- [目录页面](zotero-final/normal-light-catalog.png)与[维护区](zotero-final/normal-dark-maintenance.png)

浏览器补充检查的边界记录见 [bounds.json](browser-final/bounds.json)：正常/紧凑窗口、明暗主题中，导航计数与默认用途提示均保留在各自容器内。模型卡片截图只代表这些控制数据下的呈现。

本次证据只覆盖设置页面与原型一致性修正，不替代真实 ChatGPT 登录、SIWC/C20 或跨平台发行验收。原 OpenSpec 归档与其他工作区改动保留。

用户随后明确调整设置窗口的命名与 Backend Manager 入口：使用 Built-in Agent 语义，选项卡仅保留打开设置按钮。该追加修正及新的候选身份记录于 [Built-in Agent 命名与入口验证](builtin-semantics/verification.md)，原型与上述阶段的截图作为该追加要求之前的记录保留。
