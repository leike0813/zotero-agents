# Manuscript Literature Framing

## 目的

学術論文のIntroductionおよびRelated Workセクションの執筆を支援します。対話型のダイアログを通じて、論文のポジショニングを明確にし、関連文献を収集し、執筆フレームワークを分析し、LaTeXドラフトを生成します。

## ユースケース

- 論文を起草中で、文献フレームワークを整理する必要がある
- 論文のポジショニングとイノベーションを特定する
- IntroductionおよびRelated WorkセクションのLaTeXドラフトを生成する

## 入力制約

| 制約タイプ | 説明 |
|---------|------|
| 入力ユニット | workflow（アイテムを選択する必要はありません） |
| 実行方法 | ダッシュボードから直接実行 |

## 実行フロー

このWorkflowは対話型で実行され、以下の段階を経て進行します:

```
1. 論文情報の確認
   └── 論文タイトルと研究範囲を確認
       └── 対象ジャーナル/ベニューと執筆スタイルを明確化

2. 資料収集
   └── Zoteroライブラリから関連文献を検索
       └── 文献メタデータと引用情報を取得

3. 多角的フレームワーク分析
   └── フィールド内の論文のポジショニングを分析
       └── 利用可能な執筆角度とナラティブスレッドを特定

4. 執筆計画
   └── Introduction構造プランを生成
       └── Related Work組織化プランを生成

5. ドラフト生成
   └── Introduction LaTeXドラフトを出力
       └── Related Work LaTeXドラフトを出力
       └── 引用マッピングとエビデンスインベントリを含む
```

### 操作の詳細

- 各段階でユーザーの確認が必要で、確認後に進行します
- ユーザーは対話中に方向を調整できます
- 進捗はダッシュボードで監視できます

## 推定所要時間

対話のターン数と文献ライブラリのサイズに依存します。AI分析段階に約5〜10分かかり、それに各段階のユーザー確認時間が加わります。

## 出力

実行完了後、成果物はApply Resultフックを介してZoteroに（ノートとして）書き込むか、ダウンロードできます:

| 成果物 | フォーマット | 説明 |
|------|------|------|
| `introduction.tex` | LaTeX | Introductionドラフト |
| `related-work.tex` | LaTeX | Related Workドラフト |
| `framing-analysis.json` | JSON | 多角的フレームワーク分析 |
| `writing-plan.json` | JSON | 執筆計画 |
| `evidence-inventory.json` | JSON | エビデンス/引用インベントリ |
| `citation-map.json` | JSON | 引用マッピング関係 |
| `intent-brief.json` | JSON | 論文ポジショニングサマリー |

:::tip 成果物へのアクセス
生成されたLaTeXドラフトおよびその他の成果物は、**ダッシュボードの成果物エリア**で確認できます。成果物をLaTeX原稿に直接配置したり、エクスポートしてさらに処理できます。
:::

## パラメータ

| パラメータ | タイプ | 説明 | デフォルト |
|------|------|------|--------|
| `paperTitle` | string | 論文タイトル | — |
| `language` | string | 出力言語 | `auto` |
| `targetVenue` | string | 対象ジャーナル/ベニュー（任意） | 空 |
| `articleType` | string | 論文タイプ | `original research` |
| `stylePreference` | string | 執筆スタイルの好み（任意） | 空 |

### 執筆スタイルの例

- `concise`: 簡潔なスタイル
- `IEEE-like`: IEEEスタイル
- `Nature-like`: Natureスタイル
- `Chinese draft`: 中国語ドラフト

## 依存関係

- **バックエンド**: ACPバックエンド
- **Zoteroライブラリ**: ライブラリに関連論文アイテムが必要

:::tip 推奨されるWorkflow
最良の結果を得るために、このWorkflowを実行する前に以下の準備を完了することを推奨します:
1. 十分な数の関連論文を収集・取り込む
2. すべての論文で[Literature Analysis](#doc/workflows%2Fliterature-analysis) + [Tag Regulator](#doc/workflows%2Ftag-regulator)を実行
3. Synthesis WorkbenchでAdvance Matchingを実行し、承認アイテムを処理
4. 関連する[Topic Synthesis](#doc/workflows%2Ftopic-synthesis)をいくつか作成
:::

## モデル推奨

🟡 **長コンテキスト**に対応したモデルを推奨。IntroductionとRelated Workの執筆には、多数の論文のダイジェスト、引用分析、Topic Synthesis結果を統合する必要があり、コンテキストウィンドウに高い要求を課します。

## 関連Workflow

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — 論文の構造化された知識基盤を確立
- [Topic Synthesis](#doc/workflows%2Ftopic-synthesis) — トピック統合を先に作成し、分析結果に基づいて論文を執筆
