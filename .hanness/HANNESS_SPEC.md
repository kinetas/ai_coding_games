# Hanness Framework — 체크포인트 시스템 명세

## 개요

Hanness는 MVP 구현 작업을 **페이지 단위로 직렬 처리**하는 자율 구현 러너다.
각 페이지는 독립적인 구현 단위이며, 체크포인트를 통해 중단/재개가 가능하다.

## 디렉토리 구조

```
.hanness/
  hanness_runner.py        ← 메인 실행 스크립트 (체크포인트 러너)
  hanness_manifest.json    ← 페이지 목록 및 의존성 정의
  checkpoint.json          ← 실행 상태 추적 (자동 생성)
  runner.log               ← 실행 로그 (자동 생성)
  pages/
    index.md               ← .page 파일 포맷 가이드
    page_01_setup_models.page
    page_02_combination_engine.page
    ...
    page_09_combat_ai_polish.page
  tasks/
    page_01.task           ← 각 페이지의 작업 컨텍스트
    ...
    page_09.task
  results/
    page_01_result.txt     ← Claude 출력 결과 (자동 생성)
    ...
```

## 실행 명령

```bash
# 체크포인트에서 이어서 실행 (기본)
python hanness_runner.py

# 처음부터 다시 실행
python hanness_runner.py --reset

# 특정 페이지부터 시작
python hanness_runner.py --from page_03

# 특정 페이지만 단독 실행
python hanness_runner.py --only page_02

# 실패한 페이지 재시도
python hanness_runner.py --retry-failed

# 현재 진행 상태 확인
python hanness_runner.py --status

# Claude 미호출 시뮬레이션 (테스트용)
python hanness_runner.py --dry-run
```

## 체크포인트 시스템

### 상태 전이
```
PENDING → IN_PROGRESS → DONE
                      ↘ FAILED → (--retry-failed) → IN_PROGRESS
```

### checkpoint.json 구조
```json
{
  "run_id": "A1B2C3D4",
  "started_at": "2026-05-08T12:00:00",
  "last_updated": "2026-05-08T12:15:30",
  "pages": {
    "page_01": {
      "state": "DONE",
      "started_at": "2026-05-08T12:00:00",
      "completed_at": "2026-05-08T12:05:23",
      "elapsed": "5m 23s",
      "result_file": "results/page_01_result.txt",
      "attempts": 1
    },
    "page_02": {
      "state": "FAILED",
      "started_at": "2026-05-08T12:05:28",
      "failed_at": "2026-05-08T12:06:10",
      "error": "claude CLI 타임아웃 (600s 초과)",
      "attempts": 1
    }
  }
}
```

### 원자적 저장
checkpoint.json은 `.tmp` 임시 파일에 먼저 쓴 후 rename으로 교체한다.
중간에 프로세스가 죽어도 이전 체크포인트가 손상되지 않는다.

## 페이지 파일 포맷 (.page)

```
---
page_id: page_XX
title: 페이지 제목
depends_on: [page_YY]
output_files: [src/foo.js]
---

# 구현 목표: ...

## 컨텍스트
...

## 요구사항
...

## Acceptance Criteria
- [ ] 조건 1
- [ ] 조건 2
```

## 에러 처리

| 오류 유형 | 처리 방법 |
|-----------|-----------|
| Page 파일 없음 | FAILED 처리, 다음 페이지 중단 |
| Claude CLI 없음 | 즉시 오류 출력 및 종료 |
| Claude 타임아웃 | FAILED 처리 (600초) |
| Ctrl-C | 체크포인트 저장 후 종료 (코드 130) |
| API 오류 (비0 종료) | FAILED 처리 |

## 페이지 간 인터벌

기본 5초 대기 (API rate-limit 방어). `--no-pause` 플래그로 비활성화 가능.
