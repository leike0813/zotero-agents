# Zotero Library Agent

## 개요

Zotero Library Agent는 [Host Bridge](host-bridge)의 유계(bounded) 온디맨드 작업 표면입니다. AI 에이전트가 유한한 요청에 대해 Zotero 라이브러리를 운영할 수 있게 합니다 — 항목 검사, 컨텍스트 검색, 문헌 및 합성 데이터 읽기, Workflow 실행, 승인된 변경 적용, 파일 전송, 증거 전달 — 상주 라이브러리 유지보수 서비스가 되지 않으면서.

Host Bridge는 세 가지 표면을 노출하며, 각각 다른 역할을 가집니다:

| 표면 | 역할 | 사용 시점 |
|------|------|-----------|
| **CLI Bundle** (`zotero-bridge`) | 설치, 연결 및 저수준 명령 계약 | Host Bridge 기능에 대한 직접 CLI 액세스가 필요한 경우 |
| **Library Agent** | 유계 작업 라우팅, 증거 전달 및 감사 가능한 결과 | 의도 라우팅과 완료 증거가 필요한 유한 요청이 있는 경우 |
| **Librarian Profile** (Hermes) | 상주 인덱스, 정기 유지보수 및 지속적 라이브러리 서비스 | 영구 로컬 인덱싱, cron 작업 또는 지속적 모니터링이 필요한 경우 |

## Library Agent가 제공하는 것

- **작업 라우팅**: 전체 명령 테이블을 스캔할 필요 없이 현재 의도를 가장 작은 일치 명령 패밀리로 라우팅합니다.
- **Journey 참조**: 7개의 상세 Journey 매뉴얼이 특정 작업 범주를 커버하며, 각각 분기, 경계 사례, 증거 요구사항, 승인 경계 및 복구 경로를 명시합니다.
- **증거 전달**: 결정적 형태 검증과 아티팩트 다이제스트 계산을 갖춘 휴대 가능한 증거 번들.
- **권한 경계**: Host Bridge를 유일한 제어 경로로 강제하여 Zotero 스토리지 직접 접근이나 백그라운드 서비스 동작을 방지합니다.
- **유계 작업**: 각 작업은 요청된 결과와 그 증거가 관찰 가능할 때 완료됩니다 — 제출 확인이나 준비된 전달만으로는 완료가 아닙니다.

## 유계 작업 흐름

1. **연결 확인**: 로드된 CLI와 Host Bridge 프로파일을 확인합니다. `zotero-bridge surface identity --json`을 실행하여 패키지된 매니페스트와 비교하고 리포지토리의 `releaseSetId`를 확인합니다.
2. **의도 라우팅**: 작업 라우팅 참조를 읽어 요청을 충족하는 가장 작은 명령 패밀리를 선택합니다.
3. **일치하는 Journey 로드**: 작업 범주와 정확히 일치하는 하나의 Journey 매뉴얼을 읽습니다.
4. **증거 보존**: 현재 Host 팩트, 반환된 핸들, 로컬 아티팩트 및 승인 상태를 별개의 증거로 보존합니다.
5. **실행 또는 제출**: Workflow의 경우 Workflow 실행 참조를 따릅니다. Workflow 옵션을 허용하지 않는 실행 모드로 옵션을 보내지 않습니다.
6. **구축 및 검증**: 번들된 헬퍼를 사용하여 최종 증거 번들을 구축하고 검증합니다.

요청된 결과와 그 증거가 관찰 가능할 때 작업이 완료됩니다.

## Journey 범주

Library Agent는 7개의 Journey 매뉴얼을 포함하며, 각각 특정 작업 도메인을 커버합니다:

| Journey | 범위 |
|---------|------|
| **현재 컨텍스트 및 라이브러리 읽기** | 지시적 선택, 검색 대 목록, 항목 상세, 노트 및 첨부파일 증거 |
| **노트, 첨부파일 및 준비 상태** | 노트 청크 및 페이로드, 주석, PDF/Markdown/분석 준비 상태 및 생성된 첨부파일 |
| **합성 연구 컨텍스트** | 주제, 인용 그래프 뷰, 인덱스, 리졸버, 아티팩트, 스키마 및 어텐션 큐 |
| **Host 소유 Workflow** | Workflow 설명, 요구사항, 검증, 제출, 모니터링, 권한, 상호작용 및 Product 증거 |
| **Agent 소유 전달** | Agent 소유 번들 실행, 결과 검증, apply-back 및 영수증 복구 |
| **구체적 쓰기** | 미리본 변경, 시맨틱 쓰기 명령, 승인 및 실시간 검증 |
| **Product 및 파일** | 로컬 경로, 등록된 파일, Dashboard Product, 다운로드 및 첨부파일 전달 |

각 Journey는 정확한 페이로드나 결과 필드가 필요할 때 번들된 `zotero-bridge` CLI 명령 카드를 가리킵니다.

## 권한 및 보안 경계

Library Agent는 의도하지 않은 Zotero 변경을 방지하기 위해 엄격한 경계를 강제합니다:

- **Host Bridge만**: Host Bridge를 유일한 Zotero 및 Zotero Agents 제어 경로로 취급합니다. Zotero 데이터베이스, 스토리지 디렉토리, 플러그인 내부 또는 브라우저 상태를 직접 읽거나 쓰지 않습니다.
- **유계 작업**: Library Agent를 백그라운드 라이브러리 서비스로 전환하지 않습니다. 현재 요청에 대해 유계 작업을 수행하고 결과 또는 필요한 사용자 결정이 가능해지면 제어를 반환합니다.
- **무인 쓰기 금지**: 예약되거나 무인 쓰기를 수행하지 않습니다. 현재 사용자 요청과 Host Bridge 승인이 모든 변경 또는 apply-back을 관할합니다.
- **오래된 가정 금지**: 캐시 항목, 생성된 참조 또는 증거 번들을 라이브 Zotero 사실로 취급하지 않습니다. 신선도가 중요할 때 Host Bridge를 통해 현재 사실을 확인합니다.

## 증거 전달

Library Agent는 작업 연속성을 위해 휴대 가능한 증거 번들을 생성합니다. 증거 번들에는 다음이 포함됩니다:

- **상태**: `completed`, `canceled` 또는 `failed`
- **요약**: 작업 로컬의 간결한 발견
- **증거 파일** (선택): 헬퍼가 구축하고 검증한 증거 번들로, 다른 에이전트나 작업이 소비 가능
- **진단 정보** (선택): 구조화된 진단 정보

번들된 헬퍼를 사용하여 증거 번들을 구축하고 검증합니다:

```sh
python scripts/zotero_library_agent.py evidence build --input evidence-input.json --output evidence.json
python scripts/zotero_library_agent.py evidence validate --input evidence.json
```

헬퍼는 결정적 형태를 검증하고, 아티팩트 다이제스트를 계산하며, Workflow 번들을 검사합니다. 에이전트는 명령 선택, 해석, 증거 충분성 및 검토된 작업의 승인 여부에 대해 계속 책임을 집니다.

## 실패 처리

- 실패를 보고할 때 구조화된 오류 코드와 핸들 필드를 보존합니다.
- 오류가 오래된 구문이나 정체성을 나타낼 때만 명령이나 객체를 재발견합니다. 대체 핸들을 추측하지 않습니다.
- 작업이 파일 핸들이나 출력 경로를 반환할 때, 증거 또는 apply-back 입력으로 사용하기 전에 선언된 파일을 검증합니다.
- 필요한 권한, 입력 또는 사용자 의도가 누락된 경우 경계에서 중지하고 정확히 누락된 결정을 명시합니다.

## 통합

Library Agent는 모든 Zotero 접근에 Host Bridge에 의존합니다. Library Agent를 사용하기 전에:

1. Host Bridge가 실행 중인지 확인합니다 (Zotero → 설정 → Zotero Agents → Host Bridge → **시작 / 엔드포인트 표시**).
2. `zotero-bridge` CLI를 설치합니다 (Host Bridge 환경설정 패널의 **CLI 설치** 버튼 사용).
3. 엔드포인트 URL과 Bearer 토큰으로 연결 프로파일을 구성합니다. 자세한 설정은 [Host Bridge 구성](host-bridge)을 참조하십시오.

## 다음 단계

- [Host Bridge](host-bridge) — `zotero-bridge` CLI와 Host Bridge 기능의 전체 참조
- [Hermes Profiles](hermes-profiles) — 로컬 인덱싱과 정기 유지보수를 갖춘 상주 라이브러리 서비스
- [Workflows](../workflows) — 모든 내장 및 사용자 정의 Workflow 개요
- [MCP Server](mcp-server) — MCP 호환 클라이언트를 위한 대체 프로토콜 인터페이스
