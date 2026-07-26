# Host Bridge 审阅镜像操作合同

## 适用边界

审阅镜像是三层 agent-facing surface 的中文人工评审视图，不是发布 payload，也不是新的语义事实源。正式英文生成面仍由各自 source renderer 产生；`host-bridge/surfaces.json` 决定层级和组件所有权；`artifact/host-bridge-review/` 只保存译文、索引与来源证明。

所有权布局如下：

| 发布面 | 自有 Markdown | 继承关系 |
| --- | --- | --- |
| `zotero-bridge-cli` | Minimum Skill 的 `SKILL.md` 与完整 references | 无 |
| `zotero-library-agent` | coordinator 与 query、acquisition、analysis、synthesis、curation 六个 Skill 包 | 继承 `zotero-bridge-cli` |
| `zotero-librarian` | Hermes 根级 `README.md`、`SOUL.md` 与 Librarian Skill 包 | 继承前两层 |

继承文件不在下游目录复制。`INDEX.md` 和 `PROVENANCE.json` 记录每层的 `lineage`、`ownedFileCount`、`inheritedFileCount` 与 `effectiveFileCount`，使审阅者能够从所有权布局还原完整发布面。

## 暂存生命周期

`prepare` 要求空目录，并产生：

```text
<staging>/
├── inventory.json
├── summaries.template.json
├── source/<artifactPath>
└── translated/<artifactPath>
```

`source/` 是冻结快照，不得编辑。`translated/` 按相同 `artifactPath` 保存中文译文。Agent 从 `summaries.template.json` 复制键全集到 `summaries.json`，保留 schema `host-bridge.review-summaries.v1`，并为每个键填写非空中文摘要。摘要用于脚本生成索引，不得包含未经文档支持的判断。

不要复用有内容的暂存目录。prepare 后若正式生成面、surface manifest、candidate release set 或 latest complete receipt 发生变化，当前暂存身份即失效，必须在新的空目录重新 prepare。

## 翻译合同

需要翻译：

- Markdown 标题、自然语言段落、列表说明与表格中的自然语言；
- YAML frontmatter 的 `description`；
- 命令前后的解释、输入输出语义、约束、完成条件和失败处理；
- `README.md` 与 `SOUL.md` 中面向 agent 的自然语言。

需要保持：

- fenced code block 的 fence、语言标记、内容和顺序；
- inline code 的内容和顺序；
- Markdown 链接目标 URL；
- YAML frontmatter 是否存在及 `name` 值；
- 标题层级序列；
- HTML comments 和 machine markers；
- 命令、参数、路径、环境变量、schema、DTO 字段、枚举、标识符、hash、版本与其他机器可读值。

Host Bridge、CLI、Agent、Skill、workflow、surface、release set、approval、handle、profile、provider、backend、session、transcript、MCP、SkillRunner 等边界术语可保留英文。译文要自然、准确、current-state only，不能补入变更历史、兼容策略或执行合同以外的建议。

结构校验通过只代表机器边界未被破坏，不代表译文语义合格。Agent 必须逐文件审阅含义，尤其注意 MUST/SHALL、否定条件、授权边界、完成定义与恢复顺序。

## 清单与来源证明

`inventory.json` 使用 `host-bridge.review-mirror-inventory.v2`，包含：

- surface definitions 的路径、schema 与 SHA-256；
- candidate release set 和 latest complete release 的关键 identity；
- 各发布面的 kind、facet、extends、lineage、direct/inherited Skills 和 owned/effective 数量；
- 每个 owned 文件的 owner、Skill、源路径、artifact 路径、源 SHA-256 与受保护结构 SHA-256。

`PROVENANCE.json` 使用 `host-bridge.review-mirror.v2`。它继承冻结清单的身份字段，并增加生成时间、source commit、译文 SHA-256 和译文结构 SHA-256。它是机器生成合同，不翻译、不手改。

`check` 会重新解析当前 manifest 和 owned 文件全集，比较完整清单而非仅比较数量，并验证正式目录的 Markdown 精确集合、symlink、源/译文 hash、结构 digest 以及索引链接。相同数量下替换文件仍会失败。

## 原子替换与恢复

`finalize` 的顺序是：比较冻结输入与当前输入、验证译文精确全集、验证摘要全集、验证受保护结构、生成索引和 provenance、复制到同级临时目录、最后原子 rename。旧正式目录只在最后切换期间作为备份，成功后删除备份；切换失败时恢复旧目录。

常见失败处理：

| 失败 | 处理 |
| --- | --- |
| `staging directory must be empty` | 新建空临时目录后重新 prepare |
| `source changed since prepare` | 丢弃本轮暂存，从当前正式源重新 prepare 和翻译 |
| `translation missing` / `unmanaged` | 对照 `inventory.json` 修正 `translated/` 精确文件集 |
| `summaries do not match` | 以 template 键全集重建 `summaries.json`，不要增删键 |
| `Protected Markdown structure changed` | 恢复对应机器结构，只修改自然语言 |
| provenance、hash 或 index link mismatch | 不手改机器文件；从空暂存区完整刷新镜像 |

任何失败都不能通过直接改写 `artifact/host-bridge-review/PROVENANCE.json`、降低校验或删除旧正式目录来规避。
