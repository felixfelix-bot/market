#!/usr/bin/env python3
"""Post the DEDUP A comment (verbatim from dedup_a_comment.md) onto card t_75341e70."""
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
body = (BASE / "dedup_a_comment.md").read_text()
cmd = ["hermes", "kanban", "--board", "plebeian-pr-reviews", "comment", "t_75341e70", body]
print(f"posting {len(body)} chars to t_75341e70 ...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("rc:", res.returncode)
print("stdout:", res.stdout[-3000:])
print("stderr:", res.stderr[-3000:])
sys.exit(res.returncode)
