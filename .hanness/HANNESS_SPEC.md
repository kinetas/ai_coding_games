# Hanness Framework — 자율 구현 명세

CardForge MVP를 **page 단위로 분할**해 Claude CLI를 통해 **직렬 자율 구현**하는 프레임워크.

---

## 디렉토리 구조

```
.hanness/
├── HANNESS_SPEC.md          ← 이 문서 (프레임워크 명세)
├── hanness_runner.py        ← 자율 실행 엔진 (체크포인트 + Claude 호출)
├── hanness_manifest.json    ← 페이지별 진행 상태 체크포인트
├── runner.log               ← 실행 로그 파일
├── pages/                   ← context-aware 분할 단위 (.page 파일)
│   ├── page_01_models.page
│   ├── page_02_combinations.page
│   ├── ...
│   └── page_09_ux_polish.page
├── tasks/                   ← 에이전트가 자동 생성하는 실행 단위 (.task 파일)
│   └── page_01.task         (runner 실행 시 자동 생성)
└── results/                 ← 각 page 실행 결과 로그
    └── page_01_result.txt   (runner 실행 시 자동 생성)
```

---

## 파일 포맷

### .page 파일
에이전트가 무엇을 만들지 정의하는 명세 단위.

```
# PAGE NN — 제목
status: pending | done | failed
depends_on: [page_01_models, page_02_combinations]

## 목표
...

## 구현 범위
...

## 성공 기준
- [ ] 항목 1
- [ ] 항목 2
```

### .task 파일 (자동 생성 JSON)
runner가 .page를 읽어 Claude CLI에 전달할 프롬프트를 포함한 실행 단위.

```json
{
  "page_id":    "page_01",
  "page_num":   "01",
  "title":      "Data Models & Project Setup",
  "depends_on": [],
  "created_at": "2026-04-06T20:30:00",
  "status":     "pending | running | done | failed",
  "prompt":     "...Claude에게 전달할 전체 지시 텍스트..."
}
```

### hanness_manifest.json (체크포인트)
직렬 처리 중 각 page의 완료 여부를 추적. 중단 후 재시작 시 이 파일을 기준으로 재개.

```json
{
  "version": 1,
  "created_at": "2026-04-06T20:30:00",
  "last_updated": "2026-04-06T20:42:10",
  "pages": {
    "page_01": { "status": "done",    "completed_at": "..." },
    "page_02": { "status": "running", "started_at":   "..." },
    "page_03": { "status": "pending" }
  }
}
```

---

## 실행 흐름

```
hanness_runner.py 시작
       │
       ▼
manifest 로드 → 미완료 page 확인
       │
       ▼
[의존성 충족?] ──No──→ 중단 (의존 page 먼저 완료 필요)
       │ Yes
       ▼
.task 파일 자동 생성 (없을 경우)
       │
       ▼
manifest: status = "running"
       │
       ▼
Claude CLI 실행
  claude --print --dangerously-skip-permissions -p "<task.prompt>"
       │
       ├─ 성공 → manifest: status = "done" → 다음 page
       │
       └─ 실패 → manifest: status = "failed" → 중단 (--continue 없을 시)
```

---

## 사용법

```bash
# 환경 확인
python .hanness/hanness_runner.py --status

# 전체 자율 구현 시작 (중단됐던 곳부터 재개)
python .hanness/hanness_runner.py

# 특정 페이지만 재실행
python .hanness/hanness_runner.py --page 03

# 실행 없이 계획 확인
python .hanness/hanness_runner.py --dry-run

# 전체 초기화 후 처음부터 재시작
python .hanness/hanness_runner.py --reset

# 실패해도 계속 진행
python .hanness/hanness_runner.py --continue
```

실행 중 출력은 콘솔과 `.hanness/runner.log`에 함께 기록된다.

---

## 체크포인트 복구 규칙

| manifest 상태 | 재실행 시 동작              |
|---------------|-----------------------------|
| `pending`     | .task 생성 후 Claude 실행   |
| `running`     | 이전 실행이 중단된 것 → 재실행 |
| `done`        | 건너뜀 (이미 완료)          |
| `failed`      | 기본 중단 / `--continue`로 강제 진행 |

---

## Page 의존성 그래프

```
page_01 (models)
   ├──→ page_02 (combinations)
   ├──→ page_03 (game_loop) ──→ page_07 (win_lose) ──→ page_08 (save_load) ──→ page_09
   ├──→ page_04 (card_widget) ──→ page_05 (game_board) ──→ page_06 (ui_panels) ──→ page_09
   └──→ page_08
```

---

## 새 Page 추가 방법

1. `.hanness/pages/page_NN_이름.page` 파일 생성
2. `depends_on:` 필드에 선행 page 기입
3. `hanness_manifest.json`에 `"page_NN": { "status": "pending" }` 추가
4. runner 재실행 — .task는 자동 생성됨
