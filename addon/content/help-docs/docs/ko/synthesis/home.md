# 홈 대시보드

홈은 Synthesis Workbench를 열 때 가장 먼저 보이는 페이지입니다. 라이브러리의 종합적인 개요, 동기화 상태 및 인기 토픽에 대한 빠른 접근을 제공합니다.

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/synthesis/home.webp" alt="Synthesis Home Dashboard" title="Synthesis Home Dashboard" loading="lazy" /><figcaption>Synthesis Home Dashboard</figcaption></figure>

## 라이브러리 인사이트 카드

페이지 상단에는 Synthesis 시스템의 현재 상태를 보여주는 통계 카드 세트가 표시됩니다:

| 지표 | 설명 |
|--------|-------------|
| **등록된 논문 수** | Canonical Reference Index에 포함된 총 논문 수 |
| **토픽 수** | 생성된 토픽 통합의 수 |
| **그래프 노드** | 인용 그래프의 총 노드 수 (라이브러리 논문 + 외부 참고문헌) |
| **그래프 엣지** | 인용 그래프의 총 인용 관계 수 |
| **동기화 상태** | WebDAV/Git 동기화의 실행 상태 |

이 지표를 통해 라이브러리의 구조화 수준과 통합 진행 상황을 빠르게 파악할 수 있습니다.

## 동기화 패널

[WebDAV 동기화](#doc/synthesis%2Fwebdav-sync)(권장) 또는 [Git 동기화](#doc/synthesis%2Fgit-sync)(사용 중단됨)가 구성된 경우, 홈 페이지에 동기화 상태 패널이 표시됩니다:

### WebDAV 동기화

- **동기화 상태**: idle / queued / syncing / blocked_conflict / failed
- **마지막 동기화 시간**
- **원격 HEAD 식별자**
- **작업 버튼**: 수동 동기화, 일시 중지/재개, 재시도

충돌이 발생하면 패널에 충돌 상세 정보 및 작업 옵션(`keep_local`, `clear_after_manual_edit`)이 표시됩니다.

WebDAV 동기화의 자세한 구성 및 사용 방법은 [WebDAV 동기화](#doc/synthesis%2Fwebdav-sync)를 참조하세요.

:::warning 자동 동기화 안내
WebDAV 동기화의 자동 동기화 기능은 아직 충분히 테스트되지 않았습니다. 현재 단계에서는 **수동 동기화만 사용**하고, 향후 릴리스에서 개선된 후 자동 동기화를 활성화하는 것을 권장합니다.
:::

### Git 동기화 (사용 중단됨)

역사적 참고를 위해 [Git 동기화](#doc/synthesis%2Fgit-sync)를 참조하세요.

## 리뷰 항목 패널

홈 페이지에는 대기 중인 리뷰 항목의 빠른 미리보기를 표시할 수 있습니다:

| 리뷰 카테고리 | 설명 |
|-----------------|-------------|
| **인용 매치** | 대기 중인 인용-항목 바인딩 제안 |
| **개념** | 대기 중인 개념, 의미 및 별칭 제안 |
| **토픽 그래프 관계** | 대기 중인 토픽 간 관계 |
| **태그 제안** | 승인을 기다리는 AI 추천 태그 |

각 카테고리에는 대기 중인 항목 수가 배지로 표시됩니다. 클릭하면 [리뷰 허브](#doc/synthesis%2Freview)의 해당 서브 탭으로 이동합니다.

## 인기 토픽

페이지 하단에는 관련된 논문 수 기준으로 정렬된 인기 토픽 카드 리스트가 표시됩니다. 각 카드에는 다음이 포함됩니다:

- **토픽 이름** — 클릭하면 토픽 상세 페이지로 이동
- **논문 수** — 토픽이 다루는 논문 수
- **요약 미리보기** — 토픽 설명 발췌
- **작업 버튼** — 토픽 열기, 토픽 업데이트

활성 토픽이 여러 개일 경우, "모두 보기" 링크를 사용하여 Topics 페이지에서 전체 리스트를 탐색할 수 있습니다.

## 다음 단계

- [WebDAV 동기화](#doc/synthesis%2Fwebdav-sync) — Synthesis 데이터의 크로스 디바이스 동기화 구성
- [리뷰 허브](#doc/synthesis%2Freview) — 인용 매치, 개념 및 토픽 그래프 리뷰 항목 처리
- [인덱스 & 인용 그래프](#doc/synthesis%2Findex-and-citation) — Canonical Reference Index 관리
