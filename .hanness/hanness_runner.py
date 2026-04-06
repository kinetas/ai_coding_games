#!/usr/bin/env python
"""
Hanness Runner — 자율 plan-and-build 직렬 실행기
CardForge MVP를 page 단위로 분할해 Claude CLI를 통해 순차 구현한다.

사용법:
  python hanness_runner.py               # 중단된 지점부터 재개
  python hanness_runner.py --reset       # 전체 초기화 후 재시작
  python hanness_runner.py --page 03    # 특정 페이지만 재실행
  python hanness_runner.py --dry-run    # 실행 없이 계획만 출력
  python hanness_runner.py --status     # 현재 진행 상황 출력
"""

import os
import sys
import json
import time
import hashlib
import argparse
import subprocess
import re
from pathlib import Path
from datetime import datetime

# ─── 경로 설정 ────────────────────────────────────────────────────────────────
REPO_ROOT   = Path(__file__).parent.parent
HANNESS_DIR = Path(__file__).parent
PAGES_DIR   = HANNESS_DIR / "pages"
TASKS_DIR   = HANNESS_DIR / "tasks"
RESULTS_DIR = HANNESS_DIR / "results"
MANIFEST    = HANNESS_DIR / "hanness_manifest.json"
LOG_FILE    = HANNESS_DIR / "runner.log"

# Claude CLI 경로 (Windows 우선)
CLAUDE_PATHS = [
    r"C:\Users\Administrator\.local\bin\claude.exe",
    "claude",
    "claude.exe",
]

# ─── 유틸리티 ─────────────────────────────────────────────────────────────────
def find_claude() -> str:
    for p in CLAUDE_PATHS:
        if Path(p).exists():
            return p
        try:
            subprocess.run([p, "--version"], capture_output=True, timeout=5)
            return p
        except Exception:
            pass
    raise RuntimeError("Claude CLI를 찾을 수 없습니다. PATH를 확인하세요.")


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def log(msg: str, level: str = "INFO"):
    icons = {"INFO": "·", "OK": "✓", "FAIL": "✗", "WARN": "△", "HEAD": "▶"}
    icon = icons.get(level, "·")
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {icon} {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def ensure_runtime_dirs():
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# ─── 매니페스트 ───────────────────────────────────────────────────────────────
DEFAULT_MANIFEST = {
    "version": 1,
    "created_at": None,
    "last_updated": None,
    "pages": {}
}


def load_manifest() -> dict:
    if MANIFEST.exists():
        with open(MANIFEST, encoding="utf-8") as f:
            return json.load(f)
    m = DEFAULT_MANIFEST.copy()
    m["created_at"] = now_iso()
    return m


def save_manifest(m: dict):
    m["last_updated"] = now_iso()
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=2)


# ─── 페이지 파서 ──────────────────────────────────────────────────────────────
def parse_page(path: Path) -> dict:
    """
    .page 파일을 파싱해 dict 반환.
    필드: id, title, status, depends_on, content
    """
    text = path.read_text(encoding="utf-8")

    # 첫 줄에서 제목 추출: # PAGE 01 — ...
    title_match = re.search(r"^#\s*PAGE\s*(\d+)\s*[—-]+\s*(.+)$", text, re.MULTILINE)
    page_num  = title_match.group(1).zfill(2) if title_match else "00"
    title_str = title_match.group(2).strip() if title_match else path.stem

    # status 추출
    status_match = re.search(r"^status:\s*(.+)$", text, re.MULTILINE)
    status = status_match.group(1).strip() if status_match else "pending"

    # depends_on 추출
    dep_match = re.search(r"^depends_on:\s*\[(.*)?\]", text, re.MULTILINE)
    if dep_match:
        raw = dep_match.group(1).strip()
        deps = [d.strip() for d in raw.split(",") if d.strip()] if raw else []
    else:
        deps = []

    return {
        "id":         f"page_{page_num}",
        "num":        page_num,
        "title":      title_str,
        "file":       str(path),
        "status":     status,
        "depends_on": deps,
        "content":    text,
    }


def load_pages() -> list[dict]:
    ensure_runtime_dirs()
    pages = [parse_page(p) for p in sorted(PAGES_DIR.glob("*.page"))]
    return pages


# ─── .task 파일 생성 ──────────────────────────────────────────────────────────
TASK_PROMPT_TEMPLATE = """\
당신은 CardForge Flutter 게임 프로젝트의 자율 구현 에이전트입니다.
아래 Page 명세를 읽고 지시된 파일을 실제로 생성/수정하십시오.

[프로젝트 루트]
{repo_root}

[CLAUDE.md 핵심 제약]
- Flutter + Riverpod + shared_preferences 전용
- 조합 규칙은 combinations.dart 데이터 테이블에만 존재
- 개별 위젯 타이머 금지 → 중앙 Tick 루프 사용
- 저장은 shared_preferences만 사용

[Page 명세]
{page_content}

[지시]
1. 위 명세의 "구현 범위"에 나열된 파일을 모두 생성 또는 수정하라.
2. "성공 기준"의 각 항목이 통과되도록 구현하라.
3. 구현 완료 후 `flutter analyze`를 실행해 오류가 없는지 확인하라.
4. 작업 완료 시 각 생성 파일의 경로와 주요 변경 사항을 간략히 요약하라.
5. 이전 page의 파일이 아직 없다면 stub/placeholder로 생성 후 진행하라.
"""


def generate_task(page: dict) -> Path:
    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    task_path = TASKS_DIR / f"{page['id']}.task"
    prompt = TASK_PROMPT_TEMPLATE.format(
        repo_root=str(REPO_ROOT),
        page_content=page["content"],
    )
    task_data = {
        "page_id":    page["id"],
        "page_num":   page["num"],
        "title":      page["title"],
        "depends_on": page["depends_on"],
        "created_at": now_iso(),
        "status":     "pending",
        "prompt":     prompt,
    }
    with open(task_path, "w", encoding="utf-8") as f:
        json.dump(task_data, f, ensure_ascii=False, indent=2)
    return task_path


def load_task(page_id: str) -> dict | None:
    task_path = TASKS_DIR / f"{page_id}.task"
    if task_path.exists():
        with open(task_path, encoding="utf-8") as f:
            return json.load(f)
    return None


def update_task_status(page_id: str, status: str):
    task_path = TASKS_DIR / f"{page_id}.task"
    if not task_path.exists():
        return
    with open(task_path, encoding="utf-8") as f:
        data = json.load(f)
    data["status"] = status
    data["updated_at"] = now_iso()
    with open(task_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ─── Claude CLI 실행 ──────────────────────────────────────────────────────────
def run_claude(page: dict, claude_bin: str, dry_run: bool = False) -> tuple[bool, str]:
    """
    Claude CLI를 사용해 task를 실행한다.
    반환: (성공 여부, 출력 텍스트)
    """
    task = load_task(page["id"])
    if not task:
        return False, "task 파일 없음"

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    result_path = RESULTS_DIR / f"{page['id']}_result.txt"
    prompt = task["prompt"]

    if dry_run:
        log(f"[DRY-RUN] {page['id']}: Claude 호출 생략", "WARN")
        log(f"  프롬프트 미리보기 ({len(prompt)} chars): {prompt[:120]}...", "INFO")
        return True, "[dry-run] 건너뜀"

    log(f"Claude CLI 실행 중: {page['id']} — {page['title']}", "HEAD")

    # Claude CLI: --print 모드로 비대화형 실행
    cmd = [
        claude_bin,
        "--print",           # 비대화형 출력 모드
        "--dangerously-skip-permissions",  # 자율 실행에서 권한 프롬프트 생략
        "-p", prompt,
    ]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=600,  # 10분 제한
        )
        output = proc.stdout + proc.stderr
        success = proc.returncode == 0

        # 결과 저장
        with open(result_path, "w", encoding="utf-8") as f:
            f.write(f"=== {page['id']} — {page['title']} ===\n")
            f.write(f"실행 시각: {now_iso()}\n")
            f.write(f"종료 코드: {proc.returncode}\n")
            f.write("=" * 60 + "\n")
            f.write(output)

        return success, output

    except subprocess.TimeoutExpired:
        msg = f"타임아웃: {page['id']} 10분 초과"
        log(msg, "FAIL")
        with open(result_path, "w", encoding="utf-8") as f:
            f.write(msg)
        return False, msg

    except Exception as e:
        msg = f"실행 오류: {e}"
        log(msg, "FAIL")
        return False, msg


# ─── 의존성 해소 ──────────────────────────────────────────────────────────────
def deps_satisfied(page: dict, manifest: dict) -> bool:
    for dep in page["depends_on"]:
        dep_id = dep.replace("page_", "page_").strip()
        # depends_on은 "page_01_models" 형식
        # manifest key는 "page_01" 형식으로 저장
        # page_id에서 숫자만 추출해 비교
        num_match = re.search(r"(\d+)", dep)
        if not num_match:
            continue
        dep_key = f"page_{num_match.group(1).zfill(2)}"
        entry = manifest["pages"].get(dep_key, {})
        if entry.get("status") != "done":
            return False
    return True


# ─── 진행 상황 출력 ───────────────────────────────────────────────────────────
def print_status(pages: list[dict], manifest: dict):
    print("\n" + "=" * 56)
    print("  Hanness Runner — CardForge MVP 진행 현황")
    print("=" * 56)
    total = len(pages)
    done = sum(1 for p in pages if manifest["pages"].get(p["id"], {}).get("status") == "done")
    failed = sum(1 for p in pages if manifest["pages"].get(p["id"], {}).get("status") == "failed")

    bar_filled = int(done / total * 30) if total else 0
    bar = "█" * bar_filled + "░" * (30 - bar_filled)
    print(f"  [{bar}] {done}/{total} 완료")
    if failed:
        print(f"  ⚠ 실패: {failed}개")
    print()

    STATUS_ICON = {
        "done":    "✓",
        "failed":  "✗",
        "running": "▶",
        "pending": "○",
        "skipped": "–",
    }
    for p in pages:
        entry = manifest["pages"].get(p["id"], {})
        st = entry.get("status", "pending")
        icon = STATUS_ICON.get(st, "?")
        ts = entry.get("completed_at", "")[:16] if st == "done" else ""
        deps = f"  ← {', '.join(p['depends_on'])}" if p["depends_on"] else ""
        print(f"  {icon} PAGE {p['num']} {p['title']:<35} {ts}{deps}")

    print("=" * 56 + "\n")


# ─── 메인 루프 ────────────────────────────────────────────────────────────────
def run(args):
    ensure_runtime_dirs()
    pages = load_pages()
    if not pages:
        log("pages/ 디렉토리에 .page 파일이 없습니다.", "FAIL")
        sys.exit(1)

    manifest = load_manifest()

    # 매니페스트에 새 페이지 등록
    for p in pages:
        if p["id"] not in manifest["pages"]:
            manifest["pages"][p["id"]] = {"status": "pending"}

    if args.status:
        print_status(pages, manifest)
        return

    if args.reset:
        log("전체 초기화 중...", "WARN")
        for p in pages:
            manifest["pages"][p["id"]] = {"status": "pending"}
        save_manifest(manifest)
        log("초기화 완료. 처음부터 재시작합니다.", "OK")

    # 특정 페이지만 실행
    if args.page:
        target_num = args.page.zfill(2)
        pages = [p for p in pages if p["num"] == target_num]
        if not pages:
            log(f"페이지 {target_num}을 찾을 수 없습니다.", "FAIL")
            sys.exit(1)
        # 해당 페이지 상태 초기화
        for p in pages:
            manifest["pages"][p["id"]] = {"status": "pending"}

    if not args.dry_run:
        claude_bin = find_claude()
        log(f"Claude CLI: {claude_bin}", "INFO")
    else:
        claude_bin = "claude"

    print_status(pages, manifest)
    log("자율 구현 시작...\n", "HEAD")

    for page in pages:
        pid = page["id"]
        entry = manifest["pages"].get(pid, {})

        # 이미 완료된 페이지 건너뜀
        if entry.get("status") == "done" and not args.page:
            log(f"건너뜀 (이미 완료): {pid}", "OK")
            continue

        # 의존성 확인
        if not deps_satisfied(page, manifest):
            pending_deps = [d for d in page["depends_on"]]
            log(f"의존성 미충족 — {pid}: {pending_deps}", "WARN")
            log("이전 페이지가 실패했거나 아직 실행되지 않았습니다. 중단합니다.", "FAIL")
            break

        # .task 파일 생성 (없으면)
        task_path = TASKS_DIR / f"{pid}.task"
        if not task_path.exists() or args.reset or args.page:
            log(f"task 파일 생성: {pid}.task", "INFO")
            generate_task(page)

        # 실행 상태 기록
        manifest["pages"][pid]["status"] = "running"
        manifest["pages"][pid]["started_at"] = now_iso()
        save_manifest(manifest)
        update_task_status(pid, "running")

        # Claude 실행
        success, output = run_claude(page, claude_bin, dry_run=args.dry_run)

        if success:
            manifest["pages"][pid]["status"] = "done"
            manifest["pages"][pid]["completed_at"] = now_iso()
            save_manifest(manifest)
            update_task_status(pid, "done")
            log(f"완료: {pid} — {page['title']}", "OK")

            # 간단한 요약 출력 (마지막 20줄)
            if output and not args.dry_run:
                summary_lines = output.strip().split("\n")[-20:]
                print("  │ " + "\n  │ ".join(summary_lines))
            print()

        else:
            manifest["pages"][pid]["status"] = "failed"
            manifest["pages"][pid]["failed_at"] = now_iso()
            save_manifest(manifest)
            update_task_status(pid, "failed")
            log(f"실패: {pid} — {page['title']}", "FAIL")
            log(f"결과 파일 확인: .hanness/results/{pid}_result.txt", "INFO")

            if not args.continue_on_fail:
                log("오류로 인해 중단합니다. --continue 플래그로 강제 진행 가능.", "WARN")
                break

    print()
    print_status(pages, manifest)
    log("Hanness Runner 종료.", "INFO")


# ─── 진입점 ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Hanness Runner — CardForge 자율 구현 실행기"
    )
    parser.add_argument("--reset",    action="store_true", help="전체 초기화 후 재시작")
    parser.add_argument("--page",     metavar="N",         help="특정 페이지 번호만 재실행 (예: 03)")
    parser.add_argument("--dry-run",  action="store_true", help="Claude 호출 없이 계획만 출력")
    parser.add_argument("--status",   action="store_true", help="현재 진행 현황 출력")
    parser.add_argument("--continue", dest="continue_on_fail", action="store_true",
                        help="실패해도 다음 페이지 계속 진행")
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
