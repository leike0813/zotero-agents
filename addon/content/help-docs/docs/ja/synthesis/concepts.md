# 概念知識ベース

概念知識ベース（Concept KB）は、Synthesis システムのオプションの知識レイヤーであり、文献で参照されるコア概念の構造化された管理を提供する。概念はトピックグラフやリーダーにオーバーレイでき、トピック統合のコンテキストを充実させる。

## 概念とは

Synthesis システムにおいて、**概念**とは研究ドメイン内で独立した意味を持つ用語または実体である。タグの平面的な分類とは異なり、概念は意味、別名、関係を含む多層的な構造を持つことができる。

### 概念の 4 層構造

```
Concept                 — 例："Transformer"
  └── Sense             — 例："Transformer（機械学習アーキテクチャ）"
       ├── Alias        — 例："Transformer model"、"Transformer network"
       └── Relation     — broader_than "Attention Mechanism"
```

### 概念タイプ

| タイプ | 説明 | 例 |
|--------|------|-----|
| `method` | 研究方法 | Deep learning、reinforcement learning |
| `model` | モデルまたはアーキテクチャ | Transformer、ResNet |
| `dataset` | データセット | ImageNet、COCO |
| `metric` | 評価指標 | BLEU、F1-score |
| `field` | 研究分野 | Computer vision、natural language processing |
| `task` | タスク | Image classification、machine translation |
| `tool` | ツール | PyTorch、TensorFlow |

## Concepts サーフェスの機能

### 概念リスト

Synthesis Workbench → Concepts ページでは、インデックスされたすべての概念を閲覧できる。

- **フィルタ**: タイプ（method/model/dataset など）、ステータス、関連トピックでフィルタリング
- **検索**: 名前で概念を検索
- **表示切替**: コンパクト/ゆとりのある密度

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/concepts.webp" alt="Synthesis Concepts ページ" title="Synthesis Concepts ページ" loading="lazy" /><figcaption>Synthesis Concepts ページ</figcaption></figure>

### 概念の詳細

概念を選択すると、以下の情報を表示・編集できる。

| 情報 | 説明 |
|------|------|
| **ID** | 概念 ID、名前、タイプ |
| **ステータス** | active / deprecated / pending |
| **定義** | 概念の説明的定義 |
| **意味** | 異なるコンテキストにおける概念の特定の意義 |
| **別名** | 同じ概念の代替名 |
| **関係** | 他の概念との関連付け（broader / narrower / related） |
| **関連トピック** | この概念を参照しているトピック |

### 意味の管理

同じ概念でも、学問分野によって異なる意味を持つ場合がある。意味（sense）メカニズムにより以下のことが可能になる。

- 概念に複数の意味を追加し、それぞれに独自の定義を付ける
- 各意味の使用コンテキストやドメインを注釈する
- 特定の意義を論文やトピックに関連付ける

### 別名管理

- 同じ概念に対する異なる命名規則を記録する（例：正式名称、略称、代替用語）
- 別名は引用マッチングと概念識別に使用される

### オーバーレイ機能

概念情報は他のサーフェスにオーバーレイできる。

- **トピックグラフへのオーバーレイ**: トピックグラフ内でトピックに関連する概念を表示
- **リーダーへのオーバーレイ**: トピック詳細ページで概念カードを表示

## レビュー

概念知識ベースへの変更提案（新概念、新意義、新関係）は、[レビューハブ](#doc/synthesis%2Freview)の概念レビュータブに表示される。これらの提案をレビューし、承認するかどうかを決定できる。

## タグとの関係

概念とタグは知識組織化のための 2 つの相補的なアプローチである。

| 観点 | タグ | 概念 |
|------|------|------|
| 構造 | 平面的、facet:value | 多層的（意味 + 別名 + 関係） |
| 目的 | 文献の分類とフィルタリング | 知識管理と関連分析 |
| 出処 | 統制語彙 + AI 推論 | 文献から自動抽出 + ユーザー管理 |
| 範囲 | 全文献をカバー | 選択されたコア用語を深くカバー |

## 次のステップ

- [レビューハブ](#doc/synthesis%2Freview) — 概念提案をレビュー
- [タグ管理](#doc/synthesis%2Ftags) — 統制タグ語彙を管理
- [トピック統合](#doc/synthesis%2Ftopic-synthesis) — 概念知識を活用してトピック統合を作成
