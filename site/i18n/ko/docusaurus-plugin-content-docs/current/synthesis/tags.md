# 태그 관리

## 태그 어휘란?

태그 어휘는 문헌의 일관된 주석을 위해 사용되는 표준화된 태깅 시스템입니다. Zotero의 기본 자유 형식 태그와 달리, 제어된 어휘의 태그는 통합된 명명 규칙을 따르므로 통계 및 검색이 용이합니다.

## 패싯

각 태그는 패싯(차원)에 속합니다. 현재 다음 패싯이 지원됩니다:

| 패싯 | 설명 | 예시 |
|-------|-------------|---------|
| `field` | 연구 분야 | `field:natural_language_processing` |
| `topic` | 연구 토픽 | `topic:transformer_architecture` |
| `method` | 연구 방법 | `method:reinforcement_learning` |
| `model` | 사용된 모델 | `model:gpt-4` |
| `ai_task` | AI 작업 유형 | `ai_task:text_summarization` |
| `data` | 데이터셋 | `data:imagenet` |
| `tool` | 도구 | `tool:python` |
| `status` | Workflow 대기 작업 | `status:need-analysis` |

태그 형식: `^[a-z_]+:[a-zA-Z0-9/_.-]+$`, 최대 120자.

## Vocabulary 탭

Synthesis Workbench → Tags → Vocabulary 페이지에서 다음 작업을 수행할 수 있습니다:

- **보기**: 정의된 모든 표준 태그를 확인, 상태, 패싯, 별칭 및 사용 횟수 표시
- **추가**: 새 표준 태그 생성
- **편집**: 태그 메타데이터 수정
- **사용 중단**: 태그를 사용 중단으로 표시하고, 선택적으로 대체 태그 지정
- **JSON 가져오기**: JSON 파일에서 태그 어휘 가져오기 (확인 전 미리보기 지원)
- **JSON 내보내기**: 현재 어휘를 JSON 파일로 내보내기

![Synthesis Tags Page](/img/docs/synthesis/tags.png)

태그 상태:
- `active`: 활성
- `deprecated`: 사용 중단됨 (대체 태그가 있음)
- `warning`: 경고 (검토가 필요할 수 있음)

## Staged 탭 (대기 중인 태그)

**tag-regulator** 스킬은 자동으로 문헌 메타데이터를 분석하여 제어된 태그 제안을 생성하며, Staged 페이지에 표시됩니다.

### 승인 워크플로

1. 제안된 태그 리스트 검토
2. 각 태그에 대해 다음 작업 가능:
   - **승급**: 태그를 표준 어휘에 추가
   - **폐기**: 제안을 거부
   - **Staged 비우기**: 모든 제안을 일괄 폐기

### 가져오기/내보내기 형식

태그 어휘는 JSON 형식 가져오기/내보내기(TagVocab 형식)를 지원하여 다음을 가능하게 합니다:

- 라이브러리 간 태그 시스템 마이그레이션
- 팀 간 태그 규칙 공유
- 백업 및 버전 제어

## 관련 Workflow

`status`는 읽기 진행률이 아니라 Workflow 대기 작업을 나타냅니다. 항목에는 0개 이상의 status가 있을 수 있습니다. 다섯 가지 내장 정의(`need-metadata-curation`, `need-fulltext`, `need-markdown`, `need-analysis`, `need-deep-reading`)는 플러그인 시작 시 생성됩니다. Tag Bootstrapper와 [Tag Regulator](../workflows/tag-regulator)는 이를 생성하거나 수정할 수 없으며 문헌에 추가하거나 제거할 수도 없습니다. 사용자 정의 status는 허용됩니다. PDF를 수동으로 첨부해도 `status:need-fulltext`는 자동 제거되지 않습니다.
