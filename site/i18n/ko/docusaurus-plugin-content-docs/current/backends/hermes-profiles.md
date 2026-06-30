# Zotero Librarian Hermes 프로필

## 개요

**zotero-librarian**은 [Host Bridge](host-bridge)를 통해 AI 에이전트가 Zotero 라이브러리를 관리할 수 있게 해주는 즉시 설치 가능한 [Hermes](https://github.com/anomalyco/hermes) 프로필입니다. 에이전트가 필요한 모든 것을 번들로 제공합니다: `zotero-bridge` CLI, Host Bridge 연결 프로필 템플릿, 로컬 SQLite 메타데이터 인덱스, 워크플로 카탈로그 캐시, 실행 모니터링 스크립트, 예약된 유지보수 cron 작업.

이 프로필은 Zotero Agents 저장소의 `host-bridge/zotero-librarian-profile` 브랜치에서 독립형 패키지로 배포됩니다.

## 할 수 있는 일

| 기능 | 설명 |
|------|------|
| **로컬 메타데이터 인덱스** | Zotero 라이브러리의 검색 가능한 SQLite 스냅샷(제목, 저자, 태그, 컬렉션, DOI, 노트/첨부파일 수)을 유지하여 빠르고 오프라인 가능한 쿼리 제공 |
| **워크플로 카탈로그 캐시** | 모든 내장 워크플로의 페이로드 계약을 로컬에 캐시하여 에이전트가 매번 스키마를 다시 쿼리하지 않고 알려진 워크플로를 제출할 수 있음 |
| **예약된 유지보수** | 6개의 내장 cron 템플릿: 인덱스 갱신, 워크플로 카탈로그 갱신, 실행 모니터링, 수신함 분류, 라이브러리 위생, 주의 대기열 요약 |
| **실행 모니터링** | 제출된 워크플로 실행을 추적하고 상태 변경, 종료 상태 또는 주의가 필요한 항목을 보고 |
| **주의 대기열** | Host Bridge의 `insights.get_attention_queue`와 로컬 인덱스 메타데이터를 결합하여 우선순위가 높은 읽기 및 분석 작업을 표시 |

## 설치

### 전제 조건

- [Zotero](https://www.zotero.org/) 7+에 **Zotero Agents** 플러그인 설치 완료
- Host Bridge 실행 중 (확인: Zotero → 설정 → Zotero Agents → Host Bridge → **시작 / 엔드포인트 표시**)
- 시스템에 [Hermes](https://github.com/anomalyco/hermes) 설치 완료
- `zotero-bridge` CLI 사용 가능 (Host Bridge 설정 패널의 **CLI 설치** 버튼으로 설치)

### 프로필 설치

```bash
hermes profile install zotero-librarian
```

이 명령은 프로필 패키지를 다운로드하여 Hermes 프로필 디렉토리에 압축을 풉니다.

### Hermes 구성

프로필의 `config.yaml`을 편집하여 원하는 모델 제공업체를 설정합니다:

```yaml
# 설치된 프로필 디렉토리 내부
provider:
  type: anthropic    # 또는 openai, local 등
  model: claude-sonnet-4-20250514
  # ... API 키 및 기타 제공업체 설정
```

전체 제공업체 구성 옵션은 [Hermes 문서](https://github.com/anomalyco/hermes)를 참조하세요.

### Zotero Bridge 연결 구성

프로필에는 `assets/host-bridge/profile.example.json`에 Host Bridge 연결 템플릿이 포함되어 있습니다. 실제 엔드포인트와 토큰을 제공해야 합니다:

1. Zotero → 설정 → Zotero Agents → Host Bridge 열기
2. **시작 / 엔드포인트 표시**를 클릭하여 브리지가 실행 중인지 확인하고 엔드포인트 URL(예: `http://127.0.0.1:26570/bridge/v1`)을 기록
3. **마스터 토큰 복사**를 클릭(또는 패널에 표시된 세션 토큰 사용)
4. 토큰을 환경 변수로 설정:

```bash
# Linux / macOS
export ZOTERO_BRIDGE_TOKEN="<사용자-토큰>"

# Windows PowerShell
$env:ZOTERO_BRIDGE_TOKEN = "<사용자-토큰>"
```

5. 원격/LAN 액세스의 경우 엔드포인트도 직접 포함:

```bash
export ZOTERO_BRIDGE_ENDPOINT="http://127.0.0.1:26570/bridge/v1"
```

프로필 템플릿은 `auth.tokenEnv: "ZOTERO_BRIDGE_TOKEN"`을 사용하므로 CLI가 환경에서 자동으로 토큰을 가져옵니다. 엔드포인트, 토큰 및 프로필 파일에 대한 자세한 내용은 [Host Bridge 구성](host-bridge)을 참조하세요.

### 설정 확인

```bash
# Host Bridge 연결 확인
zotero-bridge status

# 프로필에 CLI 바이너리 설치 (최초 1회만)
python scripts/install_zotero_bridge_cli.py

# 최초 인덱스 갱신 (모든 라이브러리 메타데이터를 로컬 SQLite로 가져옴)
python scripts/zotero_librarian_index_service.py refresh

# 로컬 인덱스에서 검색 테스트
python scripts/zotero_librarian_index_service.py search "machine learning"
```

## 인덱스 서비스 명령어

프로필의 핵심 유틸리티는 `zotero_librarian_index_service.py`입니다. 매번 Zotero를 호출하지 않고 빠르고 반복적인 라이브러리 쿼리를 위해 로컬 SQLite 데이터베이스를 유지합니다.

| 명령어 | 설명 |
|--------|------|
| `refresh` | `zotero-bridge library snapshot`을 페이지 단위로 가져와 SQLite 인덱스를 원자적으로 업데이트. 최신 갱신에서 누락된 항목은 삭제됨으로 표시 |
| `search "<검색어>"` | 제목, 저자, 식별자, 태그, 컬렉션, 출판 필드에서 전체 텍스트 검색 |
| `item <key-or-id>` | Zotero 항목 키 또는 숫자 ID로 단일 인덱스 레코드 반환 |
| `stats` | 활성/삭제된 항목 수, 태그 수, 컬렉션 수, 워크플로 카탈로그 상태 보고 |
| `workflow-refresh` | `workflow list` 및 `workflow describe`를 호출하여 로컬 워크플로 카탈로그 캐시 갱신 |
| `workflow-show <id>` | 알려진 워크플로의 캐시된 페이로드 계약 표시 |
| `run-register --run-id <id> --workflow-id <id>` | 제출된 워크플로 실행을 모니터링에 등록 |
| `run-watch` | 활성 등록된 모든 실행을 확인하고 상태 변경 또는 종료 상태 보고 |

## 사용 사례

### 라이브러리 관리

**일일 수신함 분류** (`cron/inbox-triage.yaml`)

프로필의 수신함 분류 cron은 매일 실행되어 라이브러리의 새 항목 완전성을 확인합니다:

- `0-inbox`(미처리) 상태의 항목
- 누락된 태그 또는 컬렉션 할당
- 누락된 DOI, URL 또는 첨부 파일
- 누락된 요약 또는 다이제스트 아티팩트

제안된 조치 보고서를 생성하지만 승인 없이는 Zotero 변경을 수행하지 않습니다.

**주간 라이브러리 위생** (`cron/library-hygiene.yaml`)

매주 월요일 실행되어 라이브러리의 데이터 품질 문제를 스캔합니다:

- 중복 항목 (DOI, 제목 또는 ISBN 기준)
- 의심스러운 깨진 문자 제목
- 분리된 항목 (상위 컬렉션 없음)
- 빈 컬렉션
- 단일 항목의 과도한 태그 수
- 비정상적인 Zotero 항목 유형을 가진 항목

모든 제안은 수정 조치를 명시적으로 승인할 때까지 읽기 전용입니다.

**주의 대기열** (`cron/attention-queue.yaml`)

Host Bridge의 `insights.get_attention_queue`와 로컬 인덱스 메타데이터를 결합하여 높은 우선순위 작업의 순위 목록을 표시합니다 — 읽을 논문, 채워야 할 메타데이터 공백, 실행할 워크플로.

### 문헌 검색 및 가져오기

1. 이미 소유한 논문을 다시 추가하지 않도록 먼저 로컬 인덱스를 검색합니다:
   ```bash
   python scripts/zotero_librarian_index_service.py search "attention mechanism survey"
   ```

2. 논문을 찾을 수 없는 경우 `literature-search-ingest` 워크플로를 사용하여 외부 소스를 검색하고 Zotero에 추가합니다:
   ```bash
   zotero-bridge workflow submit \
     --workflow literature-search-ingest \
     --none \
     --workflow-options '{"query":"attention mechanism survey","searchMode":"arxiv-and-doi"}'
   ```

3. 가져오기 후 tag-bootstrapper 또는 tag-regulator 워크플로를 실행하여 새 항목의 태그를 정규화합니다.

### 자동 문헌 분석 워크플로

프로필은 Zotero Agents 플러그인의 모든 내장 워크플로를 카탈로그화합니다. 카탈로그가 갱신되면 스키마를 다시 쿼리하지 않고도 모든 워크플로를 직접 제출할 수 있습니다.

**일괄 문헌 분석**

논문 컬렉션에 `literature-analysis` 워크플로를 제출하여 구조화된 다이제스트를 생성합니다:

```bash
zotero-bridge workflow submit \
  --workflow literature-analysis \
  --items @items.json \
  --workflow-options '{"language":"ko"}'
```

실행 등록 및 모니터링:

```bash
python scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id literature-analysis
python scripts/zotero_librarian_index_service.py run-watch
```

**단일 논문 심층 읽기**

특정 논문의 심층 분석:

```bash
zotero-bridge workflow submit \
  --workflow literature-deep-reading \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"ko","mode":"comprehensive"}'
```

**논문 간 주제 통합**

논문 컬렉션 전반의 주제 통합:

```bash
zotero-bridge workflow submit \
  --workflow create-topic-synthesis \
  --items @collection-items.json \
  --workflow-options '{"topicSeed":"self-supervised learning","language":"ko"}'
```

**번역 지원**

논문 메타데이터 또는 초록 번역:

```bash
zotero-bridge workflow submit \
  --workflow literature-translator \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"target_language":"ko","mode":"metadata"}'
```

**논문 Q&A**

논문 내용에 대한 질문:

```bash
zotero-bridge workflow submit \
  --workflow literature-explainer \
  --items '[{"key":"ABCD1234","libraryId":1}]' \
  --workflow-options '{"language":"ko"}'
```

## 예약된 유지보수 작업

프로필은 `cron/` 디렉토리에 6개의 사전 구성된 cron 템플릿을 포함합니다:

| Cron 작업 | 일정 | 동작 |
|----------|------|------|
| `index-refresh` | 6시간마다 | `library snapshot`을 페이지 단위로 가져와 로컬 SQLite 인덱스를 최신 상태로 유지. 변경 사항이 없으면 `[SILENT]` 보고 |
| `workflow-catalog-refresh` | 매일 03:00 | `workflow list` + `workflow describe`를 호출하여 워크플로 카탈로그 캐시 갱신. 변경 사항이 없으면 `[SILENT]` 보고 |
| `run-monitor` | 5분마다 | `run-watch`를 호출하여 활성 등록된 실행 확인. 상태 변경, 종료 상태 또는 주의가 필요한 항목만 보고 |
| `inbox-triage` | 매일 09:00 | `status:0-inbox` 항목, 누락된 태그, 누락된 컬렉션, 누락된 메타데이터 검색. 읽기 전용 보고서 생성 |
| `library-hygiene` | 매주 월요일 | 중복 항목, 분리된 항목, 빈 컬렉션 및 데이터 품질 문제 스캔 |
| `attention-queue` | 매일 18:00 | 주의 대기열 인사이트와 로컬 인덱스 데이터를 결합하여 높은 우선순위 작업 순위 지정 |

모든 비대화형 유지보수 작업은 실행 가능한 결과가 없을 때 사용자에게 스팸을 방지하기 위해 `[SILENT]` 마커를 사용합니다.

## 보안 경계

- 프로필 템플릿(`profile.example.json`)에는 실제 토큰이 절대 포함되지 않습니다. 항상 `ZOTERO_BRIDGE_TOKEN`을 환경 변수로 사용하세요.
- 유지보수 cron 작업은 기본적으로 읽기 전용입니다. 변경에는 명시적인 사용자 승인이 필요합니다.
- Zotero 데이터베이스 파일을 직접 읽지 마세요. 항상 Host Bridge, `zotero-bridge` 및 `library.sync_snapshot`에서 생성된 로컬 인덱스를 사용하세요.

## 다음 단계

- [Host Bridge](host-bridge) — `zotero-bridge` CLI 및 Host Bridge 기능에 대한 완전한 참조
- [워크플로](../workflows) — 모든 내장 및 사용자 정의 워크플로 개요
- [MCP Server](mcp-server) — MCP 호환 클라이언트를 위한 대체 프로토콜 인터페이스
