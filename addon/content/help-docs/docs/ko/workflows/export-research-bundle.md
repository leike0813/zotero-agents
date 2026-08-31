# Export Research Bundle

## 목적

선언된 논문 의도를 기반으로 기존 Zotero 라이브러리 및 Synthesis 컨텍스트에서 읽기 전용 연구 번들을 Dashboard Products에 자동 구성합니다. 번들은 관련 주제, 핵심 논문 및 사용 가능한 분석 아티팩트가 있는 관련 논문을 수집합니다.

## 입력

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `paperTitle` | 예 | 연구 자료를 찾는 데 사용되는 작업 원고 제목. |
| `researchContent` | 예 | 연구 문제, 방법, 범위 및 의도된 기여. |
| `articleType` | 아니요 | 원고 유형(기본값: `original research`). |
| `maxTopics` | 아니요 | 포함할 관련 주제 최대 수, 범위 0–10(기본값: 5). |
| `maxCorePapers` | 아니요 | 핵심 논문 최대 수, 범위 1–50(기본값: 20). |
| `maxRelatedPapers` | 아니요 | Topic 외 추가 논문의 최대 수, 범위 1–200(기본값: 80). 선택한 Topic에서 확인된 논문은 이 한도를 넘어도 유지됩니다. |

Zotero 항목 선택은 필요하지 않습니다.

## 동작

1. 사용자로부터 논문 의도 파라미터를 수신합니다.
2. 기존 Synthesis Topics와 제한된 Zotero 메타데이터 앵커에서 후보 자료를 찾습니다. 검색은 제목, 저자, 연도, 출판물명, 태그 등 색인된 메타데이터를 비교하며 전문 의미 검색은 수행하지 않습니다.
3. 핵심 논문과 관련 논문을 구별하기 위해 제한된 평가를 수행합니다.
4. 주제 보고서, 서지 메타데이터 및 사용 가능한 v2 분석 아티팩트(다이제스트, 참고문헌, 인용 분석, 대화 내용)와 함께 연구 번들을 구성합니다.
5. 핵심 논문의 경우 로컬 이미지가 있는 Markdown 소스를 선호합니다. PDF로 폴백합니다. 둘 다 사용할 수 없는 경우 경고를 기록합니다.
6. Dashboard Products에 읽기 전용 제품으로 번들을 등록합니다.

주제, 그래프, 분석 아티팩트 또는 소스의 사용 불가는 우아하게 저하됩니다 — 워크플로는 여전히 읽을 수 있는 증거로 계속 진행하며 진단 및 경고를 기록합니다. 기준을 충족하는 논문이 없으면 실행은 제품을 등록하지 않고 종료됩니다.

## 출력 및 적용

연구 번들은 Dashboard Products에 읽기 전용 아티팩트로 등록됩니다. 구조:

| 경로 | 설명 |
|------|-------------|
| `README.md` | 권장 읽기 순서, 파일 명명, 주제/논문 인덱스가 있는 에이전트 및 인간 대상 진입점 |
| `manifest.json` | v2 아티팩트 경로, 출처, 파일 무결성 및 진단의 기계 판독 가능 인벤토리 |
| `topics/<topic-id>/report.md` | 주제 통합 보고서(사용 가능한 경우) |
| `papers/<paper-id>/metadata.json` | 논문별 휴대 가능한 서지 메타데이터 |
| `papers/<paper-id>/source.md` | Markdown 소스(사용 가능한 경우) |
| `papers/<paper-id>/digest-*.md` | Literature Analysis 다이제스트 아티팩트(사용 가능한 경우) |

루트 파일과 함께 `topics/` 및 `papers/` 시맨틱 디렉토리만 사용됩니다. Markdown 이미지는 해결된 로컬 경로가 Markdown 파일의 디렉토리 트리 내에 있는 경우에만 포함됩니다. 트리 외부 또는 누락된 이미지는 원본 링크를 유지하지만 제품 파일로 등록되지 않습니다.

## 예상 소요 시간

라이브러리 크기, 후보 수, 주제/그래프 사용 가능성 및 백엔드 응답 속도에 따라 다릅니다. 진행 상황과 결과는 실행 패널에 표시됩니다.

## 모델 권장 사항

강력한 의미 이해 및 도구 호출 능력을 갖춘 모델이 권장됩니다. 이 작업은 논문 의도에 대한 주제 및 논문 관련성을 판단하고 읽기 전용 Zotero 및 Synthesis 컨텍스트를 올바르게 사용해야 합니다.

## 종속성

- **백엔드**: Skill-Runner
- **스킬**: `export-research-bundle`
- **Host Bridge**: Zotero 및 Synthesis 컨텍스트를 읽을 수 있는 권한 필요

## 관련 Workflow

- [Literature Analysis](#doc/workflows%2Fliterature-analysis) — 번들에 포함할 수 있는 다이제스트 및 인용 분석 아티팩트 생성
- [Literature Search & Ingest](#doc/workflows%2Fliterature-search-ingest) — 번들을 구성하기 전에 누락된 문헌 검색 및 수집
- [Export/Import Literature Bundle](#doc/workflows%2Fexport-import-literature-bundle) — Zotero 항목의 휴대 가능한 ZIP 번들 내보내기 (다른 목적)
