import json
import subprocess
from pathlib import Path

root = Path('/home/c03rad0r/worktrees/pr1380-delta-review/artifacts/pr1380_review')
reviews = json.loads((root / 'reviews.json').read_text())
for review in reviews:
    if review['commit_id'] == 'a5b9f50e0651b124f44679579a50102b4d4e34e1':
        print(f"REVIEW {review['id']} by {review['user']['login']}")
        body = review['body']
        for needle in ['Required before merge', 'New, non-gating', 'HUMAN SIGN-OFF', 'PR description', 'genuinely absent']:
            start = body.find(needle)
            if start >= 0:
                print(body[max(0, start-100):min(len(body), start+700)])
                print('---')

log = (root / 'unit-ci.log').read_text(errors='replace').splitlines()
print('CI summary evidence:')
for line in log:
    if 'Ran ' in line and 'tests across' in line or (' pass' in line and line.rstrip().endswith('pass')) or 'Failed to fetch' in line and '(pass)' in line:
        print(line)
print('HEAD test script:', json.loads(subprocess.check_output(['git', '-C', '/home/c03rad0r/repos/market', 'show', 'a5b9f50e0651b124f44679579a50102b4d4e34e1:package.json'], text=True))['scripts']['test:unit'])
print(subprocess.check_output(['git', '-C', '/home/c03rad0r/repos/market', 'merge-tree', '--write-tree', 'origin/auctions', 'a5b9f50e0651b124f44679579a50102b4d4e34e1'], text=True))
