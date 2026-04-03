# Branch Rewind and Incremental Cherry-Pick Plan

## Goal

Reconstruct `get-currency-context-vm` from the last known green CI commit and then re-apply only reviewer-requested changes in narrow, testable batches to avoid scope creep.

## Baseline

- Last known successful remote CI commit:
  - `24f411ef5436be8b00afa275d6036cb7fcf7d93e`

## Execution Strategy

1. Create a safety backup branch from current `HEAD`.
2. Reset `get-currency-context-vm` to the green baseline commit.
3. Cherry-pick reviewer-related commits in isolated batches.
4. Push after each batch and use GitHub Actions as source of truth.
5. Do not proceed to next batch until CI is green.

## Step-by-Step Commands

### 0) Safety backup

```bash
git checkout get-currency-context-vm
git checkout -b backup/get-currency-context-vm-20260404
git push -u origin backup/get-currency-context-vm-20260404
git checkout get-currency-context-vm
```

### 1) Rewind working branch to known-good CI commit

```bash
git reset --hard 24f411ef5436be8b00afa275d6036cb7fcf7d93e
```

### 2) Apply feedback in narrow batches

#### Batch A: Key rename + production relay scope

- Commit(s):
  - `250fb8c` (`CURRENCY_SERVER_KEY` -> `CVM_SERVER_KEY`, relay scope)

```bash
git cherry-pick 250fb8c
git push --force-with-lease origin get-currency-context-vm
```

#### Batch B: Generalize unit/integration script targets

- Commit(s):
  - `c75c71c`
  - `9463c7e`

```bash
git cherry-pick c75c71c 9463c7e
git push --force-with-lease origin get-currency-context-vm
```

#### Batch C: ctxcn-generated client + naming alignment

- Commit(s):
  - `82922d0`
  - `c583520`
  - `8f1ed42` (includes server/client renames)

```bash
git cherry-pick 82922d0 c583520 8f1ed42
git push --force-with-lease origin get-currency-context-vm
```

#### Batch D: Deploy integration for currency server

- Commit(s):
  - `ec1d228`
  - `58d9eb5`

```bash
git cherry-pick ec1d228 58d9eb5
git push --force-with-lease origin get-currency-context-vm
```

## Explicitly Deferred (unless requested)

- Documentation/review note commits only:
  - `0c40fa9`
  - `b0879b5`

## Conflict Policy

If a cherry-pick introduces conflicts or broad side effects:

```bash
git cherry-pick --abort
```

Then re-apply only the minimal required hunks for that specific reviewer comment.

## Guardrails to Prevent Scope Creep

- One reviewer-theme batch at a time.
- No opportunistic refactors.
- No unrelated test-stack hardening in this pass.
- CI must pass before moving to the next batch.
