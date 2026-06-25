# 설치 가이드

## 시스템 요구사항

- **Zotero**: 7.0 이상 (Zotero 9 권장)
- **플랫폼**: Windows 10+, macOS 12+, Linux (x86_64 / x86 / ARM64 / ARM)

> **Zotero 버전 안내**: 이 플러그인은 Zotero 9에서 개발 및 테스트됩니다. Zotero 8은 이론적으로 완전히 지원됩니다(Zotero 8/9 간에 플러그인 프레임워크에 유의미한 변경사항이 없습니다). Zotero 7도 이론적으로 지원되어야 하지만 리소스 제한으로 인해 철저하게 테스트되지는 않았습니다. 향후 유지보수는 Zotero 9에 집중될 예정입니다. Zotero 7에서 문제가 발생하면 [Issues](https://github.com/leike0813/zotero-agents/issues)에 보고해 주세요.

## 플러그인 설치

### GitHub/Gitee 릴리스에서 설치 (권장)

1. [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) 또는 [Gitee 릴리스 미러](https://gitee.com/leike0813/zotero-agents/releases) 방문
2. 최신 `.xpi` 파일 다운로드
3. Zotero에서 **도구 → 추가 기능** 열기
4. 톱니바퀴 아이콘을 클릭하고 **파일에서 추가 기능 설치...** 선택
5. 다운로드한 `.xpi` 파일 선택

### 소스에서 빌드

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

빌드 결과물은 `.scaffold/build/` 디렉토리에 위치합니다.

## 공식 Workflow 패키지 설치

이 플러그인은 **내장된 비즈니스 로직이 없습니다**. 모든 Workflow는 별도의 공식 Workflow 패키지를 통해 제공됩니다.

### 방법 1: 메뉴에서 설치 (권장)

1. Zotero를 재시작한 후, 아무 항목이나 우클릭 → **Zotero Agents** → **📦 공식 Workflow 패키지 설치**
2. 플러그인이 GitHub / Gitee에서 최신 공식 패키지를 자동으로 다운로드합니다
3. 완료되면 성공 알림이 표시되며, 모든 공식 Workflow가 대시보드에 표시됩니다

### 방법 2: 환경설정에서 설치

1. **Zotero → 설정 → Zotero Agents** 열기
2. **Workflow 설정** 섹션에서 **공식 Workflow 패키지 설치** 클릭
3. 업데이트 채널(stable / beta / dev)을 전환하고 업데이트를 확인할 수도 있습니다

### 업데이트 메커니즘

- 플러그인은 시작 시 공식 패키지의 새 버전을 자동으로 확인합니다
- 새 버전이 사용 가능하면 확인 대화상자가 표시됩니다
- 업데이트 후 Workflow 목록이 자동으로 다시 로드됩니다

공식 Workflow 패키지 저장소: [GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Gitee 미러](https://gitee.com/leike0813/zotero-agents-workflows)

## 설치 확인

1. Zotero 재시작
2. Zotero 도구모음에서 **Zotero Agents** 아이콘이 표시되어야 합니다
3. 아무 항목이나 우클릭 — **Zotero Agents** 하위 메뉴가 표시되어야 합니다(사용 가능한 Workflow 포함)

우클릭 메뉴에 **📦 공식 Workflow 패키지 설치** 옵션만 표시되는 경우, 공식 패키지가 아직 설치되지 않은 것입니다 — 위의 지침에 따라 설치하세요. 설치 성공 후, [시작하기](#doc/getting-started)로 이동하여 백엔드를 구성하고 첫 번째 Workflow를 실행하세요.
