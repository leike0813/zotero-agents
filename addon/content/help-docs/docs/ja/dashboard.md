# ダッシュボード

## 概要

ダッシュボードはZotero Agentsの中央監視・制御パネルである。タスクステータスの表示、Workflowの管理、履歴の閲覧、実行時ログの検査が可能である。

## 開き方

- **ツールバーボタン**: ZoteroツールバーのZotero Agentsアイコンをクリック
- **メニュー**: **ツール → ダッシュボードを開く**
- **Zoteroタブ**: メニューから開くと、独立したZoteroタブとして表示される

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_workbench.webp" alt="Zotero Agentsツールバーダッシュボードボタン" title="Zotero Agentsツールバーダッシュボードボタン" loading="lazy" /><figcaption>Zotero Agentsツールバーダッシュボードボタン</figcaption></figure>

## ページ

### ホーム

ダッシュボードのデフォルトページで、以下を表示する。

- **Workflowリスト**: 利用可能なすべてのWorkflow。実行ボタンと設定ボタンを含む
- **ACPチャットエリア**: ACP対話へのクイックアクセス
- **ACP Skill実行**: ACPバックエンドのスキル実行ステータス
- **Skillフィードバック**: 最近のスキル実行フィードバック評価とコメントを閲覧
- **タスクサマリー**: 現在実行中のタスクの概要

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_home.webp" alt="ダッシュボードホーム" title="ダッシュボードホーム" loading="lazy" /><figcaption>ダッシュボードホーム</figcaption></figure>

### Workflowオプション

Workflowのパラメータ設定ページである。

- 各Workflowの設定を表示・変更
- デフォルトパラメータを設定
- デフォルトバックエンドを選択

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_workflow-settings.webp" alt="ダッシュボードWorkflowオプションページ" title="ダッシュボードWorkflowオプションページ" loading="lazy" /><figcaption>ダッシュボードWorkflowオプションページ</figcaption></figure>

### バックエンド

バックエンド管理ページである。

- すべての設定済みバックエンドのリスト
- 各バックエンドのタスク履歴
- バックエンドの詳細表示（タイプにより異なる）

バックエンドの詳細表示：

| バックエンドタイプ | 表示内容 |
|-------------|---------|
| Generic HTTP | タスクテーブル + 実行時ログ |
| SkillRunner | 実行テーブル + ステータスエリア + 会話エリア + 返信/キャンセルアクション |
| ACP | Skill実行ビュー |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_acp-backend.webp" alt="ダッシュボードACPバックエンドタスクリスト" title="ダッシュボードACPバックエンドタスクリスト" loading="lazy" /><figcaption>ダッシュボードACPバックエンドタスクリスト</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skillrunner-backend.webp" alt="ダッシュボードSkillRunnerバックエンドタスクリスト" title="ダッシュボードSkillRunnerバックエンドタスクリスト" loading="lazy" /><figcaption>ダッシュボードSkillRunnerバックエンドタスクリスト</figcaption></figure>

### 成果物

Workflowの成果物の閲覧と管理を行う。

- Workflow実行からの出力成果物を表示
- 成果物フォルダを開く
- 成果物のプレビューと削除

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_products.webp" alt="ダッシュボード成果物ストレージ" title="ダッシュボード成果物ストレージ" loading="lazy" /><figcaption>ダッシュボード成果物ストレージ</figcaption></figure>

## Skillフィードバック

Skillフィードバックパネルには最近のスキル実行フィードバックが表示される。

| 列 | 説明 |
|--------|-------------|
| Workflow | 実行されたWorkflowの名前 |
| バックエンド | 実行したバックエンド |
| 評価 | ユーザー評価（1〜5） |
| コメント | フィードバックコメント |
| タイムスタンプ | フィードバックが送信された日時 |

アクション：
- **フィルタ**: 評価、Workflow、期間でフィルタ
- **エクスポート**: フィードバックデータを分析用にエクスポート

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skill-feedback.webp" alt="ダッシュボードSkillフィードバックストレージ" title="ダッシュボードSkillフィードバックストレージ" loading="lazy" /><figcaption>ダッシュボードSkillフィードバックストレージ</figcaption></figure>

## タスクステータス

| ステータス | 説明 |
|--------|-------------|
| `queued` | 実行待ち |
| `running` | 実行中 |
| `waiting_user` | ユーザー入力を待っている |
| `waiting_auth` | 認可を待っている |
| `succeeded` | 実行成功 |
| `failed` | 実行失敗 |
| `canceled` | キャンセル済み |

## 実行時ログビューア

ダッシュボードには組み込みのログビューアが含まれる。

- バックエンドによるフィルタ
- Workflowによるフィルタ
- ログレベルによるフィルタ
- 期間によるフィルタ
- 診断情報のエクスポート
- 問題のサマリーをコピー

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_logs.webp" alt="ダッシュボード実行時ログビューア" title="ダッシュボード実行時ログビューア" loading="lazy" /><figcaption>ダッシュボード実行時ログビューア</figcaption></figure>

## ツールバーボタン

ZoteroツールバーのZotero Agentsアイコンボタンは以下をサポートする。

- 左クリック：ダッシュボードを開く/切り替える
- 実行中のタスク数を表示
- 実行中のタスクリストをポップアップで表示
