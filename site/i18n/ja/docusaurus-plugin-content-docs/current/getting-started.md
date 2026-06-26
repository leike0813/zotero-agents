# はじめに

## 1. 公式Workflowパッケージのインストール

プラグイン自体にはビジネスロジックが含まれていない。プラグインのインストール後、まず公式Workflowパッケージをインストールする必要がある。

1. 任意のZoteroアイテムを右クリック → **Zotero Agents** → **📦 公式Workflowパッケージをインストール**
2. ダウンロードとインストールが完了するまで待機
3. インストールが成功すると、ダッシュボードですべての公式Workflowが参照可能になる

**Zotero → 設定 → Zotero Agents**から、いつでも公式パッケージのインストールや更新が可能である。

## 2. バックエンドの設定

### ACPバックエンド（推奨）

最も推奨される方法である。マシンにACP対応のエージェントツールがインストールされていれば、追加の設定はゼロで済む。

1. **ツール → [バックエンドマネージャー](backends/backend-manager)**を開く
2. **ACP**タブに切り替える
3. **プリセットから追加**ドロップダウンからエージェントツールを選択（Codex / OpenCode / Claude Codeなど）
4. プリセットがコマンドを自動入力する。右下の**保存**をクリックする

**エージェントツールを初めて使う場合**は、各ツールの公式ドキュメントを参照してインストールされたい。

| エージェント | インストールガイド |
|-------|-------------------|
| **OpenCode** | [opencode.ai docs](https://opencode.ai/docs) |
| **Codex** | [OpenAI Codex docs](https://platform.openai.com/docs) |
| **Claude Code** | [Anthropic docs](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Google docs](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [Alibaba Cloud docs](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ 詳細は[ACPバックエンド設定](backends/acp)を参照

### MinerUバックエンド（PDF解析用）

MinerU WorkflowはPDFをMarkdownに変換でき、後続のすべての文献分析の理想的な前処理ステップとなる。設定は簡単である。

1. [mineru.net](https://mineru.net)にアクセスしてアカウントを登録し、**API → API管理**からAPIトークンを取得
2. **ツール → [バックエンドマネージャー](backends/backend-manager)**を開く
3. **Generic HTTP**タブに切り替え、**Generic HTTPを追加**をクリック
4. 以下を入力：表示名 `MinerU Official` · Base URL `https://mineru.net` · 認証 `bearer` · 認証トークン：APIトークンを貼り付け · タイムアウト `600000`
5. 右下の**保存**をクリック

→ 詳細は[MinerU使用ガイド](workflows/mineru)を参照

### 代替案：DockerデプロイのSkill-Runner

永続的なバックグラウンド実行やLAN内共有が必要な場合は、[DockerでSkill-Runnerをデプロイ](backends/skill-runner#recommended-docker-persistent-deployment)できる。デプロイ後、SkillRunnerタブでバックエンドインスタンスを追加する。

> 詳細な操作手順は[バックエンドマネージャー](backends/backend-manager)を参照。

## 3. 完全なWorkflow

以下に完全なエンドツーエンドのWorkflowを示す。各ステップを順番に試すことを推奨する。まず、ライブラリからPDF添付ファイル付きの論文を1つ選択する。

### ステップ1：PDF → Markdown（MinerU）

この論文を右クリック（またはPDF添付ファイルを直接右クリック）し、**Zotero Agents → MinerU**を選択する。少し待機すると、論文内容の`.md`ファイルがPDFと同じディレクトリに生成される。

### ステップ2：組み込みMarkdownリーダーを試す

Zoteroの添付ファイルリストで新しく生成された`.md`ファイルを見つけ、**ダブルクリックして組み込みリーダーで開く**。アウトラインナビゲーション、検索、数式レンダリング、コード構文ハイライト機能を備えている。組み込みリーダーを使用したくない場合は、環境設定で無効にしてシステムのデフォルトオープナーに戻せる。

→ 詳細は[組み込みMarkdownリーダー](markdown-reader)を参照

### ステップ3：文献分析を実行

この論文を右クリック（または`.md`添付ファイルを直接右クリック）し、**Zotero Agents → Literature Analysis**を選択する。エージェントが自動的に3つの成果物を生成する。完了すると、アイテムの下に3つのノート添付ファイルが出現する。

| ノート | 内容 |
|------|---------|
| **Digest** | 論文のダイジェスト — 研究背景、方法、結果、結論 |
| **References** | 構造化された参考文献 — 表形式の引用リスト |
| **Citation Analysis** | 引用分析レポート — 引用の文脈と引用意図の分類 |

→ 詳細は[Literature Analysis](workflows/literature-analysis)を参照

### ステップ4：対話型文献解説

この論文について質問がある場合は、右クリックして**Zotero Agents → Literature Explainer**を選択する。サイドバーが自動的にチャットパネルを開き、論文の内容についてエージェントと自由に会話できる。エージェントの回答は検証ゲートウェイを経由するため、虚構を心配する必要はない。会話後、Q&A記録が学習ノートとして生成される。

→ 詳細は[Literature Explainer](workflows/literature-explainer)を参照

### ステップ5：深読

重要な論文を徹底的に体系的に読む必要がある場合は、右クリックして**Zotero Agents → Deep Reading**を選択する。エージェントが洗練されたスタンドアロンのHTMLドキュメントを生成する。セクション分析、重要概念、参考文献、日英翻訳を含む。ライブラリ情報で充実させられ（利用可能な場合）、このドキュメントはより広範な研究コンテキスト、関連概念、重要な質問も運ぶ。

→ 詳細は[Deep Reading](workflows/literature-deep-reading)を参照

### ステップ6：トピック統合 — 個別の論文から全体像へ

ライブラリが一定の規模に達し、関連する論文にすべて文献分析とタグ正規化を適用した後、トピック統合を作成できる。

ダッシュボードから**トピック統合を作成**を実行し、研究方向の説明を入力すると、エージェントが自動的にライブラリ内の関連論文を特定し、極めて厳密で正確かつ包括的な統合レポートを生成する。このレポートは完全にライブラリの内容に基づいて記述され、汎用的なAI応答よりもはるかに精密で信頼性が高い。

→ 詳細は[Topic Synthesis](workflows/topic-synthesis)を参照

## 次のステップ

- **バッチ処理**: ライブラリの論文に対して[Literature Analysis](workflows/literature-analysis)を一括実行し、統合の基盤を構築
- **タグシステム**: [Tag Bootstrapper](workflows/tag-bootstrapper)を使用して制御語彙を作成し、メタデータを標準化
- **グラフ探索**: [Synthesis Workbench](synthesis)で引用ネットワークを可視化
- **カスタム開発**: [Custom Workflows](workflows/custom/)を参照して独自のWorkflowを作成
- **問題報告**: [GitHub](https://github.com/leike0813/zotero-agents/issues)または[Gitee](https://gitee.com/leike0813/zotero-agents/issues)で問題を報告
