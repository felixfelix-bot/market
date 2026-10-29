## Review: PR #1319 — docs: NIP-46 remote signer identity separation invariants

**PR:** https://github.com/PlebeianApp/market/pull/1319
**Head:** `5067affba283` | **Author:** maxime-tt | **State:** OPEN | **Files:** 2 markdown, +225

### Scope

Two documentation files:
1. `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md` (+82) — much of this content is already on master via earlier PRs (e.g. #1316). The net-new piece in this PR is the **I2 update bullet** crediting PR #1290 with the first code verification of I2 against the timeout-fallback path.
2. `docs/handover/nip46-remote-signer-identity-separation.md` (+143, new) — handover doc for the NIP-46 signer rewrite, describing six code patterns (A–F) PR #1252 must preserve.

### Verification performed

Diff is docs-only — no runtime code, no CI impact. Verified the doc's specific claims against the actual code:

- **Pattern A** (`recoverNip46UserPubkey`, lines 119/120/129/132/139/150-153 in PR #1290's `auth.ts`): verified — `expectedPubkeys` set contains ONLY the explicit param, never `signer.userPubkey` (PR #1290 head `2817bb5a`:110-160). Mismatch check at lines 143-144 is against `expectedPubkeys` only. Restore logic at 150-153 confirmed. The tight, fail-closed behavior maxime-tt documents matches the code.
- **Pattern B** (`cacheResolvedNip46User` via `(signer as unknown as { _user?: NDKUser })._user = user`): verified at PR #1290 head lines 98-103, with explicit NDK-3.0.3 pin rationale in the comment.
- **Pattern C** (`cancelNip46HandshakeListeners` in `finally`): verified — runs at lines 158/184/212 of PR #1290's auth.ts.
- **Pattern D** (`await ndkActions.setSigner(...)` before `isAuthenticated: true`): verified at lines 489-498.
- **Pattern E** (5 keys cleared on logout incl. `nostr_user_pubkey`): verified at lines 516-521.
- **Pattern F** (`getAuthStorage()` seam): verified — single definition at line 32, used by every login/logout/persist path.
- **Nip46Mock** distinct `remoteSignerSk`/`userSk` keypairs and `get_public_key` returning `userPk`: verified at `e2e/utils/nip46-mock.ts` lines 53-57, 292-293.
- **E2E timeout-recovery test** asserting `mock.pk !== mock.userPk` and `nostr_user_pubkey === mock.userPk`: verified at `e2e/tests/auth.spec.ts` lines 437-438, 474-475, 542-543.

All 8 patterns the handover doc claims Code Patterns A-F + the e2e mock + the timeout-recovery e2e coverage are real and present at PR #1290's head. Verified file:line citations are accurate.

### Findings

None blocking. Three things worth flagging as author-visible INFO/NITs:

**[NIT]** `docs/handover/nip46-remote-signer-identity-separation.md:39` — "Code patterns (auth.ts, final state at PR #1290 head 272839a4)" — the hash cited is a stale intermediate commit; the final PR #1290 head is `2817bb5a`. The patterns themselves match `2817bb5a` exactly (verified above), so only the hash string is off. Suggest correcting to `2817bb5a`.

**[NIT]** `docs/handover/nip46-remote-signer-identity-separation.md:36` — Patterns A–F describe code that exists on PR #1290's branch (closed unmerged) but **not** on master. Today `src/lib/stores/auth.ts` on master does not define `recoverNip46UserPubkey`, `cacheResolvedNip46User`, `cancelNip46HandshakeListeners`, `getAuthStorage`, or `persistAuthenticatedLoginState`. The handover doc is therefore forward-looking guidance for the Wave A3b rewrite rather than a description of current master behavior — this is consistent with the PR body ("the migration pattern PR #1252 must preserve"), but readers following the file path citations may be confused. Suggest one sentence clarifying that these patterns exist only on the closed PR #1290 branch and await re-introduction in the Wave A3b rewrite.

**[INFO]** `docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md` — the OG Meta bullets and "Amendment (2026-09)" text in the diff are already on master (as of `91d43aa` — PR #1316); this PR's only new ADR content is the small I2 update bullet. No action needed — just flagging that the delta here is much smaller than the +82 line stat suggests.

### Verdict

**APPROVED** at `5067affba283` — docs-only, zero runtime risk, all cited patterns and file references verified accurate against PR #1290 head. Two NITs above are suggestions for clarity / accuracy of the doc itself; none block. The I2 update note correctly reflects the history: PR #1199 was not an input dependency by design, but the invariant was only first code-verified on the PR #1290 timeout path.

---

*Cross-family review by Hermes (worker-reviewer-kimi). All file:line citations verified against PR #1290 head `2817bb5a`.*

