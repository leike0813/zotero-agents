# 개념 지식 베이스

개념 지식 베이스(Concept KB)는 Synthesis 시스템의 선택적 지식 계층으로, 문헌에서 참조되는 핵심 개념의 구조화된 관리를 제공합니다. 개념은 토픽 그래프와 리더에 오버레이되어 토픽 통합의 컨텍스트를 풍부하게 할 수 있습니다.

## 개념이란?

Synthesis 시스템에서 **개념**은 연구 도메인 내에서 독립적인 의미를 갖는 용어나 엔티티입니다. 태그의 평면적 분류와 달리, 개념은 의미, 별칭 및 관계를 포함한 다계층 구조를 가질 수 있습니다.

### 개념의 4계층 구조

```
Concept                 — 예: "Transformer"
  └── Sense             — 예: "Transformer (머신러닝 아키텍처)"
       ├── Alias        — 예: "Transformer 모델", "Transformer 네트워크"
       └── Relation     — broader_than "Attention 메커니즘"
```

### 개념 유형

| 유형 | 설명 | 예시 |
|------|-------------|----------|
| `method` | 연구 방법 | 딥러닝, 강화학습 |
| `model` | 모델 또는 아키텍처 | Transformer, ResNet |
| `dataset` | 데이터셋 | ImageNet, COCO |
| `metric` | 평가 지표 | BLEU, F1-score |
| `field` | 연구 분야 | 컴퓨터 비전, 자연어 처리 |
| `task` | 작업 | 이미지 분류, 기계 번역 |
| `tool` | 도구 | PyTorch, TensorFlow |

## 개념 서피스 기능

### 개념 리스트

Synthesis Workbench → Concepts 페이지에서 인덱싱된 모든 개념을 탐색할 수 있습니다:

- **필터**: 유형(method / model / dataset 등), 상태 또는 관련 토픽별
- **검색**: 이름으로 개념 검색
- **뷰 토글**: Compact / Comfortable 밀도

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/concepts.webp" alt="Synthesis Concepts Page" title="Synthesis Concepts Page" loading="lazy" /><figcaption>Synthesis Concepts Page</figcaption></figure>

### 개념 상세 정보

개념을 선택하면 다음을 보고 편집할 수 있습니다:

| 정보 | 설명 |
|-------------|-------------|
| **식별자** | 개념 ID, 이름, 유형 |
| **상태** | active / deprecated / pending |
| **정의** | 개념에 대한 설명적 정의 |
| **의미(Senses)** | 다른 컨텍스트에서의 개념의 특정 의미 |
| **별칭(Aliases)** | 동일한 개념에 대한 대체 이름 |
| **관계(Relations)** | 다른 개념과의 연관(broader / narrower / related) |
| **관련 토픽** | 이 개념을 참조하는 토픽 |

### 의미 관리

동일한 개념이 학문 분야에 따라 다른 의미를 가질 수 있습니다. 의미 메커니즘을 통해 다음이 가능합니다:

- 하나의 개념에 여러 의미를 추가하고, 각각에 고유한 정의 부여
- 각 의미의 사용 컨텍스트나 도메인을 주석으로 표시
- 특정 의미를 논문이나 토픽과 연관

### 별칭 관리

- 동일한 개념에 대한 다양한 명명 규칙 기록 (예: 전체 이름, 약어, 대체 용어)
- 별칭은 인용 매칭 및 개념 식별에 사용됨

### 오버레이 기능

개념 정보는 다른 서피스에 오버레이될 수 있습니다:

- **토픽 그래프에 오버레이**: 토픽 그래프에서 토픽과 관련된 개념 표시
- **리더에 오버레이**: 토픽 상세 페이지에서 개념 카드 표시

## 리뷰

개념 지식 베이스에 대한 변경 제안(새 개념, 새 의미, 새 관계)은 [리뷰 허브](#doc/synthesis%2Freview)의 개념 리뷰 탭에 나타납니다. 이러한 제안을 검토하고 수락 여부를 결정할 수 있습니다.

## 태그와의 관계

개념과 태그는 지식 조직을 위한 두 가지 상호 보완적인 접근 방식입니다:

| 차원 | 태그 | 개념 |
|-----------|------|----------|
| 구조 | 평면적, facet:value | 다계층 (의미 + 별칭 + 관계) |
| 목적 | 문헌 분류 및 필터링 | 지식 관리 및 연관 분석 |
| 출처 | 제어된 어휘 + AI 추론 | 문헌에서 자동 추출 + 사용자 관리 |
| 범위 | 모든 문헌을 포괄 | 선택된 핵심 용어의 심층적 포괄 |

## 다음 단계

- [리뷰 허브](#doc/synthesis%2Freview) — 개념 제안 리뷰
- [태그 관리](#doc/synthesis%2Ftags) — 제어된 태그 어휘 관리
- [토픽 통합](#doc/synthesis%2Ftopic-synthesis) — 토픽 통합 생성 시 개념 지식 활용
