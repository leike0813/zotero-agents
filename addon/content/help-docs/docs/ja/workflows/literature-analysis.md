# Literature Analysis

## 目的

PDFまたはMarkdownの添付ファイルから文献ダイジェスト、参考文献リスト、引用分析レポートを生成します。

**Literature Analysisはエージェント型文献管理の基盤です** — 取り込んだすべての論文はこのWorkflowを実行すべきです。各論文に構造化された知識基盤を確立し、引用グラフやTopic Synthesisなどのすべての高度な機能はこのWorkflowの出力に依存します。

このWorkflowは、Skill-Runnerバックエンド上で`literature-analysis`スキルを呼び出し、学術論文の構造化分析を実行します。

:::tip ベストプラクティス
- **先にMarkdownを抽出**: Literature Analysisを実行する前に、[MinerU](#doc/workflows%2Fmineru)を使用してPDFをMarkdownに変換することを推奨します。元のMarkdownは、論文構造のAI理解を大幅に向上させます。
- **先にタグ語彙を初期化**: 最初のLiterature Analysisの前に、[Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper)を実行して統制されたタグ語彙を初期化することを推奨します。これにより、分析パイプライン内の自動タグ正規化が最大の効果を発揮します。
:::

## ユースケース

- 新しい論文を読む際に、主要な内容の要約を素早く得る
- 論文の完全な参考文献リストを収集する
- 論文の引用コンテキストと引用意図を分析する

## 入力制約

| 制約タイプ | 説明 |
|---------|------|
| 入力ユニット | 添付ファイル |
| 受付タイプ | `text/markdown`、`text/x-markdown`、`text/plain`、`application/pdf` |
| 親あたり上限 | 最大1つの添付ファイル |

### 実行方法

- PDFまたはMarkdownの添付ファイルを直接選択
- 親アイテムを選択すると、プラグインが自動的に最初の適合添付ファイルを展開

## 実行フロー

```
1. リクエスト構築
   └── ソースファイルをSkill-Runnerにアップロード
       └── skill_id: "literature-analysis"を呼び出し

2. Skill-Runner処理
   └── ドキュメント内容を解析
       └── 3つの出力を生成:
           ├── digest.md          （文献ダイジェスト）
           ├── references.json    （参考文献リスト）
           └── citation_analysis.json （引用分析）

3. 結果返却
   └── バンドル（zip）をダウンロード
       └── result.jsonとartifacts/を含む
```

### 実行モード

完全自動で、ユーザーの操作は不要です。送信して完了を待つだけです。

### 実行設定

- `execution.mode`: `auto` — 自動実行、ユーザーの操作は不要
- `skillrunner_mode`: `auto` — 非インタラクティブモード

## 推定所要時間

| シナリオ | 推定時間 |
|------|---------|
| 標準的な参考文献フォーマット | 6〜10分 |
| 非標準的な参考文献フォーマット | 12〜18分 |

所要時間は主に参考文献フォーマットが標準化されているかに依存します — フォーマットが標準化されているほど（ScienceDirect、IEEEなどの主要ジャーナルからの引用）、AI解析が高速になります。論文の長さは比較的minorな影響しかありません。

## 出力

実行完了後、親アイテムの下に**3つのZoteroノート**が作成されます:

### 1. ダイジェストノート

- タイプ: `data-zs-note-kind="digest"`
- 内容: 研究背景、方法、結果、結論を涵蓋するHTMLレンダリングされた文献ダイジェスト
- 更新戦略: 実行のたびに同じ名前のノートを更新（既存の場合は上書き）

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_digest.webp" alt="Literature Analysisダイジェストノート" title="Literature Analysisダイジェストノート" loading="lazy" /><figcaption>Literature Analysisダイジェストノート</figcaption></figure>

:::info ノート内容について
ノートに表示される内容は、バックエンドデータから**レンダリング**されたものです。Zoteroでノートの内容を直接変更しても、実際のバックエンドデータは**変更されません**。分析結果を編集するには、[Export/Import Notes](#doc/workflows%2Fexport-import-notes)機能を使用して、エクスポート→修正→再インポートを行ってください。
:::

### 2. 参考文献ノート

- タイプ: `data-zs-note-kind="references"`
- 内容: 参考文献HTMLテーブル（番号、年、タイトル、著者、出典、ロケーター）
- 更新戦略: 実行のたびに同じ名前のノートを更新

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_references.webp" alt="Literature Analysis参考文献ノート" title="Literature Analysis参考文献ノート" loading="lazy" /><figcaption>Literature Analysis参考文献ノート</figcaption></figure>

### 3. 引用分析ノート

- タイプ: `data-zs-note-kind="citation-analysis"`
- 内容: 引用コンテキストと引用意図分類を含む引用分析レポート
- 更新戦略: 実行のたびに同じ名前のノートを更新

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/literature-analysis_citation-analysis.webp" alt="Literature Analysis引用分析ノート" title="Literature Analysis引用分析ノート" loading="lazy" /><figcaption>Literature Analysis引用分析ノート</figcaption></figure>

## パラメータ

| パラメータ | タイプ | 説明 | デフォルト |
|------|------|------|--------|
| `language` | string | 出力言語 | `zh-CN` |
| `auto_tag_regulator` | boolean | 文献分析後に[Tag Regulator](#doc/workflows%2Ftag-regulator)を自動的にカスケードするかどうか。**有効化を推奨** | `true` |
| `auto_tag_infer_tag` | boolean | タグ正規化をカスケードする際、AIに新しいタグの推論を許可するかどうか（`auto_tag_regulator`が有効な場合のみ表示） | `true` |

`language`の利用可能な値: `zh-CN`、`en-US`、`ja-JP`、`ko-KR`、`de-DE`、`fr-FR`、`es-ES`、`ru-RU`。カスタム入力も対応。

## モデル推奨

🔴 **テキスト理解力の高い**モデルを推奨。バックエンドがサブエージェント委任（Claude Code、Codexなど）に対応している場合、ダイジェスト、参考文献リスト、引用分析を並列処理でき、総所要時間を大幅に短縮できます。

## 依存関係

- **バックエンド**: Skill-Runnerサービス
- **バックエンド設定**: バックエンドマネージャーでSkill-Runnerタイプのバックエンドを設定
- **スキル**: `literature-analysis`スキルがSkill-Runner上にデプロイされている必要がある

## 関連Workflow

- [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper) — 最初の分析前に統制されたタグ語彙を初期化
- [MinerU](#doc/workflows%2Fmineru) — PDFを先にMarkdownに変換して最高の分析品質を得る
- [Interactive Literature Explainer](#doc/workflows%2Fliterature-explainer) — AIとの対話による文献の深い理解
- [Export/Import Notes](#doc/workflows%2Fexport-import-notes) — 分析成果物をエクスポートして編集、またはZoteroインスタンス間で移行
- [Tag Regulator](#doc/workflows%2Ftag-regulator) — タグ正規化を独立して実行（Literature Analysisから自動的にカスケード可能）
