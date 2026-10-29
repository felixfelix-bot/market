import importlib.util
from pathlib import Path

path = Path.home() / '.hermes/bot/governance/gate_engine.py'
spec = importlib.util.spec_from_file_location('gate_engine', path)
ge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ge)
text = Path('/home/c03rad0r/worktrees/pr1380-delta-review/artifacts/pr1380_review/review-body.md').read_text()
print('approval_token_present:', bool(ge.RE_APPROVE.search(text)))
print('models:', ge.RE_MODEL.findall(text))
print('benchmark_floor:', ge.review_benchmark_floor_ok('glm-5.3', 'tier/review-glm'))
print('secret_scan:', ge.scan_secrets(text))
print('pr_branch_asserted:', ge.pr_branch_asserted(text))
