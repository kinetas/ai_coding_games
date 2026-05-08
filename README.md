# CardForge Online

중세 카드 전략 서바이벌 — 솔로 or 1:1 PvP.  
**Phaser 3** (클라이언트) + **Node.js & Socket.io** (서버) 기반으로 재구축 중.

---

## 게임 모드

| 모드 | 설명 |
|------|------|
| **Solo** | 닉네임 입력 후 단독 보드에서 시작. 서버 연결 없음. 약탈자가 자연 스폰되며 생존 시간을 최대화하는 것이 목표. |
| **PvP (1:1)** | 방 코드로 상대방과 매칭. 상대방 인구를 먼저 0으로 만들거나 왕국 점수 30점 달성 시 승리. |

---

## 빠른 시작

### 레거시 프로토타입 (바닐라 JS, 즉시 실행 가능)

```bash
# index.html을 브라우저로 열면 끝
start index.html       # Windows
open index.html        # macOS
```

### 신규 빌드 (Phaser 3 + Node.js, 개발 중)

```bash
# 서버
npm install
npm start              # port 3000

# 클라이언트
cd client
npm install
npm run dev
```

---

## 프로젝트 구조

```
web_game/
├── index.html          # 레거시 프로토타입 진입점
├── style.css           # 레거시 스타일
├── game.js             # 레거시 게임 로직 (바닐라 JS)
│
├── server/
│   └── index.js        # Node.js + Socket.io 서버
│
├── client/
│   ├── index.html
│   └── src/
│       ├── main.js                    # Phaser3 Game 인스턴스
│       ├── models/
│       │   ├── CardDefs.js            # 카드 타입 enum (23종)
│       │   ├── CardStack.js           # 스택 데이터 모델
│       │   └── GameState.js           # 솔로/PvP 상태 스키마
│       ├── logic/
│       │   ├── CombinationEngine.js   # 조합 레시피 엔진
│       │   ├── SpawnManager.js        # 자연 스폰 관리
│       │   ├── WinLoseChecker.js      # 승패 감지
│       │   ├── CombatResolver.js      # 전투 교환비 테이블
│       │   └── CombatAI.js            # 약탈자/투석기 AI
│       ├── ui/
│       │   ├── CardView.js            # 카드 렌더링 + 뱃지
│       │   ├── DragController.js      # 드래그 & 스택 조작
│       │   └── HUD.js                 # Stat 패널, 왕국 건설 버튼
│       ├── scenes/
│       │   ├── LobbyScene.js          # 닉네임 입력, 모드 선택
│       │   ├── RoomScene.js           # 방 생성/참여/대기실
│       │   ├── GameScene.js           # 메인 게임 루프
│       │   └── ResultScene.js         # 결과 화면
│       └── network/
│           └── SocketClient.js        # Socket.io 래퍼
│
└── .hanness/                          # 자율 구현 러너 (Hanness)
    ├── hanness_runner.py
    ├── hanness_manifest.json
    ├── pages/   (page_01~09.page)
    ├── tasks/   (page_01~09.task)
    └── results/ (자동 생성)
```

---

## 카드 시스템

### 카드 종류 (23종)

| 카테고리 | 카드 |
|---------|------|
| 인구 | 사람, 전사, 궁수, 척후병 |
| 자연 | 바위, 나무, 늑대, 곰 |
| 자원 | 식량, 씨앗, 돌, 목재, 창, 활, 배, 벽돌 |
| 건물 | 농지, 과수원, 목조 가옥, 마을, 도시, 성벽 |
| 적군 | 약탈자, 투석기 |

### 주요 조합 레시피

```
바위 + 사람    → 돌 2장       (사람 유지)
나무 + 사람    → 목재 2장     (사람 유지)
농지 + 사람    → 식량 1장     (둘 다 유지)
돌 + 돌        → 벽돌
목재 + 돌      → 창
창 + 목재      → 활
목재 + 목재    → 배
사람 + 창      → 전사
활 + 사람      → 궁수
목재 + 사람    → 척후병
사람 + 식량    → 사람 2장
벽돌 + 벽돌   → 성벽
벽돌 + 나무   → 목조 가옥     (인구 제한 +1)
목조 가옥 x2  → 마을          (인구 제한 +3, 농지 제한 +1)
마을 x2       → 도시          (인구 제한 +6, 농지 제한 +2, 왕국 점수 +1)
전사 + 배      → 약탈자 파견   (PvP 전용, 상대 보드로)
```

---

## 스택 시스템

같은 타입 카드는 하나의 스택으로 관리. 왼쪽 상단 뱃지로 수량 표시.

| 조작 | 동작 |
|------|------|
| 즉시 드래그 | 스택 전체 이동 |
| 1초 길게 누른 후 드래그 | 1장만 분리 이동 |
| 숫자키 N 입력 후 드래그 | N장 분리 이동 |

---

## 왕국 점수 (Kingdom Score)

```
왕국 점수 = 도시 수 × 1 + floor(성벽 수 / 10) + floor(인구 수 / 5)
```

30점 달성 시 HUD에 **왕국 건설** 버튼 활성화.  
PvP에서 먼저 누른 플레이어가 즉시 승리.

---

## 자율 구현 러너 (Hanness)

구현 작업을 9개 페이지 단위로 자동 실행하는 체크포인트 러너.

```powershell
$env:PYTHONIOENCODING = "utf-8"
python .hanness/hanness_runner.py --status        # 진행 상태 확인
python .hanness/hanness_runner.py --dry-run       # 시뮬레이션
python .hanness/hanness_runner.py                 # 실제 실행 (Claude 호출)
python .hanness/hanness_runner.py --retry-failed  # 실패 페이지 재시도
python .hanness/hanness_runner.py --from page_03  # 특정 페이지부터
python .hanness/hanness_runner.py --reset         # 처음부터
```

| 페이지 | 내용 |
|--------|------|
| page_01 | 프로젝트 골격 & 카드 데이터 모델 |
| page_02 | 조합 엔진 (CombinationEngine) |
| page_03 | 게임 루프 & 자연 스폰 시스템 |
| page_04 | 카드 렌더링 & 스택 UI |
| page_05 | 드래그 & 스택 상호작용 |
| page_06 | HUD 패널 & 로비 UI |
| page_07 | 승패 감지 & 결과 화면 |
| page_08 | Socket.io 네트워크 레이어 & PvP |
| page_09 | 전투 AI & UX 폴리시 |

> Python 3.11 필요: `C:\Users\Administrator\AppData\Local\Programs\Python\Python311\python.exe`
