# PDF 探测

在 Stage 40 有限研究和主智能体审阅阶段使用此参考文档。
一次正式的 PDF 审阅为每条硬路由恰好包含一个终态条目：
`authoritative_landing`、`open_access` 和 `web_search`。按此顺序搜索路由，
并在首个经验证的 PDF 出现后停止主动搜索；后续路由条目
使用 `skipped_after_verified_pdf` 标记。

目标是获取同一直接作品的合法、公开、可达的 PDF。
当所有路由均已穷尽后，元数据收录可在无 PDF 的情况下继续。

## 单任务研究与正式审阅边界

在 Stage 30 范围批准后，每个单篇工作器接收一项原子性的
有限研究任务。元数据和 PDF 发现是该任务内的两类证据，
而非独立的工作器阶段或独立的委托轮次。
工作器在找到经验证的 `pdf_url` 时记录该 URL、
所检查的来源 URL，以及同一扁平 `result.json` 中的简要不确定性说明；
它不写入路由载荷、清单、哈希记录或终结器输入。

主智能体将原始研究结果转换为正式的三键路由对象。
当路由证据不完整时，主智能体可检查工作器的来源 URL
并执行小幅有限修复搜索。只有通过门控签发的
主智能体 `researchReviewPayload` 才能推进 PDF 状态。
工作器从不调用门控、提交该载荷、接收 Zotero 命令或写入 Host 回执。

工作器规格和原始结果保留在
`runtime/agent-batches/batch-NNN/` 下；主智能体审阅载荷和生成的
收录载荷保留在 `runtime/payloads/` 下；Host 回执保留在
`runtime/host/` 下。不要将路由说明或下载的临时文件写入
`result/`、`/tmp`、主目录、缓存目录或其他分配路径。
工作流需要经验证的公开 URL 和响应/身份事实，而非私有的本地 PDF 存档。

如果工作器无法写入其声明的结果路径，则直接返回相同的扁平
JSON 对象并退出。主智能体可将该对象持久化到声明路径、
审阅它并编写正式路由对象。不存在工作器侧的验证或修复循环。

## 硬路由顺序

### 1. 权威落地页

按顺序检查：

1. DOI 解析器或其他规范化标识符落地页；
2. 出版商、期刊、会议、仓储库、大学或发布机构页面；
3. 属于该直接作品的显式链接 HTML 全文、下载控件、补充记录
   或直接 PDF URL。

不要将落地页视为 PDF。仅跟踪公开链接并验证响应。

查询形式：

```text
https://doi.org/<normalized-doi>
site:<publisher-domain> "<original title>"
"<identifier>" site:<issuing-domain>
```

### 2. 开放获取

检查适用来源：

1. 基于 DOI 的开放获取索引；
2. 领域仓储库（如 arXiv 或学科仓储库）；
3. 机构仓储库；
4. 学位论文仓储库；
5. 合法公开文件的作者、实验室、项目或资助方页面。

查询形式：

```text
<normalized DOI> open access
"<original title>" repository
"<original title>" site:<institution-domain>
<author> "<distinctive title phrase>" pdf
```

索引声称某作品开放获取仅是一条线索。需跟踪其 URL 并
验证实际文件。

### 3. 公开网络搜索

在可用时同时使用原始标题和标识符形式：

```text
"<authoritative original title>" filetype:pdf
"<normalized DOI>" pdf
"<original title>" "<first creator>" pdf
```

对于非拉丁字母标题，优先使用原始文字搜索。翻译和罗马化
查询作为补充。公开网络搜索不能放宽来源合法性或身份检查。

## 可达性与内容验证

一次 `found` 尝试需满足以下全部条件：

- 最终 URL 使用 HTTP(S)；
- 无需账户、订阅登录、机构代理或交互式审批；
- 最终响应可达；
- 内容类型以 `application/pdf` 开头；
- 响应是文件本身，而非 HTML 落地页、同意页面、错误页面、
  查看器外壳或搜索结果；
- 文件的标题、创作者、标识符、发表场所或其他直接作品证据
  与主智能体确认的直接作品元数据匹配；
- 来源合法且可公开分享。

检查响应头，必要时检查首页或嵌入元数据。仅凭 URL
以 `.pdf` 结尾是不够的。服务器可能返回 HTML、拒绝访问页面
或另一篇论文。

如果稳定的落地页有参考价值，将其单独记录为 `landing_url`。
`pdf_url` 必须指向经验证的文件响应。

## 直接作品身份

仅当 PDF 代表已批准且经元数据确认的直接作品时才接受。比较：

- DOI、ISBN、PMID、arXiv id、报告编号或仓储库 id；
- 权威原始标题；
- 有序创作者列表；
- 作品类型和材料版本；
- 年份、容器、发布机构和特征性子标题。

拒绝以下情况：

- 引用论文；
- 所选作品为衍生文章时的学位论文；
- 所选条目为已发表文章时的预印本，除非关系和所选材料版本明确允许；
- 补充材料、海报、幻灯片、摘要集、勘误或数据集而非作品本身；
- 不同创作者的同名作品。

当可达文件不是直接作品时使用 `status: "mismatch"`。在 `notes` 中
说明冲突的身份事实；永远不要将该 URL 放入 `pdf_url`。

## 状态语义

| 状态 | 含义 |
| --- | --- |
| `found` | 已验证一个合法、公开、可达且身份匹配的 `application/pdf` 响应 |
| `not_found` | 路由已成功搜索但未产生可用 PDF |
| `restricted` | 候选文件存在但需要登录、订阅、授权或其他受限访问 |
| `unavailable` | 计划的路由或服务无法访问或以不可用方式不适用 |
| `mismatch` | 检索或链接到的文件属于另一书目对象 |
| `error` | 由于具体的网络、解析或服务错误导致尝试失败 |
| `skipped_after_verified_pdf` | 更高优先级的路由已产生经验证的同一作品公开 PDF，因此本后续路由被有意跳过 |

不存在通用的 `not_attempted` 状态。在经验证的 PDF 存在之前，
空的搜索摘要不能覆盖一条路由。记录来源、确切查询或 URL、
终态状态和简要说明。对于 `found`，还需记录经验证的
PDF URL、PDF 内容类型和具体身份证据。对于
`skipped_after_verified_pdf`，说明哪条更高优先级路由已成功。
这些证据字段取代了自声明的可达性、合法性和身份布尔值；
来源策略仍然适用。

## 合法与禁止来源

接受以下来源的公开文件：

- 出版商和期刊网站；
- DOI 或发布机构落地页；
- 公认的开放获取和机构仓储库；
- 作者、项目、实验室、大学或资助方页面；
- 公有领域仓储库和合法存档。

不得使用：

- 盗版或未授权分享网站；
- 凭据、机构代理会话、Cookie 转移或浏览器登录自动化；
- 仅在私人账户内可见的 URL；
- 规避工具或付费墙绕过手段；
- 与所选候选无关的本地文件。

ACP shell、公开 HTTP 和搜索工具可在其授权范围内使用。
不要使用浏览器、Connector、CDP 或其他用户的登录会话来获取受限内容。

## 完整找到载荷

此载荷覆盖所有路由并选定权威文件：

```json
{
  "attempts": {
    "authoritative_landing": {
      "source": "官方期刊落地页",
      "query_or_url": "https://doi.org/10.5555/tunnel.001",
      "status": "found",
      "pdf_url": "https://journal.example.org/articles/tunnel.001.pdf",
      "content_type": "application/pdf",
      "identity_evidence": [
        "DOI、原始中文标题和创作者与确认元数据匹配。"
      ],
      "notes": "DOI、中文标题和创作者与确认元数据匹配。"
    },
    "open_access": {
      "source": "开放获取路由",
      "query_or_url": "经验证权威 PDF 后无需查询",
      "status": "skipped_after_verified_pdf",
      "notes": "权威落地页路由已产生经验证的 PDF。"
    },
    "web_search": {
      "source": "公开网络搜索",
      "query_or_url": "经验证权威 PDF 后无需查询",
      "status": "skipped_after_verified_pdf",
      "notes": "权威落地页路由已产生经验证的 PDF。"
    }
  }
}
```

运行时根据确定性路由偏好选择可用文件。
不要仅因早期路由找到了文件就省略后续路由键；
将它们记录为 `skipped_after_verified_pdf`，使正式对象保持完整
同时避免浪费搜索。由主智能体（而非工作器）提交
三键对象并后续遵循门控的审阅游标。

## 完整缺失载荷

PDF 缺失是探测的终态结果，而非工作流失败：

```json
{
  "attempts": {
    "authoritative_landing": {
      "source": "官方期刊落地页",
      "query_or_url": "https://doi.org/10.5555/tunnel.001",
      "status": "not_found",
      "notes": "该页面提供元数据但无公开文件。"
    },
    "open_access": {
      "source": "开放获取索引和仓储库",
      "query_or_url": "10.5555/tunnel.001",
      "status": "not_found",
      "notes": "未找到仓储库副本。"
    },
    "web_search": {
      "source": "公开网络搜索",
      "query_or_url": "\"隧道衬砌病害智能识别研究\" filetype:pdf OR \"10.5555/tunnel.001\" pdf",
      "status": "not_found",
      "notes": "未找到合法公开副本。"
    }
  }
}
```

候选项获得 PDF 状态 `missing`。确定性收录准备
省略 `pdfUrl` 并保留权威的 `landingUrl`。这仍然是
完整的正式 PDF 结果；缺少公开 PDF 不是将经元数据确认的候选项
从收录准备中排除的理由。

## 其他终态示例

### 受限

```json
{
  "source": "出版商下载",
  "query_or_url": "https://publisher.example.org/download/123",
  "status": "restricted",
  "notes": "下载需要订阅者登录。"
}
```

不要自动化登录。继续执行其他路由。

### 不匹配

```json
{
  "source": "公开网络搜索",
  "query_or_url": "\"Shared Article Title\" filetype:pdf",
  "status": "mismatch",
  "notes": "该 PDF 的创作者和 DOI 不同。"
}
```

不要将不匹配的 URL 放入 `pdf_url`。

### 不可用

```json
{
  "source": "开放获取索引",
  "query_or_url": "10.5555/tunnel.001",
  "status": "unavailable",
  "notes": "实际请求后公共服务不可用。"
}
```

## 反例

### 拒绝：将落地页报告为 PDF

响应内容类型为 `text/html`，但尝试使用 `status:
"found"` 并将落地 URL 存储为 `pdf_url`。应根据情况将路由记录为
`not_found` 或 `restricted`，并仅将该页面保留为
`landing_url`。

### 拒绝：无路由尝试的搜索摘要

"网上没有 PDF"没有记录确切查询、来源、终态状态
和说明。该路由仍处于未覆盖状态。

### 拒绝：缺少路由

仅存在权威落地页和开放获取条目。硬门控必须
拒绝该载荷，因为三个路由键均为必需。当早期路由
找到了有效文件时，缺失的后续键应以
`skipped_after_verified_pdf` 存在，而非被省略。

### 拒绝：将 PDF 研究作为第二个工作器任务委托

一个工作器返回书目事实，主智能体为同一候选项启动另一个
仅处理 PDF 的工作器。这违背了原子性单篇任务分配
并重建了隐藏的工作器阶段链。原始任务
已要求同时进行有限元数据和公开 PDF 研究。
如果其原始结果缺少决定性的 PDF 证据，主智能体在编写正式审阅时
执行小幅有限修复；它不创建新的工作器侧阶段或终结器循环。

### 拒绝：中间文件离开运行器工作区

当分配结果路径不可用时，智能体将路由说明写入 `/tmp`、
将 PDF 下载到主目录缓存或使用外部临时目录。
这不是授权的回退方式。应将相同的扁平 JSON 结果返回给主智能体；
所有持久化的中间工件属于 `runtime/` 下，
只有最终的公开输出属于 `result/` 下。

### 拒绝：身份错误的文件

一个可达的公开 PDF 具有翻译后的标题但创作者和 DOI 不同。
使用 `mismatch`；不要附加它。

### 拒绝：将受限来源视为公开

浏览器会话可以查看出版商文件，因为用户已登录。
这并不使 URL 变为公开或可复用。记录 `restricted`，
不要提取会话凭据。

### 拒绝：非法来源

文件出现在未授权分享网站上。不能使用 `found`；
记录合法来源尝试的结果并继续合法搜索。
缺少自声明的 `legal_source` 布尔值永远不会放宽该策略。
