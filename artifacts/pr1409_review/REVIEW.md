# Review — PR #1409 `docs(adr): mark auction BFT decision accepted`

**Reviewed head:** `8cf24b9ec134844ef6ebca5d87393a59e8fd0ee7` (author maximotodev; merged 2026-10-05T23:02:47Z via merge commit `614ff3a0def0`; base `78c10f48bb67` — the merge commit of #1407)

**Verdict: APPROVED — no change requests.**

## Why this is right

The PR does exactly what its title says and nothing else: it flips ADR-0017's status from `Proposed` to `Accepted` in both places that status lives — the ADR front-matter (`docs/adr/ADR-0017-four-validator-bft-consensus-for-plebeian-auctions.md:5`) and the registry row (`docs/adr/README.md:25`) — and replaces the now-false "maintainer decision requested" framing with completed-ratification wording. Before this PR the two status cells agreed with each other but disagreed with reality; after it they state what actually happened.

The factual core checks out against the GitHub record. "On 2026-10-05, this ADR was ratified and PR #1407 was merged" (ADR-0017:230): Franchovy APPROVED #1407 at `96cbdd1f` on 2026-10-05T15:38:06Z, #1407 merged at 15:48:12Z, and this PR's direct parent is #1407's merge commit `78c10f48`. The seven enumerated architecture choices (ADR-0017:234-240) are **byte-identical** to the pre-merge text — the PR claims ratification of exactly those seven and smuggles in no eighth. The dropped sentence "That parameter decision does not ratify this proposed ADR or its seven broader architecture choices" was true before the merge and false after; removing it is the entire point of the PR.

Scope discipline holds: exactly two files, +8/−7, docs only. The body's claim that this PR "does not include the separately ratified leader-change-only soft-close amendment" is verifiable — that amendment is commit `6ca781fb`, which lands on `master` *after* this head; it is not in this diff. No auction semantics, no code, no ADR renumbering.

## First-party verification (at head `8cf24b9e`)

- Status cells: ADR-0017:5 = `Accepted`; README:25 = `Accepted`. The registry row's number/title/file/notes cells are byte-identical to base — only the status cell changed.
- Ratification section (ADR-0017:224-240): new header, "proposed" scrubbed from the 2026-10-04 parameter line (:226), ratification sentence (:230), "accepted architecture choices" lead-in (:232) — all present; choices 1-7 byte-identical to base; trailing content unchanged.
- Tree sweep at head: no other file references ADR-0017 or its status; no leftover "decision requested" / "does not ratify" text anywhere in `docs/`.
- CI at head: `unit-integration`, `prettier`, `footprint`, `security-scan`, `e2e-grep` all green; `Deploy preview` green; `e2e-full` skipped (docs-only). The one failed `Tear down preview` run is the known preview-lane teardown defect ("Prepare SSH key + pinned host key", exit 127 — no checkout before `ssh-prepare.sh`), pre-existing at other heads and unreachable from a docs diff.

## Non-blocking notes

- [NIT] `docs/adr/ADR-0017-four-validator-bft-consensus-for-plebeian-auctions.md:67,71,95` — the stale "proposed" framing this PR set out to scrub was removed at :226 but survives in three earlier spots: "the selected proposed architecture" (:67, :71) and "The proposed 300-second profile has not been verified" (:95). Inside an Accepted record these now read as proposals. Cosmetic; the load-bearing **NOT_RUN** verification requirement at :96-98 is correctly preserved.
- [INFO] `docs/adr/README.md:25` — the registry row's Notes cell still says only "Branch `adr/auction-bft-consensus`" and cites neither PR #1407 (proposal+ratification) nor PR #1409 (this status flip) as provenance, unlike the ADR-0015/0016 rows which cite their PRs.

---

<!-- GATE-2.5 footer appended after the cold audit returns; not part of the draft under audit. -->