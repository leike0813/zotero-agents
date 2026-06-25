# Topic Synthesis

## 目的

3ステップの自動化パイプラインを通じてTopic Synthesisを作成し、関連する論文群の体系的な分析と統合を行います。

Synthesis Workbenchのトピック作成フローに対応し、このWorkflowはトピックシードから完全な分析レポートまでのエンドツーエンドの処理を提供します。

## ユースケース

- 研究方向を中心とした包括的なトピック分析を作成する
- 分類体系、主要主張、タイムライン、将来方向を自動的に構築する
- 構造化された統合分析レポートを生成する

## 入力制約

| 制約タイプ | 説明 |
|---------|------|
| 入力ユニット | workflow（アイテムを選択する必要はありません） |
| 実行方法 | ダッシュボードから実行、またはSynthesis Workbenchでトリガー |

## 実行フロー

このWorkflowは、自動的に引き継ぎ合う**3つの順次実行スキル**で構成されています:

```
1. create-topic-synthesis-prepare
   └── トピックシードを受け取る
       └── トピックインテントを作成
       └── 論文ワークセットを構築
       └── 分析コンテキストを準備

2. topic-synthesis-core-enrichment
   └── コアエンリッチメント
       └── Taxonomy（分類体系）を書き込み
       └── タイムラインを構築
       └── Claims（主張）を抽出
       └── 将来方向を分析
       └── レビューアウトラインを生成
       └── ナレッジグラフの補完

3. topic-synthesis-finalize
   └── カバレッジ判定
       └── 外部コンテキストサマリーを生成
       └── キュレーション提案
       └── 最終分析サマリーを生成
```

## 出力

実行完了後、トピック統合結果がSynthesisシステムの永続ストレージに書き込まれ、Synthesis Workbenchのトピックビューとグラフビューに反映されます。

具体的な出力は以下の通りです:

- **トピックメタデータ**: 名前、説明、作成時刻
- **Taxonomy**: 階層的なトピック分類体系
- **タイムラインイベント**: 時系列で整理された重要イベント
- **Claims**: 抽出された主要な主張とそのエビデンス
- **Comparisons**: 多次元の比較分析
- **Future Directions**: 将来の研究方向提案
- **Coverage**: 文献カバレッジ分析
- **Report**: 統合分析レポート

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_overview.webp" alt="Topic Synthesis概要ページ" title="Topic Synthesis概要ページ" loading="lazy" /><figcaption>Topic Synthesis概要ページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_taxonomy.webp" alt="Topic Synthesis Taxonomyページ" title="Topic Synthesis Taxonomyページ" loading="lazy" /><figcaption>Topic Synthesis Taxonomyページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_claims.webp" alt="Topic Synthesis Claimsページ" title="Topic Synthesis Claimsページ" loading="lazy" /><figcaption>Topic Synthesis Claimsページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_compare.webp" alt="Topic Synthesis Compareページ" title="Topic Synthesis Compareページ" loading="lazy" /><figcaption>Topic Synthesis Compareページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_future-directions.webp" alt="Topic Synthesis Future Directionsページ" title="Topic Synthesis Future Directionsページ" loading="lazy" /><figcaption>Topic Synthesis Future Directionsページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_coverage.webp" alt="Topic Synthesis Coverageページ" title="Topic Synthesis Coverageページ" loading="lazy" /><figcaption>Topic Synthesis Coverageページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_report.webp" alt="Topic Synthesis Reportページ" title="Topic Synthesis Reportページ" loading="lazy" /><figcaption>Topic Synthesis Reportページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_references.webp" alt="Topic Synthesis Referencesページ" title="Topic Synthesis Referencesページ" loading="lazy" /><figcaption>Topic Synthesis Referencesページ</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/workflows/topic-synthesis_subgraph.webp" alt="Topic Synthesis論文サブグラフ" title="Topic Synthesis論文サブグラフ" loading="lazy" /><figcaption>Topic Synthesis論文サブグラフ</figcaption></figure>

## パラメータ

| パラメータ | タイプ | 説明 | デフォルト |
|------|------|------|--------|
| `topicSeed` | string | 作成するトピックを記述するトピックシード | — |
| `language` | string | 出力言語 | `auto` |

### languageの説明

- `auto`: 自動検出（通常はプラグインUI言語を使用）
- `zh-CN`: 中国語
- `en-US`: 英語

## 依存関係

- **バックエンド**: ACPバックエンド
- **Synthesisシステム**: Synthesis Workbenchが初期化されている必要がある
- **ライブラリ論文**: ライブラリに十分な数の関連論文アイテムが存在することが推奨される

:::tip 推奨される準備
トピックを作成する前に、以下を実行することを推奨します:
1. すべての関連論文で[Literature Analysis](#doc/workflows%2Fliterature-analysis)を実行済みであること
2. 関連論文で[Tag Regulator](#doc/workflows%2Ftag-regulator)を実行済みであること
3. Synthesis WorkbenchのIndexページで**Advance Matching**（高度な引用マッチングによる重複排除）を実行すること
4. Reviewページのすべての承認アイテムを処理すること（保留中の決定を「Apply」することを忘れずに）

正確な引用グラフ関係は、Topic Synthesisにおける論文重要度計算（PageRank、フロンティアスコアなど）の品質に直接影響し、トピック概要の全体的な品質を向上させます。
:::

## 推定所要時間

| トピックサイズ | 推定時間 |
|---------|---------|
| 小トピック（≤10論文） | 8〜12分 |
| 中トピック（10〜30論文） | 12〜18分 |
| 大トピック（30論文以上） | 18〜25分 |

論文数が多い場合は、更新機能を使用して増分反復することをお勧めします。

## モデル推奨

🔴 **テキスト理解力 + 長コンテキスト**に対応したモデルを推奨。Topic Synthesisは、多数の論文ダイジェスト、引用関係、タグ、概念知識の総合的分析を必要とする計算集約型タスクです。バックエンドがサブエージェント委任に対応している場合、多段階パイプラインをより効率的に実行できます。

## 関連Workflow

- [Synthesis Workbench概要](#doc/synthesis%2Findex) — Synthesis Workbenchの使用ガイド
- [Manuscript Literature Framing](#doc/workflows%2Fmanuscript-literature-framing) — Topic Synthesisの結果に基づいて論文のIntroductionを執筆
