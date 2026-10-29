# REPORT — PR #1286 citation inventory (faithful transcription)

Worker: fleet offload (worker-heavy) · Date: 2026-10-29 · Repo: PlebeianApp/market
Card: t_6a82b4dc (board plebeian-pr-reviews) · Mode: READ-ONLY, zero GitHub writes
Task parent: t_ad93f86e ("Rebuild ground truth: diff, PR metadata, head-SHA citations for #1286")

## 1. Artifact read (source of truth)

| field  | value                                                              |
| ------ | ------------------------------------------------------------------ |
| path   | `/home/c03rad0r/worktrees/pr1286-review/DRAFT-REVIEW.md`           |
| bytes  | 3291                                                               |
| sha256 | `8de0eb0d2ef9573cc2d8be0922867ba96106b147021fe4a14658b6b86f451e01` |
| md5    | `2fa622c901779b8b9be904a100752469`                                 |
| lines  | 13                                                                 |
| mtime  | 2026-10-29 00:42:05 +0100                                          |

A byte-identical copy is archived at `artifacts/pr1286_citations/DRAFT-REVIEW.source.md`.

### How the artifact was located (STEP 0 audit trail)

Searched in the prescribed order, all read-only:

1. **Kanban task record / artifacts for the parent task id** — `~/.hermes/kanban/boards/plebeian-pr-reviews/kanban.db`:
   `task_attachments` holds only 2 rows, both for `t_0f6a0798` (unrelated). `task_comments` for
   `t_ad93f86e` has 2 rows, neither containing review text ("fleet-done rc=1…", "UNBLOCK: price window open").
   `task_events` has zero rows matching `1286`. `task_links` has no row touching `t_ad93f86e`.
   Board workspaces `t_ad93f86e` and `t_30a3a336` are **empty directories**;
   `t_31cab538` and `t_6a82b4dc` workspaces do not exist.
2. **Board run-output directory** — `boards/plebeian-pr-reviews/{logs,attachments,workspaces}`: no `*1286*` file
   (only `kanban.db.bak-*` snapshots). `task_runs` for `t_ad93f86e` are 2x `scheduled` + 2x `crashed`
   (crashed at 1790463118 / 1790463318, ~05:11-05:16 local) — the parent never wrote a run summary.
3. **Common scratch locations** — `/tmp`: `pr1286.diff` (36438 B, diff only, no review prose) and directory
   `/tmp/pr1286/` (10 loose source excerpts). Both near-misses, not the draft.

**Candidate found and selected:** `/home/c03rad0r/worktrees/pr1286-review/DRAFT-REVIEW.md`.

Provenance evidence that this is the parent task's draft (not a near-miss):

- The filename and location are the exact artifact the parent task wrote into its own review worktree
  (`/home/c03rad0r/worktrees/pr1286-review`, whose `HEAD` is `dc88681f` on top of `2ae85b6f`).
- Its first line cites head `2ae85b6f`, the same head the parent task was briefed on.
- Its five findings match, one-for-one and in order, the parent's own `PROGRESS.md` lines 10-11 in the same
  worktree: "Draft = 5 NEW findings (2 RISK, 3 NIT), 14 lines" and the cited `storefront.tsx:56-58`,
  `StorefrontRenderer.tsx:74`, `ADR-019:163-166`, `liveChat.tsx:93-99` list.
- `GLM-VERDICT-2.md` in the same directory is the GATE 2.5 re-review of _this_ file by path
  ("You previously reviewed the draft at /home/c03rad0r/worktrees/pr1286-review/DRAFT-REVIEW.md").

**Near-misses rejected as candidates** (different PRs, would have been fabrication to use):

- `/tmp/REVIEW_DRAFT.md` (2980 B) — review of head `017e38ff` (NIP-46/auth signer work), not PR #1286.
- `/tmp/draft-draft.txt` (58 B) — "Reviewed tip cfef7525 — no new issues found. Approving."

## 2. Deliverable — `/tmp/pr1286_citations.json`

**24 citation rows** covering **23 distinct claims** (C1..C23).

Convention chosen for uncited claims: **they are included in the main array with
`file_path: null, cited_line: null, cited_line_end: null`**, so the array is a superset of the draft's
claims (11 such rows). The same 11 are also listed separately in section 5 below.

Archived copy: `artifacts/pr1286_citations/pr1286_citations.json`.

Row schema as specified: `claim_id`, `claim_text`, `file_path`, `cited_line`, `cited_line_end`,
`raw_quote_from_draft`.

## 3. CITATION_INVENTORY

| claim_id | file_path:line                                                           | short claim summary                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1       | NO CITATION                                                              | The PR's overall shape (one name driving NIP-05 + vanity URL + a signed page) is the right shape, and its schema-first block model reads cleanly.                                             |
| C2       | NO CITATION                                                              | The new findings are stated at head 2ae85b6f; the ten previously-raised review items still stand and are not repeated in this draft.                                                          |
| C3       | src/lib/schemas/storefront.ts:28                                         | `heroBlock.image` reuses `safeLink`, which only requires an `https:` scheme on any host.                                                                                                      |
| C4       | NO CITATION                                                              | A signed page event can therefore make every visitor's browser fetch an arbitrary third-party URL.                                                                                            |
| C5       | NO CITATION                                                              | `parseStorefrontPage` accepts a hero block whose `image` is an arbitrary attacker host, as demonstrated with `{"type":"hero","title":"Hi","image":"https://attacker.example/pixel.png?u=1"}`. |
| C6       | StorefrontRenderer.tsx:26                                                | `StorefrontRenderer` puts that image value straight into `<img src>`.                                                                                                                         |
| C7       | NO CITATION                                                              | A seller, or anyone holding a 30024 they can get rendered, obtains a per-visitor tracking pixel and every visitor's IP/timestamp on a page served as the project's own.                       |
| C8       | ADR-019:146-147                                                          | ADR-019 states that images resolve through the existing Blossom/NIP-96 host allowlist.                                                                                                        |
| C9       | src/lib/blossom.ts                                                       | No such allowlist exists in this diff, and `src/lib/blossom.ts` only lists servers with no predicate.                                                                                         |
| C10      | src/queries/storefront.tsx:40                                            | `fetchStorefrontPage` never Schnorr-verifies the 30024 event at the parse boundary.                                                                                                           |
| C11      | NO CITATION                                                              | It filters on `kind`, `pubkey` and the `d` tag only, then hands `event.content` to `parseStorefrontPage`.                                                                                     |
| C12      | NO CITATION                                                              | Without a signature check, a forged event with the right pubkey/kind/`d` and a bad signature renders on a public `/{name}` page.                                                              |
| C13      | NO CITATION                                                              | The repo already states the rule for this case: NDK's sampling verification may skip forged events, so events are verified explicitly.                                                        |
| C14      | src/queries/liveChat.tsx:93-99                                           | `src/queries/liveChat.tsx` calls `verifyNostrEventSignature` before parsing, as the existing precedent.                                                                                       |
| C15      | src/queries/AGENTS.md                                                    | `src/queries/AGENTS.md` requires validating signature assumptions before treating an event as application state.                                                                              |
| C16      | src/routes/\_dashboard-layout/dashboard/account/storefront.tsx:56-58     | The dashboard storefront editor textarea is unconditionally overwritten whenever `publishedPage` changes, with no dirty guard.                                                                |
| C17      | src/queries/storefront.tsx:59-63                                         | `useStorefrontPage`'s subscription invalidates on any incoming 30024 from this pubkey, so a draft being typed is silently replaced by the relay copy.                                         |
| C18      | NO CITATION                                                              | The overwrite triggers in practice when publishing from a second device/tab while the first is mid-edit.                                                                                      |
| C19      | src/components/storefront/StorefrontRenderer.tsx:74                      | `StorefrontRenderer` renders a `<main>` inside the `<main>` at the root route, giving a storefront document two main landmarks, contrary to the a11y rule of exactly one per document.        |
| C19      | src/routes/\_\_root.tsx:102                                              | `StorefrontRenderer` renders a `<main>` inside the `<main>` at the root route, giving a storefront document two main landmarks, contrary to the a11y rule of exactly one per document.        |
| C20      | NO CITATION                                                              | `ProfilePage` returns a `<div>` rather than a `<main>` for the same nested-landmark reason.                                                                                                   |
| C21      | docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md:163-166 | ADR-019 promises two guards for R5: a renderer unit test asserting a hostile page renders inert, and an e2e path purchase → publish → `/{name}` → NIP-05.                                     |
| C22      | src/lib/schemas/storefront.test.ts                                       | This PR ships only a parser-level test at `src/lib/schemas/storefront.test.ts`.                                                                                                               |
| C23      | NO CITATION                                                              | No e2e scenario references storefront or 30024, so the render layer is unverified for the exact threats the ADR enumerates.                                                                   |

### Full uncited-claims list (11 claims, no path:line in the draft)

- C1 — The PR's overall shape (one name driving NIP-05 + vanity URL + a signed page) is the right shape, and its schema-first block model reads cleanly.
- C2 — The new findings are stated at head 2ae85b6f; the ten previously-raised review items still stand and are not repeated in this draft.
- C4 — A signed page event can therefore make every visitor's browser fetch an arbitrary third-party URL.
- C5 — `parseStorefrontPage` accepts a hero block whose `image` is an arbitrary attacker host, as demonstrated with `{"type":"hero","title":"Hi","image":"https://attacker.example/pixel.png?u=1"}`.
- C7 — A seller, or anyone holding a 30024 they can get rendered, obtains a per-visitor tracking pixel and every visitor's IP/timestamp on a page served as the project's own.
- C11 — It filters on `kind`, `pubkey` and the `d` tag only, then hands `event.content` to `parseStorefrontPage`.
- C12 — Without a signature check, a forged event with the right pubkey/kind/`d` and a bad signature renders on a public `/{name}` page.
- C13 — The repo already states the rule for this case: NDK's sampling verification may skip forged events, so events are verified explicitly.
- C18 — The overwrite triggers in practice when publishing from a second device/tab while the first is mid-edit.
- C20 — `ProfilePage` returns a `<div>` rather than a `<main>` for the same nested-landmark reason.
- C23 — No e2e scenario references storefront or 30024, so the render layer is unverified for the exact threats the ADR enumerates.

## 4. Verification performed on the extraction

Mechanical, not judgemental — these prove completeness and fidelity only:

| gate                                                                         | result                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| every `raw_quote_from_draft` is an exact substring of the draft              | 24 / 24 PASS                                              |
| every distinct path token in the draft appears in the inventory              | 11 / 11 PASS                                              |
| every `:line` / `:line-line` reference in the draft appears in the inventory | 10 / 10 PASS                                              |
| claim ids monotonic by first appearance in the draft                         | PASS (C1..C23 in order)                                   |
| no claim merged or split contrary to sentence boundaries                     | reviewed manually against the 5 numbered items + preamble |

Path tokens found in the draft and covered: `src/lib/schemas/storefront.ts`,
`StorefrontRenderer.tsx` (bare, as written), `ADR-019` (bare, as written), `src/lib/blossom.ts`,
`src/queries/storefront.tsx`, `src/queries/liveChat.tsx`, `src/queries/AGENTS.md`,
`src/routes/_dashboard-layout/dashboard/account/storefront.tsx`,
`src/components/storefront/StorefrontRenderer.tsx`, `src/routes/__root.tsx`,
`docs/adr/ADR-019-unified-storefront-identity-and-page-builder.md`, `src/lib/schemas/storefront.test.ts`.

Line references found: `:28`, `:26`, `:146-147`, `:40`, `:93-99`, `:56-58`, `:59-63`, `:74`, `:102`, `:163-166`.

Transcription fidelity notes (deliberately NOT corrected):

- `StorefrontRenderer.tsx:26` is written as a **bare filename**, not a repo-relative path. Transcribed as written.
- `ADR-019:146-147` is written as a **bare ADR id**, not a file path. Transcribed as written.
- C19 emits **two rows** because the draft attaches two citations to the one nested-`<main>` assertion
  (`StorefrontRenderer.tsx:74` and `src/routes/__root.tsx:102`), per the "one row per citation" rule.
- The draft's preamble also names head SHA `2ae85b6f`; it is not a file path so it is not a citation row,
  but it is preserved inside C2's verbatim quote.

## 5. Uncited claims (input for the later verification task)

Same 11 claims as listed in section 3, repeated here as the standalone list:

- C1 — The PR's overall shape (one name driving NIP-05 + vanity URL + a signed page) is the right shape, and its schema-first block model reads cleanly.
- C2 — The new findings are stated at head 2ae85b6f; the ten previously-raised review items still stand and are not repeated in this draft.
- C4 — A signed page event can therefore make every visitor's browser fetch an arbitrary third-party URL.
- C5 — `parseStorefrontPage` accepts a hero block whose `image` is an arbitrary attacker host, as demonstrated with `{"type":"hero","title":"Hi","image":"https://attacker.example/pixel.png?u=1"}`.
- C7 — A seller, or anyone holding a 30024 they can get rendered, obtains a per-visitor tracking pixel and every visitor's IP/timestamp on a page served as the project's own.
- C11 — It filters on `kind`, `pubkey` and the `d` tag only, then hands `event.content` to `parseStorefrontPage`.
- C12 — Without a signature check, a forged event with the right pubkey/kind/`d` and a bad signature renders on a public `/{name}` page.
- C13 — The repo already states the rule for this case: NDK's sampling verification may skip forged events, so events are verified explicitly.
- C18 — The overwrite triggers in practice when publishing from a second device/tab while the first is mid-edit.
- C20 — `ProfilePage` returns a `<div>` rather than a `<main>` for the same nested-landmark reason.
- C23 — No e2e scenario references storefront or 30024, so the render layer is unverified for the exact threats the ADR enumerates.

Note: C4, C5, C7, C11, C12, C13, C18, C23 are **not** orphan claims — they are continuations of a numbered
draft item whose sibling claim carries the citation. They carry no citation _of their own_, which is what
this list records. C1, C2, C20 carry none anywhere.

## 6. Scope discipline

- No claim was evaluated, ranked, confirmed, or refuted. `claim_text` is a paraphrase of what the draft
  asserts, with no judgement words added.
- Paths and line numbers were never normalised, reflowed, or corrected.
- **Zero GitHub write operations were performed.** No `gh` command of any kind was invoked in this run —
  not `gh pr view`, not `gh pr diff`, not `gh api`, and certainly no comment, review, approve,
  request-changes, label, or merge. All source material was already on local disk.
- No kanban write operations were performed either; the board DB was opened read-only.

## 7. Steps completed

STEP 0 locate — DONE · STEP 1 read in full — DONE · STEP 2 enumerate claims — DONE (23)
STEP 3 extract citations verbatim — DONE (24 rows) · STEP 4 write JSON — DONE · STEP 5 unverified list — DONE (11)
