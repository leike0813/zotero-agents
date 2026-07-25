# PDF 探测

本参考用于阶段 40 的三路线公开 PDF 研究和主代理检查。目标是在合法、公开、可达且直接作品身份匹配的前提下找到最佳 PDF；未找到 PDF 时保留 metadata-only 入库。

## 完成标准

每篇批准论文必须执行三路线判断：

1. 权威落地页；
2. 开放获取；
3. 公开网络搜索。

只有较早路线已经找到并验证合法匹配 PDF 时，后续路线才可使用 `skipped_after_verified_pdf`。没有较早 verified PDF 时，剩余路线必须实际尝试。

探测完成时必须能判断：

- 是否找到 PDF；
- URL 是否公开、合法和稳定；
- 响应是否真的是 PDF；
- PDF 是否对应批准的直接作品和材料版本；
- 是否可写入 `paper.pdfUrl`；
- 无 PDF 时是否保留 landing URL 和 metadata-only payload。

## 路线顺序

路线按优先级而不是并行猜测执行：

```text
authoritative_landing
  -> open_access
  -> web_search
```

每条路线记录状态、来源 URL、观察事实和终态理由。子代理可在 stdout 报告这些信息；Host payload 只保留最终 landing/PDF URL。

## 路线一：权威落地页

从 metadata 阶段确认的权威 landing page 开始：

- 出版商或期刊 article page；
- 会议或 proceedings 页面；
- arXiv abstract 页面；
- 学位授予机构记录；
- 作者/项目正式仓储记录；
- 出版社 book/chapter 页面；
- 政府或机构正式 report 页面。

检查：

- 页面是否明确指向同一 identifier、题名、作者和版本；
- 是否有直接 PDF link、download link 或嵌入 PDF；
- PDF 是否无需登录、机构代理或验证码；
- 链接是否为永久/稳定公开地址；
- 下载结果是否真实 PDF。

出版商页面显示“PDF”按钮但要求订阅登录时，不能视为公开 PDF。landing page 本身仍可保留。

## 路线二：开放获取

路线一没有 verified PDF 时，查询适用合法开放来源：

- Unpaywall 或其他合法 OA resolver；
- PubMed Central；
- arXiv；
- DOAJ 期刊页面；
- institutional repository；
- author-accepted manuscript repository；
- conference/open proceedings；
- government/public research repository；
- dataset/project 官方发布页中的论文文件。

使用 DOI、标题、作者、年份和材料版本交叉核对。OA 服务指向的 repository 版本必须与批准的直接作品关系明确。

接受作者接受稿时应确认：

- 它是目标作品的合法公开版本；
- 题名、作者和 identifier 对应；
- 不是演示文稿、补充材料、海报或不同 manuscript；
- 用户批准的 material identity 允许该版本作为附件。

## 路线三：公开网络搜索

前两条路线没有 verified PDF 时执行公开网络搜索。组合：

- 精确题名 + `filetype:pdf`；
- DOI + `pdf`；
- 题名 + 作者 + repository；
- 原文题名和 alternate title；
- 机构、项目、会议或期刊域名限制；
- 地区语言中的“全文”“下载”“论文”等正式术语。

网络搜索结果只是入口。每个候选 URL 仍需完成可达性、文件和身份验证。

以下搜索结果不能直接接受：

- 仅有搜索摘要；
- 登录/订阅页面；
- 临时预览或 session URL；
- 文档分享、论坛或来源不明镜像；
- 盗版站点；
- 只匹配关键词但不是目标作品的 PDF。

## 可达性与文件验证

对候选 PDF URL 进行实际请求或等价的公开访问检查：

- 成功 HTTP 状态；
- 合理重定向；
- `Content-Type` 是 PDF，或文件头包含 `%PDF-`；
- 返回内容不是 HTML 登录页、错误页、验证码或同意页；
- 文件大小合理且不是零字节/截断占位；
- 最终 URL 可供 Host 访问。

若服务阻止 HEAD，可使用有界 GET 或 range 请求。不要因 URL 以 `.pdf` 结尾就判定为 PDF。

## 直接作品身份

PDF 必须与批准作品一致。优先检查：

- DOI、ISBN、PMID、arXiv 或其他强 identifier；
- title page 的完整题名；
- creators；
- venue、year 和 material type；
- 页眉页脚或 repository record；
- 版本声明。

以下情况拒绝：

- 同一作者的另一篇论文；
- 同一主题的综述；
- conference slides、poster、supplement 或 dataset；
- thesis 代替批准的 article，或 article 代替批准的 thesis；
- preprint/accepted manuscript 与批准版本关系无法确认；
- correction、editorial 或 response 代替原论文。

文件标题略有排版差异可以结合 identifier、作者和版本关系判断；不能仅凭文件名决定身份。

## 合法性

允许：

- 出版商明确公开的 PDF；
- 合法 OA 期刊和 repository；
- 作者或机构依法公开的 manuscript；
- 政府、公共机构和开放 proceedings；
- 用户明确提供并有权使用的本地公开文件。

不允许：

- Sci-Hub、LibGen 和其他盗版来源；
- 绕过 paywall、登录、机构代理或验证码；
- 使用用户浏览器 session、cookies 或 Zotero Connector；
- 来源不明的镜像和再上传；
- 违反服务条款的抓取或 token 复用。

无法确认合法性时不附加 PDF，并保留 metadata-only 路径。

## 路线状态

每条路线使用清晰终态：

- `found`：找到并验证合法匹配 PDF；
- `not_found`：路线已实际检查，未找到候选；
- `restricted`：只找到需要登录、订阅或权限的来源；
- `mismatch`：找到文件但不是批准的直接作品；
- `unavailable`：来源或网络不可用；
- `error`：请求或解析失败；
- `skipped_after_verified_pdf`：较早路线已有 verified PDF。

`skipped_after_verified_pdf` 的前提是已保存较早路线的 verified URL 和身份判断。`restricted`、`mismatch`、`unavailable` 和 `error` 不是 found。

一篇论文的最终 PDF 状态：

- `found`：至少一条路线 found；
- `missing`：所有适用路线完成但无 found；
- `failed`：技术错误使必要路线无法完成且无法安全判断；
- `skipped`：论文在 metadata/identity 阶段已成为 `not_attempted`，因此不进入 mutation。

## payload 行为

### 找到 PDF

```json
{
  "landingUrl": "https://doi.org/10.0000/example",
  "pdfUrl": "https://repository.example.org/example.pdf",
  "attachLandingUrlOnMissingPdf": true
}
```

选择最佳 URL：

1. 权威直接 PDF；
2. 稳定合法 OA repository；
3. 经验证的公共网络来源。

### 未找到 PDF

```json
{
  "landingUrl": "https://doi.org/10.0000/example",
  "attachLandingUrlOnMissingPdf": true
}
```

省略 `pdfUrl`。metadata-only payload 仍可提交。`attachLandingUrlOnMissingPdf` 请求 Host 在未取得 PDF 时按其能力保存 landing page；它不代表 PDF 附件成功。

### Metadata 未通过

直接作品身份或最低 metadata 无法确认时不准备 mutation payload。PDF 搜索结果不能反向替代 metadata identity。

## 主代理检查

主代理确认：

1. 三条路线都有终态，或后续路线具有合法 skip 原因；
2. found URL 已完成可达性与文件验证；
3. PDF 对应同一直接作品和材料版本；
4. 来源合法公开；
5. `landingUrl` 与 `pdfUrl` 角色正确；
6. no-PDF 论文仍有有效 metadata-only payload；
7. 最终 `pdfStatus` 由 Host receipt 决定，而非 worker 预测。

如果某条必要路线缺失，主代理补做该路线或重新委派该论文。是否保存 stdout 审计不改变路线必须实际执行的要求。

## 示例与反例

### 正确：OA 路线找到 PDF

权威页面只有付费入口；Unpaywall 指向机构库 accepted manuscript。DOI、题名、作者和版本一致，文件可公开下载。接受 repository PDF，网络搜索路线可标记 `skipped_after_verified_pdf`。

### 正确：三条路线均未找到

权威页面受限，OA 无结果，公开网络搜索只找到引用页面。省略 `pdfUrl`，写 metadata-only payload。

### 拒绝：将 landing page 当作 PDF

URL 返回 HTML article page。它可以作为 `landingUrl`，不能作为 `pdfUrl`。

### 拒绝：无前置 found 却跳过路线

权威页面和 OA 均未找到文件，公开网络搜索必须执行，不能标记 `skipped_after_verified_pdf`。

### 拒绝：身份错误

搜索命中同名作者的相邻论文。即使文件可访问，也必须标记 mismatch。

### 拒绝：受限或非法来源

登录后的 publisher PDF、机构代理 URL、盗版镜像和验证码绕过结果不能写入 payload。
