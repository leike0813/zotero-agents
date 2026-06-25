# Workflow概要

## Workflowとは

WorkflowはZotero Agentsの中核機能であり、複数のスキルステップを自動化された処理パイプラインに組み合わせることができます。Workflowは完全なタスクを定義します。入力の受信、データの処理、そして出力の生成までを涵盖します。

## Workflowの構造

```
workflow.json (マニフェストファイル)
├── manifest: メタデータ、バージョン、名前を宣言
├── parameters: 設定可能なパラメータを定義
├── inputs: 入力タイプを定義（添付ファイル、アイテム、ノートなど）
├── hooks: JavaScriptフックスクリプト（入力のフィルタリング、リクエストの構築、結果の適用）
└── provider: 必要なバックエンドタイプを指定
```

### 入力ユニットタイプ

| タイプ | 説明 |
|------|------|
| `attachment` | アイテムの添付ファイル |
| `parent` | 選択されたアイテムの親アイテム |
| `note` | ノートアイテム |
| `workflow` | バッチスコープ |

### フックシステム

Workflowは実行のさまざまな段階でカスタムJavaScriptスクリプトを実行できます。

- **filterInputs**: 入力のフィルタリングと選択
- **buildRequest**: バックエンドに送信するリクエストコンテンツを構築
- **normalizeSettings**: ユーザー設定を正規化
- **applyResult**: バックエンドから返された結果をZoteroに適用

## 3つの実行バックエンド

Workflowは3つのバックエンドタイプを通じて実行できます。

| バックエンド | リクエストタイプ | 用途 |
|---------|-------------|---------|
| **Skill-Runner** | `skill.run.v1` | 一般的なスキル実行、インタラクティブモードに対応 |
| **ACP** | `acp.skill.run.v1` | ACPバックエンド経由のスキル実行 |
| **Generic HTTP** | `generic-http.request.v1` | HTTP API呼び出し |

## 公式Workflowパッケージ

公式Workflowは**スタンドアロンパッケージ**として公開・インストールされ、プラグイン本体とは切り離されています。インストール方法:

- 右クリックメニュー → **Zotero Agents** → **📦 Install Official Workflow Package**
- 環境設定で**Install Official Workflow Package**をクリック

公式パッケージは3つのアップデートチャネルに対応しています: stable / beta / dev。プラグインは起動時に自動的にアップデートをチェックします。

## 公式Workflow

プラグインには機能別にグループ化された一連の公式Workflowが含まれています:

### 📚 文献分析ツールキット

| Workflow | 目的 | 入力 | バックエンド | ドキュメント |
|---------|------|------|------|------|
| **Literature Analysis** ⭐ | PDF/MDからダイジェスト、参考文献リスト、引用分析を生成。タグ正規化へカスケード可能 | 添付ファイル | Skill-Runner | [詳細](#doc/workflows%2Fliterature-analysis) |
| **Interactive Literature Explainer** | AIとのマルチターン対話による文献の深い理解、検証済み回答で幻覚を防止 | 添付ファイル | Skill-Runner | [詳細](#doc/workflows%2Fliterature-explainer) |
| **Deep Reading** | 翻訳サポート付きの構造化された深読HTMLビューを生成 | 添付ファイル | ACP | [詳細](#doc/workflows%2Fliterature-deep-reading) |
| **Literature Search & Ingest** | エージェントに学術文献を検索させ、Zoteroに直接取り込む | workflow | ACP | [詳細](#doc/workflows%2Fliterature-search-ingest) |
| **Tag Bootstrapper** | 研究ドメインの統制されたタグ語彙を対話的に作成 | workflow | Skill-Runner | [詳細](#doc/workflows%2Ftag-bootstrapper) |
| **Tag Regulator** | 統制語彙に基づいてタグを正規化し、新しいタグを推論 | 親アイテム | Skill-Runner | [詳細](#doc/workflows%2Ftag-regulator) |
| **Export/Import Notes** | 分析ノートのエクスポート・インポート、編集と再インポートに対応 | 親アイテム | バックエンド不要 | [詳細](#doc/workflows%2Fexport-import-notes) |

### 🛠️ ユーティリティ

| Workflow | 目的 | 入力 | バックエンド | ドキュメント |
|---------|------|------|------|------|
| **MinerU PDF Parsing** | MinerUサービスを呼び出してPDFをMarkdownに解析 | 添付ファイル | Generic HTTP | [詳細](#doc/workflows%2Fmineru) |
| **Topic Synthesis** | トピック統合分析とレポートを作成する3ステップのパイプライン | workflow | ACP | [詳細](#doc/workflows%2Ftopic-synthesis) |
| **Manuscript Literature Framing** | Introduction / Related WorkのLaTeXドラフトを生成 | workflow | ACP | [詳細](#doc/workflows%2Fmanuscript-literature-framing) |

### 🔧 デバッグツール

| Workflow | 目的 | バックエンド | ドキュメント |
|---------|------|------|------|
| **Debug Probe** | Workflowシステムの開発テストと診断 | Skill-Runner | [詳細](#doc/workflows%2Fdebug-probe) |

## 次のステップ

- [Workflowの実行と設定](#doc/workflows%2Finvocation)
- [バックエンドの設定](#doc/backends%2Findex) — バックエンド設定の詳細手順
