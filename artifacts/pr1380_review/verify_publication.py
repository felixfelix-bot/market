import json
import subprocess
from pathlib import Path

root = Path('/home/c03rad0r/worktrees/pr1380-delta-review')
review = json.loads((root / 'artifacts/pr1380_review/published-review.json').read_text())
posted = review['body'].rstrip('\n')
draft = (root / 'artifacts/pr1380_review/review-body.md').read_text().rstrip('\n')
assert posted == draft, 'published body differs from review-body.md'
assert review['id'] == 5692663369
assert review['commit_id'] == 'a5b9f50e0651b124f44679579a50102b4d4e34e1'
assert review['state'] == 'COMMENTED'
state_path = Path('/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json')
state = json.loads(state_path.read_text())
entry = state['prs']['1380']
assert entry['last_reviewed_sha'] == review['commit_id']
assert entry['review_id'] == review['id']
assert entry['review_url'] == review['html_url']
assert '1381' in state['prs']
print(json.dumps({
    'review_id': review['id'],
    'review_url': review['html_url'],
    'review_commit_id': review['commit_id'],
    'review_state': review['state'],
    'body_matches_file_ignoring_trailing_newlines': True,
    'last_reviewed_sha': entry['last_reviewed_sha'],
    'state_sibling_1381_present': True,
}, indent=2))
print(subprocess.check_output(['git', 'status', '--short', '--branch'], cwd=root, text=True))
