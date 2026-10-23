#!/bin/bash
# Step 6 evidence: is the never-posted draft (4828c54..50199dc) still applicable at the new head?
cd /home/c03rad0r/repos/market || exit 1
HEAD=6be7496cc2089db2e2da04bb083312ae6d43a79d
OLD=50199dce5a11c1d33d42bfe8bdda55447e6ab5d7
DRAFTBASE=4828c54e
REVIEWED_LO=8bf1a35     # lower bound of published review 5328118447 range
REVIEWED_HI=eacc4256   # reviewed head (published 2026-09-26)

echo "### ordering: is the whole draft range inside the PUBLISHED review window 8bf1a35..eacc4256?"
# Containment direction: the review FLOOR must be an ancestor of the draft base,
# and the draft head must be an ancestor of the review CEILING.
echo "review_floor_8bf1a35_ancestor_of_draftbase_4828c54: $(git merge-base --is-ancestor $REVIEWED_LO $DRAFTBASE 2>/dev/null && echo YES || echo NO)"
echo "drafthead_50199dc_ancestor_of_review_ceiling_eacc4256: $(git merge-base --is-ancestor $OLD $REVIEWED_HI 2>/dev/null && echo YES || echo NO)"
echo "reviewed_hi_eacc4256_ancestor_of_head: $(git merge-base --is-ancestor $REVIEWED_HI $HEAD && echo YES || echo NO)"
git show -s --format='8bf1a35 %cI %s' $REVIEWED_LO 2>/dev/null
echo "commits_8bf1a35..eacc4256=$(git rev-list --count $REVIEWED_LO..$REVIEWED_HI 2>/dev/null)"
echo
echo "### do the 4 draft-range files carry the draft additions unchanged at head?"
for f in src/lib/__tests__/fetchMintKeysets.test.ts src/lib/__tests__/settlementDescriptor.test.ts src/lib/auction/settlementDescriptor.ts src/lib/auction/validation.ts; do
  # lines added by the draft range that are still present in the head blob
  added=$(git diff $DRAFTBASE..$OLD -- "$f" | grep -c '^+[^+]')
  still=$(git diff $DRAFTBASE..$OLD -- "$f" | grep '^+[^+]' | sed 's/^+//' | grep -cFxf <(git show $HEAD:"$f") )
  echo "$f: draft_added_lines=$added still_present_at_head=$still"
done
echo
echo "### commits touching each of the 4 files between draft head and new head"
for f in src/lib/__tests__/fetchMintKeysets.test.ts src/lib/__tests__/settlementDescriptor.test.ts src/lib/auction/settlementDescriptor.ts src/lib/auction/validation.ts; do
  echo "--- $f"
  git log --oneline $OLD..$HEAD -- "$f" | cat
done
