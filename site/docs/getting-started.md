# Getting Started

## 1. Install Official Workflow Packages

The plugin itself contains no business logic. After installing the plugin, you first need to install the official workflow packages:

1. Right-click any Zotero item → **Zotero Agents** → **📦 Install Official Workflow Packages**
2. Wait for the download and installation to complete
3. After successful installation, all official workflows will be visible in the Dashboard

You can also install or update the official packages at any time from **Zotero → Settings → Zotero Agents**.

## 2. Configure a Backend

### ACP Backend (Recommended)

This is the most recommended approach — as long as you have any ACP-compatible agent tool installed on your machine, it requires zero additional configuration.

1. Open **Tools → [Backend Manager](backends/backend-manager)**
2. Switch to the **ACP** tab
3. Select your agent tool from the **Add from Preset** dropdown (Codex / OpenCode / Claude Code, etc.)
4. The preset auto-fills the command; click **Save** in the bottom-right corner

**First time using an agent tool?** Refer to the official documentation of the respective tool for installation:

| Agent | Installation Guide |
|-------|-------------------|
| **OpenCode** | [opencode.ai docs](https://opencode.ai/docs) |
| **Codex** | [OpenAI Codex docs](https://platform.openai.com/docs) |
| **Claude Code** | [Anthropic docs](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Google docs](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [Alibaba Cloud docs](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ See [ACP Backend Configuration](backends/acp) for details

### MinerU Backend (for PDF Parsing)

The MinerU workflow can convert PDFs to Markdown, making it the ideal preprocessing step for all subsequent literature analysis. Configuration is straightforward:

1. Visit [mineru.net](https://mineru.net) to register an account, and obtain an API Token from **API → API Management**
2. Open **Tools → [Backend Manager](backends/backend-manager)**
3. Switch to the **Generic HTTP** tab, click **Add Generic HTTP Profile from Preset**, and choose `MinerU Official`
4. Replace the token placeholder with your API Token and keep Timeout `600000`
5. Click **Save** in the bottom-right corner

→ See [MinerU Usage Guide](workflows/mineru) for details

### Alternative: Docker-deployed Skill-Runner

If you need persistent background execution or LAN sharing, you can [deploy Skill-Runner with Docker](backends/skill-runner#recommended-docker-persistent-deployment). After deployment, add a backend instance in the SkillRunner tab.

> For detailed operation instructions, see [Backend Manager](backends/backend-manager).

## 3. Complete Workflow

Below is a complete end-to-end workflow. It is recommended to try each step in order. First, select a paper with a PDF attachment from your library.

### Step 1: PDF → Markdown (MinerU)

Right-click this paper (or directly right-click its PDF attachment), and select **Zotero Agents → MinerU**. After a short wait, a `.md` file of the paper content will be generated in the same directory as the PDF.

### Step 2: Try the Built-in Markdown Reader

Find the newly generated `.md` file in the Zotero attachment list and **double-click to open it in the built-in reader** — featuring outline navigation, search, math formula rendering, and code syntax highlighting. If you prefer not to use the built-in reader, you can disable it in Preferences and revert to the system default opener.

→ See [Built-in Markdown Reader](markdown-reader) for details

### Step 3: Run Literature Analysis

Right-click this paper (or directly right-click the `.md` attachment), and select **Zotero Agents → Literature Analysis**. The agent will automatically generate three artifacts; upon completion, three note attachments will appear under the item:

| Note | Content |
|------|---------|
| **Digest** | Paper digest — research background, methods, results, and conclusions |
| **References** | Structured references — a tabular citation list |
| **Citation Analysis** | Citation analysis report — citation context and citation intent classification |

→ See [Literature Analysis](workflows/literature-analysis) for details

### Step 4: Interactive Literature Explainer

If you have any questions about this paper, right-click and select **Zotero Agents → Literature Explainer**. The sidebar will automatically open the chat panel, where you can freely converse with the agent about the paper's content. The agent's answers go through a verification gateway, so you don't need to worry about fabrication. After the conversation, the Q&A record will be generated as study notes.

→ See [Literature Explainer](workflows/literature-explainer) for details

### Step 5: Deep Reading

When you need to thoroughly and systematically read an important paper, right-click and select **Zotero Agents → Deep Reading**. The agent will produce a polished standalone HTML document — including section analysis, key concepts, references, and bilingual translations. Enriched with your library information (if available), this document will also carry the broader research context, related concepts, and key questions.

→ See [Deep Reading](workflows/literature-deep-reading) for details

### Step 6: Topic Synthesis — From Individual Papers to the Big Picture

Once your library has reached a certain size and the relevant papers have all undergone literature analysis and tag normalization, you can create a Topic Synthesis.

Run **Create Topic Synthesis** from the Dashboard, enter a description of your research direction, and the agent will automatically identify relevant papers in your library and generate an extremely rigorous, accurate, and comprehensive synthesis report. This report is written entirely based on your library content, far more precise and reliable than generic AI responses.

→ See [Topic Synthesis](workflows/topic-synthesis) for details

## Next Steps

- **Batch Processing**: Run [Literature Analysis](workflows/literature-analysis) on papers in your library in bulk to build the foundation for Synthesis
- **Tag System**: Use [Tag Bootstrapper](workflows/tag-bootstrapper) to create a controlled vocabulary and standardize your metadata
- **Graph Exploration**: Visualize your citation network in the [Synthesis Workbench](synthesis)
- **Custom Development**: Refer to [Custom Workflows](workflows/custom/) to create your own workflows
- **Report Issues**: Report problems on [GitHub](https://github.com/leike0813/zotero-agents/issues) or [Gitee](https://gitee.com/leike0813/zotero-agents/issues)
