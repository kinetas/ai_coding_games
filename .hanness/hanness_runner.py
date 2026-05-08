#!/usr/bin/env python3
"""
hanness_runner.py — CardForge Online 자율 구현 러너
CLAUDE.md §11 구현 우선순위 기반 9개 페이지 직렬 처리

사용법:
  python hanness_runner.py              # 체크포인트에서 이어서 실행
  python hanness_runner.py --reset      # 처음부터 다시 실행
  python hanness_runner.py --from page_03   # 특정 페이지부터 시작
  python hanness_runner.py --only page_02   # 특정 페이지만 단독 실행
  python hanness_runner.py --retry-failed   # 실패한 페이지 재시도
  python hanness_runner.py --status         # 현재 진행 상태 확인
  python hanness_runner.py --dry-run        # Claude 미호출 시뮬레이션
"""

import argparse
import json
import os
import subprocess
import sys
import time
import uuid
import signal
from datetime import datetime
from pathlib import Path

# ─── 경로 설정 ───────────────────────────────────────────────
RUNNER_DIR   = Path(__file__).parent
MANIFEST_F   = RUNNER_DIR / "hanness_manifest.json"
CHECKPOINT_F = RUNNER_DIR / "checkpoint.json"
LOG_F        = RUNNER_DIR / "runner.log"
RESULTS_DIR  = RUNNER_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)

CLAUDE_CMD   = "claude"          # Claude Code CLI
TIMEOUT_SEC  = 600               # 페이지당 최대 실행 시간 (초)
INTER_DELAY  = 5                 # 페이지 간 대기 (초, rate-limit 방어)

# ─── 체크포인트 관리 ────────────────────────────────────────

def load_checkpoint():
    if CHECKPOINT_F.exists():
        return json.loads(CHECKPOINT_F.read_text(encoding="utf-8"))
    return {"run_id": str(uuid.uuid4())[:8].upper(), "pages": {}}

def save_checkpoint(cp):
    """원자적 저장 (tmp → rename)"""
    tmp = CHECKPOINT_F.with_suffix(".tmp")
    cp["last_updated"] = _now()
    tmp.write_text(json.dumps(cp, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(CHECKPOINT_F)

def _now():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

# ─── 로깅 ────────────────────────────────────────────────────

def log(msg, level="INFO"):
    line = f"[{_now()}] [{level}] {msg}"
    print(line)
    with LOG_F.open("a", encoding="utf-8") as f:
        f.write(line + "\n")

# ─── 매니페스트 로드 ─────────────────────────────────────────

def load_manifest():
    return json.loads(MANIFEST_F.read_text(encoding="utf-8"))

# ─── 단일 페이지 실행 ────────────────────────────────────────

def run_page(page_meta, cp, dry_run=False):
    page_id    = page_meta["id"]
    task_file  = RUNNER_DIR / page_meta["task"]
    result_file = RESULTS_DIR / f"{page_id}_result.txt"

    if not task_file.exists():
        log(f"{page_id}: task 파일 없음 ({task_file})", "ERROR")
        return False

    task_prompt = task_file.read_text(encoding="utf-8").strip()
    if not task_prompt:
        log(f"{page_id}: task 파일이 비어 있음", "ERROR")
        return False

    # 체크포인트 갱신 — IN_PROGRESS
    cp["pages"][page_id] = {
        "state": "IN_PROGRESS",
        "started_at": _now(),
        "attempts": cp["pages"].get(page_id, {}).get("attempts", 0) + 1,
    }
    save_checkpoint(cp)

    log(f"▶ {page_id}: {page_meta['title']} 시작")

    if dry_run:
        log(f"  [dry-run] 실제 Claude 호출 건너뜀")
        time.sleep(1)
        cp["pages"][page_id].update({"state": "DONE", "completed_at": _now(), "elapsed": "0s"})
        save_checkpoint(cp)
        return True

    # Claude Code CLI 호출
    start = time.time()
    try:
        result = subprocess.run(
            [CLAUDE_CMD, "--print", task_prompt],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SEC,
            encoding="utf-8",
        )
    except subprocess.TimeoutExpired:
        log(f"{page_id}: 타임아웃 ({TIMEOUT_SEC}s 초과)", "ERROR")
        cp["pages"][page_id].update({
            "state": "FAILED", "failed_at": _now(),
            "error": f"타임아웃 ({TIMEOUT_SEC}s 초과)"
        })
        save_checkpoint(cp)
        return False
    except FileNotFoundError:
        log(f"Claude CLI({CLAUDE_CMD})를 찾을 수 없습니다. PATH를 확인하세요.", "ERROR")
        sys.exit(1)

    elapsed = f"{time.time() - start:.0f}s"
    output  = result.stdout or ""
    stderr  = result.stderr or ""

    # 결과 파일 저장
    result_file.write_text(
        f"=== {page_id} result ===\n{output}\n=== stderr ===\n{stderr}",
        encoding="utf-8"
    )

    if result.returncode != 0:
        log(f"{page_id}: 실패 (exit {result.returncode}) — {elapsed}", "ERROR")
        cp["pages"][page_id].update({
            "state": "FAILED", "failed_at": _now(), "elapsed": elapsed,
            "error": f"exit code {result.returncode}",
            "result_file": str(result_file),
        })
        save_checkpoint(cp)
        return False

    log(f"✓ {page_id}: 완료 — {elapsed}")
    cp["pages"][page_id].update({
        "state": "DONE", "completed_at": _now(), "elapsed": elapsed,
        "result_file": str(result_file),
    })
    save_checkpoint(cp)
    return True

# ─── 상태 출력 ────────────────────────────────────────────────

def print_status(manifest, cp):
    print("\n=== Hanness 실행 상태 ===")
    pages_cp = cp.get("pages", {})
    for p in manifest["pages"]:
        pid   = p["id"]
        title = p["title"]
        info  = pages_cp.get(pid, {})
        state = info.get("state", "PENDING")
        icon  = {"PENDING": "⏳", "IN_PROGRESS": "🔄", "DONE": "✅", "FAILED": "❌"}.get(state, "?")
        elapsed = info.get("elapsed", "")
        print(f"  {icon} {pid}: {title[:40]:<42} {elapsed}")
    print()

# ─── Ctrl-C 핸들러 ───────────────────────────────────────────

_current_cp = None
def _sigint_handler(sig, frame):
    log("Ctrl-C 감지 — 체크포인트 저장 후 종료", "WARN")
    if _current_cp:
        save_checkpoint(_current_cp)
    sys.exit(130)
signal.signal(signal.SIGINT, _sigint_handler)

# ─── 메인 ─────────────────────────────────────────────────────

def main():
    global _current_cp

    parser = argparse.ArgumentParser(description="Hanness 자율 구현 러너")
    parser.add_argument("--reset",        action="store_true", help="체크포인트 초기화")
    parser.add_argument("--from",         dest="from_page",    help="특정 페이지부터 시작")
    parser.add_argument("--only",         dest="only_page",    help="특정 페이지만 실행")
    parser.add_argument("--retry-failed", action="store_true", help="FAILED 페이지 재시도")
    parser.add_argument("--status",       action="store_true", help="진행 상태 출력")
    parser.add_argument("--dry-run",      action="store_true", help="Claude 미호출 시뮬레이션")
    parser.add_argument("--no-pause",     action="store_true", help="페이지 간 대기 없음")
    args = parser.parse_args()

    manifest = load_manifest()

    if args.reset:
        CHECKPOINT_F.unlink(missing_ok=True)
        log("체크포인트 초기화 완료")

    cp = load_checkpoint()
    _current_cp = cp

    if args.status:
        print_status(manifest, cp)
        return

    pages = manifest["pages"]

    # --only: 단일 페이지만
    if args.only_page:
        target = next((p for p in pages if p["id"] == args.only_page), None)
        if not target:
            log(f"페이지 '{args.only_page}'를 찾을 수 없습니다", "ERROR")
            sys.exit(1)
        run_page(target, cp, dry_run=args.dry_run)
        return

    # --retry-failed: FAILED 페이지만 PENDING으로 초기화
    if args.retry_failed:
        for pid, info in cp["pages"].items():
            if info.get("state") == "FAILED":
                info["state"] = "PENDING"
                log(f"  {pid} FAILED → PENDING (재시도 예약)")
        save_checkpoint(cp)

    # --from: 특정 페이지부터
    start_idx = 0
    if args.from_page:
        ids = [p["id"] for p in pages]
        if args.from_page not in ids:
            log(f"페이지 '{args.from_page}'를 찾을 수 없습니다", "ERROR")
            sys.exit(1)
        start_idx = ids.index(args.from_page)

    # 실행 루프
    log(f"=== Hanness 실행 시작 (run_id: {cp['run_id']}) ===")
    failed_count = 0

    for i, page_meta in enumerate(pages[start_idx:], start=start_idx):
        pid   = page_meta["id"]
        state = cp["pages"].get(pid, {}).get("state", "PENDING")

        if state == "DONE":
            log(f"  skip {pid}: 이미 완료")
            continue

        # 의존 페이지 확인
        deps_ok = all(
            cp["pages"].get(dep, {}).get("state") == "DONE"
            for dep in page_meta.get("depends_on", [])
        )
        if not deps_ok:
            log(f"{pid}: 의존 페이지 미완료 — 건너뜀", "WARN")
            failed_count += 1
            continue

        ok = run_page(page_meta, cp, dry_run=args.dry_run)
        if not ok:
            failed_count += 1

        # 페이지 간 대기
        if not args.no_pause and i < len(pages) - 1:
            log(f"  {INTER_DELAY}초 대기 중...")
            time.sleep(INTER_DELAY)

    log("=== Hanness 실행 완료 ===")
    print_status(manifest, cp)

    if failed_count > 0:
        log(f"실패한 페이지 {failed_count}개. --retry-failed 로 재시도하세요.", "WARN")
        sys.exit(1)

if __name__ == "__main__":
    main()
