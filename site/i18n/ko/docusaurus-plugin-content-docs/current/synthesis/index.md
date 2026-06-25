# Synthesis Workbench 개요

Synthesis Workbench는 Zotero Agents에서 제공하는 심층 문헌 분석 플랫폼입니다. 라이브러리를 구조화된 지식 네트워크로 변환하여 토픽 통합, 인용 분석, 개념 관리 및 제어된 어휘 관리를 지원합니다.

![Synthesis Workbench Home](/img/docs/synthesis/home.png)

## 열기 방법

1. **툴바 버튼** 또는 **메뉴**를 통해 Dashboard / Synthesis Workspace를 엽니다
2. Workspace Tab에서 **Synthesis** 뷰로 전환합니다

## 모든 서피스 (페이지)

Synthesis Workbench는 8개의 서피스로 구성되며, 각 서피스는 서로 다른 기능 뷰를 제공합니다:

| 서피스 | 기능 | 문서 |
|---------|----------|------|
| **Home** | 라이브러리 개요 대시보드: 라이브러리 인사이트 (등록된 논문 수 / 토픽 수 / 그래프 노드), Git 동기화 상태 패널, 인기 토픽 카드 리스트 | [상세](home) |
| **Topics** | 토픽 리스트 및 관리: 3가지 뷰 모드 (그래프 / 그리드 / 리스트), 토픽 생성 및 업데이트, 토픽 검색 및 정렬 | [상세](topic-synthesis) |
| **Index** | 표준 참고문헌 인덱스: 논문 등록 뷰 (논문 리스트 + 인용 행 + 바인딩 상태), 표준 참고문헌 뷰 (검색 / 병합 / 리다이렉트 / 중복 제거) | [상세](index-and-citation) |
| **Review** | 리뷰 허브: 3개의 서브 탭 — 인용 매치 리뷰 (바인딩 제안 수락/거절), 개념 리뷰, 토픽 그래프 관계 리뷰 | [상세](review) |
| **Graph** | 인용 그래프 시각화 (force-directed / radial / component — 3가지 레이아웃), 토픽 필터링 및 노드/엣지 인터랙션 지원 | [상세](index-and-citation) |
| **Tags** | 제어된 태그 어휘 관리 + 자동 태그 제안 승인 | [상세](tags) |
| **Concepts** | 개념 지식 베이스 관리: 개념 / 의미 / 별칭 / 관계의 4계층 구조, 토픽 그래프와 리더에 오버레이 가능 | [상세](concepts) |
| **Reader** | 토픽 리더: 8개의 서브 페이지(Overview, Taxonomy, Claims, Compare, Future Directions, Coverage, References, Report)를 갖춘 전체 토픽 상세 페이지 | [상세](topic-synthesis) |

## 핵심 개념

### Canonical Store

Canonical Store는 Synthesis 시스템의 기반 지식 그래프 저장소입니다. Zotero 데이터 디렉토리에 content-addressable JSON 파일을 저장합니다.

**저장 위치:** `<Zotero data directory>/zotero-agents/data/synthesis/`

**디렉토리 구조:**

```
synthesis/
├── topics/             # 토픽 통합을 위한 구조화된 아티팩트
├── concepts/           # 개념 지식 베이스
├── topic-graph/        # 토픽 그래프 노드 및 엣지
├── citation-graph/     # 인용 그래프 스냅샷
├── tags/               # 제어된 태그 어휘
├── sync/               # Git 동기화 작업 트리
└── state/              # 런타임 상태 (트랜잭션, 영수증, 캐시 등)
```

각 파일은 스키마 ID, 버전 번호, 타임스탬프 및 스키마 유효성 검증된 데이터 본문을 포함하는 JSON 엔벨로프 형식(CanonicalEnvelope)을 사용합니다. 쓰기 작업은 트랜잭션 시맨틱스를 사용합니다: 데이터는 먼저 트랜잭션 디렉토리에 스테이징되고, 유효성 검증 성공 시 표준 위치로 승격되며, 실패 시 자동으로 롤백됩니다.

### Reference Sidecar

Reference Sidecar는 각 논문에 첨부된 아티팩트의 인덱스입니다. Workflow가 문헌 항목을 처리하여 다이제스트, 참고문헌 리스트 및 인용 분석을 생성하면, 이러한 아티팩트는 구조화된 노트(Zotero Notes) 형태로 항목에 첨부됩니다. Sidecar 시스템은 이 노트를 스캔하여 아티팩트 상태(완전 / 부분 / 누락)를 인덱스에 기록합니다.

**Sidecar 스캔 주기:** Sidecar는 다음 시점에 스캔이 트리거됩니다:

- Workflow 실행이 완료되고 아티팩트가 기록된 후
- 명시적인 sidecar 새로 고침 작업이 트리거되었을 때
- 시스템이 시작 시 오래된 sidecar 데이터를 감지했을 때

**아티팩트 유형:**

| 아티팩트 | 설명 |
|----------|-------------|
| `digest` | 논문 다이제스트 (Markdown) |
| `references` | 참고문헌 리스트 (JSON) |
| `citation_analysis` | 인용 분석 보고서 (JSON) |

Sidecar 데이터는 Canonical Reference Index의 주요 입력으로 사용됩니다. 시스템은 references 아티팩트에서 인용 레코드를 추출하여 표준 참고문헌을 설정한 뒤, 라이브러리 항목과의 매칭 및 바인딩을 시도합니다.

### 데이터 흐름

```
Zotero Library
    │
    ├──→ Workflow 실행 (문헌 분석 / 심층 독서)
    │         │
    │         ↓
    │   아티팩트 노트 (다이제스트 / 참고문헌 / 인용 분석)
    │         │
    │         ↓
    │   Reference Sidecar ← 아티팩트 상태 스캔
    │         │
    │         ├──→ Canonical Reference Index
    │         │         │
    │         │         ├──→ 인용 바인딩 (Zotero 항목에 바인드)
    │         │         └──→ 인용 그래프
    │         │
    │         └──→ 토픽 통합
    │                   │
    │                   ├──→ 토픽 그래프 (토픽 관계)
    │                   └──→ 개념 연결 (개념 KB)
    │
    └──→ Git 동기화 ←→ 원격 저장소 (버전 제어 및 백업)
```

## 사전 요구 사항

Synthesis Workbench를 사용하려면 다음이 필요합니다:

- 구성된 [Skill-Runner](../backends/skill-runner) 백엔드 (통합 Workflow 실행용)
- 라이브러리에 존재하는 논문 항목

## 다음 단계

- [홈 대시보드](home) — 라이브러리 개요 및 동기화 상태 확인
- [태그 관리](tags) — 제어된 태그 어휘 관리
- [인덱스 & 인용 그래프](index-and-citation) — 참고문헌 인덱싱 및 인용 네트워크 알아보기
- [토픽 통합 생성](topic-synthesis) — 토픽 분석 생성
- [리뷰 허브](review) — 인용 매치, 개념 및 토픽 그래프 제안 리뷰
- [개념 지식 베이스](concepts) — 핵심 개념 관리
- [Git 동기화](git-sync) — 데이터 동기화 및 백업 구성
