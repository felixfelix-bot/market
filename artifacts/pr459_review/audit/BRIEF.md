You are a cold auditor. You are auditing a DRAFT code review before it is published on GitHub. Your job: verify every claim in the draft FIRST-HAND against the actual bytes at the PR head commit, and catch false claims, wrong line numbers, unsourced assertions, and missed defects. You are NOT writing a review of the PR — you are auditing the REVIEW.

## Setup facts (verified, do not re-derive)

- Repo: /home/c03rad0r/repos/market, remote `origin` = PlebeianApp/market
- PR #459 head: db60d4d7ec896944e79ed2734f42b7ec670a156e (exists locally in git)
- Read the head file with: git -C /home/c03rad0r/repos/market show 'db60d4d7ec896944e79ed2734f42b7ec670a156e:src/routes/products.$productId.tsx' > /tmp/head_file.tsx (quote the whole pathspec; the $ must survive into git)
- Do NOT run any write commands on the repo; read-only audit. gh allowed only read-only (gh api / gh pr view).

## The draft under audit

Read it from: /home/c03rad0r/repos/market/artifacts/pr459_review/REVIEW.md

## Your audit method (do each step, append findings to a file as you go)

Write your working notes to /tmp/pr459_audit/audit-verdict.md (mkdir -p first). After EACH step below, append a line: `STEP N: <PASS/FAIL> <one-line finding>` to that file.

1. Read the draft REVIEW.md fully.
2. Line-number check: for every file:line citation in the draft, extract the cited line from the head file (`awk 'NR==<n>' /tmp/head_file.tsx`) and confirm the quoted code is actually at that line. Draft cites: :390 (useDocumentMeta call), :258/:267/:289 (early returns), :231 (price), :396 (currency), :393 (image), :106-107 (twitter:description guard), :104-105 (price meta tags), :101 (og:type product). The draft's line numbers refer to the HEAD file, so verify each.
3. Claim check — rules-of-hooks: list the hook calls in the component body in source order (useQueryClient, useEffect, useQuery x2, useBreakpoint, useState x4, useConfigQuery, useEntityPermissions, useBlacklistSettings, useFeaturedProducts, useHeroBackground, useDocumentMeta). Verify useDocumentMeta's call site comes after all three conditional early returns (loading/error/not-found). Conclude whether "render 1: 14 hooks, render 2: 15 hooks" is the correct characterization.
4. Claim check — dead price guard: verify :231 is `const price = priceTag ? parseFloat(priceTag[1]) : 0` and :396 is `currency: priceTag?.[2] || 'SATS'`, and that the hook's guard at ~:107 (`price !== undefined && currency ? ... : description`) therefore can never take the description-only branch. Check whether the product:price meta tags at :104-105 share this guard.
5. Claim check — og:image unvalidated: verify :393 is `image: backgroundImageUrl || undefined` and that backgroundImageUrl comes from formattedImages[0]?.url || '' (untrusted image[1] relay tag). Verify the claim about the merged superseder: git -C /home/c03rad0r/repos/market show origin/master:src/lib/ogTags.ts | grep -n -A8 "absolutizeImageUrl"
6. Claim check — supersession: `gh pr view 1232 --repo PlebeianApp/market --json state,mergedAt,title` and `gh api repos/PlebeianApp/market/issues/459/comments --jq '.[] | {id, user: .user.login, head: .body[0:150]}'` (read-only). Confirm #1232 MERGED and the maxime-tt comment (id 5310184633) says what the draft quotes. Check "826 commits behind": git -C /home/c03rad0r/repos/market rev-list --count db60d4d7ec896944e79ed2734f42b7ec670a156e..origin/master
7. Claim check — prior review correction: verify src/index.html at head has NO meta description tag (only charset/viewport/theme-color/title). Verify no other injector exists: git -C ... grep -n 'name="description"' <head> -- src/
8. Missed-defect sweep: scan the ENTIRE added lines of the PR (git show bfad3eb7 -- 'src/routes/products.$productId.tsx' for the feat, db60d4d7 for the 5-line head fix). Candidates to check: (a) meta description truncation `description.substring(0, 157) + '...'` operates on UTF-16 code units — can it split a surrogate pair mid-character for emoji-bearing descriptions, and is this worth flagging? (b) useEffect dep array lists config.\* fields — any stale-closure bug? (c) cleanup restores document.title to originalTitle captured at effect-run time — any StrictMode double-invoke issue? (d) meta.setAttribute('content', untrusted) — safe vs innerHTML? (e) anything else in the diff the draft missed.
9. Tone check: blunt correctness-first, never person-directed; structure has [BLOCK]/[RISK]/[NIT]/[INFO] with file:line. Confirm.
10. Final verdict at the end of the audit file:
    AUDIT_VERDICT: <CONFIRMED | CONFIRMED_W_AMENDMENTS | REJECTED>
    AMENDMENTS: <list each amendment the draft needs before publishing, or "none">
    MISS_CANDIDATES: <defects the draft missed worth adding, or "none">

Be skeptical of the draft. Verify, don't trust. Every finding must cite the bytes you checked.
