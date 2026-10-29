# Cold audit of PR #1409 draft review

Auditor: kimi family (Moonshot), read-only, no writes to repo or GitHub.

STEP 1: PASS read draft at /home/c03rad0r/repos/market/artifacts/pr1409_review/REVIEW.md (28 lines, verdict APPROVED).
STEP 2: PASS all 17 cited lines in ADR-0017 and README:25 match draft characterization (awk on /tmp/pr1409_audit/head_adr.md and head_readme.md).
STEP 3: PASS base status cells are Proposed; head cells are Accepted (base_adr.md:5='Proposed', base_readme.md:25 status='Proposed'; head_adr.md:5='Accepted', head_readme.md:25 status='Accepted').
STEP 4: PASS 7 enumerated choices byte-identical between base and head (sed -n on base_adr.md vs head_adr.md).
STEP 5: PASS #1407 mergedAt=2026-10-05T15:48:12Z via mergeCommit 78c10f48bb67; Franchovy APPROVED at 2026-10-05T15:38:06Z on head commit 96cbdd1f; #1409 head parent is exactly 78c10f48bb67.
STEP 6: PASS commit 6ca781fb is a descendant of head (merge-base --is-ancestor exit=0), touches only ADR-0017, and is NOT in the PR diff (diff stat = 2 files only).
STEP 7: PASS no other files reference ADR-0017/four-validator/auction BFT (git grep empty); no leftover "decision requested" / "does not ratify" in docs/ (git grep empty).
STEP 8: PASS unit-integration, prettier, footprint, security-scan, e2e-grep success; Deploy preview success; e2e-full skipped; Tear down preview (job 112019971657) failed at step "Prepare SSH key + pinned host key".
STEP 9: FAIL draft says exactly three "proposed" occurrences at :67,:71,:95 but head ADR actually has FOUR occurrences of "proposed"/"proposal": lines 67, 71, 95, and 161 ("A Byzantine proposer may omit a bid from its proposal"). The :67/71/95 usage matches the NIT claim but line 161's "proposer/proposal" is a BFT protocol term (Byzantine proposer) and not a status framing; it is not stale wording caused by the status flip. Worth a note, not a block.
STEP 10: PASS no contradictions or missed duplicate status locations: full diff is only the two status flips and the ratification paragraph rewrite; README has only one ADR-0017 row at line 25; ADR front-matter is the only other status cell. No overclaim on "byte-identical" — choices 1-7 are byte-identical; nothing else claimed byte-identical.
STEP 11: PASS tone is correctness-first, findings tagged [NIT]/[INFO], verdict APPROVED with no change requests; appropriate for docs-only merged PR.

AUDIT_VERDICT: CONFIRMED_W_AMENDMENTS
AMENDMENTS:

- STEP 9: [NIT] docs/adr/ADR-0017-four-validator-bft-consensus-for-plebeian-auctions.md:161 also contains "proposal" ("A Byzantine proposer may **omit a bid** from its proposal."). This is a protocol term, not stale status framing, so it does not invalidate the NIT, but the draft's count "three earlier spots" is technically off by one if counting literal occurrences. Suggested amendment: reword the NIT to say "three earlier spots where the architecture is framed as 'proposed' (:67, :71, :95)" or note that :161 is a separate technical term.
  MISS_CANDIDATES: none
